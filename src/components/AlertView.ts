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
  
  // Query for the renderer container
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
    
    // Play preview using the core renderer (handles all animation internally)
    await this.alertRenderer.playPreview(config);
  }

  // Convert AlertVariant (DB model) to AlertConfig (core config)
  // This is the only mapping logic that should remain in the component
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

  // Update content - delegates to core AlertRenderer
  private updateContent() {
    const container = this.containerRef;
    if (!this.variant || !container) return;
    
    // Initialize AlertRenderer if not already done
    if (!this.alertRenderer) {
      this.alertRenderer = createAlertRenderer(container);
    }
    
    // Build alert config and render - core handles all styling
    const config = this.buildAlertConfig();
    this.alertRenderer.render(config);
  }

  render() {
    if (!this.variant) return html``;
    
    // Container that AlertRenderer will populate
    return html`
      <div class="alert-container"></div>
    `;
  }
}
