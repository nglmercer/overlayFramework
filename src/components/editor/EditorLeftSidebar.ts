import { html, css, LitElement,unsafeCSS } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { consume } from '@lit/context';
import { AlertVariant } from '../../lib/db';
import { PlatformEventDefinition } from '../../lib/alertEvents';
import { platformSchemaContext } from '../../context/schemaContext';
import { LocalizeController } from '../../locales/localization';
import { EVENTS } from '../../lib/constants';
import { MenuItem } from '../ui/UIMenu';

// Import external CSS
import styles from './EditorLeftSidebar.css?inline';

@customElement('editor-left-sidebar')
export class EditorLeftSidebar extends LitElement {
  static styles = css`
    ${unsafeCSS(styles)}
    :host {
      display: block;
      flex-shrink: 0;
    }
  `;

  @property({ type: Array }) variants: AlertVariant[] = [];
  
  /**
   * Platform event schema definitions.
   * Can be passed as property or consumed from context.
   */
  @consume({ context: platformSchemaContext, subscribe: true })
  @property({ attribute: false })
  schema: PlatformEventDefinition[] = [];
  
  @property({ type: String }) selectedVariantId: string | null = null;
  @property({ type: String }) expandedSection: string | null = null;
  @property({ type: Boolean }) randomize = false;

  @state() private _collapsed = false;

  // Use getter to derive local state from property to avoid update scheduling issues
  private get _localExpandedSection(): string | null {
    return this.expandedSection ?? null;
  }

  private _localize = new LocalizeController(this);

  private _t(key: string): string {
    return this._localize.t(key);
  }

  private _toggleSection(sectionId: string) {
    const newSection = this.expandedSection === sectionId ? null : sectionId;
    this.dispatchEvent(new CustomEvent(EVENTS.COMPONENT.SECTION_CHANGE, {
      detail: newSection,
      bubbles: true,
      composed: true
    }));
  }

  private _toggleCollapse() {
    this._collapsed = !this._collapsed;
  }

