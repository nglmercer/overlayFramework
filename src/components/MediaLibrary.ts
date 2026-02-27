import { html, css, LitElement } from 'lit';
import { Component, property, state } from '../litcomponents';
import { LocalizeController } from '../locales/localization';
import { createBrowserClient } from '../api/client';
import type { FileItem } from '../api/client';
import { confirm } from '../lib/dialog';

const apiClient = createBrowserClient({ baseUrl: 'http://localhost:39769' });

@Component('media-library')
export class MediaLibrary extends LitElement {
  @property({ type: String }) type: 'image' | 'sound' = 'image';
  @property({ type: String }) selectedUrl: string | null = null;
  @property({ type: Function }) onClose: () => void = () => {};
  @property({ type: Function }) onSelect: (url: string, name: string) => void = () => {};

  private currentAudio: HTMLAudioElement | null = null;

  @state() private selectedItem: string | null = null;
  @state() private currentPage = 1;
  @state() private sortBy = 'date';
  private itemsPerPage = 6;

  @state() private items: FileItem[] = [];
  @state() private loading = true;
  @state() private uploading = false;
  @state() private error: string | null = null;
  @state() private quotaUsed: string = '0.00 MB';
  @state() private quotaMax: string = '100.00 MB';

  private _localize = new LocalizeController(this);

  static styles = css`
    :host {
      position: fixed;
      inset: 0;
      background-color: rgba(0, 0, 0, 0.8);
      z-index: 50;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    }
    .modal {
      background-color: #18181b;
      border-radius: 0.75rem;
      width: 100%;
      max-width: 56rem;
      display: flex;
      flex-direction: column;
      max-height: 90vh;
      color: white;
    }
    .header {
      padding: 1.5rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }
    .header h2 { font-size: 1.5rem; font-weight: 700; margin: 0; }
    .header button { background: transparent; border: none; color: #9ca3af; cursor: pointer; }
    .header button:hover { color: white; }

    .content { padding: 1.5rem; flex: 1; overflow-y: auto; }
    .stats-bar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem; }
    .storage-info { display: flex; align-items: center; gap: 1rem; }
    .storage-info .label { font-size: 0.875rem; font-weight: 600; border-bottom: 2px solid #a970ff; padding-bottom: 0.25rem; }
    .storage-info .text { font-size: 0.875rem; color: #9ca3af; }
    
    .actions { display: flex; align-items: center; gap: 1rem; }
    .btn-upload { background-color: rgba(255, 255, 255, 0.1); border: none; color: white; padding: 0.5rem 1rem; border-radius: 0.375rem; font-size: 0.875rem; font-weight: 600; cursor: pointer; display: inline-block; }
    .btn-upload:hover { background-color: rgba(255, 255, 255, 0.2); }
    .btn-upload.disabled { opacity: 0.5; cursor: not-allowed; }
    
    .sort-container { display: flex; align-items: center; gap: 0.5rem; }
    .sort-container label { font-size: 0.875rem; font-weight: 600; color: #d1d5db; }
    .sort-container select { background-color: #0e0e10; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 0.375rem; padding: 0.5rem 0.75rem; color: white; font-size: 0.875rem; outline: none; }
    .sort-container select:focus { border-color: #a970ff; }

    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; }
    .item { background-color: #26262c; border-radius: 0.5rem; padding: 1rem; cursor: pointer; border: 2px solid transparent; transition: all 0.2s; position: relative; }
    .item.selected { border-color: #a970ff; background-color: rgba(169, 112, 255, 0.1); box-shadow: 0 0 0 2px rgba(169, 112, 255, 0.4); }
    .item:hover:not(.selected) { border-color: rgba(255, 255, 255, 0.2); }
    
    .preview-box { aspect-ratio: 16/9; background-color: #0e0e10; border-radius: 0.375rem; margin-bottom: 0.75rem; display: flex; align-items: center; justify-content: center; overflow: hidden; position: relative; }
    .preview-box img { width: 100%; height: 100%; object-fit: cover; }
    .preview-box video { width: 100%; height: 100%; object-fit: cover; }
    .preview-box audio { width: 100%; position: absolute; bottom: 0; left: 0; }
    .preview-box svg { width: 2rem; height: 2rem; color: rgba(255, 255, 255, 0.5); }
    
    .delete-btn { position: absolute; top: 0.5rem; right: 0.5rem; background: rgba(239, 68, 68, 0.8); color: white; border: none; border-radius: 0.25rem; width: 1.5rem; height: 1.5rem; display: none; align-items: center; justify-content: center; cursor: pointer; z-index: 10; padding: 0; }
    .delete-btn:hover { background: rgba(239, 68, 68, 1); }
    .item:hover .delete-btn { display: flex; }

    .item-name { font-size: 0.875rem; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .item-meta { font-size: 0.75rem; color: #9ca3af; margin-top: 0.25rem; }

    .footer { padding: 1.5rem; border-top: 1px solid rgba(255, 255, 255, 0.1); display: flex; justify-content: space-between; align-items: center; }
    .pagination { display: flex; gap: 0.5rem; }
    .page-btn { width: 2rem; height: 2rem; display: flex; align-items: center; justify-content: center; border-radius: 0.375rem; background: transparent; border: none; color: #9ca3af; cursor: pointer; }
    .page-btn:hover { background-color: rgba(255, 255, 255, 0.1); }
    .page-btn.active { background-color: #9146FF; color: white; }
    .page-btn:disabled { opacity: 0.5; cursor: not-allowed; }

    .footer-actions { display: flex; gap: 0.75rem; }
    .btn-cancel { background: transparent; border: none; color: white; font-weight: 600; padding: 0.5rem 1rem; border-radius: 0.375rem; cursor: pointer; font-size: 0.875rem; }
    .btn-cancel:hover { background-color: rgba(255, 255, 255, 0.1); }
    .btn-add { background-color: #9146FF; border: none; color: white; font-weight: 600; padding: 0.5rem 1rem; border-radius: 0.375rem; cursor: pointer; font-size: 0.875rem; }
    .btn-add:hover { background-color: #a970ff; }
    .btn-add:disabled { opacity: 0.5; cursor: not-allowed; }
    
    .loader { display: flex; justify-content: center; padding: 3rem; color: #9ca3af; }
    .empty-state { display: flex; justify-content: center; padding: 3rem; color: #9ca3af; flex-direction: column; align-items: center; gap: 1rem; }
  `;

