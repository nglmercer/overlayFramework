import { html, css, LitElement } from 'lit';
import { Component, property } from '../litcomponents';
import { AlertVariant } from '../lib/db';

@Component('app-alert-view')
export class AppAlertView extends LitElement {
  @property({ type: Object }) variant?: AlertVariant;
  @property({ type: Object }) eventData: Record<string, string> = {};

  static styles = css`
    :host {
      display: block;
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  `;

  render() {
    if (!this.variant) return html``;
    
    // Replace variables in message
    let message = this.variant.message || '';
    if (this.eventData) {
      for (const [key, value] of Object.entries(this.eventData)) {
        message = message.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
      }
    }

    return html`
      <div 
        style="
          background-color: ${this.variant.bgColor}${Math.round((this.variant.bgOpacity || 0) * 2.55).toString(16).padStart(2, '0')};
          padding: ${this.variant.padding}px;
          border-radius: ${this.variant.rounded ? '1rem' : '0'};
          text-align: ${this.variant.textAlign};
          display: flex;
          flex-direction: ${this.variant.layout === 'text-below' ? 'column' : 'row'};
          align-items: center;
          gap: ${this.variant.spacing}px;
        "
      >
        ${this.variant.imageUrl ? html`<img src="${this.variant.imageUrl}" style="width: 200px; height: 200px; object-fit: contain;" />` : html`
          <div style="width: 200px; height: 200px; background: #26262c; border-radius: 1rem; display: flex; align-items: center; justify-content: center;">
            <span style="font-size: 4rem;">❤</span>
          </div>
        `}
        <div style="
          color: ${this.variant.textColor};
          font-family: ${this.variant.fontFamily};
          font-weight: ${this.variant.fontWeight};
          font-size: ${this.variant.fontSize}px;
          text-shadow: ${this.variant.textShadow ? '2px 2px 4px rgba(0,0,0,0.5)' : 'none'};
        ">
          ${message}
        </div>
      </div>
    `;
  }
}
