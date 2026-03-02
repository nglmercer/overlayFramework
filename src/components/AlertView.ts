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
  variantToAlertConfig,
  createAlertConfig,
} from '../core/alertRenderer';

// Import constants for default values
import { CONFIG } from '../lib/constants';

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

  // Method exposed to editor to trigger the preview logic
  public async playPreview() {
    if (!this.variant || !this.alertRenderer) return;
    
    // Build config and play preview using the core renderer
    const config = this.buildAlertConfig();
    await this.alertRenderer.playPreview(config);
  }

  /**
   * Build AlertConfig from variant using core library mapper
   */
  private buildAlertConfig(): AlertConfig {
    const containerWidth = CONFIG.PREVIEW.DEFAULT_SIZE;
    const containerHeight = CONFIG.PREVIEW.DEFAULT_SIZE;
    
    if (!this.variant) {
      return createAlertConfig({}, { containerWidth, containerHeight });
    }
    
    // Use the core library mapper for proper type-safe conversion
    return variantToAlertConfig(
      this.variant, 
      this.eventData,
      { containerWidth, containerHeight }
    );
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
