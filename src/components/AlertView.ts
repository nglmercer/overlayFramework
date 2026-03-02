/**
 * Alert View Component
 * 
 * Renders alert variants using the core AlertRenderer.
 * Handles preview playback and content updates.
 * 
 * @module components/AlertView
 */

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

// Import constants for default values
import { ALERT_DEFAULTS, CONFIG } from '../lib/constants';

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
      animationIn: (v.animationIn as AnimationType) || ALERT_DEFAULTS.ANIMATION.IN,
      animationOut: (v.animationOut as AnimationType) || ALERT_DEFAULTS.ANIMATION.OUT,
      animationInDuration: v.animationInDuration || ALERT_DEFAULTS.ANIMATION_DURATION,
      animationOutDuration: v.animationOutDuration || ALERT_DEFAULTS.ANIMATION_DURATION,
      duration: v.duration || ALERT_DEFAULTS.DURATION,
      layout: (v.layout as AlertLayout) || ALERT_DEFAULTS.LAYOUT,
      bgColor: v.bgColor || ALERT_DEFAULTS.COLORS.BG,
      bgOpacity: v.bgOpacity || ALERT_DEFAULTS.OPACITY.BG,
      padding: v.padding || ALERT_DEFAULTS.SPACING.PADDING,
      spacing: v.spacing || ALERT_DEFAULTS.SPACING.ITEM,
      rounded: v.rounded ?? ALERT_DEFAULTS.BOX.ROUNDED,
      shadow: v.shadow ?? ALERT_DEFAULTS.BOX.SHADOW,
      message: v.message || '',
      fontFamily: v.fontFamily || ALERT_DEFAULTS.TYPOGRAPHY.FONT_FAMILY,
      fontWeight: v.fontWeight || ALERT_DEFAULTS.TYPOGRAPHY.FONT_WEIGHT,
      fontSize: v.fontSize || ALERT_DEFAULTS.TYPOGRAPHY.FONT_SIZE,
      textAlign: v.textAlign || ALERT_DEFAULTS.TYPOGRAPHY.TEXT_ALIGN,
      textColor: v.textColor || ALERT_DEFAULTS.COLORS.TEXT,
      highlightColor: v.highlightColor || ALERT_DEFAULTS.COLORS.HIGHLIGHT,
      textShadow: v.textShadow ?? true,
      imageUrl: v.imageUrl,
      imageScale: v.imageScale || ALERT_DEFAULTS.MEDIA.IMAGE_SCALE,
      imageVolume: v.imageVolume || ALERT_DEFAULTS.MEDIA.IMAGE_VOLUME,
      soundUrl: v.soundUrl,
      soundVolume: v.soundVolume || ALERT_DEFAULTS.MEDIA.SOUND_VOLUME,
      eventData: this.eventData,
      containerWidth: CONFIG.PREVIEW.DEFAULT_SIZE,
      containerHeight: CONFIG.PREVIEW.DEFAULT_SIZE,
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
