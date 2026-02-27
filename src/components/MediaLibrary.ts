import { html, css, LitElement } from 'lit';
import { Component, property, state } from '../litcomponents';
import { getLocale, setLocale, LocalizeController, t } from '../locales/localization';

@Component('media-library')
export class MediaLibrary extends LitElement {
  @property({ type: String }) type: 'image' | 'sound' = 'image';
  @property({ type: Function }) onClose: () => void = () => {};
  @property({ type: Function }) onSelect: (url: string, name: string) => void = () => {};

  @state() private selectedItem: string | null = null;
  @state() private currentPage = 1;
  @state() private sortBy = 'date';
  private itemsPerPage = 6;

  private _localize = new LocalizeController(this);

  private images = [
    { id: '1', name: 'RewardRedemption.webm', date: '2023-07-24', size: 1.29, url: 'https://picsum.photos/seed/1/200/200' },
    { id: '2', name: 'GoalStarted.webm', date: '2022-08-10', size: 1.48, url: 'https://picsum.photos/seed/2/200/200' },
    { id: '3', name: 'GoalCompleted.webm', date: '2022-08-10', size: 1.53, url: 'https://picsum.photos/seed/3/200/200' },
    { id: '4', name: 'HypeTrainStarted.webm', date: '2022-08-10', size: 1.55, url: 'https://picsum.photos/seed/4/200/200' },
    { id: '5', name: 'HypeTrainLevelAchieved.webm', date: '2022-08-10', size: 1.68, url: 'https://picsum.photos/seed/5/200/200' },
    { id: '6', name: 'HypeTrainAll-time-high.webm', date: '2022-08-10', size: 1.69, url: 'https://picsum.photos/seed/6/200/200' },
    { id: '7', name: 'Follow.webm', date: '2022-08-11', size: 2.10, url: 'https://picsum.photos/seed/7/200/200' },
    { id: '8', name: 'Subscribe.webm', date: '2022-08-12', size: 3.50, url: 'https://picsum.photos/seed/8/200/200' },
  ];

  private sounds = [
    { id: 's1', name: 'Magic Chime', date: '2022-08-09', size: 1.24, url: 'https://actions.google.com/sounds/v1/magic/magic_chime.ogg' },
    { id: 's2', name: 'Cartoon Boing', date: '2022-08-09', size: 0.92, url: 'https://actions.google.com/sounds/v1/cartoon/cartoon_boing.ogg' },
    { id: 's3', name: 'Short Beep', date: '2022-08-09', size: 0.84, url: 'https://actions.google.com/sounds/v1/alarms/beep_short.ogg' },
    { id: 's4', name: 'Retro Laser', date: '2022-08-09', size: 1.06, url: 'https://actions.google.com/sounds/v1/weapons/retro_laser_gun.ogg' },
    { id: 's5', name: 'Water Drop', date: '2022-08-09', size: 0.97, url: 'https://actions.google.com/sounds/v1/water/water_drop.ogg' },
    { id: 's6', name: 'Fast Typing', date: '2022-08-09', size: 0.83, url: 'https://actions.google.com/sounds/v1/office/typing_fast.ogg' },
    { id: 's7', name: 'Baby Cry', date: '2022-08-10', size: 0.50, url: 'https://actions.google.com/sounds/v1/human_voices/human_baby_cry.ogg' },
    { id: 's8', name: 'Glass Crash', date: '2022-08-11', size: 0.30, url: 'https://actions.google.com/sounds/v1/impacts/crash.ogg' },
  ];

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
    .btn-upload { background-color: rgba(255, 255, 255, 0.1); border: none; color: white; padding: 0.5rem 1rem; border-radius: 0.375rem; font-size: 0.875rem; font-weight: 600; cursor: pointer; }
    .btn-upload:hover { background-color: rgba(255, 255, 255, 0.2); }
    
    .sort-container { display: flex; align-items: center; gap: 0.5rem; }
    .sort-container label { font-size: 0.875rem; font-weight: 600; color: #d1d5db; }
    .sort-container select { background-color: #0e0e10; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 0.375rem; padding: 0.5rem 0.75rem; color: white; font-size: 0.875rem; outline: none; }
    .sort-container select:focus { border-color: #a970ff; }

    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; }
    .item { background-color: #26262c; border-radius: 0.5rem; padding: 1rem; cursor: pointer; border: 2px solid transparent; transition: border-color 0.2s; }
    .item.selected { border-color: #a970ff; }
    .item:hover:not(.selected) { border-color: rgba(255, 255, 255, 0.2); }
    
    .preview-box { aspect-ratio: 16/9; background-color: #0e0e10; border-radius: 0.375rem; margin-bottom: 0.75rem; display: flex; align-items: center; justify-content: center; overflow: hidden; position: relative; }
    .preview-box img { width: 100%; height: 100%; object-cover: cover; }
    .preview-box svg { width: 2rem; height: 2rem; color: rgba(255, 255, 255, 0.5); }
    
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
  `;

  private get allItems() {
    return this.type === 'image' ? this.images : this.sounds;
  }

  private get sortedItems() {
    return [...this.allItems].sort((a, b) => {
      if (this.sortBy === 'date') {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      } else if (this.sortBy === 'name') {
        return a.name.localeCompare(b.name);
      } else if (this.sortBy === 'size') {
        return (b as any).size - (a as any).size;
      }
      return 0;
    });
  }

  private formatDate(dateString: string) {
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
  }

  render() {
    const items = this.sortedItems;
    const totalPages = Math.ceil(items.length / this.itemsPerPage);
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
              <span class="text">13.76 MB / 100 MB</span>
            </div>
            <div class="actions">
              <button class="btn-upload">${this._localize.t('media.uploadFile')}</button>
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

          <div class="grid">
            ${currentItems.map(item => html`
              <div 
                class="item ${this.selectedItem === item.id ? 'selected' : ''}" 
                @click="${() => {
                  this.selectedItem = item.id;
                  if (this.type === 'sound' && 'url' in item) {
                    new Audio((item as any).url).play().catch(e => console.warn('Could not play list audio:', e));
                  }
                }}"
              >
                <div class="preview-box">
                  ${this.type === 'image' && 'url' in item ? html`
                    <img src="${(item as any).url}" alt="${item.name}" />
                  ` : html`
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                    </svg>
                  `}
                </div>
                <div class="item-name">${item.name}</div>
                <div class="item-meta">${this.formatDate(item.date)} - ${item.size} MB</div>
              </div>
            `)}
          </div>
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
                const selected = this.allItems.find(i => i.id === this.selectedItem);
                if (selected) this.onSelect('url' in selected ? (selected as any).url : '', selected.name);
              }}"
            >${this._localize.t('media.addToAlerts')}</button>
          </div>
        </div>
      </div>
    `;
  }
}
