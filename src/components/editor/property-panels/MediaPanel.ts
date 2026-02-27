import { html, css, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { AlertVariant } from '../../../lib/db';

@customElement('property-panel-media')
export class PropertyPanelMedia extends LitElement {
  static styles = css`
    :host {
      display: block;
    }
    
    .section-content {
      background-color: #0e0e10;
      padding: 1rem;
    }
    
    .btn-media {
      width: 100%;
      padding: 0.5rem;
      background: #3a3a3d;
      border: none;
      color: white;
      border-radius: 0.375rem;
      cursor: pointer;
      margin-bottom: 0.5rem;
    }
    
    .btn-media:hover {
      background-color: #464649;
    }
    
    .divider {
      height: 1px;
      background: rgba(255, 255, 255, 0.1);
      margin: 1rem 0;
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

  private _openImageLibrary() {
    this.dispatchEvent(new CustomEvent('open-media-library', {
      detail: 'image',
      bubbles: true,
      composed: true
    }));
  }

  private _openSoundLibrary() {
    this.dispatchEvent(new CustomEvent('open-media-library', {
      detail: 'sound',
      bubbles: true,
      composed: true
    }));
  }

  render() {
    if (!this.variant) return html``;

    return html`
      <div class="section-content">
        <button 
          class="btn-media"
          @click="${this._openImageLibrary}"
        >
          ${this.t('media.changeImage')}
        </button>
        
        <ui-range 
          label="${this.t('media.imageScale')}" 
          .value="${this.variant.imageScale}" 
          @change="${(e: CustomEvent) => this._handleChange('imageScale', e.detail)}"
        ></ui-range>
        
        <ui-range 
          label="${this.t('media.imageVolume')}" 
          .value="${this.variant.imageVolume}" 
          @change="${(e: CustomEvent) => this._handleChange('imageVolume', e.detail)}"
        ></ui-range>
        
        <div class="divider"></div>
        
        <button 
          class="btn-media"
          @click="${this._openSoundLibrary}"
        >
          ${this.t('media.changeSound')}
        </button>
        
        <ui-range 
          label="${this.t('media.soundVolume')}" 
          .value="${this.variant.soundVolume}" 
          @change="${(e: CustomEvent) => this._handleChange('soundVolume', e.detail)}"
        ></ui-range>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'property-panel-media': PropertyPanelMedia;
  }
}
