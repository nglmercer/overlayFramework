import { html, unsafeCSS, LitElement } from 'lit';
import { Component, state, property } from '../../litcomponents';
import { dbManager, AlertBox } from '../../lib/db';
import { LocalizeController } from '../../locales/localization';
import { alert, confirm, prompt } from '../../lib/dialog';
import { CONFIG } from '../../lib/constants';

// Import external styles
import styles from './Dashboard.css?inline';

@Component('app-dashboard')
export class AppDashboard extends LitElement {
  @state() private alertBoxes: AlertBox[] = [];
  @property({ type: Function }) onEdit: (id: string) => void = () => {};

  private _localize = new LocalizeController(this);

  static styles = unsafeCSS(styles);

  connectedCallback() {
    super.connectedCallback();
    this.loadBoxes();
  }

  async loadBoxes() {
    const boxes = await dbManager.getBoxes();
    if (boxes.length === 0) {
      const defaultBox = { id: '1', name: 'Alerts Box 1', enabled: true };
      await dbManager.saveBox(defaultBox);
      this.alertBoxes = [defaultBox];
    } else {
      this.alertBoxes = boxes;
    }
  }

  async handleCreateBox() {
    if (this.alertBoxes.length >= CONFIG.MAX_BOXES) return;
    const newBox = {
      id: crypto.randomUUID(),
      name: `Alerts Box ${this.alertBoxes.length + 1}`,
      enabled: true
    };
    await dbManager.saveBox(newBox);
    await this.loadBoxes();
  }

  async handleToggleBox(box: AlertBox) {
    const updated = { ...box, enabled: !box.enabled };
    await dbManager.saveBox(updated);
    await this.loadBoxes();
  }

  async handleDeleteBox(id: string) {
    const confirmed = await confirm(this._localize.t('dashboard.confirmDelete') || 'Are you sure you want to delete this alert box?');
    if (!confirmed) return;
    await dbManager.deleteBox(id);
    await this.loadBoxes();
  }

  async handleDuplicateBox(box: AlertBox) {
    if (this.alertBoxes.length >= CONFIG.MAX_BOXES) {
      await alert(this._localize.t('dashboard.maxBoxesReached') || 'Maximum number of alert boxes reached.');
      return;
    }
    const newBox = {
      ...box,
      id: crypto.randomUUID(),
      name: `${box.name} (Copy)`,
      enabled: box.enabled
    };
    await dbManager.saveBox(newBox);
    await this.loadBoxes();
  }

  async handleRenameBox(box: AlertBox) {
    const newName = await prompt(this._localize.t('dashboard.enterNewName') || 'Enter new name', {
      defaultValue: box.name
    });
    if (newName && newName.trim() !== '') {
      const updated = { ...box, name: newName.trim() };
      await dbManager.saveBox(updated);
      await this.loadBoxes();
    }
  }

  async handleCopySource(id: string) {
    // Generate the URL in the same format shown in the application
    const url = `${window.location.origin}/preview.html?id=${id}`;
    try {
      await navigator.clipboard.writeText(url);
      await alert(this._localize.t('dashboard.urlCopied') || 'URL copied to clipboard!');
    } catch (err) {
      await alert(this._localize.t('dashboard.copyFailed') || 'Failed to copy URL.');
    }
  }

  render() {
    return html`
      <div class="max-w-3xl">
        <h1>${this._localize.t('dashboard.title')}</h1>
        <p class="stats">${this._localize.t('dashboard.alertGroups')}: ${this.alertBoxes.length}/${CONFIG.MAX_BOXES}</p>

        <button 
          class="btn-create"
          @click="${this.handleCreateBox}"
          ?disabled="${this.alertBoxes.length >= CONFIG.MAX_BOXES}"
        >
          <svg style="width: 1.25rem; height: 1.25rem; margin-right: 0.5rem;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" />
          </svg>
          ${this._localize.t('dashboard.createAlertBox')}
        </button>

        <div class="box-grid">
          ${this.alertBoxes.map(box => html`
            <div class="box-item">
              <div class="box-header">
                <div class="box-info">
                  <div 
                    class="toggle ${box.enabled ? 'on' : 'off'}"
                    @click="${() => this.handleToggleBox(box)}"
                  >
                    <div class="toggle-knob">
                      ${box.enabled ? html`
                        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ` : ''}
                    </div>
                  </div>
                  <span class="box-name">${box.name}</span>
                </div>
                
                <ui-menu .items="${[
                  { 
                    id: 'copy', 
                    label: this._localize.t('dashboard.copySource'),
                    icon: html`<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>`,
                    onClick: () => this.handleCopySource(box.id) 
                  },
                  { 
                    id: 'rename', 
                    label: this._localize.t('dashboard.rename'),
                    icon: html`<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>`,
                    onClick: () => this.handleRenameBox(box) 
                  },
                  { 
                    id: 'duplicate', 
                    label: this._localize.t('dashboard.duplicate'),
                    icon: html`<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" /></svg>`,
                    onClick: () => this.handleDuplicateBox(box) 
                  },
                  { divider: true, id: 'd1', label: '' },
                  { 
                    id: 'delete', 
                    label: this._localize.t('dashboard.delete'), 
                    danger: true,
                    icon: html`<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>`,
                    onClick: () => this.handleDeleteBox(box.id) 
                  }
                ]}"></ui-menu>
              </div>
              <div class="box-footer">
                <button 
                  class="btn-edit"
                  @click="${() => this.onEdit(box.id)}"
                >
                  ${this._localize.t('dashboard.editAlerts')}
                </button>
              </div>
            </div>
          `)}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'app-dashboard': AppDashboard;
  }
}
