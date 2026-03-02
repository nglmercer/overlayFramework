import { html, css, LitElement } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { AlertVariant } from '../../lib/db';
import { LocalizeController } from '../../locales/localization';
import { EVENTS } from '../../lib/constants';
import './property-panels';

type PanelId = 'general' | 'typography' | 'animations' | 'design' | 'media';

@customElement('editor-right-sidebar')
export class EditorRightSidebar extends LitElement {
  static styles = css`
    :host {
      display: block;
      flex-shrink: 0;
    }

    /* ── Sidebar Shell ── */
    .sidebar-right {
      width: 20rem;
      min-width: 20rem;
      height: 100%;
      max-height: 100%;
      border-left: 1px solid rgba(255, 255, 255, 0.1);
      background-color: #18181b;
      display: flex;
      flex-direction: column;
      overflow-y: auto;
      overflow-x: hidden;
      transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1),
                  min-width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .sidebar-right.collapsed {
      width: 2.75rem;
      min-width: 2.75rem;
    }

    /* ── Collapse toggle strip ── */
    .collapse-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.55rem 0.75rem;
      border-bottom: 1px solid rgba(255,255,255,0.08);
      flex-shrink: 0;
      min-height: 2.5rem;
    }

    .collapse-bar-label {
      font-size: 0.65rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      color: #6b7280;
      text-transform: uppercase;
      white-space: nowrap;
      overflow: hidden;
      opacity: 1;
      transition: opacity 0.2s;
    }

    .sidebar-right.collapsed .collapse-bar-label {
      opacity: 0;
      pointer-events: none;
    }

    .btn-collapse {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 1.5rem;
      height: 1.5rem;
      background: transparent;
      border: none;
      color: #6b7280;
      cursor: pointer;
      border-radius: 0.25rem;
      flex-shrink: 0;
      transition: color 0.2s, background-color 0.2s;
    }

    .btn-collapse:hover {
      background-color: rgba(255,255,255,0.07);
      color: #d1d5db;
    }

    .btn-collapse svg {
      width: 1rem;
      height: 1rem;
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    /* Right sidebar collapse icon points outward (right) when expanded */
    .sidebar-right .btn-collapse svg {
      transform: rotate(180deg);
    }

    .sidebar-right.collapsed .btn-collapse svg {
      transform: rotate(0deg);
    }

    /* ── Scrollable body (hidden when collapsed) ── */
    .sidebar-body {
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden;
      opacity: 1;
      transition: opacity 0.2s 0.05s;
    }

    .sidebar-right.collapsed .sidebar-body {
      opacity: 0;
      pointer-events: none;
    }

    /* ── Section accordion ── */
    .section {
      border-bottom: 1px solid rgba(255,255,255,0.06);
    }

    .section-btn {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.75rem 0.875rem;
      background: transparent;
      border: none;
      color: white;
      cursor: pointer;
      user-select: none;
      transition: background-color 0.15s;
      gap: 0.5rem;
    }

    .section-btn:hover {
      background-color: rgba(255, 255, 255, 0.05);
    }

    .section-btn-label {
      flex: 1;
      font-size: 0.8rem;
      font-weight: 600;
      letter-spacing: 0.02em;
      text-align: left;
    }

    .section-chevron {
      display: flex;
      align-items: center;
      color: #6b7280;
      transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1),
                  color 0.15s;
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

    /* ── Panel content ── */
    .section-content {
      overflow: hidden;
      animation: panelSlideDown 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    }

    @keyframes panelSlideDown {
      from { opacity: 0; transform: translateY(-6px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    /* ── Danger button ── */
    .btn-danger {
      width: 100%;
      padding: 0.75rem;
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.2);
      color: #ef4444;
      border-radius: 0.375rem;
      cursor: pointer;
      font-weight: 600;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
    }

    .btn-danger:hover {
      background: rgba(239, 68, 68, 0.2);
    }

    /* ── Empty state ── */
    .empty-state {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      color: #6b7280;
      padding: 2rem;
      text-align: center;
      font-size: 0.875rem;
    }

    /* ── Responsive Styles ── */
    @media (max-width: 1024px) {
      .sidebar-right {
        width: 16rem;
        min-width: 16rem;
      }
    }

    @media (max-width: 768px) {
      .sidebar-right {
        position: absolute;
        right: 0;
        top: 0;
        bottom: 0;
        width: 100%;
        max-width: 280px;
        min-width: 240px;
        z-index: 100;
        transform: translateX(0);
        transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }

      .sidebar-right.collapsed {
        transform: translateX(100%);
        width: 0;
        min-width: 0;
      }
    }
  `;

  @property({ type: Object }) variant: AlertVariant | null = null;
  @property({ type: Boolean }) randomize = false;

  @state() private _expandedSection: PanelId | null = 'general';
  @state() private _collapsed = false;

  private _localize = new LocalizeController(this);

  private _t(key: string): string {
    return this._localize.t(key);
  }

  private _panels: { id: PanelId; labelKey: string }[] = [
    { id: 'general', labelKey: 'sidebar.general' },
    { id: 'typography', labelKey: 'sidebar.typography' },
    { id: 'animations', labelKey: 'sidebar.animations' },
    { id: 'design', labelKey: 'sidebar.design' },
    { id: 'media', labelKey: 'sidebar.media' }
  ];

