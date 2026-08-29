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
 * @property {{quote: string, name: string, rating: number}} [testimonial]
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
  /** @type {Object.<string, *>} */
  #answers = {};
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
    this.#render();
  }

  /** Restores in-progress answers/step index from localStorage, if present. */
  #restoreState() {
    try {
      const raw = localStorage.getItem(this.#storageKey);
      if (!raw) return;
      const saved = JSON.parse(raw);
      this.#answers = saved.answers || {};
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
        JSON.stringify({ answers: this.#answers, currentIndex: this.#currentIndex })
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
   * Merges the `sets` object of every chosen option into #answers.
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

    if (step.testimonial) {
      const card = document.createElement('div');
      card.className = 'dk-scent-quiz__testimonial';

      if (step.testimonial.rating) {
        const stars = document.createElement('div');
        stars.className = 'dk-scent-quiz__testimonial-stars';
        stars.setAttribute('aria-hidden', 'true');
        stars.textContent = '★'.repeat(Math.round(step.testimonial.rating));
        card.appendChild(stars);
      }

      const quote = document.createElement('p');
      quote.className = 'dk-scent-quiz__testimonial-quote';
      quote.textContent = `"${step.testimonial.quote}"`;
      card.appendChild(quote);

      if (step.testimonial.name) {
        const name = document.createElement('p');
        name.className = 'dk-scent-quiz__testimonial-name';
        name.textContent = step.testimonial.name;
        card.appendChild(name);
      }

      wrap.appendChild(card);
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
    this.#renderResults(results);
  }

  /**
   * Scores every product against the collected answers using the
   * config's scoring.match rules — generic, not hardcoded per-attribute,
   * so a new rule in the config is picked up automatically.
   * @returns {Array<Object>}
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
        return answerList.some((a) => productList.includes(a));
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
   * @param {Array<Object>} results
   */
  #fireWebhook(results) {
    const webhookUrl = this.dataset.webhookUrl;
    if (!webhookUrl) return;

    const payload = {
      answers: this.#answers,
      results: results.map((r) => ({ id: r.product.id, handle: r.product.handle, score: r.score })),
      email: this.#answers.email,
      phone: this.#answers.phone,
      name: this.#answers.name,
      submittedAt: new Date().toISOString(),
    };

    fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
   * @param {Array<Object>} results
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

  /** @param {Array<Object>} [results] */
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

    const grid = document.createElement('div');
    grid.className = 'dk-scent-quiz__results-grid';

    results.forEach(({ product }, index) => {
      const card = document.createElement('a');
      card.className = 'dk-scent-quiz__result-card';
      if (index === 0) card.classList.add('is-hero');
      card.href = `/products/${product.handle}`;

      if (product.image) {
        const img = document.createElement('img');
        img.src = product.image;
        img.alt = product.title;
        img.loading = 'lazy';
        card.appendChild(img);
      }

      const title = document.createElement('p');
      title.className = 'dk-scent-quiz__result-title';
      title.textContent = product.title;
      card.appendChild(title);

      if (product.price) {
        const price = document.createElement('p');
        price.className = 'dk-scent-quiz__result-price';
        price.textContent = product.price;
        card.appendChild(price);
      }

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
