import { html, LitElement, css } from 'lit';
import { Component, property, state } from '../../litcomponents';
import type { FileItem } from '../../api/client';
import { createBrowserClient } from '../../api/client';

const apiClient = createBrowserClient({ baseUrl: 'http://localhost:39769' });

/**
 * MediaLibraryItem — a single card in the MediaLibrary grid.
 *
 * Handles its own audio playback state so multiple cards can coexist
 * cleanly; the parent stops all audio when a new card is selected.
 *
 * Events emitted:
 *  - ml-select  (detail: { item: FileItem })
 *  - ml-delete  (detail: { id: string, event: Event })
 */
@Component('media-library-item')
export class MediaLibraryItem extends LitElement {
  @property({ type: Object }) item!: FileItem;
  @property({ type: Boolean }) selected = false;

  @state() private isPlaying = false;

  private audio: HTMLAudioElement | null = null;

  static styles = css`
    :host {
      display: block;
    }

    .item {
      background: rgba(255,255,255,0.04);
      border-radius: 0.625rem;
      padding: 0.875rem;
      cursor: pointer;
      border: 2px solid transparent;
      transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
      position: relative;
      height: 100%;
      box-sizing: border-box;
    }
    .item.selected {
      border-color: #a970ff;
      background: rgba(169,112,255,0.08);
      box-shadow: 0 0 0 3px rgba(169,112,255,0.2);
    }
    .item:hover:not(.selected) {
      border-color: rgba(255,255,255,0.15);
      background: rgba(255,255,255,0.06);
    }

    .preview-box {
      aspect-ratio: 16/9;
      background: #0d0d14;
      border-radius: 0.375rem;
      margin-bottom: 0.75rem;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      position: relative;
    }
    .preview-box img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .preview-box video {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    /* Audio preview */
    .audio-preview {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.625rem;
      width: 100%;
      height: 100%;
      padding: 0.5rem;
      box-sizing: border-box;
    }
    .audio-icon {
      width: 2.25rem;
      height: 2.25rem;
      color: rgba(255,255,255,0.3);
      transition: color 0.2s;
    }
    .audio-icon.playing {
      color: #a970ff;
      animation: pulse 1.2s ease-in-out infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.7; transform: scale(0.94); }
    }

    /* Waveform bars */
    .waveform {
      display: flex;
      align-items: flex-end;
      gap: 2px;
      height: 20px;
    }
    .wave-bar {
      width: 3px;
      background: rgba(255,255,255,0.2);
      border-radius: 2px;
      height: 5px;
    }
    .waveform.playing .wave-bar {
      background: #a970ff;
      animation: wave 0.8s ease-in-out infinite;
    }
    .wave-bar:nth-child(1) { animation-delay: 0s; }
    .wave-bar:nth-child(2) { animation-delay: 0.1s; }
    .wave-bar:nth-child(3) { animation-delay: 0.2s; }
    .wave-bar:nth-child(4) { animation-delay: 0.3s; }
    .wave-bar:nth-child(5) { animation-delay: 0.15s; }
    @keyframes wave {
      0%, 100% { height: 4px; }
      50% { height: 16px; }
    }

    /* Play/pause floating button */
    .play-btn {
      position: absolute;
      bottom: 0.5rem;
      right: 0.5rem;
      background: rgba(145,70,255,0.9);
      border: none;
      border-radius: 50%;
      width: 1.75rem;
      height: 1.75rem;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: white;
      transition: background 0.15s, transform 0.1s;
      z-index: 5;
      padding: 0;
    }
    .play-btn:hover { background: #a970ff; transform: scale(1.1); }

    /* Delete button */
    .delete-btn {
      position: absolute;
      top: 0.5rem;
      right: 0.5rem;
      background: rgba(239,68,68,0.8);
      color: white;
      border: none;
      border-radius: 0.25rem;
      width: 1.5rem;
      height: 1.5rem;
      display: none;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      z-index: 10;
      padding: 0;
      transition: background 0.15s;
    }
    .delete-btn:hover { background: rgb(239,68,68); }
    .item:hover .delete-btn { display: flex; }

    /* Selected check badge */
    .selected-badge {
      position: absolute;
      top: 0.5rem;
      left: 0.5rem;
      background: #9146ff;
      border-radius: 50%;
      width: 1.125rem;
      height: 1.125rem;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10;
    }

    /* Item info */
    .item-name {
      font-size: 0.8rem;
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      color: rgba(255,255,255,0.9);
    }
    .item-meta {
      font-size: 0.7rem;
      color: #6b7280;
      margin-top: 0.2rem;
      display: flex;
      align-items: center;
      gap: 0.375rem;
    }
    .item-meta .dot { opacity: 0.4; }
  `;