  private _togglePanel(panelId: PanelId) {
    // True toggle: clicking the open panel closes it
    this._expandedSection = this._expandedSection === panelId ? null : panelId;
  }

  private _toggleCollapse() {
    this._collapsed = !this._collapsed;
  }

  private _handlePropertyChange(e: CustomEvent) {
    this.dispatchEvent(new CustomEvent('property-change', {
      detail: e.detail,
      bubbles: true,
      composed: true
    }));
  }

  private _handleAnimationConfigChange(e: CustomEvent) {
    // Extract entrance and exit animation configs from the event detail
    // The event now includes both configs in a single call
    const { entrance, exit, activeTab } = e.detail;
    
    // Dispatch a single property-change event with both animation configs
    // This ensures atomic update of both animations
    this.dispatchEvent(new CustomEvent('property-change', {
      detail: { 
        field: 'animationConfigs', 
        value: { entrance, exit, updatedTab: activeTab } 
      },
      bubbles: true,
      composed: true
    }));
  }

  private _handleDuplicate() {
    if (!this.variant) return;
    this.dispatchEvent(new CustomEvent(EVENTS.COMPONENT.DUPLICATE_VARIANT, { 
      detail: this.variant.id,
      bubbles: true, 
      composed: true 
    }));
  }

  private _handleDelete() {
    if (!this.variant) return;
    this.dispatchEvent(new CustomEvent(EVENTS.COMPONENT.DELETE_VARIANT, { 
      detail: this.variant.id,
      bubbles: true, 
      composed: true 
    }));
  }

  private _handleOpenMediaLibrary(type: 'image' | 'sound') {
    this.dispatchEvent(new CustomEvent('open-media-library', {
      detail: type,
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

  render() {
    const collapsed = this._collapsed;

    if (!this.variant) {
      return html`
        <div class="sidebar-right ${collapsed ? 'collapsed' : ''}">
          <div class="collapse-bar">
            <span class="collapse-bar-label">${this._t('sidebar.properties')}</span>
            <button class="btn-collapse" @click="${this._toggleCollapse}"
                    title="${collapsed ? 'Expand' : 'Collapse'} panel">
              <!-- chevron pointing right = collapse right sidebar -->
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                   stroke-linecap="round" stroke-linejoin="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
          </div>
          <div class="sidebar-body">
            <div class="empty-state">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <path d="M9 9h6M9 12h6M9 15h4"/>
              </svg>
              ${this._t('preview.select')}
            </div>
          </div>
        </div>
      `;
    }

    return html`
      <div class="sidebar-right ${collapsed ? 'collapsed' : ''}">
        <!-- Collapse / header bar -->
        <div class="collapse-bar">
          <span class="collapse-bar-label">${this._t('sidebar.properties')}</span>
          <button class="btn-collapse" @click="${this._toggleCollapse}"
                  title="${collapsed ? 'Expand panel' : 'Collapse panel'}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                 stroke-linecap="round" stroke-linejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        </div>

        <!-- Scrollable accordion body -->
        <div class="sidebar-body custom-scrollbar">
          ${this._panels.map(panel => {
            const isOpen = this._expandedSection === panel.id;
            return html`
              <div class="section">
                <button
                  class="section-btn"
                  aria-expanded="${isOpen}"
                  @click="${() => this._togglePanel(panel.id)}"
                >
                  <span class="section-btn-label">${this._t(panel.labelKey)}</span>
                  <span class="section-chevron">${this._chevron()}</span>
                </button>

                ${isOpen ? html`<div class="section-content">${this._renderPanel(panel.id)}</div>` : ''}
              </div>
            `;
          })}

          <div style="margin-top: 1rem; padding: 0 1rem 2rem 1rem;">
            <button class="btn-danger" @click="${this._handleDelete}">
              <svg style="width: 1.1rem; height: 1.1rem;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              ${this._t('variant.delete')}
            </button>
          </div>
        </div>
      </div>
    `;
  }

  private _renderPanel(panelId: PanelId) {
    switch (panelId) {
      case 'general':
        return html`
          <property-panel-general
            .variant="${this.variant}"
            .randomize="${this.randomize}"
            @property-change="${this._handlePropertyChange}"
            @duplicate-variant="${this._handleDuplicate}"
          ></property-panel-general>
        `;
      case 'typography':
        return html`
          <property-panel-typography
            .variant="${this.variant}"
            @property-change="${this._handlePropertyChange}"
          ></property-panel-typography>
        `;
      case 'animations':
        return html`
          <property-panel-animation
            .variant="${this.variant}"
            @property-change="${this._handlePropertyChange}"
            @animation-config-change="${this._handleAnimationConfigChange}"
          ></property-panel-animation>
        `;
      case 'design':
        return html`
          <property-panel-design
            .variant="${this.variant}"
            @property-change="${this._handlePropertyChange}"
          ></property-panel-design>
        `;
      case 'media':
        return html`
          <property-panel-media
            .variant="${this.variant}"
            @property-change="${this._handlePropertyChange}"
            @open-media-library="${(e: CustomEvent) => this._handleOpenMediaLibrary(e.detail)}"
          ></property-panel-media>
        `;
      default:
        return html``;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'editor-right-sidebar': EditorRightSidebar;
  }
}
