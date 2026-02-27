import { html, css, LitElement } from 'lit';
import { Component, property, state } from '../litcomponents';
import { AlertVariant } from '../lib/db';
import { getLocale, setLocale, LocalizeController } from '../locales/localization';

@Component('app-alert-view')
export class AppAlertView extends LitElement {
  @property({ type: Object }) variant?: AlertVariant;
  @property({ type: Object }) eventData: Record<string, string> = {};

  @state() private animationPhase: 'in' | 'out' | 'none' = 'none';

  static styles = css`
    :host {
      display: block;
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }

    /* Keyframes */
    @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
    @keyframes fade-out { from { opacity: 1; } to { opacity: 0; } }
    
    @keyframes slide-in-up { from { transform: translateY(100px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    @keyframes slide-out-down { from { transform: translateY(0); opacity: 1; } to { transform: translateY(100px); opacity: 0; } }
    
    @keyframes zoom-in { from { transform: scale(0.5); opacity: 0; } to { transform: scale(1); opacity: 1; } }
    @keyframes zoom-out { from { transform: scale(1); opacity: 1; } to { transform: scale(0.5); opacity: 0; } }
    
    @keyframes bounce-in { 
      0% { transform: scale(0.3); opacity: 0; }
      50% { transform: scale(1.05); opacity: 1; }
      70% { transform: scale(0.9); }
      100% { transform: scale(1); }
    }
    
    /* Pre-defined animation classes mapped to state */
    .animate-in { animation-fill-mode: both; }
    .animate-out { animation-fill-mode: both; }
    
    .hidden { opacity: 0; pointer-events: none; }
  `;

  // method exposed to editor to trigger the preview logic
  public async playPreview() {
    if (!this.variant) return;
    
    // Play sound if present
    if (this.variant.soundUrl && this.variant.soundVolume !== undefined) {
      const audio = new Audio(this.variant.soundUrl);
      audio.volume = this.variant.soundVolume / 100;
      audio.play().catch(e => console.warn('Could not play test audio:', e));
    }

    // Reset and trigger In
    this.animationPhase = 'none';
    await new Promise(r => setTimeout(r, 50));
    
    this.animationPhase = 'in';

    // Trigger Out after duration
    setTimeout(() => {
      if (this.animationPhase === 'in') { // prevent race conditions
        this.animationPhase = 'out';
        
        // Hide after out animation completes
        setTimeout(() => {
          if (this.animationPhase === 'out') {
            this.animationPhase = 'none';
          }
        }, (this.variant?.animationOutDuration || 1) * 1000 + 100);
      }
    }, (this.variant.duration || 10) * 1000);
  }

  render() {
    if (!this.variant) return html``;
    
    // Replace variables in message
    let message = this.variant.message || '';
    if (this.eventData) {
      for (const [key, value] of Object.entries(this.eventData)) {
        message = message.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
      }
    }
    
    let animStyle = '';
    let visibilityClass = this.animationPhase === 'none' ? 'hidden' : '';
    
    if (this.animationPhase === 'in') {
      animStyle = `animation: ${this.variant.animationIn || 'fade-in'} ${this.variant.animationInDuration || 1}s ease-out forwards;`;
    } else if (this.animationPhase === 'out') {
      animStyle = `animation: ${this.variant.animationOut || 'fade-out'} ${this.variant.animationOutDuration || 1}s ease-in forwards;`;
    }

    return html`
      <div 
        class="${visibilityClass}"
        style="
          background-color: ${this.variant.bgColor}${Math.round((this.variant.bgOpacity || 0) * 2.55).toString(16).padStart(2, '0')};
          padding: ${this.variant.padding}px;
          border-radius: ${this.variant.rounded ? '1rem' : '0'};
          text-align: ${this.variant.textAlign};
          box-shadow: ${this.variant.shadow ? '0 10px 25px -5px rgba(0,0,0,0.5)' : 'none'};
          display: flex;
          flex-direction: ${this.variant.layout === 'text-below' ? 'column' : 'row'};
          align-items: center;
          gap: ${this.variant.spacing}px;
          ${animStyle}
        "
      >
        ${this.variant.imageUrl ? html`<img src="${this.variant.imageUrl}" style="width: ${this.variant.imageScale !== undefined ? this.variant.imageScale * 4 : 200}px; height: auto; object-fit: contain;" />` : html`
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
