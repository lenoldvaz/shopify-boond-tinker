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

  // Added by DK on 2026-03-07: Track drawer open state with a private flag instead of
  // reading the DOM [open] attribute. On iOS Safari the native <details> toggle fires on
  // touchend — before the synthetic click event — so by the time toggle() runs, the DOM
  // already has [open] set and isOpen would wrongly return true, causing close() to be
  // called on every open tap (flash-and-vanish bug). The flag reflects OUR intent and is
  // immune to the iOS touchend timing difference.
  #isDrawerOpen = false;

  connectedCallback() {
    super.connectedCallback();

    this.addEventListener('keyup', this.#onKeyUp);
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
   */
  get isOpen() {
    return this.#isDrawerOpen; // Added by DK on 2026-03-07: use flag, not DOM attribute
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
   * Added by DK on 2026-03-07: Accept event so we can preventDefault() — prevents the
   * <summary> click's native <details> toggle from firing as the default action. On iOS
   * Safari, touchend already set/removed [open] before click fires, so letting the click's
   * default action run a second toggle causes [open] to be in the wrong state, hiding all
   * menu content (blank drawer). We take full ownership of [open] via open()/reset() instead.
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

    if (details === this.refs.details) {
      this.#isDrawerOpen = true; // Added by DK on 2026-03-07
      details.setAttribute('open', ''); // Added by DK on 2026-03-07: manually set [open] since preventDefault() stops native toggle
    }
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

    if (details === this.refs.details) this.#isDrawerOpen = false; // Added by DK on 2026-03-07
    summary.setAttribute('aria-expanded', 'false');
    details.classList.remove('menu-open');

    onAnimationEnd(details, () => {
      reset(details);

      if (details === this.refs.details) {
        removeTrapFocus();
        const openDetails = this.querySelectorAll('details[open]');
        openDetails.forEach(reset);
      } else {
        trapFocus(this.refs.details);
      }
    });
  }

}
// Added by DK on 2026-03-07: #setupAnimatedElementListeners removed — stagger animation removed.

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
