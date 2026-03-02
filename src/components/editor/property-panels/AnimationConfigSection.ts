import { html, css, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import {
  AnimationConfig,
  AnimationType,
  Direction,
  Easing,
  animationTypeOptions,
  directionOptions,
  easingOptions,
} from '../../../schemas/animation-schemas';

/**
 * Sub-component for configuring individual animation properties
 */
@customElement('animation-config-section')
export class AnimationConfigSection extends LitElement {
  static styles = css`
    :host {
      display: block;
    }

    .config-section {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .config-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.75rem;
    }

    .config-row.triple {
      grid-template-columns: 1fr 1fr 1fr;
    }

    .config-row.quad {
      grid-template-columns: 1fr 1fr 1fr 1fr;
    }

    .section-label {
      color: #8b8b8e;
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 0.5rem;
    }

    .section-group {
      background-color: #1a1a1d;
      padding: 0.75rem;
      border-radius: 4px;
    }

    .divider {
      height: 1px;
      background-color: #2a2a2e;
      margin: 0.5rem 0;
    }
  `;

  @property({ type: Object }) config: AnimationConfig | null = null;
  @property({ type: String }) label: string = 'Animation';

  /**
   * Handle individual property changes
   */
  private _handleChange(property: keyof AnimationConfig, value: unknown) {
    if (!this.config) return;

    const updatedConfig = {
      ...this.config,
      [property]: value,
    };

    this.dispatchEvent(new CustomEvent('config-change', {
      detail: updatedConfig,
      bubbles: true,
      composed: true,
    }));
  }

  /**
   * Get animation type options as UI-select compatible format
   */
  private get _typeOptions() {
    return animationTypeOptions.map(opt => ({
      value: opt.value,
      label: opt.label,
    }));
  }

  /**
   * Get direction options as UI-select compatible format
   */
  private get _directionOptions() {
    return directionOptions.map(opt => ({
      value: opt.value,
      label: opt.label,
    }));
  }

  /**
   * Get easing options as UI-select compatible format
   */
  private get _easingOptions() {
    return easingOptions.map(opt => ({
      value: opt.value,
      label: opt.label,
    }));
  }

  render() {
    if (!this.config) return html``;

    return html`
      <div class="config-section">
        <!-- Basic Settings -->
        <div class="section-group">
          <div class="section-label">Basic Settings</div>
          <div class="config-row">
            <ui-select 
              label="Type" 
              .value="${this.config.type}"
              .options="${this._typeOptions}"
              @change="${(e: CustomEvent) => this._handleChange('type', e.detail)}"
            ></ui-select>
            
            <ui-select 
              label="Direction" 
              .value="${this.config.direction}"
              .options="${this._directionOptions}"
              @change="${(e: CustomEvent) => this._handleChange('direction', e.detail)}"
            ></ui-select>
          </div>
          
          <div class="config-row">
            <ui-select 
              label="Easing" 
              .value="${this.config.easing}"
              .options="${this._easingOptions}"
              @change="${(e: CustomEvent) => this._handleChange('easing', e.detail)}"
            ></ui-select>
            
            <ui-input 
              label="Duration (ms)" 
              type="number" 
              .value="${this.config.duration.toString()}"
              @change="${(e: CustomEvent) => this._handleChange('duration', Number(e.detail))}"
            ></ui-input>
          </div>
        </div>

        <!-- Timing -->
        <div class="section-group">
          <div class="section-label">Timing</div>
          <div class="config-row">
            <ui-input 
              label="Delay (ms)" 
              type="number" 
              .value="${this.config.delay.toString()}"
              @change="${(e: CustomEvent) => this._handleChange('delay', Number(e.detail))}"
            ></ui-input>
          </div>
        </div>

        <!-- Transform Properties -->
        <div class="section-group">
          <div class="section-label">Transform</div>
          <div class="config-row">
            <ui-input 
              label="Distance (px)" 
              type="number" 
              .value="${this.config.distance.toString()}"
              @change="${(e: CustomEvent) => this._handleChange('distance', Number(e.detail))}"
            ></ui-input>
            
            <ui-input 
              label="Scale" 
              type="number" 
              step="0.1"
              .value="${this.config.scale.toString()}"
              @change="${(e: CustomEvent) => this._handleChange('scale', Number(e.detail))}"
            ></ui-input>
          </div>
          
          <div class="config-row">
            <ui-input 
              label="Rotate (deg)" 
              type="number" 
              .value="${this.config.rotate.toString()}"
              @change="${(e: CustomEvent) => this._handleChange('rotate', Number(e.detail))}"
            ></ui-input>
            
            <ui-input 
              label="Opacity" 
              type="number" 
              step="0.1"
              min="0"
              max="1"
              .value="${this.config.opacity.toString()}"
              @change="${(e: CustomEvent) => this._handleChange('opacity', Number(e.detail))}"
            ></ui-input>
          </div>
        </div>

        <!-- Effects -->
        <div class="section-group">
          <div class="section-label">Effects</div>
          <div class="config-row">
            <ui-input 
              label="Blur (px)" 
              type="number" 
              .value="${this.config.blur.toString()}"
              @change="${(e: CustomEvent) => this._handleChange('blur', Number(e.detail))}"
            ></ui-input>
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'animation-config-section': AnimationConfigSection;
  }
}
