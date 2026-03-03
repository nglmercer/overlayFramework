import { html, css, LitElement,unsafeCSS } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { getLocale, setLocale, LocalizeController } from '../../locales/localization';
import styles from './EditorTopbar.css?inline';

@customElement('editor-topbar')
export class EditorTopbar extends LitElement {
  static styles = css`
    :host {
      display: block;
    }
    ${unsafeCSS(styles)}
  `;

  @property({ type: String }) title = '';
  @property({ type: String }) backLabel = '';
  @property({ type: Function }) onBack: () => void = () => {};
  @property({ type: Function }) onGetPreviewUrl: () => Promise<string | null> = async () => null;
  @property({ type: String }) boxId = '';
  @property({ type: Boolean }) autoPreview = false;
  @property({ type: String }) set previewUrl(value: string) {
    const oldValue = this._previewUrl;
    if (oldValue !== value) {
      this._previewUrl = value;
      this.requestUpdate('previewUrl', oldValue);
    }
  }
  get previewUrl(): string {
    return this._previewUrl;
  }
  @state() private _previewUrl = '';
  @state() private isGeneratingUrl = false;
  @state() private urlVisible = false;

  private _localize = new LocalizeController(this);

  // React to boxId changes to auto-generate preview URL
  willUpdate(changedProperties: Map<string, unknown>) {
    if (changedProperties.has('boxId') && this.boxId && this.onGetPreviewUrl && !this._previewUrl) {
      // Auto-generate when boxId is set and no URL exists yet
      setTimeout(() => {
        this._handleGetPreviewUrl();
      }, 500);
    }
  }

  firstUpdated() {
    // Auto-generate preview URL if autoPreview is enabled and boxId is set
    if (this.autoPreview && this.boxId && this.onGetPreviewUrl) {
      setTimeout(() => {
        this._handleGetPreviewUrl();
      }, 1000); // Small delay to ensure parent is ready
    }
  }

  private _t(key: string): string {
    return this._localize.t(key);
  }

  private _handleLocaleChange(e: Event) {
    const select = e.target as HTMLSelectElement;
    setLocale(select.value);
    this.requestUpdate();
  }

  private async _handleGetPreviewUrl() {
    // Prevent multiple simultaneous requests
    if (this.isGeneratingUrl || this._previewUrl) {
      return;
    }
    
    this.isGeneratingUrl = true;
    try {
      const url = await this.onGetPreviewUrl();
      if (url) {
        this._previewUrl = url;
      }
    } catch (error) {
      console.error('Failed to get preview URL:', error);
    } finally {
      this.isGeneratingUrl = false;
    }
  }

  private _handleCopyUrl() {
    if (this._previewUrl) {
      navigator.clipboard.writeText(this._previewUrl);
    }
  }

  private _handleToggleVisibility() {
    this.urlVisible = !this.urlVisible;
  }

  private _handleRefreshUrl() {
    this._previewUrl = '';
    this._handleGetPreviewUrl();
  }


  render() {
    return html`
      <div class="topbar">
        <button class="btn-back" @click="${this.onBack}">
          <span>← ${this._t('app.back')}</span>
        </button>
        <div style="font-weight: 700;">${this.title || this._t('app.editor')}</div>
        <div style="display: flex; align-items: center; gap: 1rem;">
          ${this._previewUrl ? html`
            <div class="preview-url-container">
              <input 
                class="preview-url-input ${this.urlVisible ? 'visible' : ''}" 
                type="text" 
                .value="${this._previewUrl}" 
                readonly
              />
              <button class="btn-copy" @click="${this._handleToggleVisibility}">${this.urlVisible ? '🙈' : '👁️'}</button>
              <button class="btn-copy" @click="${this._handleCopyUrl}">Copy</button>
              <button class="btn-copy" @click="${this._handleRefreshUrl}" title="Regenerate">↻</button>
            </div>
          ` : html`
            <button 
              class="btn-preview-url" 
              @click="${this._handleGetPreviewUrl}"
              ?disabled="${this.isGeneratingUrl}"
            >
              ${this.isGeneratingUrl ? 'Generating...' : 'Get Preview URL'}
            </button>
          `}
          <select 
            class="locale-select"
            @change="${this._handleLocaleChange}"
            .value="${getLocale()}"
          >
            <option value="es">Español</option>
            <option value="en">English</option>
          </select>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'editor-topbar': EditorTopbar;
  }
}
