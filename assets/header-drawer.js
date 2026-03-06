import { Component } from '@theme/component';
import { trapFocus, removeTrapFocus } from '@theme/focus';
import { onAnimationEnd } from '@theme/utilities';

/**
 * A custom element that manages the main menu drawer.
 *
 * @typedef {object} Refs
 * @property {HTMLDetailsElement} details - The details element.
 *
 * @extends {Component<Refs>}
 */
class HeaderDrawer extends Component {
  requiredRefs = ['details'];

  connectedCallback() {
    super.connectedCallback();

    this.addEventListener('keyup', this.#onKeyUp);
    this.#setupAnimatedElementListeners();

    // Added by DK on 2026-03-05: Intercept touchend on the main summary to prevent
    // iOS Safari from toggling <details> on touchend (before the synthetic click fires).
    // preventDefault() on touchend also suppresses the click, so toggle() only runs once.
    const mainSummary = this.refs.details.querySelector(':scope > summary');
    mainSummary?.addEventListener('touchend', this.#onSummaryTouchEnd, { passive: false });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('keyup', this.#onKeyUp);

    const mainSummary = this.refs.details.querySelector(':scope > summary');
    mainSummary?.removeEventListener('touchend', this.#onSummaryTouchEnd);
  }

  // Added by DK on 2026-03-05: Touch handler that prevents native iOS details toggle
  #onSummaryTouchEnd = (event) => {
    event.preventDefault();
    this.toggle();
  };

  /**
   * Close the main menu drawer when the Escape key is pressed
   * @param {KeyboardEvent} event
   */
  #onKeyUp = (event) => {
    if (event.key !== 'Escape') return;

    this.#close(this.#getDetailsElement(event));
  };

  /**
   * @returns {boolean} Whether the main menu drawer is open
   */
  get isOpen() {
    return this.refs.details.hasAttribute('open');
  }

  /**
   * Get the closest details element to the event target
   * @param {Event | undefined} event
   * @returns {HTMLDetailsElement}
   */
  #getDetailsElement(event) {
    if (!(event?.target instanceof Element)) return this.refs.details;

    return event.target.closest('details') ?? this.refs.details;
  }

  /**
   * Toggle the main menu drawer
   * Added by DK on 2026-03-05: Accept event param and prevent native <details> toggle.
   * On iOS Safari, the native toggle fires on touchend (before the synthetic click event),
   * so isOpen is already true when toggle() runs, causing immediate close() — items flash
   * then vanish. Preventing default stops native toggle; open() sets the attribute manually.
   * @param {Event} [event]
   */
  toggle(event) {
    event?.preventDefault();
    return this.isOpen ? this.close() : this.open(event);
  }

  /**
   * Open the closest drawer or the main menu drawer
   * @param {Event} [event]
   */
  open(event) {
    const details = this.#getDetailsElement(event);
    const summary = details.querySelector('summary');

    if (!summary) return;

    // Added by DK on 2026-03-05: Manually set open attribute since native toggle is prevented
    event?.preventDefault();
    details.setAttribute('open', '');
    summary.setAttribute('aria-expanded', 'true');
    requestAnimationFrame(() => details.classList.add('menu-open'));

    trapFocus(details);
  }

  /**
   * Go back or close the main menu drawer
   * @param {Event} [event]
   */
  back(event) {
    this.#close(this.#getDetailsElement(event));
  }

  /**
   * Close the main menu drawer
   */
  close() {
    this.#close(this.refs.details);
  }

  /**
   * Close the closest menu or submenu that is open
   *
   * @param {HTMLDetailsElement} details
   */
  #close(details) {
    const summary = details.querySelector('summary');

    if (!summary) return;

    summary.setAttribute('aria-expanded', 'false');
    details.classList.remove('menu-open');

    // Added by DK on 2026-03-05: Replaced onAnimationEnd with setTimeout since stagger
    // animations were removed. onAnimationEnd waits for an animationend event which never
    // fires without item animations, so reset() would never be called (leaving the [open]
    // attribute on details, breaking the icon toggle and subsequent open/close cycles).
    // We wait for the drawer slide-out CSS transition (--drawer-animation-speed) + buffer.
    const drawerSpeedMs =
      parseFloat(getComputedStyle(this).getPropertyValue('--drawer-animation-speed')) * 1000 || 200;

    setTimeout(() => {
      reset(details);

      if (details === this.refs.details) {
        removeTrapFocus();
        const openDetails = this.querySelectorAll('details[open]');
        openDetails.forEach(reset);
      } else {
        trapFocus(this.refs.details);
      }
    }, drawerSpeedMs + 50);
  }

  /**
   * Attach animationend event listeners to all animated elements to remove will-change after animation
   * to remove the stacking context and allow submenus to be positioned correctly
   */
  #setupAnimatedElementListeners() {
    /**
     * @param {AnimationEvent} event
     */
    function removeWillChangeOnAnimationEnd(event) {
      const target = event.target;
      if (target && target instanceof HTMLElement) {
        target.style.setProperty('will-change', 'unset');
        target.removeEventListener('animationend', removeWillChangeOnAnimationEnd);
      }
    }
    const allAnimated = this.querySelectorAll('.menu-drawer__animated-element');
    allAnimated.forEach((element) => {
      element.addEventListener('animationend', removeWillChangeOnAnimationEnd);
    });
  }
}

if (!customElements.get('header-drawer')) {
  customElements.define('header-drawer', HeaderDrawer);
}

/**
 * Reset an open details element to its original state
 *
 * @param {HTMLDetailsElement} element
 */
function reset(element) {
  element.classList.remove('menu-open');
  element.removeAttribute('open');
  element.querySelector('summary')?.setAttribute('aria-expanded', 'false');
}
