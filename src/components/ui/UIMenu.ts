import { html, unsafeCSS, LitElement } from 'lit';
import { Component, property, state, query, PropertyValues, render } from '../../litcomponents';
import styles from './UIMenu.css?inline';

export interface MenuItem {
  id: string;
  label: string;
  icon?: any; // SVG or string
  danger?: boolean;
  divider?: boolean;
  onClick?: () => void;
}

@Component('ui-menu')
export class UIMenu extends LitElement {
  @property({ type: Array }) items: MenuItem[] = [];
  @state() private open = false;
  @state() private menuPosition = { top: 0, left: 0 };
  @query('.trigger') private triggerElement!: HTMLButtonElement;
  private menuContainer: HTMLDivElement | null = null;

  static styles = unsafeCSS(styles);


  private _closeMenu = () => {
    this.open = false;
    window.removeEventListener('click', this._closeMenu);
    window.removeEventListener('scroll', this._updatePosition, true);
    window.removeEventListener('resize', this._updatePosition);
    this._removeMenuFromDOM();
  };

  private _updatePosition = () => {
    if (!this.open || !this.triggerElement) return;
    const rect = this.triggerElement.getBoundingClientRect();
    this.menuPosition = {
      top: rect.bottom + window.scrollY,
      left: rect.right + window.scrollX
    };
    this.requestUpdate();
  };

  private _removeMenuFromDOM() {
    if (this.menuContainer && this.menuContainer.parentNode) {
      this.menuContainer.parentNode.removeChild(this.menuContainer);
      this.menuContainer = null;
    }
  }

  connectedCallback() {
    super.connectedCallback();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._closeMenu();
  }

  private _handleItemClick(item: MenuItem, e: Event) {
    e.stopPropagation();
    if (item.onClick) {
      item.onClick();
    }
    this.dispatchEvent(new CustomEvent('menu-click', {
      detail: item.id,
      bubbles: true,
      composed: true
    }));
    this._closeMenu();
  }

  protected updated(changedProperties: PropertyValues) {
    super.updated(changedProperties);
    if (this.open) {
      this._renderPortal();
    }
  }

  private _toggleMenu(e: Event) {
    e.stopPropagation();
    this.open = !this.open;
    if (this.open) {
      this._updatePosition();
      window.addEventListener('click', this._closeMenu);
      window.addEventListener('scroll', this._updatePosition, true);
      window.addEventListener('resize', this._updatePosition);
    } else {
      this._closeMenu();
    }
  }

  private _renderPortal() {
    if (!this.menuContainer) {
      this.menuContainer = document.createElement('div');
      this.menuContainer.id = `ui-menu-portal-${this.id || Math.random().toString(36).substr(2, 9)}`;
      document.body.appendChild(this.menuContainer);
    }

    const menuItems = this.items.map(item => {
      if (item.divider) {
        return html`<div class="divider"></div>`;
      }
      return html`
        <button 
          class="menu-item ${item.danger ? 'danger' : ''}" 
          @click="${(e: Event) => this._handleItemClick(item, e)}"
        >
          ${item.icon ? html`<span class="menu-icon">${item.icon}</span>` : ''}
          <span class="menu-label">${item.label}</span>
        </button>
      `;
    });

    const menuStyles = `
      position: absolute;
      top: ${this.menuPosition.top}px;
      left: ${this.menuPosition.left}px;
      transform: translateX(-100%) translateY(0.5rem);
      z-index: 9999;
      pointer-events: auto;
    `;

    // We need to inject the styles since it's outside our shadow DOM
    // For simplicity, we can render the same styles as the component
    render(html`
      <style>
        ${UIMenu.styles}
        .dropdown-menu-portal {
           display: block; opacity: 1; visibility: visible; transform: none;
           position: static;
        }
      </style>
      <div 
        class="dropdown-menu open dropdown-menu-portal" 
        style="${menuStyles}"
        @click="${(e: Event) => e.stopPropagation()}"
      >
        ${menuItems}
      </div>
    `, this.menuContainer);
  }

  render() {
    return html`
      <div class="menu-container">
        <button 
          class="trigger ${this.open ? 'active' : ''}" 
          @click="${this._toggleMenu}"
          aria-haspopup="true"
          aria-expanded="${this.open}"
        >
          <slot name="trigger">
            <svg style="width: 1.25rem; height: 1.25rem;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </slot>
        </button>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-menu': UIMenu;
  }
}
