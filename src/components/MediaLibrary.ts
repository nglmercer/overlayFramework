import { html, LitElement } from 'lit';
import { Component, property, state } from '../litcomponents';
import { LocalizeController } from '../locales/localization';
import { createBrowserClient } from '../api/client';
import type { FileItem,FileTypes } from '../api/client';
import { FileCategory } from '../api/client';
import { confirm } from '../lib/dialog';
import { mediaLibraryStyles } from './media-library/MediaLibraryStyles';

// Register sub-component
import './media-library/MediaLibraryItem';
import type { MediaLibraryItem } from './media-library/MediaLibraryItem';

const apiClient = createBrowserClient({ baseUrl: 'http://localhost:35021' });

// ─────────────────────────────────────────────────────────────────────────────
// MediaLibrary component
//
// Events dispatched (for consumers who prefer event-based integration):
//   'media-select'  { url: string, name: string }
//   'media-close'   {}
//
// Or pass callbacks via .onSelect / .onClose properties (legacy).
// ─────────────────────────────────────────────────────────────────────────────

@Component('media-library')
export class MediaLibrary extends LitElement {
  // ── Public API ──────────────────────────────────────────────────────────
  /** Filter files by type shown in the grid */
  @property({ type: String }) type: 'image' | 'sound' | 'video' = 'image';

  /**
   * The currently-selected URL in the parent (used to pre-highlight the
   * matching item when the library first opens).
   */
  @property({ type: String }) selectedUrl: string | null = null;

  /** Callback – called when user confirms selection (url, name) */
  @property({ attribute: false }) onSelect: (url: string, name: string) => void = () => {};

  /** Callback – called when the modal is closed without selecting */
  @property({ attribute: false }) onClose: () => void = () => {};

  // ── Internal state ──────────────────────────────────────────────────────
  @state() private selectedItem: string | null = null;
  @state() private currentPage = 1;
  @state() private sortBy: 'date' | 'name' | 'size' = 'date';
  @state() private searchQuery = '';
  @state() private items: FileItem[] = [];
  @state() private loading = true;
  @state() private uploading = false;
  @state() private error: string | null = null;
  @state() private quotaUsed = 0;
  @state() private quotaMax = 0;

  /**
   * ID of the item whose audio is currently playing.
   * Kept here (not in the child) so the parent can stop the old
   * player when a new card is selected — without needing queryAll
   * across shadow boundaries.
   */
  @state() private playingItemId: string | null = null;

  private readonly ITEMS_PER_PAGE = 6;
  private _localize = new LocalizeController(this);

  // ── Styles ──────────────────────────────────────────────────────────────
  static styles = mediaLibraryStyles;

  // ── Lifecycle ───────────────────────────────────────────────────────────
  connectedCallback() {
    super.connectedCallback();
    this.fetchFiles();
    this.fetchQuota();
  }

  /**
   * Once items arrive, try to sync the pre-selection from `selectedUrl`.
   * We only do this once (when `selectedItem` is still null).
   */
  updated(changedProperties: Map<string, unknown>) {
    const itemsArrived = changedProperties.has('items') && this.items.length > 0;
    const urlChanged   = changedProperties.has('selectedUrl');

    if ((itemsArrived || urlChanged) && this.selectedUrl && !this.selectedItem) {
      this._syncSelectionFromUrl();
    }
  }

  private _syncSelectionFromUrl() {
    const match = this.items.find(f => apiClient.files.getUrl(f) === this.selectedUrl);
    if (!match) return;

    this.selectedItem = match.id;

    // Jump to the page that contains the pre-selected item
    const ordered = this._filteredAndSorted();
    const idx = ordered.findIndex(i => i.id === match.id);
    if (idx >= 0) {
      const targetPage = Math.floor(idx / this.ITEMS_PER_PAGE) + 1;
      if (this.currentPage !== targetPage) this.currentPage = targetPage;
    }
  }

  // ── Data fetching ───────────────────────────────────────────────────────
  private async fetchFiles() {
    this.loading = true;
    this.error = null;
    try {
      const result = await apiClient.files.list({ pageSize: 100 });
      this.items = result.files.filter(f => {
        if (!f.mimeType) return false;
        if (this.type === 'image') {
          return f.mimeType.startsWith('image/') || f.mimeType.startsWith('video/');
        }
        if (this.type === 'sound') {
          return f.mimeType.startsWith('audio/') ||
                 f.mimeType.includes('ogg') ||
                 f.mimeType.includes('wav') ||
                 f.mimeType.startsWith('video/');
        }
        // video type - only videos
        return f.mimeType.startsWith('video/');
      });
    } catch (err: any) {
      console.error('[MediaLibrary] fetchFiles:', err);
      this.error = err.message ?? 'Error fetching files';
    } finally {
      this.loading = false;
    }
  }

