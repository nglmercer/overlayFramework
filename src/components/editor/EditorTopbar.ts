import { html, css, LitElement } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { getLocale, setLocale, LocalizeController } from '../../locales/localization';

@customElement('editor-topbar')
export class EditorTopbar extends LitElement {
  static styles = css`
    :host {
      display: block;
    }
    
    .topbar {
      height: 3.5rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 1rem;
      background-color: #18181b;
      flex-shrink: 0;
    }
    
    .btn-back {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;
      font-weight: 600;
      background-color: #3a3a3d;
      color: white;
      padding: 0.375rem 0.75rem;
      border-radius: 9999px;
      border: none;
      cursor: pointer;
      transition: background-color 0.2s;
    }
    
    .btn-back:hover {
      background-color: #464649;
    }

    .btn-preview-url {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;
      font-weight: 600;
      background-color: #2563eb;
      color: white;
      padding: 0.375rem 0.75rem;
      border-radius: 9999px;
      border: none;
      cursor: pointer;
      transition: background-color 0.2s;
    }
    
    .btn-preview-url:hover {
      background-color: #1d4ed8;
    }

    .btn-preview-url:disabled {
      background-color: #4b5563;
      cursor: not-allowed;
    }

    .preview-url-container {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .preview-url-input {
      background: #3a3a3d;
      color: white;
      border: 1px solid #4b5563;
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
      font-size: 0.75rem;
      width: 200px;
      -webkit-text-security: disc;
      text-security: disc;
    }

    .preview-url-input.visible {
      -webkit-text-security: none;
      text-security: none;
    }

    .btn-copy {
      background: #4b5563;
      color: white;
      border: none;
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
      cursor: pointer;
      font-size: 0.75rem;
    }

    .btn-copy:hover {
      background-color: #6b7280;
    }
    
    .locale-select {
      background: #3a3a3d;
      color: white;
      border: none;
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
      cursor: pointer;
      font-size: 0.875rem;
    }

    /* ── Responsive Styles ── */
    @media (max-width: 768px) {
      .topbar {
        padding: 0 0.5rem;
      }

      .btn-back span {
        display: none;
      }

      .btn-back::before {
        content: '←';
      }

      .topbar > div:nth-child(2) {
        font-size: 0.875rem;
        max-width: 120px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }
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
          ${this.previewUrl ? html`
            <div class="preview-url-container">
              <input 
                class="preview-url-input ${this.urlVisible ? 'visible' : ''}" 
                type="text" 
                .value="${this.previewUrl}" 
                readonly
              />
              <button class="btn-copy" @click="${this._handleToggleVisibility}">${this.urlVisible ? '🙈' : '👁️'}</button>
              <button class="btn-copy" @click="${this._handleCopyUrl}">Copy</button>
            </div>
          ` : html`
            <input
              class="preview-url-input ${this.urlVisible ? 'visible' : ''}"
              type="text"
              placeholder="Generate preview URL..."
            />
            <button class="btn-copy" @click="${this._handleToggleVisibility}">${this.urlVisible ? '🙈' : '👁️'}</button>
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
