import { html, css, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { AlertVariant } from '../../../lib/db';

@customElement('property-panel-general')
export class PropertyPanelGeneral extends LitElement {
  static styles = css`
    :host {
      display: block;
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
  @property({ type: Function }) t: (key: string) => string = (key) => key;

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
      { value: 'always', label: this.t('variant.prob.always') },
      { value: 'common', label: this.t('variant.prob.common') },
      { value: 'rare', label: this.t('variant.prob.rare') },
      { value: 'epic', label: this.t('variant.prob.epic') }
    ];

    return html`
      <div class="section-content">
        <ui-input 
          label="${this.t('variant.name')}" 
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
            ${this.t('variant.duplicate')}
          </button>
          
          <ui-select 
            label="${this.t('variant.probability')}" 
            .value="${this.variant.probability || 'always'}"
            .options="${probabilityOptions}"
            @change="${(e: CustomEvent) => this._handleChange('probability', e.detail)}"
          ></ui-select>
        ` : ''}

        <ui-input 
          label="${this.t('variant.duration')}" 
          type="number" 
          .value="${this.variant.duration.toString()}" 
          @change="${(e: CustomEvent) => this._handleChange('duration', Number(e.detail))}"
        ></ui-input>

        <ui-toggle 
          label="${this.t('variant.customHtml')}" 
          .checked="${!!this.variant.customHtmlEnabled}"
          @change="${(e: CustomEvent) => this._handleChange('customHtmlEnabled', e.detail)}"
        ></ui-toggle>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'property-panel-general': PropertyPanelGeneral;
  }
}