  private _getVariantMenuItems(variant: AlertVariant): MenuItem[] {
    return [
      {
        id: 'duplicate',
        label: this._t('variant.duplicate'),
        icon: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`,
        onClick: () => this._handleDuplicateVariant(variant.id)
      },
      {
        id: 'copy-json',
        label: this._t('variant.copyJson'),
        icon: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>`,
        onClick: () => this._handleCopyVariant(variant.id)
      },
      { id: 'divider-1', label: '', divider: true },
      {
        id: 'delete',
        label: this._t('variant.delete'),
        danger: true,
        icon: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`,
        onClick: () => this._handleDeleteVariant(variant.id)
      }
    ];
  }

  private _handleMenuClick(variantId: string, menuItemId: string) {
    switch (menuItemId) {
      case 'duplicate':
        this._handleDuplicateVariant(variantId);
        break;
      case 'copy-json':
        this._handleCopyVariant(variantId);
        break;
      case 'delete':
        this._handleDeleteVariant(variantId);
        break;
    }
  }

  private _handleDuplicateVariant(variantId: string) {
    console.log('[EditorLeftSidebar] Duplicate variant:', variantId);
    this.dispatchEvent(new CustomEvent(EVENTS.COMPONENT.DUPLICATE_VARIANT, {
      detail: variantId,
      bubbles: true,
      composed: true
    }));
  }

  private _handleCopyVariant(variantId: string) {
    console.log('[EditorLeftSidebar] Copy variant JSON:', variantId);
    this.dispatchEvent(new CustomEvent(EVENTS.COMPONENT.COPY_VARIANT, {
      detail: variantId,
      bubbles: true,
      composed: true
    }));
  }

  private _handleDeleteVariant(variantId: string) {
    console.log('[EditorLeftSidebar] Delete variant:', variantId);
    this.dispatchEvent(new CustomEvent(EVENTS.COMPONENT.DELETE_VARIANT, {
      detail: variantId,
      bubbles: true,
      composed: true
    }));
  }
  private _chevron() {
    return html`
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
           stroke-linecap="round" stroke-linejoin="round">
        <polyline points="6 9 12 15 18 9"/>
      </svg>
    `;
  }

  private _selectVariant(variantId: string) {
    console.log('[EditorLeftSidebar] _selectVariant called:', variantId);
    this.dispatchEvent(new CustomEvent(EVENTS.COMPONENT.VARIANT_SELECT, {
      detail: variantId,
      bubbles: true,
      composed: true
    }));
  }

  private _toggleRandomize() {
    this.dispatchEvent(new CustomEvent(EVENTS.COMPONENT.RANDOMIZE_TOGGLE, {
      bubbles: true,
      composed: true
    }));
  }

  render() {
    const collapsed = this._collapsed;
    console.log('[EditorLeftSidebar] render - schema:', this.schema, 'variants:', this.variants?.length);
    return html`
      <div class="sidebar-left ${collapsed ? 'collapsed' : ''}">
        <div class="sidebar-header">
          <div class="header-actions">
            <button class="btn-collapse" @click="${this._toggleCollapse}"
                    title="${collapsed ? 'Expand sidebar' : 'Collapse sidebar'}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                   stroke-linecap="round" stroke-linejoin="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>
          </div>
          <span class="header-title">${this._t('sidebar.variants')}</span>
          <button
            class="btn-add"
            title="${this._t('variant.new')}"
            @click="${() => {
              console.log('[EditorLeftSidebar] + button clicked, dispatching CREATE_VARIANT');
              this.dispatchEvent(new CustomEvent(EVENTS.COMPONENT.CREATE_VARIANT, { bubbles: true, composed: true }));
            }}"
          >+</button>
        </div>

        <div class="sidebar-body custom-scrollbar">
          ${this.schema?.map(item => {
            const sectionVariants = this.variants.filter(v => v.type === item.id);
            const isExpanded = this._localExpandedSection === item.id;

            return html`
              <div class="section">
                <button
                  class="section-btn"
                  aria-expanded="${isExpanded}"
                  @click="${() => this._toggleSection(item.id)}"
                >
                  <span class="section-label">${this._t('event.' + item.id)}</span>
                  <span class="section-chevron">${this._chevron()}</span>
                </button>

                ${isExpanded ? html`
                  <div class="section-content">
                    ${sectionVariants.length >= 2 ? html`
                      <div style="margin-bottom: 0.875rem; display: flex; align-items: center; gap: 0.5rem;">
                        <div
                          class="toggle ${this.randomize ? 'on' : 'off'}"
                          @click="${this._toggleRandomize}"
                        >
                          <div class="toggle-knob"></div>
                        </div>
                        <span style="font-size: 0.75rem;">${this._t('variant.random')}</span>
                      </div>
                    ` : ''}

                    ${sectionVariants.map(v => html`
                      <div
                        class="variant-card ${this.selectedVariantId === v.id ? 'active' : ''}"
                        @click="${(e: Event) => { e.stopPropagation(); this._selectVariant(v.id); }}"
                      >
                        <div style="flex: 1;">
                          <div style="font-weight: 700; font-size: 0.875rem;">${v.name}</div>
                          <div style="font-size: 0.75rem; opacity: 0.7;">${v.condition}</div>
                        </div>
                        <ui-menu 
                          .items="${this._getVariantMenuItems(v)}"
                          @menu-click="${(e: CustomEvent) => this._handleMenuClick(v.id, e.detail)}"
                        >
                          <button 
                            slot="trigger"
                            class="variant-menu-trigger"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                              <circle cx="12" cy="12" r="1"></circle>
                              <circle cx="19" cy="12" r="1"></circle>
                              <circle cx="5" cy="12" r="1"></circle>
                            </svg>
                          </button>
                        </ui-menu>
                      </div>
                    `)}
                  </div>
                ` : ''}
              </div>
            `;
          })}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'editor-left-sidebar': EditorLeftSidebar;
  }
}
