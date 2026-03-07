import { html, css, LitElement, unsafeCSS } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { AlertVariant } from '../../lib/db';
import { LocalizeController } from '../../locales/localization';
import { EVENTS } from '../../lib/constants';
import { MenuItem } from '../ui/UIMenu';
import './property-panels';
import styles from './EditorRightSidebar.css?inline'
type PanelId = 'general' | 'typography' | 'animations' | 'design' | 'media';

@customElement('editor-right-sidebar')
export class EditorRightSidebar extends LitElement {
  static styles = css`
    :host {
      display: block;
      flex-shrink: 0;
    }
    ${unsafeCSS(styles)}
  `;

  @property({ type: Object }) variant: AlertVariant | null = null;
  @property({ type: Boolean }) randomize = false;

  @state() private _expandedSection: PanelId | null = 'general';
  @state() private _collapsed = false;
  @state() private _openMenu = false;

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
    this.dispatchEvent(new CustomEvent(EVENTS.COMPONENT.PROPERTY_CHANGE, {
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
    this.dispatchEvent(new CustomEvent(EVENTS.COMPONENT.PROPERTY_CHANGE, {
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

  private _handleCopyJson() {
    if (!this.variant) return;
    this.dispatchEvent(new CustomEvent(EVENTS.COMPONENT.COPY_VARIANT, { 
      detail: this.variant.id,
      bubbles: true, 
      composed: true 
    }));
  }

  private _handleCopyJsonDetailed() {
    if (!this.variant) return;
    this.dispatchEvent(new CustomEvent('copy-variant-detailed', { 
      detail: this.variant.id,
      bubbles: true, 
      composed: true 
    }));
  }

  private _handleMenuClick(menuItemId: string) {
    switch (menuItemId) {
      case 'duplicate':
        this._handleDuplicate();
        break;
      case 'copy-json':
        this._handleCopyJson();
        break;
      case 'copy-json-detailed':
        this._handleCopyJsonDetailed();
        break;
      case 'delete':
        this._handleDelete();
        break;
    }
  }

  private _getVariantMenuItems(): MenuItem[] {
    if (!this.variant) return [];
    return [
      {
        id: 'duplicate',
        label: this._t('variant.duplicate'),
        icon: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`,
        onClick: () => this._handleDuplicate()
      },
      {
        id: 'copy-json',
        label: this._t('variant.copyJson'),
        icon: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>`,
        onClick: () => this._handleCopyJson()
      },
      {
        id: 'copy-json-detailed',
        label: this._t('variant.copyJsonDetailed'),
        icon: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>`,
        onClick: () => this._handleCopyJsonDetailed()
      },
      { id: 'divider-1', label: '', divider: true },
      {
        id: 'delete',
        label: this._t('variant.delete'),
        danger: true,
        icon: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`,
        onClick: () => this._handleDelete()
      }
    ];
  }

  private _handleOpenMediaLibrary(type: 'image' | 'sound') {
    this.dispatchEvent(new CustomEvent(EVENTS.COMPONENT.OPEN_MEDIA_LIBRARY, {
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
            <ui-menu 
              .items="${this._getVariantMenuItems()}"
              @menu-click="${(e: CustomEvent) => this._handleMenuClick(e.detail)}"
            >
              <button 
                slot="trigger"
                class="btn-menu-trigger"
                style="width: 100%; padding: 0.5rem; background: #3a3a3d; border: none; color: white; border-radius: 0.375rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.5rem;"
              >
                <svg style="width: 1.1rem; height: 1.1rem;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
              </button>
            </ui-menu>
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
