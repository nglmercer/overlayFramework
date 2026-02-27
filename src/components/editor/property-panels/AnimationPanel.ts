import { html, css, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { AlertVariant } from '../../../lib/db';
import { LocalizeController } from '../../../locales/localization';

@customElement('property-panel-animation')
export class PropertyPanelAnimation extends LitElement {
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

    const animationInOptions = [
      { value: 'fade-in', label: this._t('variant.anim.fadeIn') },
      { value: 'slide-in-up', label: this._t('variant.anim.slideInUp') },
      { value: 'zoom-in', label: this._t('variant.anim.zoomIn') },
      { value: 'bounce-in', label: this._t('variant.anim.bounceIn') }
    ];

    const animationOutOptions = [
      { value: 'fade-out', label: this._t('variant.anim.fadeOut') },
      { value: 'slide-out-down', label: this._t('variant.anim.slideOutDown') },
      { value: 'zoom-out', label: this._t('variant.anim.zoomOut') }
    ];

    return html`
      <div class="section-content">
        <ui-select 
          label="${this._t('variant.animIn')}" 
          .value="${this.variant.animationIn}"
          .options="${animationInOptions}"
          @change="${(e: CustomEvent) => this._handleChange('animationIn', e.detail)}"
        ></ui-select>
        
        <ui-input 
          label="${this._t('variant.animInDuration')}" 
          type="number" 
          .value="${this.variant.animationInDuration.toString()}" 
          @change="${(e: CustomEvent) => this._handleChange('animationInDuration', Number(e.detail))}"
        ></ui-input>
        
        <ui-select 
          label="${this._t('variant.animOut')}" 
          .value="${this.variant.animationOut}"
          .options="${animationOutOptions}"
          @change="${(e: CustomEvent) => this._handleChange('animationOut', e.detail)}"
        ></ui-select>
        
        <ui-input 
          label="${this._t('variant.animOutDuration')}" 
          type="number" 
          .value="${this.variant.animationOutDuration.toString()}" 
          @change="${(e: CustomEvent) => this._handleChange('animationOutDuration', Number(e.detail))}"
        ></ui-input>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'property-panel-animation': PropertyPanelAnimation;
  }
}
