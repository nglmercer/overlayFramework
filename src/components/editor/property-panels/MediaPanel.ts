import { html, css, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { AlertVariant } from '../../../lib/db';
import { LocalizeController } from '../../../locales/localization';

@customElement('property-panel-media')
export class PropertyPanelMedia extends LitElement {
  static styles = css`
    :host {
      display: block;
    }

    .section-content {
      background-color: #0e0e10;
      padding: 1rem;
    }

    /* ── Current media preview strip ──────────────────── */
    .current-media {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 0.5rem;
      padding: 0.5rem 0.625rem;
      margin-bottom: 0.625rem;
      min-height: 2.25rem;
    }
    .current-media-thumb {
      width: 2rem;
      height: 2rem;
      border-radius: 0.25rem;
      object-fit: cover;
      background: #1a1a22;
      flex-shrink: 0;
    }
    .current-media-thumb.audio-thumb {
      display: flex;
      align-items: center;
      justify-content: center;
      color: #a970ff;
    }
    .current-media-name {
      flex: 1;
      font-size: 0.75rem;
      font-weight: 500;
      color: rgba(255,255,255,0.8);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .current-media-empty {
      font-size: 0.75rem;
      color: #6b7280;
      font-style: italic;
    }
    .btn-clear {
      background: transparent;
      border: none;
      color: #6b7280;
      cursor: pointer;
      padding: 0.125rem;
      display: flex;
      align-items: center;
      border-radius: 0.25rem;
      flex-shrink: 0;
      transition: color 0.15s, background 0.15s;
    }
    .btn-clear:hover { color: #f87171; background: rgba(248,113,113,0.1); }

    /* ── Buttons ─────────────────────────────────────── */
    .btn-media {
      width: 100%;
      padding: 0.5rem;
      background: #3a3a3d;
      border: none;
      color: white;
      border-radius: 0.375rem;
      cursor: pointer;
      margin-bottom: 0.5rem;
      font-size: 0.875rem;
      transition: background 0.15s;
    }
    .btn-media:hover {
      background-color: #464649;
    }

    .divider {
      height: 1px;
      background: rgba(255, 255, 255, 0.1);
      margin: 1rem 0;
    }
  `;

  @property({ type: Object }) variant: AlertVariant | null = null;

  private _localize = new LocalizeController(this);

  private _t(key: string): string {
    return this._localize.t(key);
  }

  private _handleChange(field: keyof AlertVariant, value: unknown) {
    this.dispatchEvent(new CustomEvent('property-change', {
      detail: { field, value },
      bubbles: true,
      composed: true,
    }));
  }

  private _clearImage() {
    this._handleChange('imageUrl', undefined);
    this._handleChange('imageName', undefined);
  }

  private _clearSound() {
    this._handleChange('soundUrl', undefined);
    this._handleChange('soundName', undefined);
  }

  private _openImageLibrary() {
    this.dispatchEvent(new CustomEvent('open-media-library', {
      detail: 'image',
      bubbles: true,
      composed: true,
    }));
  }

  private _openSoundLibrary() {
    this.dispatchEvent(new CustomEvent('open-media-library', {
      detail: 'sound',
      bubbles: true,
      composed: true,
    }));
  }

  // ── Render helpers ────────────────────────────────────────────────────

  private _renderImageThumb() {
    const url = this.variant?.imageUrl;
    if (!url) return html``;

    // Detect video/webm vs image
    const isVideo = url.toLowerCase().includes('.webm') || url.toLowerCase().includes('video');
    if (isVideo) {
      return html`
        <video
          class="current-media-thumb"
          src="${url}"
          muted playsinline
          style="background:#0d0d14;"
        ></video>
      `;
    }
    return html`<img class="current-media-thumb" src="${url}" alt="" />`;
  }

  private _renderCurrentImage() {
    const { variant } = this;
    const hasImage = !!(variant?.imageUrl);

    return html`
      <div class="current-media">
        ${hasImage
          ? html`
            ${this._renderImageThumb()}
            <span class="current-media-name" title="${variant!.imageName ?? variant!.imageUrl}">
              ${variant!.imageName ?? variant!.imageUrl}
            </span>
            <button class="btn-clear" @click="${this._clearImage}" title="Remove image">
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          `
          : html`<span class="current-media-empty">${this._t('media.noImageSelected') || 'No image selected'}</span>`
        }
      </div>
    `;
  }

  private _renderCurrentSound() {
    const { variant } = this;
    const hasSound = !!(variant?.soundUrl);

    return html`
      <div class="current-media">
        ${hasSound
          ? html`
            <div class="current-media-thumb audio-thumb">
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                  d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"/>
              </svg>
            </div>
            <span class="current-media-name" title="${variant!.soundName ?? variant!.soundUrl}">
              ${variant!.soundName ?? variant!.soundUrl}
            </span>
            <button class="btn-clear" @click="${this._clearSound}" title="Remove sound">
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          `
          : html`<span class="current-media-empty">${this._t('media.noSoundSelected') || 'No sound selected'}</span>`
        }
      </div>
    `;
  }

  render() {
    if (!this.variant) return html``;

    return html`
      <div class="section-content">
        <!-- Image -->
        ${this._renderCurrentImage()}
        <button class="btn-media" @click="${this._openImageLibrary}">
          ${this._t('media.changeImage')}
        </button>

        <ui-range
          label="${this._t('media.imageScale')}"
          .value="${this.variant.imageScale}"
          @change="${(e: CustomEvent) => this._handleChange('imageScale', e.detail)}"
        ></ui-range>

        <ui-range
          label="${this._t('media.imageVolume')}"
          .value="${this.variant.imageVolume}"
          @change="${(e: CustomEvent) => this._handleChange('imageVolume', e.detail)}"
        ></ui-range>

        <div class="divider"></div>

        <!-- Sound -->
        ${this._renderCurrentSound()}
        <button class="btn-media" @click="${this._openSoundLibrary}">
          ${this._t('media.changeSound')}
        </button>

        <ui-range
          label="${this._t('media.soundVolume')}"
          .value="${this.variant.soundVolume}"
          @change="${(e: CustomEvent) => this._handleChange('soundVolume', e.detail)}"
        ></ui-range>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'property-panel-media': PropertyPanelMedia;
  }
}