  disconnectedCallback() {
    super.disconnectedCallback();
    this._stopAudio();
  }

  /** Called by parent to force stop (e.g. when another card is selected) */
  stopAudio() {
    this._stopAudio();
  }

  private _stopAudio() {
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
      this.audio = null;
    }
    this.isPlaying = false;
  }

  private togglePlay(e: Event) {
    e.stopPropagation();
    if (this.isPlaying) {
      this._stopAudio();
    } else {
      this.audio = new Audio(apiClient.files.getUrl(this.item));
      this.audio.volume = 0.7;
      this.audio.play().catch(err => console.warn('Audio play failed:', err));
      this.audio.addEventListener('ended', () => { this.isPlaying = false; });
      this.isPlaying = true;
    }
  }

  private handleSelect() {
    this.dispatchEvent(new CustomEvent('ml-select', {
      detail: { item: this.item },
      bubbles: true,
      composed: true,
    }));
  }

  private handleDelete(e: Event) {
    e.stopPropagation();
    this.dispatchEvent(new CustomEvent('ml-delete', {
      detail: { id: this.item.id, event: e },
      bubbles: true,
      composed: true,
    }));
  }

  private formatDate(ts: number) {
    return new Date(ts).toLocaleDateString();
  }

  private renderPreview() {
    const { item } = this;
    const url = apiClient.files.getUrl(item);

    if (item.mimeType?.startsWith('image/')) {
      return html`<img src="${url}" alt="${item.originalName}" loading="lazy" />`;
    }

    if (item.mimeType?.startsWith('video/')) {
      return html`
        <video
          src="${url}"
          muted loop playsinline
          @mouseenter="${(e: Event) => (e.target as HTMLVideoElement).play()}"
          @mouseleave="${(e: Event) => {
            const v = e.target as HTMLVideoElement;
            v.pause();
            v.currentTime = 0;
          }}"
        ></video>
      `;
    }

    if (item.mimeType?.startsWith('audio/') || item.mimeType?.includes('ogg') || item.mimeType?.includes('wav')) {
      return html`
        <div class="audio-preview">
          <!-- Music note icon (animated when playing) -->
          <svg class="audio-icon ${this.isPlaying ? 'playing' : ''}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
              d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
          </svg>

          <!-- Waveform visualizer -->
          <div class="waveform ${this.isPlaying ? 'playing' : ''}">
            <div class="wave-bar"></div>
            <div class="wave-bar"></div>
            <div class="wave-bar"></div>
            <div class="wave-bar"></div>
            <div class="wave-bar"></div>
          </div>
        </div>

        <!-- Play / Pause button floating bottom-right -->
        <button class="play-btn" @click="${this.togglePlay}" title="${this.isPlaying ? 'Pause' : 'Play preview'}">
          ${this.isPlaying
            ? html`<svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>`
            : html`<svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>`
          }
        </button>
      `;
    }

    // Generic file icon
    return html`
      <svg style="width:2rem;height:2rem;color:rgba(255,255,255,0.25)" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
          d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    `;
  }

  render() {
    const { item } = this;
    return html`
      <div
        class="item ${this.selected ? 'selected' : ''}"
        @click="${this.handleSelect}"
      >
        <!-- Selected check badge -->
        ${this.selected ? html`
          <div class="selected-badge">
            <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="white" stroke-width="3">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        ` : ''}

        <!-- Delete button -->
        <button class="delete-btn" @click="${this.handleDelete}" title="Delete file">
          <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5"
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>

        <!-- Preview area -->
        <div class="preview-box">
          ${this.renderPreview()}
        </div>

        <!-- Meta -->
        <div class="item-name" title="${item.originalName}">${item.originalName}</div>
        <div class="item-meta">
          <span>${this.formatDate(item.uploadedAt)}</span>
          <span class="dot">·</span>
          <span>${item.sizeFormatted}</span>
        </div>
      </div>
    `;
  }
}
