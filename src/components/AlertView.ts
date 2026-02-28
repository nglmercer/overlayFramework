import { html, css, LitElement } from 'lit';
import { Component, property, query, state } from '../litcomponents';
import { AlertVariant } from '../lib/db';
import { 
  AlertRenderer, 
  AlertConfig, 
  createAlertRenderer, 
  injectAnimationStyles,
  defaultAlertConfig,
  AnimationType,
  AlertLayout
} from '../core/alertRenderer';

@Component('app-alert-view')
export class AppAlertView extends LitElement {
  @property({ type: Object }) variant?: AlertVariant;
  @property({ type: Object }) eventData: Record<string, string> = {};
  @state() private animationPhase: 'in' | 'out' | 'none' = 'none';
  
  // Query for the factory container
  @query('.alert-container') private containerRef!: HTMLDivElement;

  // AlertRenderer instance from core library
  private alertRenderer?: AlertRenderer;

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

    .hidden { opacity: 0; pointer-events: none; }
  `;

  // Initialize animation styles on first load
  static initializeStyles() {
    injectAnimationStyles();
  }

  // Method exposed to editor to trigger the preview logic
  public async playPreview() {
    if (!this.variant || !this.alertRenderer) return;
    
    // Convert AlertVariant to AlertConfig
    const config = this.buildAlertConfig();
    
    // Play preview using the core renderer
    await this.alertRenderer.playPreview(config);
    
    // Update local animation phase state for reactivity
    this.updateAnimationPhase();
  }

  // Convert AlertVariant to AlertConfig
  private buildAlertConfig(): AlertConfig {
    const v = this.variant;
    if (!v) return { ...defaultAlertConfig };
    
    return {
      animationIn: (v.animationIn as AnimationType) || 'fade-in',
      animationOut: (v.animationOut as AnimationType) || 'fade-out',
      animationInDuration: v.animationInDuration || 1,
      animationOutDuration: v.animationOutDuration || 1,
      duration: v.duration || 10,
      layout: (v.layout as AlertLayout) || 'text-below',
      bgColor: v.bgColor || '#000000',
      bgOpacity: v.bgOpacity || 0,
      padding: v.padding || 16,
      spacing: v.spacing || 16,
      rounded: v.rounded ?? true,
      shadow: v.shadow ?? false,
      message: v.message || '',
      fontFamily: v.fontFamily || 'Roboto',
      fontWeight: v.fontWeight || 'Normal',
      fontSize: v.fontSize || 24,
      textAlign: v.textAlign || 'center',
      textColor: v.textColor || '#FFFFFF',
      highlightColor: v.highlightColor || '#9146FF',
      textShadow: v.textShadow ?? true,
      imageUrl: v.imageUrl,
      imageScale: v.imageScale || 50,
      imageVolume: v.imageVolume || 50,
      soundUrl: v.soundUrl,
      soundVolume: v.soundVolume || 50,
      eventData: this.eventData,
      containerWidth: 600,
      containerHeight: 600,
    };
  }

  // Update animation phase from renderer
  private updateAnimationPhase() {
    if (this.alertRenderer) {
      // Poll for animation phase changes
      const checkPhase = () => {
        if (this.alertRenderer) {
          const phase = this.alertRenderer.getAnimationPhase();
          if (phase !== this.animationPhase) {
            this.animationPhase = phase;
          }
          if (phase !== 'none') {
            requestAnimationFrame(checkPhase);
          }
        }
      };
      requestAnimationFrame(checkPhase);
    }
  }

  // Clean up when component is disconnected from DOM
  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.alertRenderer) {
      this.alertRenderer.destroy();
      this.alertRenderer = undefined;
    }
  }

  firstUpdated() {
    // Initialize animation styles
    (this.constructor as typeof AppAlertView).initializeStyles();
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
    
    // Initialize AlertRenderer if not already done
    if (!this.alertRenderer) {
      this.alertRenderer = createAlertRenderer(container);
    }
    
    // Build alert config and render
    const config = this.buildAlertConfig();
    this.alertRenderer.render(config);
    
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
