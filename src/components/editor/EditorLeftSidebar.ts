import { html, css, LitElement } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { AlertVariant } from '../../lib/db';
import { PlatformEventDefinition } from '../../lib/alertEvents';
import { LocalizeController } from '../../locales/localization';

@customElement('editor-left-sidebar')
export class EditorLeftSidebar extends LitElement {
  static styles = css`
    :host {
      display: block;
    }
    
    .sidebar-left {
      width: 20rem;
      border-right: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      flex-direction: column;
      background-color: #18181b;
      overflow-y: auto;
    }
    
    .sidebar-header {
      padding: 1rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }
    
    .sidebar-header span {
      font-size: 0.75rem;
      font-weight: 700;
      color: #9ca3af;
      letter-spacing: 0.05em;
    }
    
    .btn-add {
      background: transparent;
      border: none;
      color: #a970ff;
      cursor: pointer;
      font-size: 1.25rem;
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
    
    .section-content {
      background-color: #0e0e10;
      padding: 1rem;
    }
    
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
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
    }
    
    .variant-card:not(.active):hover {
      background-color: rgba(255, 255, 255, 0.05);
    }
    
    .toggle {
      width: 2.5rem;
      height: 1.25rem;
      border-radius: 1.25rem;
      padding: 0.125rem;
      cursor: pointer;
      transition: background-color 0.2s;
      display: flex;
      align-items: center;
    }
    
    .toggle.on {
      background-color: #9146FF;
    }
    
    .toggle.off {
      background-color: #4b5563;
    }
    
    .toggle-knob {
      width: 1rem;
      height: 1rem;
      background-color: white;
      border-radius: 50%;
      transition: transform 0.2s;
    }
    
    .toggle.on .toggle-knob {
      transform: translateX(1.25rem);
    }
  `;

  @property({ type: Array }) variants: AlertVariant[] = [];
  @property({ type: Array }) schema: PlatformEventDefinition[] = [];
  @property({ type: String }) selectedVariantId: string | null = null;
  @property({ type: String }) expandedSection: string | null = null;
  @property({ type: Boolean }) randomize = false;

  @state() private _localExpandedSection: string | null = null;

  private _localize = new LocalizeController(this);

  updated(changedProperties: Map<string, unknown>) {
    if (changedProperties.has('expandedSection')) {
      this._localExpandedSection = this.expandedSection;
    }
  }

  private _t(key: string): string {
    return this._localize.t(key);
  }

  private _toggleSection(sectionId: string) {
    this._localExpandedSection = this._localExpandedSection === sectionId ? null : sectionId;
    this.dispatchEvent(new CustomEvent('section-change', {
      detail: this._localExpandedSection,
      bubbles: true,
      composed: true
    }));
  }

  private _selectVariant(variantId: string) {
    this.dispatchEvent(new CustomEvent('variant-select', {
      detail: variantId,
      bubbles: true,
      composed: true
    }));
  }

  private _toggleRandomize() {
    this.dispatchEvent(new CustomEvent('randomize-toggle', {
      bubbles: true,
      composed: true
    }));
  }

  render() {
    return html`
      <div class="sidebar-left">
        <div class="sidebar-header">
          <span>${this._t('sidebar.variants')}</span>
          <button class="btn-add" @click="${() => this.dispatchEvent(new CustomEvent('create-variant', { bubbles: true, composed: true }))}">+</button>
        </div>
        
        ${this.schema?.map(item => {
          const sectionVariants = this.variants.filter(v => v.type === item.id);
          const isExpanded = this._localExpandedSection === item.id;
          
          return html`
            <div class="section">
              <button 
                class="section-btn" 
                @click="${() => this._toggleSection(item.id)}"
              >
                <span style="font-weight: 600; font-size: 0.875rem;">${this._t('event.' + item.id)}</span>
                <span>${isExpanded ? '▲' : '▼'}</span>
              </button>
              
              ${isExpanded ? html`
                <div class="section-content">
                  ${sectionVariants.length >= 2 ? html`
                    <div style="margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
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
                        <div style="font-size: 0.75rem; opacity: 0.8;">${v.condition}</div>
                      </div>
                    </div>
                  `)}
                </div>
              ` : ''}
            </div>
          `;
        })}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'editor-left-sidebar': EditorLeftSidebar;
  }
}