  private async fetchQuota() {
    try {
      const q = await apiClient.quota.get();
      this.quotaUsed = q.usedStorage;
      this.quotaMax  = q.maxStorage;
    } catch {
      // Non-fatal — hide quota bar gracefully
    }
  }

  // ── Event handlers ──────────────────────────────────────────────────────
  private async handleUpload(e: Event) {
    const input = e.target as HTMLInputElement;
    if (!input.files?.length) return;

    const file = input.files[0];
    this.uploading = true;
    try {
      let category: FileTypes = FileCategory.OTHER;
      if (file.type.startsWith('image/')) category = FileCategory.IMAGE;
      else if (file.type.startsWith('video/')) category = FileCategory.VIDEO;
      else if (file.type.startsWith('audio/')) category = FileCategory.AUDIO;

      await apiClient.files.upload(file, { category });
      await Promise.all([this.fetchFiles(), this.fetchQuota()]);
    } catch (err: any) {
      alert('Error uploading: ' + err.message);
    } finally {
      this.uploading = false;
      input.value = '';
    }
  }

  private async handleDelete(e: CustomEvent<{ id: string }>) {
    const confirmed = await confirm('Are you sure you want to delete this file?');
    if (!confirmed) return;
    try {
      await apiClient.files.delete(e.detail.id);
      if (this.selectedItem === e.detail.id) this.selectedItem = null;
      if (this.playingItemId === e.detail.id) this.playingItemId = null;
      await Promise.all([this.fetchFiles(), this.fetchQuota()]);
    } catch (err: any) {
      alert('Error deleting file: ' + err.message);
    }
  }

  /**
   * Handle item selection from ml-select event.
   * Signals the previously-playing item to stop via property change —
   * MediaLibraryItem watches `playingExternal` to stop itself.
   * This avoids queryAll across shadow DOM boundaries.
   */
  private handleItemSelect(e: CustomEvent<{ item: FileItem }>) {
    const { item } = e.detail;
    this.selectedItem = item.id;
  }

  /**
   * Audio state is managed inside MediaLibraryItem.
   * The parent tracks which item is "playing" via this event so it can
   * tell previously-playing cards to stop when a new one starts.
   */
  private handleItemPlayStart(e: CustomEvent<{ id: string }>) {
    if (this.playingItemId && this.playingItemId !== e.detail.id) {
      // Find the old playing element and stop it via a custom event
      const old = this.shadowRoot?.querySelector(
        `media-library-item[data-id="${this.playingItemId}"]`
      ) as MediaLibraryItem | null;
      old?.stopAudio();
    }
    this.playingItemId = e.detail.id;
  }

  private handleItemPlayStop(e: CustomEvent<{ id: string }>) {
    if (this.playingItemId === e.detail.id) {
      this.playingItemId = null;
    }
  }

  private handleConfirmSelection() {
    const selected = this.items.find(i => i.id === this.selectedItem);
    if (!selected) return;

    const url  = apiClient.files.getUrl(selected);
    const name = selected.originalName;

    // Support both callback prop and event-based integration
    this.onSelect(url, name);
    this.dispatchEvent(new CustomEvent('media-select', {
      detail: { url, name },
      bubbles: true,
      composed: true,
    }));
  }

  private handleClose() {
    this.onClose();
    this.dispatchEvent(new CustomEvent('media-close', {
      bubbles: true,
      composed: true,
    }));
  }

  // ── Computed (pure, no side-effects) ────────────────────────────────────
  private _filteredAndSorted(): FileItem[] {
    const q = this.searchQuery.toLowerCase().trim();
    const filtered = q
      ? this.items.filter(f => f.originalName.toLowerCase().includes(q))
      : this.items;

    return [...filtered].sort((a, b) => {
      switch (this.sortBy) {
        case 'name': return a.originalName.localeCompare(b.originalName);
        case 'size': return b.size - a.size;
        default:     return b.uploadedAt - a.uploadedAt;
      }
    });
  }

  private get storagePercent(): number {
    return this.quotaMax > 0 ? Math.min((this.quotaUsed / this.quotaMax) * 100, 100) : 0;
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 MB';
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
  }

  // ── Render helpers ──────────────────────────────────────────────────────
  private renderHeader() {
    return html`
      <div class="header">
        <h2>${this._localize.t('media.resourceLibrary')}</h2>
        <button class="header-close" @click="${this.handleClose}" title="Close">
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>
    `;
  }

  private renderToolbar() {
    return html`
      <div class="toolbar">
        <div class="search-wrapper">
          <svg class="search-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          <input
            class="search-input"
            type="text"
            placeholder="${this._localize.t('media.search') || 'Search files...'}"
            .value="${this.searchQuery}"
            @input="${(e: Event) => {
              this.searchQuery = (e.target as HTMLInputElement).value;
              this.currentPage = 1;
            }}"
          />
        </div>

        <div class="sort-container">
          <label>${this._localize.t('media.sortBy')}</label>
          <select
            class="sort-select"
            .value="${this.sortBy}"
            @change="${(e: Event) => {
              this.sortBy = (e.target as HTMLSelectElement).value as 'date' | 'name' | 'size';
              this.currentPage = 1;
            }}"
          >
            <option value="date">${this._localize.t('media.dateAdded')}</option>
            <option value="name">${this._localize.t('media.name')}</option>
            <option value="size">${this._localize.t('media.size')}</option>
          </select>
        </div>
      </div>
    `;
  }

