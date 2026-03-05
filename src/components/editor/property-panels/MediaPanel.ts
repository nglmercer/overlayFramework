import { html, css, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { AlertVariant } from '../../../lib/db';
import { LocalizeController } from '../../../locales/localization';
import { mediaRegistry } from '../../../core/mediaRegistry';
import { normalizeMediaUrl } from '../../../lib/config';

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

    /* ── Section label ───────────────────────────────────── */
    .section-label {
      font-size: 0.75rem;
      font-weight: 600;
      color: rgba(255,255,255,0.6);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 0.5rem;
    }
    .section-description {
      font-size: 0.7rem;
      color: rgba(255,255,255,0.4);
      margin-bottom: 0.5rem;
      line-height: 1.3;
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
    .current-media-thumb.video-thumb {
      display: flex;
      align-items: center;
      justify-content: center;
      color: #4ade80;
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

  // Helper to detect if URL is a video file
  private _isVideo(url: string | undefined): boolean {
    if (!url) return false;
    const lowerUrl = url.toLowerCase();
    return lowerUrl.includes('.webm') || 
           lowerUrl.includes('.mp4') || 
           lowerUrl.includes('.mov') ||
           lowerUrl.includes('video');
  }

  // Helper to detect if URL is an audio file
  private _isAudio(url: string | undefined): boolean {
    if (!url) return false;
    const lowerUrl = url.toLowerCase();
    return lowerUrl.includes('.mp3') || 
           lowerUrl.includes('.wav') || 
           lowerUrl.includes('.ogg') ||
           lowerUrl.includes('.flac') ||
           lowerUrl.includes('audio') ||
           (!this._isVideo(url) && !lowerUrl.includes('.png') && !lowerUrl.includes('.jpg') && !lowerUrl.includes('.jpeg') && !lowerUrl.includes('.gif') && !lowerUrl.includes('.webp'));
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

    const isVideo = this._isVideo(url);
    if (isVideo) {
      return html`
        <div class="current-media-thumb video-thumb">
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
          </svg>
        </div>
      `;
    }
    return html`<img class="current-media-thumb" src="${mediaRegistry.resolve(url)}" alt="" />`;
  }

  private _renderCurrentImage() {
    const { variant } = this;
    const hasImage = !!(variant?.imageUrl);
    const imageUrl = variant?.imageUrl;
    const isVideo = this._isVideo(imageUrl);

    return html`
      <div class="section-label">${this._t('media.visualLabel')}</div>
      <div class="section-description">
        ${isVideo 
          ? html`${this._t('media.videoFramesOnly')} ${this._t('media.forVideoWithAudio')}` 
          : this._t('media.visualDescription')}
      </div>
      <div class="current-media">
        ${hasImage
          ? html`
            ${this._renderImageThumb()}
            <span class="current-media-name" title="${variant!.imageName ?? normalizeMediaUrl(variant!.imageUrl)}">
              ${variant!.imageName ?? normalizeMediaUrl(variant!.imageUrl)}
            </span>
            <button class="btn-clear" @click="${this._clearImage}" title="${this._t('dialog.remove') || 'Remove'}">
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          `
          : html`<span class="current-media-empty">${this._t('media.noVisualSelected')}</span>`
        }
      </div>
    `;
  }

  private _renderCurrentSound() {
    const { variant } = this;
    const hasSound = !!(variant?.soundUrl);
    const soundUrl = variant?.soundUrl;
    const isVideo = this._isVideo(soundUrl);
    const isAudio = this._isAudio(soundUrl);

    return html`
      <div class="section-label">${this._t('media.soundLabel')}</div>
      <div class="section-description">
        ${isVideo 
          ? html`${this._t('media.videoAudioOnly')} ${this._t('media.forVisualWithAudio')}` 
          : isAudio 
            ? this._t('media.audioOnly')
            : this._t('media.soundDescription')}
      </div>
      <div class="current-media">
        ${hasSound
          ? html`
            <div class="current-media-thumb audio-thumb">
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                  d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"/>
              </svg>
            </div>
            <span class="current-media-name" title="${variant!.soundName ?? normalizeMediaUrl(variant!.soundUrl)}">
              ${variant!.soundName ?? normalizeMediaUrl(variant!.soundUrl)}
            </span>
            <button class="btn-clear" @click="${this._clearSound}" title="${this._t('dialog.remove') || 'Remove'}">
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          `
          : html`<span class="current-media-empty">${this._t('media.noAudioSelected')}</span>`
        }
      </div>
    `;
  }

  render() {
    if (!this.variant) return html``;

    const imageUrl = this.variant.imageUrl;
    const soundUrl = this.variant.soundUrl;
    const isImageVideo = this._isVideo(imageUrl);
    const isSoundVideo = this._isVideo(soundUrl);
    const isSoundAudio = this._isAudio(soundUrl);

    // Show image volume only if image is a video (images don't have volume)
    const showImageVolume = isImageVideo;
    // Show sound volume if sound is audio OR video (both have audio)
    const showSoundVolume = isSoundAudio || isSoundVideo;

    return html`
      <div class="section-content">
        <!-- Visual (Image/Video) -->
        ${this._renderCurrentImage()}
        <button class="btn-media" @click="${this._openImageLibrary}">
          ${this._t('media.changeVisual')}
        </button>

        <ui-range
          label="${this._t('media.visualScale')}"
          .value="${this.variant.imageScale}"
          @change="${(e: CustomEvent) => this._handleChange('imageScale', e.detail)}"
        ></ui-range>

        ${showImageVolume ? html`
          <ui-range
            label="${this._t('media.imageVolume')}"
            .value="${this.variant.imageVolume}"
            @change="${(e: CustomEvent) => this._handleChange('imageVolume', e.detail)}"
          ></ui-range>
        ` : html`
          <div class="section-description" style="margin-top: -0.25rem; margin-bottom: 0.75rem;">
            ${this._t('media.volumeNotAvailable')}
          </div>
        `}

        <div class="divider"></div>

        <!-- Sound (Audio/Video) -->
        ${this._renderCurrentSound()}
        <button class="btn-media" @click="${this._openSoundLibrary}">
          ${this._t('media.changeAudio')}
        </button>

        ${showSoundVolume ? html`
          <ui-range
            label="${this._t('media.soundVolume')}"
            .value="${this.variant.soundVolume}"
            @change="${(e: CustomEvent) => this._handleChange('soundVolume', e.detail)}"
          ></ui-range>
        ` : html`
          <div class="section-description" style="margin-top: -0.25rem;">
            ${this._t('media.selectAudioOrVideo')}
          </div>
        `}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'property-panel-media': PropertyPanelMedia;
  }
}
