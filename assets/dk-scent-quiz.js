/**
 * Added by DK on 2026-08-11 — Boond Scent Discovery Quiz engine.
 *
 * A generic, config-driven multi-step quiz. This file renders whatever
 * questions assets/dk-scent-quiz-config.json defines and never needs to
 * change when questions/weights are added or edited — only the config
 * file does. See references/dk-scent-quiz-usage-guide.md for the full
 * config schema.
 *
 * Step types supported: choice (single-select), multi (multi-select),
 * interstitial (non-interactive, e.g. testimonials), contact (gated
 * email/phone/name capture before results).
 *
 * Persists in-progress answers to localStorage (same pattern as
 * assets/recently-viewed-products.js) so a refresh mid-quiz resumes at
 * the same step instead of losing progress.
 */

/**
 * @typedef {Object} QuizOption
 * @property {string} label
 * @property {string} [icon]
 * @property {Object.<string, string|string[]>} [sets]
 * @property {number} [weight]
 */

/**
 * @typedef {Object} QuizStep
 * @property {string} id
 * @property {'choice'|'multi'|'interstitial'|'contact'} type
 * @property {string} [prompt]
 * @property {QuizOption[]} [options]
 * @property {Object.<string, string>} [showIf]
 * @property {boolean} [cosmeticOnly]
 * @property {boolean} [skippable]
 * @property {number} [minSelections]
 * @property {string} [heading]
 * @property {string} [body]
 * @property {{quote: string, name: string, age?: number|string, rating?: number, verified?: boolean}} [testimonial] Single testimonial (legacy/simple shape) — for multiple, use `testimonials`.
 * @property {Array<{quote: string, name: string, age?: number|string, rating?: number, verified?: boolean}>} [testimonials] Multiple stacked review cards, per the reference "review wall" design.
 * @property {string} [ctaLabel]
 * @property {string[]} [fields]
 * @property {boolean} [phoneOptional]
 * @property {string} [incentiveText]
 */

export class ScentQuiz extends HTMLElement {
  /** @static @constant {string} localStorage key prefix — suffixed with the element's data-quiz-id so multiple quiz instances don't collide. */
  static #STORAGE_KEY_PREFIX = 'dkScentQuiz:';

  /** @type {QuizStep[]} */
  #steps = [];
  /** @type {Object.<string, *>} */
  #scoringConfig = {};
  /** @type {{heading?: string, items?: string[], footer?: string, durationMs?: number}|null} The "Building your personalized profile" transitional screen config, shown between contact submission and results — null if the config omits it. */
  #loadingConfig = null;
  /** @type {Object.<string, *>} */
  #answers = {};
  /** @type {Object.<string, string|string[]>} Raw label(s) selected per step id, keyed by step.id — recorded for every step including cosmeticOnly ones, so the webhook payload reflects exactly what was clicked, not just the derived scoring fields. */
  #rawAnswers = {};
  /** @type {number} */
  #currentIndex = 0;
  /** @type {Array<Object>} */
  #products = [];
  /** @type {string} */
  #storageKey = '';
  /** @type {boolean} True once the quiz_start analytics event has fired for this page load. */
  #hasFiredStart = false;
  /** @type {boolean} True if answers/currentIndex were restored from a prior in-progress session (a resume, not a fresh start). */
  #isResumed = false;
  /** @type {Set<string>} step ids already fired as a step_view event this page load, so a re-render of the same step (e.g. after a validation error) doesn't double-count. */
  #firedStepViews = new Set();

  connectedCallback() {
    this.#storageKey = ScentQuiz.#STORAGE_KEY_PREFIX + (this.dataset.quizId || 'default');
    this.#loadProductData();
    this.#restoreState();
    this.#loadConfig();
  }

