import { html, css, LitElement } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { AlertVariant } from '../../../lib/db';
import { LocalizeController } from '../../../locales/localization';
import {
  AnimationConfig,
  defaultAnimationConfig,
} from '../../../schemas/animation-schemas';

// Import sub-components
import './AnimationConfigSection';

/**
 * Property panel for animation configuration
 * Uses the new schema-based AnimationConfig for entrance and exit animations
 */
@customElement('property-panel-animation')
export class PropertyPanelAnimation extends LitElement {
  static styles = css`
    :host {
      display: block;
    }
    
    .section-content {
      background-color: #0e0e10;
      padding: 1rem;
      overflow-y: auto;
    }

    .tab-container {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }

    .tab-button {
      flex: 1;
      padding: 0.5rem 1rem;
      background-color: #1a1a1d;
      border: 1px solid #2a2a2e;
      color: #8b8b8e;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .tab-button:hover {
      background-color: #252528;
    }

    .tab-button.active {
      background-color: #2a2a2e;
      color: #ffffff;
      border-color: #6366f1;
    }
  `;

  @property({ type: Object }) variant: AlertVariant | null = null;
  @state() private _activeTab: 'entrance' | 'exit' = 'entrance';
  @state() private _entranceConfig: AnimationConfig = { ...defaultAnimationConfig };
  @state() private _exitConfig: AnimationConfig = { ...defaultAnimationConfig };

  private _localize = new LocalizeController(this);

  private _t(key: string): string {
    return this._localize.t(key);
  }

  /**
   * Initialize configs from variant
   */
  connectedCallback() {
    super.connectedCallback();
    this._initFromVariant();
  }

  /**
   * Update when variant changes
   */
  willUpdate(changedProperties: Map<string, unknown>) {
    if (changedProperties.has('variant') && this.variant) {
      this._initFromVariant();
    }
  }

  private _initFromVariant() {
    if (!this.variant) return;

    // Use new schema-based config if available, otherwise use defaults
    if (this.variant.entranceAnimation) {
      this._entranceConfig = this.variant.entranceAnimation;
    } else {
      // Fallback to legacy values
      this._entranceConfig = {
        ...defaultAnimationConfig,
        duration: this.variant.animationInDuration || 300,
      };
    }

    if (this.variant.exitAnimation) {
      this._exitConfig = this.variant.exitAnimation;
    } else {
      // Fallback to legacy values
      this._exitConfig = {
        ...defaultAnimationConfig,
        duration: this.variant.animationOutDuration || 300,
      };
    }
  }

  /**
   * Handle tab switch
   */
  private _switchTab(tab: 'entrance' | 'exit') {
    this._activeTab = tab;
  }

  /**
   * Handle property change from child components
   * Only update the config for the active tab, preserving the other tab's state
   */
  private _handleConfigChange(config: AnimationConfig) {
    const previousActiveTab = this._activeTab;
    
    // Update the config for the currently active tab
    if (this._activeTab === 'entrance') {
      this._entranceConfig = config;
    } else {
      this._exitConfig = config;
    }
    
    // Get the current values for BOTH tabs to ensure we send complete data
    const entrance = this._entranceConfig;
    const exit = this._exitConfig;
    
    // Dispatch event with full animation config
    this.dispatchEvent(new CustomEvent('animation-config-change', {
      detail: {
        entrance,
        exit,
        activeTab: previousActiveTab,
      },
      bubbles: true,
      composed: true,
    }));
  }

  /**
   * Get current config based on active tab
   */
  private get _currentConfig(): AnimationConfig {
    return this._activeTab === 'entrance' ? this._entranceConfig : this._exitConfig;
  }

  render() {
    if (!this.variant) return html``;

    return html`
      <div class="section-content">
        <!-- Tab Navigation -->
        <div class="tab-container">
          <button 
            class="tab-button ${this._activeTab === 'entrance' ? 'active' : ''}"
            @click="${() => this._switchTab('entrance')}"
          >
            ${this._t('variant.anim.entrance') || 'Entrance'}
          </button>
          <button 
            class="tab-button ${this._activeTab === 'exit' ? 'active' : ''}"
            @click="${() => this._switchTab('exit')}"
          >
            ${this._t('variant.anim.exit') || 'Exit'}
          </button>
        </div>

        <!-- Animation Config Section -->
        <animation-config-section
          .config="${this._currentConfig}"
          .label="${this._activeTab === 'entrance' 
            ? (this._t('variant.anim.entranceConfig') || 'Entrance Animation') 
            : (this._t('variant.anim.exitConfig') || 'Exit Animation')}"
          @config-change="${(e: CustomEvent) => this._handleConfigChange(e.detail)}"
        ></animation-config-section>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'property-panel-animation': PropertyPanelAnimation;
  }
}