  private renderStatsBar() {
    return html`
      <div class="stats-bar">
        <div class="storage-info">
          <span class="storage-label">${this._localize.t('media.storage')}</span>
          ${this.quotaMax > 0 ? html`
            <div class="storage-bar-wrap">
              <div class="storage-bar-fill" style="width: ${this.storagePercent}%"></div>
            </div>
            <span class="storage-text">${this.formatBytes(this.quotaUsed)} / ${this.formatBytes(this.quotaMax)}</span>
          ` : ''}
        </div>

        <label class="btn-upload ${this.uploading ? 'disabled' : ''}">
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
          </svg>
          ${this.uploading
            ? (this._localize.t('media.uploading') || 'Uploading…')
            : this._localize.t('media.uploadFile')}
          <input
            type="file"
            style="display:none"
            @change="${this.handleUpload}"
            accept="${this.type === 'sound' ? 'audio/*,.ogg,.wav,.mp3,video/*' : 'image/*,video/*'}"
            ?disabled="${this.uploading}"
          />
        </label>
      </div>
    `;
  }

  private renderGrid(currentItems: FileItem[]) {
    if (this.loading) {
      return html`
        <div class="loader">
          <div class="spinner"></div>
          <span>${this._localize.t('preview.loading')}</span>
        </div>
      `;
    }

    if (currentItems.length === 0) {
      const hasSearch = this.searchQuery.trim().length > 0;
      return html`
        <div class="empty-state">
          <svg style="width:3rem;height:3rem" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1"
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
          </svg>
          <p>${hasSearch ? 'No files match your search.' : 'No files uploaded yet.'}</p>
          ${!hasSearch ? html`<small>Upload your first file using the button above.</small>` : ''}
        </div>
      `;
    }

    return html`
      <div class="grid">
        ${currentItems.map(item => html`
          <media-library-item
            data-id="${item.id}"
            .item="${item}"
            .selected="${this.selectedItem === item.id}"
            .isPlayingExternal="${this.playingItemId === item.id}"
            .muted="${this.type === 'image'}"
            @ml-select="${this.handleItemSelect}"
            @ml-delete="${this.handleDelete}"
            @ml-play-start="${this.handleItemPlayStart}"
            @ml-play-stop="${this.handleItemPlayStop}"
          ></media-library-item>
        `)}
      </div>
    `;
  }

  private renderPagination(totalPages: number) {
    if (totalPages <= 1) return html``;

    const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
    return html`
      <div class="pagination">
        <button
          class="page-btn"
          ?disabled="${this.currentPage === 1}"
          @click="${() => { this.currentPage--; }}"
        >&lsaquo;</button>

        ${pages.map(p => html`
          <button
            class="page-btn ${this.currentPage === p ? 'active' : ''}"
            @click="${() => { this.currentPage = p; }}"
          >${p}</button>
        `)}

        <button
          class="page-btn"
          ?disabled="${this.currentPage === totalPages}"
          @click="${() => { this.currentPage++; }}"
        >&rsaquo;</button>

        <span class="page-info">${this.currentPage} / ${totalPages}</span>
      </div>
    `;
  }

  // ── Main render (NO side-effects) ───────────────────────────────────────
  render() {
    const allItems   = this._filteredAndSorted();
    const totalPages = Math.max(1, Math.ceil(allItems.length / this.ITEMS_PER_PAGE));
    // Clamp page safely — use Math.min, not mutation inside render
    const safePage   = Math.min(this.currentPage, totalPages);
    const start      = (safePage - 1) * this.ITEMS_PER_PAGE;
    const pageItems  = allItems.slice(start, start + this.ITEMS_PER_PAGE);

    return html`
      <div class="modal">
        ${this.renderHeader()}
        ${this.renderToolbar()}
        ${this.renderStatsBar()}

        <div class="content">
          ${this.error ? html`<div class="error-msg">${this.error}</div>` : ''}
          ${this.renderGrid(pageItems)}
        </div>

        <div class="footer">
          ${this.renderPagination(totalPages)}

          <div class="footer-actions">
            <button class="btn-cancel" @click="${this.handleClose}">
              ${this._localize.t('app.cancel')}
            </button>
            <button
              class="btn-add"
              ?disabled="${!this.selectedItem}"
              @click="${this.handleConfirmSelection}"
            >
              ${this._localize.t('media.addToAlerts')}
            </button>
          </div>
        </div>
      </div>
    `;
  }
}
