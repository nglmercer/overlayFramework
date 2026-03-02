import { html, css, LitElement } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { AlertVariant } from '../../lib/db';
import { PlatformEventDefinition } from '../../lib/alertEvents';
import { LocalizeController } from '../../locales/localization';
import { EVENTS } from '../../lib/constants';

@customElement('editor-left-sidebar')
export class EditorLeftSidebar extends LitElement {
  static styles = css`
    :host {
      display: block;
      flex-shrink: 0;
    }

    /* ── Shell ── */
    .sidebar-left {
      width: 20rem;
      min-width: 20rem;
      border-right: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      flex-direction: column;
      background-color: #18181b;
      overflow: hidden;
      transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1),
                  min-width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .sidebar-left.collapsed {
      width: 2.75rem;
      min-width: 2.75rem;
    }

    /* ── Header bar ── */
    .sidebar-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.55rem 0.75rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      flex-shrink: 0;
      gap: 0.5rem;
      min-height: 2.5rem;
    }

    .header-title {
      font-size: 0.65rem;
      font-weight: 700;
      color: #6b7280;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      white-space: nowrap;
      overflow: hidden;
      opacity: 1;
      transition: opacity 0.2s;
    }

    .sidebar-left.collapsed .header-title {
      opacity: 0;
      pointer-events: none;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      flex-shrink: 0;
    }

    .btn-add {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 1.5rem;
      height: 1.5rem;
      background: transparent;
      border: none;
      color: #a970ff;
      cursor: pointer;
      font-size: 1.1rem;
      border-radius: 0.25rem;
      transition: background-color 0.2s;
    }

    .btn-add:hover {
      background-color: rgba(169,112,255,0.12);
    }

    .btn-collapse {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 1.5rem;
      height: 1.5rem;
      background: transparent;
      border: none;
      color: #9ca3af;
      cursor: pointer;
      border-radius: 0.25rem;
      flex-shrink: 0;
      transition: color 0.2s, background-color 0.2s;
    }

    .btn-collapse:hover {
      background-color: rgba(255,255,255,0.1);
      color: #e5e7eb;
    }

    .btn-collapse svg {
      width: 1rem;
      height: 1rem;
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    /* Left sidebar collapse icon points outward (left) when expanded */
    .sidebar-left .btn-collapse svg {
      transform: rotate(0deg);
    }

    .sidebar-left.collapsed .btn-collapse svg {
      transform: rotate(180deg);
    }

    /* ── Scrollable body ── */
    .sidebar-body {
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden;
      opacity: 1;
      transition: opacity 0.2s 0.05s;
    }

    .sidebar-left.collapsed .sidebar-body {
      opacity: 0;
      pointer-events: none;
    }

    /* ── Accordion sections ── */
    .section {
      border-bottom: 1px solid rgba(255,255,255,0.06);
    }

    .section-btn {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      padding: 0.75rem 0.875rem;
      background: transparent;
      border: none;
      color: white;
      cursor: pointer;
      user-select: none;
      transition: background-color 0.15s;
    }

    .section-btn:hover {
      background-color: rgba(255, 255, 255, 0.05);
    }

    .section-label {
      flex: 1;
      font-weight: 600;
      font-size: 0.8rem;
      letter-spacing: 0.02em;
      text-align: left;
    }

    .section-chevron {
      display: flex;
      align-items: center;
      color: #6b7280;
      transition: transform 0.25s cubic-bezier(0.4,0,0.2,1), color 0.15s;
      flex-shrink: 0;
    }

    .section-chevron svg {
      width: 0.85rem;
      height: 0.85rem;
    }

    .section-btn[aria-expanded="true"] .section-chevron {
      transform: rotate(180deg);
      color: #a970ff;
    }

    /* ── Section content slide-down ── */
    .section-content {
      background-color: #0e0e10;
      padding: 1rem;
      animation: slideDown 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    }

    @keyframes slideDown {
      from { opacity: 0; transform: translateY(-6px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    /* ── Variant cards ── */
    .variant-card {
      background-color: transparent;
      border-radius: 0.375rem;
      padding: 0.625rem;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      cursor: pointer;
      transition: background-color 0.2s;
      margin-bottom: 0.5rem;
    }

    .variant-card.active {
      background-color: #9146FF;
      box-shadow: 0 4px 12px rgba(145,70,255,0.35);
    }

    .variant-card:not(.active):hover {
      background-color: rgba(255, 255, 255, 0.05);
    }

    /* ── Randomize toggle ── */
    .toggle {
      width: 2.5rem;
      height: 1.25rem;
      border-radius: 1.25rem;
      padding: 0.125rem;
      cursor: pointer;
      transition: background-color 0.2s;
      display: flex;
      align-items: center;
      flex-shrink: 0;
    }

    .toggle.on  { background-color: #9146FF; }
    .toggle.off { background-color: #4b5563; }

    .toggle-knob {
      width: 1rem;
      height: 1rem;
      background-color: white;
      border-radius: 50%;
      transition: transform 0.2s;
    }

    .toggle.on .toggle-knob { transform: translateX(1.25rem); }

    /* ── Responsive Styles ── */
    @media (max-width: 1024px) {
      .sidebar-left {
        width: 16rem;
        min-width: 16rem;
      }
    }

    @media (max-width: 768px) {
      .sidebar-left {
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        width: 100%;
        max-width: 280px;
        min-width: 240px;
        z-index: 100;
        transform: translateX(0);
        transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }

      .sidebar-left.collapsed {
        transform: translateX(-100%);
        width: 0;
        min-width: 0;
      }
    }
  `;

  @property({ type: Array }) variants: AlertVariant[] = [];
  @property({ type: Array }) schema: PlatformEventDefinition[] = [];
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
              console.log('[EditorLeftSidebar] + button clicked');
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
                        @click="${() => this._selectVariant(v.id)}"
                      >
                        <div style="flex: 1;">
                          <div style="font-weight: 700; font-size: 0.875rem;">${v.name}</div>
                          <div style="font-size: 0.75rem; opacity: 0.7;">${v.condition}</div>
                        </div>
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
