import { html, css, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { AlertVariant } from '../../../lib/db';

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
  @property({ type: Function }) t: (key: string) => string = (key) => key;

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
      { value: 'fade-in', label: this.t('variant.anim.fadeIn') },
      { value: 'slide-in-up', label: this.t('variant.anim.slideInUp') },
      { value: 'zoom-in', label: this.t('variant.anim.zoomIn') },
      { value: 'bounce-in', label: this.t('variant.anim.bounceIn') }
    ];

    const animationOutOptions = [
      { value: 'fade-out', label: this.t('variant.anim.fadeOut') },
      { value: 'slide-out-down', label: this.t('variant.anim.slideOutDown') },
      { value: 'zoom-out', label: this.t('variant.anim.zoomOut') }
    ];

    return html`
      <div class="section-content">
        <ui-select 
          label="${this.t('variant.animIn')}" 
          .value="${this.variant.animationIn}"
          .options="${animationInOptions}"
          @change="${(e: CustomEvent) => this._handleChange('animationIn', e.detail)}"
        ></ui-select>
        
        <ui-input 
          label="${this.t('variant.animInDuration')}" 
          type="number" 
          .value="${this.variant.animationInDuration.toString()}" 
          @change="${(e: CustomEvent) => this._handleChange('animationInDuration', Number(e.detail))}"
        ></ui-input>
        
        <ui-select 
          label="${this.t('variant.animOut')}" 
          .value="${this.variant.animationOut}"
          .options="${animationOutOptions}"
          @change="${(e: CustomEvent) => this._handleChange('animationOut', e.detail)}"
        ></ui-select>
        
        <ui-input 
          label="${this.t('variant.animOutDuration')}" 
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
