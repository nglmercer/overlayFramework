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
  @property({ type: Boolean, reflect: true }) open = false;
  @state() private menuPosition = { top: 0, left: 0, openToLeft: false, openUpward: false };
  @query('.trigger') private triggerElement!: HTMLButtonElement;
  private menuContainer: HTMLDivElement | null = null;

  static styles = unsafeCSS(styles);


  private _closeMenu = () => {
    this.open = false;
    window.removeEventListener('click', this._closeMenu);
    window.removeEventListener('scroll', this._updatePosition, true);
    window.removeEventListener('resize', this._updatePosition);
    window.removeEventListener('ui-menu-open', this._handleOtherMenuOpen);
    this._removeMenuFromDOM();
  };

  private _handleOtherMenuOpen = (e: any) => {
    if (e.detail !== this) {
      this._closeMenu();
    }
  };

  private _updatePosition = () => {
    if (!this.open || !this.triggerElement) return;
    const rect = this.triggerElement.getBoundingClientRect();
    
    // Get the menu element for accurate width
    const menuEl = this.menuContainer?.querySelector('.dropdown-menu-portal') as HTMLElement;
    const menuWidth = menuEl?.offsetWidth || 180;
    const menuHeight = menuEl?.offsetHeight || 200;
    
    // Calculate available space on both sides
    const spaceRight = window.innerWidth - rect.right;
    const spaceLeft = rect.left;
    const spaceBottom = window.innerHeight - rect.bottom;
    const spaceTop = rect.top;
    
    // Determine vertical position (above or below)
    let top = rect.bottom;
    let openUpward = false;
    
    // If not enough space below and more space above
    if (spaceBottom < menuHeight && spaceTop > spaceBottom) {
      openUpward = true;
      top = rect.top;
    }
    
    // Determine horizontal position
    // Default: align left edge of menu with left edge of trigger
    let openToLeft = false;
    let left = rect.left;
    
    // If it doesn't fit on the right, align right edge of menu with right edge of trigger
    if (spaceRight < menuWidth && spaceLeft > (menuWidth - rect.width)) {
      openToLeft = true;
      left = rect.right;
    }
    
    this.menuPosition = {
      top: top + window.scrollY,
      left: left + window.scrollX,
      openToLeft,
      openUpward
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
      
      // If we just opened, we might need to re-calculate position with actual dimensions
      // after the first render of the portal
      if (changedProperties.has('open')) {
        // Use requestAnimationFrame to ensure the DOM has been updated and sized
        requestAnimationFrame(() => this._updatePosition());
      }
    }
  }

  private _toggleMenu(e: Event) {
    this.open = !this.open;
    if (this.open) {
      this._updatePosition();
      
      // Notify other menus to close
      window.dispatchEvent(new CustomEvent('ui-menu-open', { detail: this }));
      window.addEventListener('ui-menu-open', this._handleOtherMenuOpen);

      // Delay adding the close listener to prevent immediate closure
      setTimeout(() => {
        window.addEventListener('click', this._closeMenu);
      }, 0);
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

    const baseTransform = `translateX(${this.menuPosition.openToLeft ? '-100%' : '0'}) translateY(${this.menuPosition.openUpward ? '-100%' : '0'}) translateY(${this.menuPosition.openUpward ? '-0.5rem' : '0.5rem'})`;
    const enterOffset = this.menuPosition.openUpward ? '5px' : '-5px';
    const transformOrigin = `${this.menuPosition.openToLeft ? 'right' : 'left'} ${this.menuPosition.openUpward ? 'bottom' : 'top'}`;

    render(html`
      <style>
        ${UIMenu.styles}
        /* Use !important to ensure portal positioning overrides any base CSS */
        div.dropdown-menu-portal {
           display: block !important; 
           opacity: 1 !important; 
           visibility: visible !important; 
           position: absolute !important;
           top: ${this.menuPosition.top}px !important;
           left: ${this.menuPosition.left}px !important;
           right: auto !important;
           margin: 0 !important;
           z-index: 9999 !important;
           pointer-events: auto !important;
           transform-origin: ${transformOrigin} !important;
           --base-transform: ${baseTransform};
           --enter-offset: ${enterOffset};
           animation: menuEnter 0.2s cubic-bezier(0.23, 1, 0.32, 1) forwards !important;
        }
        
        @keyframes menuEnter {
          from { 
            opacity: 0; 
            transform: var(--base-transform) scale(0.95) translateY(var(--enter-offset));
          }
          to { 
            opacity: 1; 
            transform: var(--base-transform) scale(1) translateY(0);
          }
        }

        .menu-icon svg {
          width: 100%;
          height: 100%;
          display: block;
        }
      </style>
      <div 
        class="dropdown-menu open dropdown-menu-portal" 
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
