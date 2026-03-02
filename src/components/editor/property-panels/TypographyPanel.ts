import { html, css, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { AlertVariant } from '../../../lib/db';
import { LocalizeController } from '../../../locales/localization';

@customElement('property-panel-typography')
export class PropertyPanelTypography extends LitElement {
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

    const fontFamilyOptions = [
      { value: 'Roboto', label: 'Roboto' },
      { value: 'Inter', label: 'Inter' },
      { value: 'Arial', label: 'Arial' },
      { value: 'impact', label: 'Impact' }
    ];

    const fontWeightOptions = [
      { value: 'Normal', label: 'Normal' },
      { value: 'Bold', label: 'Bold' },
      { value: 'Lighter', label: 'Lighter' }
    ];

    const textAlignOptions = [
      { value: 'left', label: this._t('variant.alignLeft') },
      { value: 'center', label: this._t('variant.alignCenter') },
      { value: 'right', label: this._t('variant.alignRight') }
    ];

    return html`
      <div class="section-content">
        <ui-input 
          label="${this._t('variant.message')}" 
          .value="${this.variant.message}" 
          @change="${(e: CustomEvent) => this._handleChange('message', e.detail)}"
        ></ui-input>
        
        <ui-select 
          label="${this._t('variant.fontFamily')}" 
          .value="${this.variant.fontFamily}"
          .options="${fontFamilyOptions}"
          @change="${(e: CustomEvent) => this._handleChange('fontFamily', e.detail)}"
        ></ui-select>
        
        <ui-select 
          label="${this._t('variant.fontWeight')}" 
          .value="${this.variant.fontWeight}"
          .options="${fontWeightOptions}"
          @change="${(e: CustomEvent) => this._handleChange('fontWeight', e.detail)}"
        ></ui-select>
        
        <ui-select 
          label="${this._t('variant.textAlign')}" 
          .value="${this.variant.textAlign}"
          .options="${textAlignOptions}"
          @change="${(e: CustomEvent) => this._handleChange('textAlign', e.detail)}"
        ></ui-select>
        
        <ui-input 
          label="${this._t('variant.fontSize')}" 
          type="number" 
          .value="${this.variant.fontSize.toString()}" 
          @change="${(e: CustomEvent) => this._handleChange('fontSize', Number(e.detail))}"
        ></ui-input>
        
        <ui-color-picker 
          label="${this._t('variant.textColor')}" 
          .value="${this.variant.textColor}"
          @change="${(e: CustomEvent) => this._handleChange('textColor', e.detail)}"
        ></ui-color-picker>
        
        <ui-color-picker 
          label="${this._t('variant.highlightColor')}" 
          .value="${this.variant.highlightColor}"
          @change="${(e: CustomEvent) => this._handleChange('highlightColor', e.detail)}"
        ></ui-color-picker>
        
        <ui-toggle 
          label="${this._t('variant.textShadow')}" 
          .checked="${this.variant.textShadow}"
          @change="${(e: CustomEvent) => this._handleChange('textShadow', e.detail)}"
        ></ui-toggle>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'property-panel-typography': PropertyPanelTypography;
  }
}
