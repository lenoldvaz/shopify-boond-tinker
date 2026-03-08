import { Component } from '@theme/component';
import { trapFocus, removeTrapFocus } from '@theme/focus';
import { onAnimationEnd } from '@theme/utilities';

/**
 * A custom element that manages the main menu drawer.
 *
 * Added by DK on 2026-03-07: Rewritten to use <button>/<div> instead of <details>/<summary>
 * for the main drawer trigger. This eliminates iOS Safari native <details> toggle timing
 * issues entirely — a <button> has no built-in toggle behaviour, so iOS cannot set or remove
 * [open] out of sync with our JS. Submenus continue to use <details> elements (they work fine).
 *
 * @typedef {object} Refs
 * @property {HTMLButtonElement} toggle - The hamburger button that opens/closes the drawer.
 * @property {HTMLElement} container - The drawer container element.
 *
 * @extends {Component<Refs>}
 */
class HeaderDrawer extends Component {
  requiredRefs = ['toggle', 'container'];

  #isDrawerOpen = false;

  connectedCallback() {
    super.connectedCallback();
    this.addEventListener('keyup', this.#onKeyUp);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('keyup', this.#onKeyUp);
  }

  /** @param {KeyboardEvent} event */
  #onKeyUp = (event) => {
    if (event.key !== 'Escape') return;
    this.close();
  };

  /** @returns {boolean} */
  get isOpen() {
    return this.#isDrawerOpen;
  }

  /**
   * Return the nearest submenu <details> element that is a descendant of this component,
   * or null if the event did not originate inside a submenu.
   * @param {Event | undefined} event
   * @returns {HTMLDetailsElement | null}
   */
  #getSubmenu(event) {
    if (!(event?.target instanceof Element)) return null;
    const details = event.target.closest('details');
    return details && this.contains(details) ? /** @type {HTMLDetailsElement} */ (details) : null;
  }

  /**
   * Toggle the main menu drawer.
   * No preventDefault() needed — <button> has no native toggle behaviour.
   */
  toggle() {
    return this.isOpen ? this.close() : this.open();
  }

  /**
   * Open the closest submenu or the main drawer.
   * @param {Event} [event]
   */
  open(event) {
    const submenu = this.#getSubmenu(event);
    if (submenu) {
      this.#openSubmenu(submenu);
    } else {
      this.#openMain();
    }
  }

  /**
   * Go back — closes the nearest open submenu.
   * @param {Event} [event]
   */
  back(event) {
    const submenu = this.#getSubmenu(event);
    if (submenu) {
      this.#closeSubmenu(submenu);
    } else {
      this.close();
    }
  }

  /**
   * Close the main menu drawer.
   */
  close() {
    this.#closeMain();
  }

  #openMain() {
    this.#isDrawerOpen = true;
    this.refs.toggle.setAttribute('aria-expanded', 'true');
    document.documentElement.setAttribute('scroll-lock', '');
    requestAnimationFrame(() => this.refs.container.classList.add('menu-open'));
    trapFocus(this.refs.container);
  }

  #closeMain() {
    if (!this.#isDrawerOpen) return;
    this.#isDrawerOpen = false;
    this.refs.toggle.setAttribute('aria-expanded', 'false');
    this.refs.container.classList.remove('menu-open');
    document.documentElement.removeAttribute('scroll-lock');
    onAnimationEnd(this.refs.container, () => {
      removeTrapFocus();
      this.querySelectorAll('details[open]').forEach(resetDetails);
    });
  }

  /** @param {HTMLDetailsElement} details */
  #openSubmenu(details) {
    const summary = details.querySelector('summary');
    if (!summary) return;
    summary.setAttribute('aria-expanded', 'true');
    requestAnimationFrame(() => details.classList.add('menu-open'));
    trapFocus(details);
  }

  /** @param {HTMLDetailsElement} details */
  #closeSubmenu(details) {
    const summary = details.querySelector('summary');
    if (!summary) return;
    summary.setAttribute('aria-expanded', 'false');
    details.classList.remove('menu-open');
    onAnimationEnd(details, () => {
      resetDetails(details);
      trapFocus(this.refs.container);
    });
  }
}

if (!customElements.get('header-drawer')) {
  customElements.define('header-drawer', HeaderDrawer);
}

/**
 * Reset a submenu details element to its closed state.
 * @param {HTMLDetailsElement} element
 */
function resetDetails(element) {
  element.classList.remove('menu-open');
  element.removeAttribute('open');
  element.querySelector('summary')?.setAttribute('aria-expanded', 'false');
}
