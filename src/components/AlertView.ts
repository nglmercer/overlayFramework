import { html, css, LitElement, nothing } from 'lit';
import { Component, property, state } from '../litcomponents';
import { AlertVariant } from '../lib/db';
import { getLocale, setLocale, LocalizeController } from '../locales/localization';
import { ElementFactory } from '../core/renderer/factory';
import { Ref, ref } from 'lit/directives/ref.js';

@Component('app-alert-view')
export class AppAlertView extends LitElement {
  @property({ type: Object }) variant?: AlertVariant;
  @property({ type: Object }) eventData: Record<string, string> = {};
  @state() private animationPhase: 'in' | 'out' | 'none' = 'none';
  
  // Ref for the factory container
  private containerRef: Ref<HTMLDivElement> = ref();

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
    
    // Apply animation phase
    this.applyAnimationPhase();

    // Trigger Out after duration
    setTimeout(() => {
      if (this.animationPhase === 'in') { // prevent race conditions
        this.animationPhase = 'out';
        
        // Apply animation phase
        this.applyAnimationPhase();
        
        // Hide after out animation completes
        setTimeout(() => {
          if (this.animationPhase === 'out') {
            this.animationPhase = 'none';
            this.applyAnimationPhase();
          }
        }, (this.variant?.animationOutDuration || 1) * 1000 + 100);
      }
    }, (this.variant.duration || 10) * 1000);
  }

  // Create image element using factory
  private createImageElement(): HTMLElement {
    if (!this.variant?.imageUrl) {
      // Return default placeholder
      const placeholder = document.createElement('div');
      placeholder.style.width = '200px';
      placeholder.style.height = '200px';
      placeholder.style.background = '#26262c';
      placeholder.style.borderRadius = '1rem';
      placeholder.style.display = 'flex';
      placeholder.style.alignItems = 'center';
      placeholder.style.justifyContent = 'center';
      placeholder.innerHTML = '<span style="font-size: 4rem;">❤</span>';
      return placeholder;
    }
    
    const imageData = {
      id: 'alert-image',
      name: 'Alert Image',
      type: 'image' as const,
      x: 0,
      y: 0,
      width: this.variant.imageScale !== undefined ? this.variant.imageScale * 4 : 200,
      height: 'auto',
      position: 'relative' as const,
      rotation: 0,
      opacity: 1,
      zIndex: 0,
      visible: true,
      url: this.variant.imageUrl,
      volume: 100,
      loop: false,
      objectFit: 'contain' as const,
    };
    
    const img = ElementFactory.create(imageData);
    img.style.width = `${imageData.width}px`;
    img.style.height = 'auto';
    
    return img;
  }

  // Create text element using factory
  private createTextElement(message: string): HTMLElement {
    if (!this.variant) return document.createElement('div');
    
    const textData = {
      id: 'alert-text',
      name: 'Alert Text',
      type: 'text' as const,
      x: 0,
      y: 0,
      width: 'auto',
      height: 'auto',
      position: 'relative' as const,
      rotation: 0,
      opacity: 1,
      zIndex: 0,
      visible: true,
      content: message,
      fontSize: this.variant.fontSize,
      fontFamily: this.variant.fontFamily,
      fontWeight: this.variant.fontWeight,
      color: this.variant.textColor,
      textAlign: this.variant.textAlign,
      textShadow: this.variant.textShadow ? '2px 2px 4px rgba(0,0,0,0.5)' : undefined,
    };
    
    return ElementFactory.create(textData);
  }

  firstUpdated() {
    this.updateContent();
  }

  updated(changedProperties: Map<string, unknown>) {
    if (changedProperties.has('variant') || changedProperties.has('eventData')) {
      this.updateContent();
    }
  }

  private updateContent() {
    const container = this.containerRef.value;
    if (!this.variant || !container) return;
    
    // Clear existing content
    container.innerHTML = '';
    
    // Replace variables in message
    let message = this.variant.message || '';
    if (this.eventData) {
      for (const [key, value] of Object.entries(this.eventData)) {
        message = message.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
      }
    }
    
    // Create and append image
    const imageEl = this.createImageElement();
    container.appendChild(imageEl);
    
    // Create and append text
    const textEl = this.createTextElement(message);
    container.appendChild(textEl);
    
    // Apply animation phase
    this.applyAnimationPhase();
  }

  private applyAnimationPhase() {
    const container = this.containerRef.value;
    if (!this.variant || !container) return;
    
    let animStyle = '';
    const visibilityClass = this.animationPhase === 'none' ? 'hidden' : '';
    
    if (this.animationPhase === 'in') {
      animStyle = `animation: ${this.variant.animationIn || 'fade-in'} ${this.variant.animationInDuration || 1}s ease-out forwards;`;
    } else if (this.animationPhase === 'out') {
      animStyle = `animation: ${this.variant.animationOut || 'fade-out'} ${this.variant.animationOutDuration || 1}s ease-in forwards;`;
    }
    
    container.className = visibilityClass;
    container.style.cssText += animStyle;
  }

  render() {
    if (!this.variant) return html``;
    
    // Render with a container that will hold factory-created elements
    return html`
      <div 
        ${this.containerRef}
        class="${this.animationPhase === 'none' ? 'hidden' : ''}"
      ></div>
    `;
  }
}
