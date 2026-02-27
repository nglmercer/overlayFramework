import { html, css, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { AlertVariant } from '../../../lib/db';
import { LocalizeController } from '../../../locales/localization';

@customElement('property-panel-design')
export class PropertyPanelDesign extends LitElement {
  static styles = css`
    :host {
      display: block;
    }
    
    .section-content {
      background-color: #0e0e10;
      padding: 1rem;
    }
  `;

  @property({ type: Object }) variant: AlertVariant | null = null;

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

  render() {
    if (!this.variant) return html``;

    const layoutOptions = [
      { value: 'text-below', label: this._t('variant.layout.textBelow') },
      { value: 'text-right', label: this._t('variant.layout.textRight') }
    ];

    return html`
      <div class="section-content">
        <ui-select 
          label="${this._t('variant.layout')}" 
          .value="${this.variant.layout}"
          .options="${layoutOptions}"
          @change="${(e: CustomEvent) => this._handleChange('layout', e.detail)}"
        ></ui-select>
        
        <ui-color-picker 
          label="${this._t('variant.bgColor')}" 
          .value="${this.variant.bgColor}"
          @change="${(e: CustomEvent) => this._handleChange('bgColor', e.detail)}"
        ></ui-color-picker>
        
        <ui-range 
          label="${this._t('variant.bgOpacity')}" 
          .value="${this.variant.bgOpacity}"
          @change="${(e: CustomEvent) => this._handleChange('bgOpacity', e.detail)}"
        ></ui-range>
        
        <ui-input 
          label="${this._t('variant.padding')}" 
          type="number" 
          .value="${this.variant.padding.toString()}" 
          @change="${(e: CustomEvent) => this._handleChange('padding', Number(e.detail))}"
        ></ui-input>
        
        <ui-input 
          label="${this._t('variant.spacing')}" 
          type="number" 
          .value="${this.variant.spacing.toString()}" 
          @change="${(e: CustomEvent) => this._handleChange('spacing', Number(e.detail))}"
        ></ui-input>
        
        <div style="display: flex; flex-direction: column; gap: 1rem; margin-top: 0.5rem;">
          <ui-toggle 
            label="${this._t('variant.rounded')}" 
            .checked="${this.variant.rounded}"
            @change="${(e: CustomEvent) => this._handleChange('rounded', e.detail)}"
          ></ui-toggle>
          
          <ui-toggle 
            label="${this._t('variant.shadow')}" 
            .checked="${this.variant.shadow}"
            @change="${(e: CustomEvent) => this._handleChange('shadow', e.detail)}"
          ></ui-toggle>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'property-panel-design': PropertyPanelDesign;
  }
}