  /**
   * Reads the pre-rendered product-data JSON block (emitted by
   * sections/dk_scent-quiz.liquid) — no API call needed.
   */
  #loadProductData() {
    const script = this.querySelector('script[data-quiz-products]');
    if (!script) return;
    try {
      this.#products = JSON.parse(script.textContent || '[]');
    } catch (error) {
      console.error('[dk-scent-quiz] Failed to parse product data', error);
      this.#products = [];
    }
  }

  /**
   * Loads the quiz config from data-config-url — always set by
   * sections/dk_scent-quiz.liquid, either to the built-in
   * assets/dk-scent-quiz-config.json asset URL or a merchant-configured
   * external URL, so this is always a fetch, never an inline parse.
   */
  async #loadConfig() {
    const configUrl = this.dataset.configUrl;
    let config = null;

    try {
      if (configUrl) {
        const response = await fetch(configUrl);
        config = await response.json();
      }
    } catch (error) {
      console.error('[dk-scent-quiz] Failed to load quiz config', error);
    }

    if (!config || !Array.isArray(config.steps)) {
      this.#renderError();
      return;
    }

    this.#steps = config.steps;
    this.#scoringConfig = config.scoring || {};
    this.#loadingConfig = config.loading || null;
    this.#render();
  }

  /** Restores in-progress answers/step index from localStorage, if present. */
  #restoreState() {
    try {
      const raw = localStorage.getItem(this.#storageKey);
      if (!raw) return;
      const saved = JSON.parse(raw);
      this.#answers = saved.answers || {};
      this.#rawAnswers = saved.rawAnswers || {};
      this.#currentIndex = saved.currentIndex || 0;
      // A restored session with progress beyond step 0 is a resume, not a
      // fresh start — quiz_start shouldn't fire again for it (see #render).
      if (this.#currentIndex > 0) this.#isResumed = true;
    } catch (error) {
      // Corrupt/old state — start fresh rather than block the quiz.
      localStorage.removeItem(this.#storageKey);
    }
  }

  /** Persists in-progress answers/step index to localStorage. */
  #saveState() {
    try {
      localStorage.setItem(
        this.#storageKey,
        JSON.stringify({ answers: this.#answers, rawAnswers: this.#rawAnswers, currentIndex: this.#currentIndex })
      );
    } catch (error) {
      // Storage full/unavailable (private browsing, etc.) — quiz still works, just won't resume.
    }
  }

  /** Clears saved progress (called on completion, so a repeat visit starts fresh). */
  #clearState() {
    try {
      localStorage.removeItem(this.#storageKey);
    } catch (error) {
      // Ignore.
    }
  }

  /**
   * Returns the list of steps that should currently be visible given the
   * answers so far — evaluates each step's showIf condition, if any.
   * @returns {QuizStep[]}
   */
  #visibleSteps() {
    return this.#steps.filter((step) => {
      if (!step.showIf) return true;
      return Object.entries(step.showIf).every(([key, value]) => this.#answers[key] === value);
    });
  }

  /** Renders the current step. */
  #render() {
    const visible = this.#visibleSteps();
    // Clamp in case a showIf branch changed and the saved index no longer applies.
    if (this.#currentIndex >= visible.length) this.#currentIndex = Math.max(0, visible.length - 1);

    const step = visible[this.#currentIndex];
    if (!step) {
      this.#renderResults();
      return;
    }

    this.#trackStepView(step, visible.length);

    const container = this.#getStepContainer();
    container.innerHTML = '';
    container.appendChild(this.#renderStep(step, visible.length));
    this.#updateProgress(visible.length);
  }

  /**
   * Fires GA4 analytics events for the funnel: quiz_start once, on the
   * very first fresh (non-resumed) render, and dk_scent_quiz_step_view
   * once per distinct step id reached this page load. Together these let
   * a GA4 funnel exploration answer "how many started" (quiz_start
   * count), "how many completed" (dk_scent_quiz_completed count, fired
   * in #completeQuiz), and per-question drop-off (the step_view count
   * for each step id, compared step to step).
   * @param {QuizStep} step
   * @param {number} totalSteps
   */
  #trackStepView(step, totalSteps) {
    if (!this.#hasFiredStart && !this.#isResumed) {
      this.#hasFiredStart = true;
      ScentQuiz.#fireEvent('dk_scent_quiz_start', { quiz_id: this.dataset.quizId || 'default' });
    }

    if (this.#firedStepViews.has(step.id)) return;
    this.#firedStepViews.add(step.id);
    ScentQuiz.#fireEvent('dk_scent_quiz_step_view', {
      quiz_id: this.dataset.quizId || 'default',
      step_id: step.id,
      step_type: step.type,
      step_index: this.#currentIndex,
      step_count: totalSteps,
    });
  }

  /**
   * Fires a gtag event if GA4 is present (loaded via Shopify's native
   * Customer Events/Google & YouTube channel on the live store — this
   * file never loads or configures gtag itself, only calls it if it's
   * already there).
   * @param {string} name
   * @param {Object.<string, *>} params
   */
  static #fireEvent(name, params) {
    if (typeof window.gtag === 'function') {
      window.gtag('event', name, params);
    }
  }

  /**
   * @param {QuizStep} step
   * @param {number} totalSteps
   * @returns {HTMLElement}
   */
  #renderStep(step, totalSteps) {
    switch (step.type) {
      case 'choice':
        return this.#renderChoiceStep(step, false);
      case 'multi':
        return this.#renderChoiceStep(step, true);
      case 'interstitial':
        return this.#renderInterstitialStep(step);
      case 'contact':
        return this.#renderContactStep(step);
      default:
        console.warn(`[dk-scent-quiz] Unknown step type "${step.type}"`);
        return document.createElement('div');
    }
  }

  /**
   * @param {QuizStep} step
   * @param {boolean} isMulti
   * @returns {HTMLElement}
   */
  #renderChoiceStep(step, isMulti) {
    const wrap = document.createElement('div');
    wrap.className = 'dk-scent-quiz__step';

    const prompt = document.createElement('h2');
    prompt.className = 'dk-scent-quiz__prompt';
    prompt.textContent = step.prompt || '';
    wrap.appendChild(prompt);

    const optionsWrap = document.createElement('div');
    optionsWrap.className = 'dk-scent-quiz__options';
    optionsWrap.setAttribute('role', isMulti ? 'group' : 'radiogroup');

    const selected = new Set();

    (step.options || []).forEach((option, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'dk-scent-quiz__option';
      button.setAttribute('role', isMulti ? 'checkbox' : 'radio');
      button.setAttribute('aria-checked', 'false');

      if (option.icon) {
        const icon = document.createElement('span');
        icon.className = 'dk-scent-quiz__option-icon';
        icon.setAttribute('aria-hidden', 'true');
        icon.textContent = option.icon;
        button.appendChild(icon);
      }

      const label = document.createElement('span');
      label.className = 'dk-scent-quiz__option-label';
      label.textContent = option.label;
      button.appendChild(label);

      button.addEventListener('click', () => {
        if (isMulti) {
          const isSelected = button.getAttribute('aria-checked') === 'true';
          button.setAttribute('aria-checked', isSelected ? 'false' : 'true');
          button.classList.toggle('is-selected', !isSelected);
          if (isSelected) selected.delete(index);
          else selected.add(index);

          const continueButton = wrap.querySelector('[data-quiz-continue]');
          if (continueButton instanceof HTMLButtonElement) {
            const minSelections = step.minSelections ?? 1;
            continueButton.disabled = selected.size < minSelections;
          }
        } else {
          this.#applyOptionAnswers(step, [option]);
          this.#advance();
        }
      });

      optionsWrap.appendChild(button);
    });

    wrap.appendChild(optionsWrap);

    if (isMulti) {
      const continueButton = document.createElement('button');
      continueButton.type = 'button';
      continueButton.className = 'dk-scent-quiz__continue';
      continueButton.textContent = 'Continue';
      continueButton.dataset.quizContinue = 'true';
      continueButton.disabled = (step.minSelections ?? 1) > 0;
      continueButton.addEventListener('click', () => {
        const options = step.options || [];
        const chosen = Array.from(selected).map((index) => options[index]);
        this.#applyOptionAnswers(step, chosen);
        this.#advance();
      });
      wrap.appendChild(continueButton);
    }

    if (step.skippable) {
      const skip = document.createElement('button');
      skip.type = 'button';
      skip.className = 'dk-scent-quiz__skip';
      skip.textContent = 'Skip for now';
      skip.addEventListener('click', () => this.#advance());
      wrap.appendChild(skip);
    }

    return wrap;
  }

  /**
   * Records the raw label(s) chosen on a step and merges the `sets`
   * object of every chosen option into #answers.
   *
   * The raw labels (#rawAnswers, keyed by step id) are recorded for
   * every step, including cosmeticOnly ones — this is what lets the
   * webhook payload show exactly what was clicked on each question, not
   * just the derived scoring fields. #answers, by contrast, only holds
   * the merged scoring-oriented values and skips cosmeticOnly steps
   * entirely, since those never feed the scoring engine.
   *
   * For `type: "multi"` steps, list-valued fields (e.g. scent_family)
   * accumulate as a de-duplicated union across all chosen options, and
   * scalar fields from multiple options collect into a list too, so
   * downstream scoring can treat them as "any of" via `intersect` mode.
   *
   * For `type: "choice"` steps (single-select), each key is *replaced*
   * rather than unioned with any prior value for that key — a
   * single-choice step's `path`/`gender`/etc. must stay a scalar for
   * `showIf`'s strict-equality comparison to keep working, and re-answering
   * a step (e.g. after a localStorage-restored resume lands mid-flow)
   * should overwrite the old choice, not merge with it.
   * @param {QuizStep} step
   * @param {QuizOption[]} chosenOptions
   */
  #applyOptionAnswers(step, chosenOptions) {
    const labels = chosenOptions.map((option) => option.label);
    this.#rawAnswers[step.id] = step.type === 'multi' ? labels : (labels[0] ?? null);

    if (step.cosmeticOnly) return;

    if (step.type !== 'multi') {
      for (const option of chosenOptions) {
        if (!option.sets) continue;
        for (const [key, value] of Object.entries(option.sets)) {
          this.#answers[key] = value;
        }
      }
      return;
    }

    /** @type {Object.<string, Set<string>>} */
    const accumulated = {};

    for (const option of chosenOptions) {
      if (!option.sets) continue;
      for (const [key, value] of Object.entries(option.sets)) {
        if (!accumulated[key]) accumulated[key] = new Set();
        if (Array.isArray(value)) value.forEach((v) => accumulated[key].add(v));
        else accumulated[key].add(value);
      }
    }

    for (const [key, valueSet] of Object.entries(accumulated)) {
      // Multi-select always replaces the key with this step's own
      // selection (not unioned with a prior step's answer for the same
      // key) — each multi-select step re-answers its own key from
      // scratch when its Continue is clicked.
      this.#answers[key] = Array.from(valueSet);
    }
  }

  /**
   * @param {QuizStep} step
   * @returns {HTMLElement}
   */
  #renderInterstitialStep(step) {
    const wrap = document.createElement('div');
    wrap.className = 'dk-scent-quiz__step dk-scent-quiz__interstitial';

    if (step.heading) {
      const heading = document.createElement('h2');
      heading.className = 'dk-scent-quiz__prompt';
      heading.textContent = step.heading;
      wrap.appendChild(heading);
    }

    if (step.body) {
      const body = document.createElement('p');
      body.className = 'dk-scent-quiz__interstitial-body';
      body.textContent = step.body;
      wrap.appendChild(body);
    }

    // Accept either a single `testimonial` object (legacy/simple config)
    // or a `testimonials` array (multiple stacked review cards, per the
    // reference design) — normalize to an array either way.
    const testimonials = step.testimonials || (step.testimonial ? [step.testimonial] : []);

    if (testimonials.length > 0) {
      const list = document.createElement('div');
      list.className = 'dk-scent-quiz__testimonial-list';

      for (const testimonial of testimonials) {
        list.appendChild(this.#renderTestimonialCard(testimonial));
      }

      wrap.appendChild(list);
    }

    const cta = document.createElement('button');
    cta.type = 'button';
    cta.className = 'dk-scent-quiz__continue';
    cta.textContent = step.ctaLabel || 'Continue';
    cta.addEventListener('click', () => this.#advance());
    wrap.appendChild(cta);

    return wrap;
  }

  /**
   * Renders one review card: avatar initial, name (+ optional age),
   * an optional "Verified" badge, a star rating, and the quote.
   * @param {{quote: string, name: string, age?: number|string, rating?: number, verified?: boolean}} testimonial
   * @returns {HTMLElement}
   */
  #renderTestimonialCard(testimonial) {
    const card = document.createElement('div');
    card.className = 'dk-scent-quiz__testimonial';

    const header = document.createElement('div');
    header.className = 'dk-scent-quiz__testimonial-header';

    const person = document.createElement('div');
    person.className = 'dk-scent-quiz__testimonial-person';

    if (testimonial.name) {
      const avatar = document.createElement('div');
      avatar.className = 'dk-scent-quiz__testimonial-avatar';
      avatar.setAttribute('aria-hidden', 'true');
      avatar.textContent = testimonial.name.trim().charAt(0).toUpperCase();
      person.appendChild(avatar);
    }

    const identity = document.createElement('div');
    identity.className = 'dk-scent-quiz__testimonial-identity';

    if (testimonial.name) {
      const nameLine = document.createElement('p');
      nameLine.className = 'dk-scent-quiz__testimonial-name';
      nameLine.textContent = testimonial.age ? `${testimonial.name}, ${testimonial.age}` : testimonial.name;
      identity.appendChild(nameLine);
    }

    if (testimonial.verified) {
      const verified = document.createElement('p');
      verified.className = 'dk-scent-quiz__testimonial-verified';
      verified.textContent = '✓ Verified';
      identity.appendChild(verified);
    }

    person.appendChild(identity);
    header.appendChild(person);

    if (testimonial.rating) {
      const stars = document.createElement('div');
      stars.className = 'dk-scent-quiz__testimonial-stars';
      stars.setAttribute('aria-hidden', 'true');
      stars.textContent = '★'.repeat(Math.round(testimonial.rating));
      header.appendChild(stars);
    }

    card.appendChild(header);

    const quote = document.createElement('p');
    quote.className = 'dk-scent-quiz__testimonial-quote';
    quote.textContent = `"${testimonial.quote}"`;
    card.appendChild(quote);

    return card;
  }

  /**
   * @param {QuizStep} step
   * @returns {HTMLElement}
   */
  #renderContactStep(step) {
    const wrap = document.createElement('div');
    wrap.className = 'dk-scent-quiz__step dk-scent-quiz__contact';

    const heading = document.createElement('h2');
    heading.className = 'dk-scent-quiz__prompt';
    heading.textContent = 'Where should we send your matches?';
    wrap.appendChild(heading);

    if (step.incentiveText) {
      const incentive = document.createElement('p');
      incentive.className = 'dk-scent-quiz__incentive';
      incentive.textContent = step.incentiveText;
      wrap.appendChild(incentive);
    }

    const form = document.createElement('form');
    form.className = 'dk-scent-quiz__contact-form';
    form.noValidate = true;

    const fields = step.fields || ['email', 'phone', 'name'];

    if (fields.includes('email')) {
      form.appendChild(this.#buildContactField('email', 'email', 'Email address', true));
    }
    if (fields.includes('phone')) {
      form.appendChild(this.#buildContactField('tel', 'phone', 'WhatsApp number (optional)', !step.phoneOptional));
    }
    if (fields.includes('name')) {
      form.appendChild(this.#buildContactField('text', 'name', 'Your name', true));
    }

    const submit = document.createElement('button');
    submit.type = 'submit';
    submit.className = 'dk-scent-quiz__continue';
    submit.textContent = 'See my matches';
    form.appendChild(submit);

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const formData = new FormData(form);
      const email = String(formData.get('email') || '').trim();

      if (fields.includes('email') && !ScentQuiz.#isValidEmail(email)) {
        const emailInput = form.querySelector('input[name="email"]');
        if (emailInput instanceof HTMLInputElement) emailInput.setCustomValidity('Please enter a valid email');
        form.reportValidity();
        return;
      }

      this.#answers.email = email;
      this.#answers.phone = String(formData.get('phone') || '').trim();
      this.#answers.name = String(formData.get('name') || '').trim();

      this.#completeQuiz();
    });

    wrap.appendChild(form);
    return wrap;
  }

  /**
   * @param {string} type
   * @param {string} name
   * @param {string} placeholder
   * @param {boolean} required
   * @returns {HTMLElement}
   */
  #buildContactField(type, name, placeholder, required) {
    const field = document.createElement('div');
    field.className = 'dk-scent-quiz__field';

    const input = document.createElement('input');
    input.type = type;
    input.name = name;
    input.placeholder = placeholder;
    input.required = required;
    input.className = 'dk-scent-quiz__input';
    input.addEventListener('input', () => input.setCustomValidity(''));

    field.appendChild(input);
    return field;
  }

  /** @param {string} email @returns {boolean} */
  static #isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  /** Advances to the next visible step and persists progress. */
  #advance() {
    this.#currentIndex += 1;
    this.#saveState();
    this.#render();
  }

  /** @param {number} totalSteps */
  #updateProgress(totalSteps) {
    const bar = this.querySelector('[data-quiz-progress-bar]');
    if (bar instanceof HTMLElement) {
      const percent = totalSteps > 0 ? Math.round(((this.#currentIndex + 1) / totalSteps) * 100) : 0;
      bar.style.width = `${percent}%`;
    }
  }

  /** @returns {HTMLElement} */
  #getStepContainer() {
    let container = this.querySelector('[data-quiz-step-container]');
    if (!container) {
      container = document.createElement('div');
      container.setAttribute('data-quiz-step-container', 'true');
      this.appendChild(container);
    }
    return container;
  }

  /**
   * Runs the config-driven scoring engine against the pre-rendered
   * product list and fires the webhook + analytics events on completion.
   */
  async #completeQuiz() {
    const results = this.#scoreProducts();
    this.#fireWebhook(results);
    this.#fireAnalytics(results);
    this.#clearState();

    if (this.#loadingConfig) {
      await this.#renderLoadingScreen(this.#loadingConfig);
    }

    this.#renderResults(results);
  }

  /**
   * Renders the "Building your personalized profile" transitional
   * screen shown after contact info is submitted and before results
   * reveal — a fixed short delay with a spinner and a checklist of
   * lines that tick off one at a time, purely a UX device (scoring
   * itself already finished instantly, client-side, before this runs).
   * Resolves once the delay has elapsed, so #completeQuiz can await it
   * before moving on to results.
   * @param {{heading?: string, items?: string[], footer?: string, durationMs?: number}} config
   * @returns {Promise<void>}
   */
  #renderLoadingScreen(config) {
    const container = this.#getStepContainer();
    container.innerHTML = '';

    const wrap = document.createElement('div');
    wrap.className = 'dk-scent-quiz__step dk-scent-quiz__loading';

    const spinner = document.createElement('div');
    spinner.className = 'dk-scent-quiz__loading-spinner';
    spinner.setAttribute('aria-hidden', 'true');
    wrap.appendChild(spinner);

    if (config.heading) {
      const heading = document.createElement('h2');
      heading.className = 'dk-scent-quiz__prompt';
      heading.textContent = config.heading;
      wrap.appendChild(heading);
    }

    const items = config.items || [];
    const checklist = document.createElement('ul');
    checklist.className = 'dk-scent-quiz__loading-checklist';

    const itemElements = items.map((itemTemplate) => {
      const li = document.createElement('li');
      li.className = 'dk-scent-quiz__loading-item';

      const check = document.createElement('span');
      check.className = 'dk-scent-quiz__loading-check';
      check.setAttribute('aria-hidden', 'true');
      check.textContent = '✓';
      li.appendChild(check);

      const text = document.createElement('span');
      text.innerHTML = this.#renderLoadingItemText(itemTemplate);
      li.appendChild(text);

      checklist.appendChild(li);
      return li;
    });

    wrap.appendChild(checklist);

    if (config.footer) {
      const footer = document.createElement('p');
      footer.className = 'dk-scent-quiz__loading-footer';
      footer.textContent = config.footer;
      wrap.appendChild(footer);
    }

    container.appendChild(wrap);

    const durationMs = config.durationMs ?? 2600;
    const perItemDelay = itemElements.length > 0 ? durationMs / (itemElements.length + 1) : durationMs;

    return new Promise((resolve) => {
      itemElements.forEach((li, index) => {
        setTimeout(() => li.classList.add('is-checked'), perItemDelay * (index + 1));
      });
      setTimeout(resolve, durationMs);
    });
  }

  /**
   * Fills a `{{answerKey}}` template in a loading-checklist line with
   * the shopper's own raw answer label(s) (from #rawAnswers, matched by
   * step id — e.g. "{{mood}} you selected" → "Fresh & clean, Floral &
   * romantic you selected"), so the screen references their actual
   * quiz picks rather than generic copy. Falls back to leaving the
   * placeholder text out entirely if no matching answer is found,
   * rather than showing a broken "{{mood}}" literal.
   * @param {string} template
   * @returns {string}
   */
  #renderLoadingItemText(template) {
    return template.replace(/\{\{\s*([\w-]+)\s*\}\}/g, (match, stepId) => {
      const raw = this.#rawAnswers[stepId];
      if (raw == null) return '';
      const label = Array.isArray(raw) ? raw.join(', ') : raw;
      return `<mark class="dk-scent-quiz__loading-highlight">${ScentQuiz.#escapeHtml(label)}</mark>`;
    });
  }

  /** @param {string} value @returns {string} */
  static #escapeHtml(value) {
    const div = document.createElement('div');
    div.textContent = value;
    return div.innerHTML;
  }

  /**
   * Scores every product against the collected answers using the
   * config's scoring.match rules — generic, not hardcoded per-attribute,
   * so a new rule in the config is picked up automatically.
   * @returns {Array<{product: Object, score: number, isFallback?: boolean}>}
   */
  #scoreProducts() {
    const rules = this.#scoringConfig.match || [];
    const scored = this.#products.map((product) => {
      let score = 0;
      for (const rule of rules) {
        const answerValue = this.#answers[rule.answerKey];
        const productValue = product[rule.productField];
        if (ScentQuiz.#ruleMatches(rule.mode, answerValue, productValue)) {
          score += rule.weight || 0;
        }
      }
      return { product, score };
    });

    scored.sort((a, b) => b.score - a.score);

    const threshold = this.#scoringConfig.minScoreThreshold ?? 0;
    const resultCount = this.#scoringConfig.resultCount ?? 3;
    const topScore = scored[0]?.score ?? 0;

    if (topScore < threshold) {
      // Fall back to merchant-configured "safe bet" products, rendered
      // into the page the same way as the scored product list.
      const fallbackScript = this.querySelector('script[data-quiz-fallback-products]');
      if (fallbackScript) {
        try {
          const fallback = JSON.parse(fallbackScript.textContent || '[]');
          return fallback.map((product) => ({ product, score: 0, isFallback: true }));
        } catch (error) {
          console.error('[dk-scent-quiz] Failed to parse fallback products', error);
        }
      }
    }

    return scored.slice(0, resultCount);
  }

  /**
   * @param {string} mode
   * @param {*} answerValue
   * @param {*} productValue
   * @returns {boolean}
   */
  static #ruleMatches(mode, answerValue, productValue) {
    if (answerValue == null || productValue == null) return false;

    const answerList = Array.isArray(answerValue) ? answerValue : [answerValue];
    const productList = Array.isArray(productValue) ? productValue : [productValue];

    switch (mode) {
      case 'intersect':
        // Case-insensitive, like 'equals' below — metafield values as
        // typed in Shopify admin (e.g. "Floral") won't match the
        // lowercase values used in dk-scent-quiz-config.json (e.g.
        // "floral") under a strict Array.includes() comparison, which
        // silently zeroed every product's score on this rule and forced
        // every quiz completion into the fallback products.
        return answerList.some((a) =>
          productList.some((p) => String(a).toLowerCase() === String(p).toLowerCase())
        );
      case 'equals':
        return answerList.some((a) => productList.some((p) => String(a).toLowerCase() === String(p).toLowerCase()));
      case 'equals-or-unisex':
        return answerList.some((a) =>
          productList.some(
            (p) => String(p).toLowerCase() === 'unisex' || String(a).toLowerCase() === String(p).toLowerCase()
          )
        );
      default:
        return false;
    }
  }

  /**
   * POSTs the full answer + result payload to the merchant-configured
   * webhook URL (Make.com/Zapier/n8n/etc.) — fire-and-forget, a webhook
   * failure should never block the shopper from seeing their results.
   *
   * Sends both `answers` (the merged, scoring-oriented values used to
   * rank products — scent_family/intensity/occasion/gender/path) and
   * `rawAnswers` (every step's literal selected label(s), keyed by step
   * id, including cosmeticOnly steps like "personality" that never feed
   * scoring) — so the webhook reflects exactly what the shopper clicked
   * on every question, not just the derived values.
   *
   * Uses Content-Type: text/plain rather than application/json — the
   * body is still valid JSON text, but application/json makes this a
   * CORS "non-simple" request, which forces the browser to send an
   * OPTIONS preflight first and silently drop the actual POST if the
   * receiving endpoint doesn't answer that preflight with the right
   * CORS headers (confirmed via DevTools: webhook.site returned a CORS
   * error and only the OPTIONS request ever arrived, never the POST).
   * text/plain is a CORS "simple request" and skips preflight entirely,
   * so the POST reaches any endpoint — including ones that don't handle
   * CORS preflight, which many webhook receivers (Make.com, Zapier,
   * webhook.site) don't. Parse the body as JSON on the receiving end
   * regardless of the header — the content is unchanged.
   * @param {Array<{product: Object, score: number, isFallback?: boolean}>} results
   */
  #fireWebhook(results) {
    const webhookUrl = this.dataset.webhookUrl;
    if (!webhookUrl) return;

    const payload = {
      answers: this.#answers,
      rawAnswers: this.#rawAnswers,
      results: results.map((r) => ({ id: r.product.id, handle: r.product.handle, score: r.score })),
      email: this.#answers.email,
      phone: this.#answers.phone,
      name: this.#answers.name,
      submittedAt: new Date().toISOString(),
    };

    fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(payload),
    }).catch((error) => {
      console.error('[dk-scent-quiz] Webhook submission failed', error);
    });
  }

  /**
   * Fires GA4/Meta Pixel completion events, reusing whatever gtag/fbq
   * globals the theme already loads elsewhere — this file does not load
   * or configure either script itself. dk_scent_quiz_completed is the
   * funnel's final event, paired with dk_scent_quiz_start and
   * dk_scent_quiz_step_view (fired per-step in #trackStepView) so a GA4
   * funnel exploration can show starts → each question → completions.
   * @param {Array<{product: Object, score: number, isFallback?: boolean}>} results
   */
  #fireAnalytics(results) {
    const topResult = results[0]?.product;

    ScentQuiz.#fireEvent('dk_scent_quiz_completed', {
      quiz_id: this.dataset.quizId || 'default',
      result_product_handle: topResult?.handle,
    });

    if (typeof window.fbq === 'function') {
      window.fbq('trackCustom', 'DkScentQuizCompleted', {
        result_product_handle: topResult?.handle,
      });
    }
  }

  /** @param {Array<{product: Object, score: number, isFallback?: boolean}>} [results] */
  #renderResults(results) {
    const container = this.#getStepContainer();
    container.innerHTML = '';

    if (!results || results.length === 0) {
      container.textContent = "We couldn't find a match — please try again.";
      return;
    }

    const wrap = document.createElement('div');
    wrap.className = 'dk-scent-quiz__results';

    const heading = document.createElement('h2');
    heading.className = 'dk-scent-quiz__prompt';
    heading.textContent = this.#answers.name ? `Your matches, ${this.#answers.name}` : 'Your matches';
    wrap.appendChild(heading);

    // Bundle card renders first (above the individual results grid) so
    // the combined offer is the first thing seen on the results screen.
    const bundleScript = this.querySelector('script[data-quiz-bundle]');
    if (bundleScript && results.length >= 2) {
      try {
        const bundleConfig = JSON.parse(bundleScript.textContent || 'null');
        if (bundleConfig && bundleConfig.enabled) {
          const [first, second] = results;
          wrap.appendChild(this.#renderBundleCard(first.product, second.product, bundleConfig));
        }
      } catch (error) {
        console.error('[dk-scent-quiz] Failed to parse bundle config', error);
      }
    }

    const grid = document.createElement('div');
    grid.className = 'dk-scent-quiz__results-grid';

    results.forEach(({ product }, index) => {
      const card = document.createElement('div');
      card.className = 'dk-scent-quiz__result-card';
      if (index === 0) card.classList.add('is-hero');

      if (index === 0) {
        const badge = document.createElement('span');
        badge.className = 'dk-scent-quiz__result-badge';
        badge.textContent = 'Your match';
        card.appendChild(badge);
      }

      const link = document.createElement('a');
      link.className = 'dk-scent-quiz__result-link';
      link.href = `/products/${product.handle}`;

      if (product.image) {
        const img = document.createElement('img');
        img.src = product.image;
        img.alt = product.title;
        img.loading = 'lazy';
        link.appendChild(img);
      }

      const title = document.createElement('p');
      title.className = 'dk-scent-quiz__result-title';
      title.textContent = product.title;
      link.appendChild(title);

      if (product.price) {
        const price = document.createElement('p');
        price.className = 'dk-scent-quiz__result-price';
        price.textContent = product.price;
        link.appendChild(price);
      }

      card.appendChild(link);
      card.appendChild(this.#renderAddToCartButton(product));

      grid.appendChild(card);
    });

    wrap.appendChild(grid);

    const couponScript = this.querySelector('script[data-quiz-coupon]');
    if (couponScript) {
      try {
        const coupon = JSON.parse(couponScript.textContent || 'null');
        if (coupon && coupon.code) wrap.appendChild(this.#renderCoupon(coupon));
      } catch (error) {
        console.error('[dk-scent-quiz] Failed to parse coupon data', error);
      }
    }

    container.appendChild(wrap);
  }

  /**
   * Renders a "Bundle & save" card offering the quiz's #1 and #2 scored
   * products together with a single "Add both to cart" button. Adds
   * both as separate line items via one /cart/add.js request (Shopify's
   * cart endpoint natively accepts multiple `items` in one call), then
   * — if a discount code is configured — redirects to
   * /discount/{code}?redirect=/cart so Shopify applies the discount to
   * the session and lands the shopper on their cart with both items and
   * the discount active (the same mechanism #renderCoupon's plain
   * callout link uses, just redirecting to /cart instead of a
   * collection since there's already something to check out). No
   * discount price math happens client-side — Shopify's own discount
   * engine computes the actual total.
   * @param {Object} productA
   * @param {Object} productB
   * @param {{discountCode?: string, discountAmount?: number, discountType?: 'percentage'|'fixed_amount'}} bundleConfig
   * @returns {HTMLElement}
   */
  #renderBundleCard(productA, productB, bundleConfig) {
    const card = document.createElement('div');
    card.className = 'dk-scent-quiz__bundle';

    const heading = document.createElement('p');
    heading.className = 'dk-scent-quiz__bundle-heading';
    heading.textContent = 'Bundle & save';
    card.appendChild(heading);

    const pair = document.createElement('div');
    pair.className = 'dk-scent-quiz__bundle-pair';

    [productA, productB].forEach((product, index) => {
      if (index > 0) {
        const plus = document.createElement('span');
        plus.className = 'dk-scent-quiz__bundle-plus';
        plus.setAttribute('aria-hidden', 'true');
        plus.textContent = '+';
        pair.appendChild(plus);
      }

      const item = document.createElement('div');
      item.className = 'dk-scent-quiz__bundle-item';

      if (product.image) {
        const img = document.createElement('img');
        img.src = product.image;
        img.alt = product.title;
        img.loading = 'lazy';
        item.appendChild(img);
      }

      const title = document.createElement('p');
      title.textContent = product.title;
      item.appendChild(title);

      pair.appendChild(item);
    });

    card.appendChild(pair);

    if (bundleConfig.discountCode) {
      const discountText = document.createElement('p');
      discountText.className = 'dk-scent-quiz__bundle-discount-text';
      const amountText =
        bundleConfig.discountType === 'fixed_amount'
          ? `$${bundleConfig.discountAmount} off`
          : `${bundleConfig.discountAmount}% off`;
      discountText.textContent = `Add both together and get ${amountText}`;
      card.appendChild(discountText);
    }

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'dk-scent-quiz__bundle-add-to-cart';
    const defaultLabel = 'Add both to cart';
    button.textContent = defaultLabel;

    const bothAvailable =
      productA.variantId && productA.available !== false && productB.variantId && productB.available !== false;

    if (!bothAvailable) {
      button.textContent = 'Bundle unavailable';
      button.disabled = true;
      return card;
    }

    button.addEventListener('click', async () => {
      button.disabled = true;
      button.textContent = 'Adding…';

      try {
        const response = await fetch('/cart/add.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            items: [
              { id: productA.variantId, quantity: 1 },
              { id: productB.variantId, quantity: 1 },
            ],
          }),
        });

        if (!response.ok) {
          const errorBody = await response.json().catch(() => null);
          throw new Error(errorBody?.message || `Cart add failed (${response.status})`);
        }

        const addedItems = await response.json();

        document.dispatchEvent(
          new CustomEvent('cart:update', {
            bubbles: true,
            detail: { resource: addedItems, sourceId: 'dk-scent-quiz-bundle', data: { source: 'dk-scent-quiz-bundle' } },
          })
        );

        if (bundleConfig.discountCode) {
          // Redirect so Shopify applies the discount to this session and
          // lands the shopper on their cart with both items + the
          // discount active — the cart already has both items from the
          // /cart/add.js call above.
          window.location.href = `/discount/${encodeURIComponent(bundleConfig.discountCode)}?redirect=%2Fcart`;
          return;
        }

        button.textContent = 'Added ✓';
        setTimeout(() => {
          button.textContent = defaultLabel;
          button.disabled = false;
        }, 2000);
      } catch (error) {
        console.error('[dk-scent-quiz] Bundle add to cart failed', error);
        button.textContent = 'Try again';
        button.disabled = false;
      }
    });

    card.appendChild(button);
    return card;
  }

  /**
   * Builds an "Add to cart" button for a result card that POSTs
   * directly to Shopify's cart AJAX endpoint (/cart/add.js) — no page
   * navigation needed. On success, dispatches a `cart:update` event
   * (the same event name the theme's own cart-drawer component
   * listens for — see assets/cart-drawer.js / assets/events.js
   * ThemeEvents.cartUpdate) so the site's existing cart drawer opens
   * automatically, exactly as it would from anywhere else on the site.
   * Falls back to a disabled "Sold out" state if the product has no
   * variant id or is unavailable.
   * @param {Object} product
   * @returns {HTMLElement}
   */
  #renderAddToCartButton(product) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'dk-scent-quiz__result-add-to-cart';

    if (!product.variantId || product.available === false) {
      button.textContent = 'Sold out';
      button.disabled = true;
      return button;
    }

    const defaultLabel = 'Add to cart';
    button.textContent = defaultLabel;

    button.addEventListener('click', async () => {
      button.disabled = true;
      button.textContent = 'Adding…';

      try {
        const response = await fetch('/cart/add.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ id: product.variantId, quantity: 1 }),
        });

        if (!response.ok) {
          const errorBody = await response.json().catch(() => null);
          throw new Error(errorBody?.message || `Cart add failed (${response.status})`);
        }

        const addedItem = await response.json();

        document.dispatchEvent(
          new CustomEvent('cart:update', {
            bubbles: true,
            detail: { resource: addedItem, sourceId: 'dk-scent-quiz', data: { source: 'dk-scent-quiz' } },
          })
        );

        button.textContent = 'Added ✓';
        setTimeout(() => {
          button.textContent = defaultLabel;
          button.disabled = false;
        }, 2000);
      } catch (error) {
        console.error('[dk-scent-quiz] Add to cart failed', error);
        button.textContent = 'Try again';
        button.disabled = false;
      }
    });

    return button;
  }

  /**
   * @param {{code: string, amount: number, type: 'percentage'|'fixed_amount', text: string}} coupon
   * @returns {HTMLElement}
   */
  #renderCoupon(coupon) {
    const callout = document.createElement('div');
    callout.className = 'dk-scent-quiz__coupon';

    const text = document.createElement('p');
    text.className = 'dk-scent-quiz__coupon-text';
    text.textContent = coupon.text;
    callout.appendChild(text);

    const link = document.createElement('a');
    link.className = 'dk-scent-quiz__coupon-link';
    link.href = `/discount/${encodeURIComponent(coupon.code)}?redirect=%2Fcollections%2Fall`;
    link.textContent = coupon.code;
    callout.appendChild(link);

    return callout;
  }

  /** Renders a fallback error message if the config fails to load. */
  #renderError() {
    const container = this.#getStepContainer();
    container.textContent = 'Sorry, this quiz is temporarily unavailable. Please try again later.';
  }
}

if (!customElements.get('dk-scent-quiz')) {
  customElements.define('dk-scent-quiz', ScentQuiz);
}
