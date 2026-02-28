import { html, css, LitElement, nothing } from 'lit';
import { Component, property, query, state } from '../litcomponents';
import { AlertVariant } from '../lib/db';
import { getLocale, setLocale, LocalizeController } from '../locales/localization';
import { Renderer } from '../core/renderer';

@Component('app-alert-view')
export class AppAlertView extends LitElement {
  @property({ type: Object }) variant?: AlertVariant;
  @property({ type: Object }) eventData: Record<string, string> = {};
  @state() private animationPhase: 'in' | 'out' | 'none' = 'none';
  
  // Query for the factory container
  @query('.alert-container') private containerRef!: HTMLDivElement;

  // Renderer instance
  private renderer?: Renderer;

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
    
    // Clean up any existing audio first
    this.cleanupMedia();
    
    // Dispatch event for sound playback (handled by parent/editor)
    if (this.variant.soundUrl && this.variant.soundVolume !== undefined) {
      this.dispatchEvent(new CustomEvent('play-sound', {
        detail: {
          url: this.variant.soundUrl,
          volume: this.variant.soundVolume / 100
        },
        bubbles: true,
        composed: true
      }));
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

  // Clean up media elements (audio/video)
  private cleanupMedia() {
    // Dispatch event to stop sound (handled by parent/editor)
    this.dispatchEvent(new CustomEvent('stop-sound', {
      bubbles: true,
      composed: true
    }));
    
    // Clean up any video elements in the container
    const container = this.containerRef;
    if (container) {
      const videos = container.querySelectorAll('video');
      videos.forEach(video => {
        video.pause();
        video.src = '';
        video.load();
      });
    }
  }

  // Clean up when component is disconnected from DOM
  disconnectedCallback() {
    super.disconnectedCallback();
    this.cleanupMedia();
  }

  // Build template data for renderer
  private buildTemplateData(message: string): any {
    if (!this.variant) return null;

    const elements: any[] = [];
    
    // Add media element if imageUrl exists
    if (this.variant.imageUrl) {
      elements.push({
        id: 'alert-media',
        name: 'Alert Media',
        type: 'multimedia' as const,
        x: 0,
        y: 0,
        width: this.variant.imageScale !== undefined ? this.variant.imageScale * 4 : 200,
        height: 'auto' as const,
        position: 'relative' as const,
        rotation: 0,
        opacity: 1,
        zIndex: 0,
        visible: true,
        url: this.variant.imageUrl,
        autoPlay: true,
        volume: this.variant.imageVolume ?? 100,
        loop: false,
        muted: false,
        objectFit: 'contain' as const,
      });
    }
    
    // Add text element
    elements.push({
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
      zIndex: 1,
      visible: true,
      content: message,
      fontSize: this.variant.fontSize,
      fontFamily: this.variant.fontFamily,
      fontWeight: this.variant.fontWeight,
      color: this.variant.textColor,
      textAlign: this.variant.textAlign,
      textShadow: this.variant.textShadow ? '2px 2px 4px rgba(0,0,0,0.5)' : undefined,
    });

    return {
      id: 'alert-template',
      name: 'Alert Template',
      width: '100%',
      height: '100%',
      backgroundColor: 'transparent',
      elements,
    };
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
    const container = this.containerRef;
    if (!this.variant || !container) return;
    
    // Replace variables in message
    let message = this.variant.message || '';
    if (this.eventData) {
      for (const [key, value] of Object.entries(this.eventData)) {
        message = message.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
      }
    }
    
    // Build template data
    const templateData = this.buildTemplateData(message);
    if (!templateData) return;
    
    // Initialize or update renderer
    if (!this.renderer) {
      this.renderer = new Renderer(container);
    }
    
    // Render using the Renderer class
    this.renderer.render(templateData);
    
    // Apply animation phase
    this.applyAnimationPhase();
  }

  private applyAnimationPhase() {
    const container = this.containerRef;
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
        class="alert-container ${this.animationPhase === 'none' ? 'hidden' : ''}"
      ></div>
    `;
  }
}
