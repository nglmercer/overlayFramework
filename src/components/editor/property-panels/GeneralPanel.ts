import { html, css, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { AlertVariant } from '../../../lib/db';
import { LocalizeController } from '../../../locales/localization';

@customElement('property-panel-general')
export class PropertyPanelGeneral extends LitElement {
  static styles = css`
    :host {
      display: block;
    }
    
    .section-content {
      background-color: #0e0e10;
      padding: 1rem;
    }
    
    .btn-duplicate {
      width: 100%;
      padding: 0.5rem;
      background: #3a3a3d;
      border: none;
      color: white;
      border-radius: 0.375rem;
      cursor: pointer;
      margin-bottom: 0.75rem;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
    }
    
    .btn-duplicate:hover {
      background-color: #464649;
    }
    
    .divider {
      height: 1px;
      background: rgba(255, 255, 255, 0.1);
      margin: 1rem 0;
    }
  `;

  @property({ type: Object }) variant: AlertVariant | null = null;
  @property({ type: Boolean }) randomize = false;

  private _localize = new LocalizeController(this);

  private _t(key: string): string {
    return this._localize.t(key);
  }

  private _handleChange(field: keyof AlertVariant, value: unknown) {
    this.dispatchEvent(new CustomEvent('property-change', {
      detail: { field, value },
      bubbles: true,
      composed: true
    }));
  }

  private _handleDuplicate() {
    this.dispatchEvent(new CustomEvent('duplicate-variant', { bubbles: true, composed: true }));
  }

  render() {
    if (!this.variant) return html``;

    const probabilityOptions = [
      { value: 'always', label: this._t('variant.prob.always') },
      { value: 'common', label: this._t('variant.prob.common') },
      { value: 'rare', label: this._t('variant.prob.rare') },
      { value: 'epic', label: this._t('variant.prob.epic') }
    ];

    return html`
      <div class="section-content">
        <ui-input 
          label="${this._t('variant.name')}" 
          .value="${this.variant.name}" 
          @change="${(e: CustomEvent) => this._handleChange('name', e.detail)}"
        ></ui-input>
        
        ${this.randomize ? html`
          <button 
            class="btn-duplicate"
            @click="${this._handleDuplicate}"
          >
            <svg style="width: 1.25rem; height: 1.25rem;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
            </svg>
            ${this._t('variant.duplicate')}
          </button>
          
          <ui-select 
            label="${this._t('variant.probability')}" 
            .value="${this.variant.probability || 'always'}"
            .options="${probabilityOptions}"
            @change="${(e: CustomEvent) => this._handleChange('probability', e.detail)}"
          ></ui-select>
        ` : ''}

        <ui-input 
          label="${this._t('variant.duration')}" 
          type="number" 
          .value="${this.variant.duration.toString()}" 
          @change="${(e: CustomEvent) => this._handleChange('duration', Number(e.detail))}"
        ></ui-input>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'property-panel-general': PropertyPanelGeneral;
  }
}