  connectedCallback() {
    super.connectedCallback();
    this.fetchFiles();
    this.fetchQuota();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio = null;
    }
  }

  updated(changedProperties: Map<string, any>) {
    if (changedProperties.has('selectedUrl') || changedProperties.has('items')) {
      if (this.selectedUrl && !this.selectedItem && this.items.length > 0) {
        const match = this.items.find(f => apiClient.files.getUrl(f) === this.selectedUrl);
        if (match) {
          this.selectedItem = match.id;
          
          // Focus current page to display selected item
          const itemIndex = this.sortedItems.findIndex(i => i.id === match.id);
          if (itemIndex >= 0) {
              const expectedPage = Math.floor(itemIndex / this.itemsPerPage) + 1;
              if (this.currentPage !== expectedPage) {
                  this.currentPage = expectedPage;
              }
          }
        }
      }
    }
  }

  async fetchFiles() {
    this.loading = true;
    try {
      const result = await apiClient.files.list({ pageSize: 100 });
      // filter locally if API didn't strictly filter
      this.items = result.files.filter(f => {
        if (!f.mimeType) return false;
        if (this.type === 'image') {
          return f.mimeType.startsWith('image/') || f.mimeType === 'video/webm' || f.mimeType.startsWith('video/');
        } else {
          return f.mimeType.startsWith('audio/') || f.mimeType === 'video/webm' || f.mimeType.includes('ogg') || f.mimeType.includes('wav');
        }
      });
      this.error = null;
    } catch(err: any) {
      console.error(err);
      this.error = err.message || 'Error fetching files';
    } finally {
      this.loading = false;
    }
  }

  async fetchQuota() {
    try {
      const q = await apiClient.quota.get();
      this.quotaUsed = (q.usedStorage / 1024 / 1024).toFixed(2) + ' MB';
      this.quotaMax = (q.maxStorage / 1024 / 1024).toFixed(2) + ' MB';
    } catch {
      // safe fallback if quota endpoint is not accessible
    }
  }

  async handleUpload(e: Event) {
    const input = e.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    
    const file = input.files[0];
    this.uploading = true;
    try {
      let category = 'other';
      if (file.type.startsWith('image/')) category = 'image';
      else if (file.type.startsWith('audio/') || file.type.startsWith('video/')) category = 'audio';
      
      await apiClient.files.upload(file, { category });
      await this.fetchFiles();
      await this.fetchQuota();
    } catch (err: any) {
      alert("Error uploading: " + err.message);
    } finally {
      this.uploading = false;
      input.value = ''; 
    }
  }

  async handleDelete(e: Event, id: string) {
    e.stopPropagation(); // don't select the item
    const confirmResult = await confirm("Are you sure you want to delete this file?")
    if (confirmResult) {
      try {
        await apiClient.files.delete(id);
        if (this.selectedItem === id) this.selectedItem = null;
        await this.fetchFiles();
        await this.fetchQuota();
      } catch (err: any) {
        alert("Error deleting file: " + err.message);
      }
    }
  }

  private get sortedItems() {
    return [...this.items].sort((a, b) => {
      if (this.sortBy === 'date') {
        return b.uploadedAt - a.uploadedAt;
      } else if (this.sortBy === 'name') {
        return a.originalName.localeCompare(b.originalName);
      } else if (this.sortBy === 'size') {
        return b.size - a.size;
      }
      return 0;
    });
  }

  private formatDate(ts: number) {
    const date = new Date(ts);
    return date.toLocaleDateString();
  }

  render() {
    const items = this.sortedItems;
    const totalPages = Math.ceil(items.length / this.itemsPerPage) || 1;
    
    // ensure current page is valid
    if (this.currentPage > totalPages) {
      this.currentPage = totalPages;
    }
    
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const currentItems = items.slice(startIndex, startIndex + this.itemsPerPage);

    return html`
      <div class="modal">
        <div class="header">
          <h2>${this._localize.t('media.resourceLibrary')}</h2>
          <button @click="${this.onClose}">
            <svg style="width: 1.5rem; height: 1.5rem;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="content">
          <div class="stats-bar">
            <div class="storage-info">
              <span class="label">${this._localize.t('media.storage')}</span>
              <span class="text">${this.quotaUsed} / ${this.quotaMax}</span>
            </div>
            <div class="actions">
              <label for="media-upload-input" class="btn-upload ${this.uploading ? 'disabled' : ''}">
                ${this.uploading ? '...' : this._localize.t('media.uploadFile')}
              </label>
              <input id="media-upload-input" type="file" style="display:none" @change="${this.handleUpload}" accept="${this.type === 'image' ? 'image/*,video/webm,.gif' : 'audio/*,video/webm,.ogg,.wav,.mp3'}" ?disabled="${this.uploading}">
              
              <div class="sort-container">
                <label>${this._localize.t('media.sortBy')}</label>
                <select @change="${(e: any) => this.sortBy = e.target.value}" .value="${this.sortBy}">
                  <option value="date">${this._localize.t('media.dateAdded')}</option>
                  <option value="name">${this._localize.t('media.name')}</option>
                  <option value="size">${this._localize.t('media.size')}</option>
                </select>
              </div>
            </div>
          </div>

          ${this.error ? html`<div style="color:red; padding:1rem;">${this.error}</div>` : ''}

          ${this.loading ? html`
            <div class="loader">${this._localize.t('preview.loading')}</div>
          ` : items.length === 0 ? html`
            <div class="empty-state">
              <svg style="width: 3rem; height: 3rem; opacity: 0.5;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>No files uploaded yet.</span>
            </div>
          ` : html`
            <div class="grid">
              ${currentItems.map(item => html`
                <div 
                  class="item ${this.selectedItem === item.id ? 'selected' : ''}" 
                  @click="${() => {
                    this.selectedItem = item.id;
                    if (this.type === 'sound') {
                      if (this.currentAudio) {
                        //this.currentAudio.pause();
                        //this.currentAudio.currentTime = 0;
                      }
                      //this.currentAudio = new Audio(apiClient.files.getUrl(item));
                      //this.currentAudio.play().catch(e => console.warn('Could not play list audio:', e));
                    }
                  }}"
                >
                  <button class="delete-btn" @click="${(e: Event) => this.handleDelete(e, item.id)}" title="Delete file">
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                
                  <div class="preview-box">
                    ${item.mimeType?.startsWith('image/') ? html`
                      <img src="${apiClient.files.getUrl(item)}" alt="${item.originalName}" />
                    ` : item.mimeType?.startsWith('video/') ? html`
                      <video 
                        src="${apiClient.files.getUrl(item)}" 
                        muted loop playsinline
                        @mouseenter="${(e: Event) => (e.target as HTMLVideoElement).play()}"
                        @mouseleave="${(e: Event) => {
                          const v = e.target as HTMLVideoElement;
                          v.pause();
                          v.currentTime = 0;
                        }}"
                      ></video>
                    ` : item.mimeType?.startsWith('audio/') ? html`
                      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                      </svg>
                      <audio src="${apiClient.files.getUrl(item)}" controls @click="${(e: Event) => e.stopPropagation()}"></audio>
                    ` : html`
                      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    `}
                  </div>
                  <div class="item-name" title="${item.originalName}">${item.originalName}</div>
                  <div class="item-meta">${this.formatDate(item.uploadedAt)} - ${item.sizeFormatted}</div>
                </div>
              `)}
            </div>
          `}
        </div>

        <div class="footer">
          <div class="pagination">
            <button 
              class="page-btn" 
              ?disabled="${this.currentPage === 1}"
              @click="${() => this.currentPage--}"
            >&lt;</button>
            ${Array.from({ length: totalPages }).map((_, i) => html`
              <button 
                class="page-btn ${this.currentPage === i + 1 ? 'active' : ''}"
                @click="${() => this.currentPage = i + 1}"
              >${i + 1}</button>
            `)}
            <button 
              class="page-btn" 
              ?disabled="${this.currentPage === totalPages}"
              @click="${() => this.currentPage++}"
            >&gt;</button>
          </div>
          <div class="footer-actions">
            <button class="btn-cancel" @click="${this.onClose}">${this._localize.t('app.cancel')}</button>
            <button 
              class="btn-add" 
              ?disabled="${!this.selectedItem}"
              @click="${() => {
                const selected = this.items.find(i => i.id === this.selectedItem);
                if (selected) {
                  this.onSelect(apiClient.files.getUrl(selected), selected.originalName);
                }
              }}"
            >${this._localize.t('media.addToAlerts')}</button>
          </div>
        </div>
      </div>
    `;
  }
}
