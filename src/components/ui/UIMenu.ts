import { html, unsafeCSS, LitElement } from 'lit';
import { Component, property, state } from '../../litcomponents';
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

  static styles = unsafeCSS(styles);

  private _toggleMenu(e: Event) {
    e.stopPropagation();
    this.open = !this.open;
    if (this.open) {
      window.addEventListener('click', this._closeMenu);
    }
  }

  private _closeMenu = () => {
    this.open = false;
    window.removeEventListener('click', this._closeMenu);
  };

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

        <div class="dropdown-menu ${this.open ? 'open' : ''}">
          ${this.items.map(item => {
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
          })}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-menu': UIMenu;
  }
}
