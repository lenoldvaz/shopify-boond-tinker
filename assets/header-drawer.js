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

  // Added by DK on 2026-03-05: Track open state with a private flag instead of reading
  // the DOM's [open] attribute. On iOS Safari, the native <details> toggle can fire at
  // different times relative to click events, making the DOM attribute unreliable as a
  // state source. Using our own flag makes toggle() immune to that race condition.
  #isDrawerOpen = false;

  connectedCallback() {
    super.connectedCallback();

    this.addEventListener('keyup', this.#onKeyUp);
    this.#setupAnimatedElementListeners();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('keyup', this.#onKeyUp);
  }

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
   * Added by DK on 2026-03-05: Use private flag instead of DOM attribute to avoid
   * iOS Safari race condition where native <details> toggle fires before click handler.
   */
  get isOpen() {
    return this.#isDrawerOpen;
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
   * Added by DK on 2026-03-05: Use flag-based state to avoid iOS Safari race condition.
   * Added by DK on 2026-03-06: Only call preventDefault() when CLOSING.
   * On iOS, calling preventDefault() on click during OPEN causes iOS to undo the
   * touchend native toggle (which already set [open]), making the drawer invisible.
   * During CLOSE, preventDefault() keeps [open] present so the 200ms slide-out
   * CSS transition can complete before reset() removes [open].
   * @param {Event} [event]
   */
  toggle(event) {
    if (this.isOpen) {
      event?.preventDefault();
      return this.close();
    }
    return this.open(event);
  }

  /**
   * Open the closest drawer or the main menu drawer
   * @param {Event} [event]
   */
  open(event) {
    const details = this.#getDetailsElement(event);
    const summary = details.querySelector('summary');

    if (!summary) return;

    // Added by DK on 2026-03-05: Track state via flag.
    // Added by DK on 2026-03-06: Removed event.preventDefault() and manual setAttribute([open]).
    // Native <details> toggle now manages [open]:
    // - Desktop: fires as click default action after our capture-phase handler runs.
    // - iOS Safari: fires on touchend before the synthetic click, so [open] is already set.
    // Calling preventDefault() here was causing iOS to undo the touchend toggle
    // asynchronously, removing [open] after our code set it → drawer stayed invisible.
    if (details === this.refs.details) this.#isDrawerOpen = true;
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
    this.#isDrawerOpen = false;
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

    // Added by DK on 2026-03-05: Reset flag if closing main drawer (e.g. via Escape key,
    // which calls #close() directly without going through close()).
    if (details === this.refs.details) this.#isDrawerOpen = false;

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
