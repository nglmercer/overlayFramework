import { html, css, LitElement } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { AlertVariant } from '../../lib/db';
import { LocalizeController } from '../../locales/localization';
import './property-panels';

type PanelId = 'general' | 'typography' | 'animations' | 'design' | 'media';

@customElement('editor-right-sidebar')
export class EditorRightSidebar extends LitElement {
  static styles = css`
    :host {
      display: block;
    }
    
    .sidebar-right {
      width: 20rem;
      border-left: 1px solid rgba(255, 255, 255, 0.1);
      background-color: #18181b;
      display: flex;
      flex-direction: column;
      overflow-y: auto;
    }
    
    .section-btn {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.875rem;
      background: transparent;
      border: none;
      color: white;
      cursor: pointer;
      transition: background-color 0.2s;
    }
    
    .section-btn:hover {
      background-color: rgba(255, 255, 255, 0.05);
    }
    
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
    
    .empty-state {
      height: 100%;
      color: #9ca3af;
      padding: 2rem;
      text-align: center;
    }
  `;

  @property({ type: Object }) variant: AlertVariant | null = null;
  @property({ type: Boolean }) randomize = false;

  @state() private _expandedSection: PanelId = 'general';

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
    this._expandedSection = this._expandedSection === panelId ? this._expandedSection : panelId;
  }

  private _handlePropertyChange(e: CustomEvent) {
    this.dispatchEvent(new CustomEvent('property-change', {
      detail: e.detail,
      bubbles: true,
      composed: true
    }));
  }

  private _handleDuplicate() {
    this.dispatchEvent(new CustomEvent('duplicate-variant', { bubbles: true, composed: true }));
  }

  private _handleDelete() {
    this.dispatchEvent(new CustomEvent('delete-variant', { bubbles: true, composed: true }));
  }

  private _handleOpenMediaLibrary(type: 'image' | 'sound') {
    this.dispatchEvent(new CustomEvent('open-media-library', {
      detail: type,
      bubbles: true,
      composed: true
    }));
  }

  render() {
    if (!this.variant) {
      return html`
        <div class="sidebar-right">
          <div class="empty-state">
            ${this._t('preview.select')}
          </div>
        </div>
      `;
    }

    return html`
      <div class="sidebar-right">
        ${this._panels.map(panel => html`
          <div class="section">
            <button 
              class="section-btn" 
              @click="${() => this._togglePanel(panel.id)}"
            >
              <span style="font-weight: 600;">${this._t(panel.labelKey)}</span>
            </button>
            
            ${this._expandedSection === panel.id ? this._renderPanel(panel.id) : ''}
          </div>
        `)}
        
        <div style="margin-top: 1rem; padding: 0 1rem 2rem 1rem;">
          <button 
            class="btn-danger"
            @click="${this._handleDelete}"
          >
            <svg style="width: 1.25rem; height: 1.25rem;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            ${this._t('variant.delete')}
          </button>
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
