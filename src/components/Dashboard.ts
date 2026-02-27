import { html, css, LitElement } from 'lit';
import { Component, state, property } from '../litcomponents';
import { dbManager, AlertBox } from '../lib/db';
import { getLocale, setLocale, LocalizeController } from '../locales/localization';
import { msg } from '@lit/localize';

@Component('app-dashboard')
export class AppDashboard extends LitElement {
  @state() private alertBoxes: AlertBox[] = [];
  @state() private openMenuId: string | null = null;
  @property({ type: Function }) onEdit: (id: string) => void = () => {};

  private _localize = new LocalizeController(this);

  static styles = css`
    :host {
      display: block;
      min-height: 100vh;
      background-color: #0e0e10;
      color: white;
      padding: 2rem;
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    }
    .max-w-3xl {
      max-width: 48rem;
      margin: 0 auto;
    }
    h1 {
      font-size: 1.875rem;
      font-weight: 700;
      margin-bottom: 0.5rem;
    }
    p.stats {
      color: #9ca3af;
      margin-bottom: 1.5rem;
      font-weight: 500;
    }
    .btn-create {
      width: 100%;
      background-color: #9146FF;
      color: white;
      font-weight: 600;
      padding: 0.75rem 1rem;
      border-radius: 0.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 2rem;
      border: none;
      cursor: pointer;
      transition: background-color 0.2s;
    }
    .btn-create:hover { background-color: #772ce8; }
    .btn-create:disabled { opacity: 0.5; cursor: not-allowed; }
    
    .box-grid {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .box-item {
      background-color: #18181b;
      border-radius: 0.5rem;
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      position: relative;
      border: 1px solid rgba(255, 255, 255, 0.05);
    }
    .box-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 2rem;
    }
    .box-info {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    .toggle {
      width: 2.75rem;
      height: 1.5rem;
      border-radius: 1.5rem;
      padding: 0.125rem;
      cursor: pointer;
      transition: background-color 0.2s;
      display: flex;
      align-items: center;
    }
    .toggle.on { background-color: #9146FF; }
    .toggle.off { background-color: #4b5563; }
    .toggle-knob {
      width: 1.25rem;
      height: 1.25rem;
      background-color: white;
      border-radius: 50%;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      transition: transform 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .toggle.on .toggle-knob { transform: translateX(1.25rem); }
    .toggle-knob svg { width: 0.75rem; height: 0.75rem; color: #9146FF; }

    .box-name { font-weight: 500; font-size: 1.125rem; }
    .menu-btn {
      padding: 0.375rem;
      background: transparent;
      border: none;
      border-radius: 0.375rem;
      cursor: pointer;
      color: #9ca3af;
    }
    .menu-btn:hover { background-color: rgba(255, 255, 255, 0.1); }
    
    .dropdown {
      position: absolute;
      top: 3.5rem;
      right: 1.25rem;
      width: 14rem;
      background-color: #1f1f23;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 0.375rem;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
      z-index: 10;
      padding: 0.25rem 0;
    }
    .dropdown button {
      width: 100%;
      text-align: left;
      padding: 0.625rem 1rem;
      background: transparent;
      border: none;
      color: #e5e7eb;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
    }
    .dropdown button:hover { background-color: rgba(255, 255, 255, 0.1); }
    .dropdown button.delete { color: #f87171; }
    
    .box-footer { display: flex; justify-content: flex-end; }
    .btn-edit {
      background-color: #3a3a3d;
      color: white;
      font-weight: 600;
      padding: 0.375rem 1rem;
      border-radius: 0.375rem;
      border: none;
      cursor: pointer;
      font-size: 0.875rem;
    }
    .btn-edit:hover { background-color: #464649; }
  `;

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
    if (this.alertBoxes.length >= 10) return;
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
    await dbManager.deleteBox(id);
    this.openMenuId = null;
    await this.loadBoxes();
  }

  render() {
    return html`
      <div class="max-w-3xl">
        <h1>${msg('Tus alertas')}</h1>
        <p class="stats">${msg('Grupos de alertas')}: ${this.alertBoxes.length}/10</p>

        <button 
          class="btn-create"
          @click="${this.handleCreateBox}"
          ?disabled="${this.alertBoxes.length >= 10}"
        >
          <svg style="width: 1.25rem; height: 1.25rem; margin-right: 0.5rem;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          ${msg('Crear recuadro de alerta')}
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
                
                <button 
                  class="menu-btn"
                  @click="${() => this.openMenuId = this.openMenuId === box.id ? null : box.id}"
                >
                  <svg style="width: 1.25rem; height: 1.25rem;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                  </svg>
                </button>
                
                ${this.openMenuId === box.id ? html`
                  <div class="dropdown">
                    <button @click="${() => {}}">${msg('Copiar fuente de navegador')}</button>
                    <button @click="${() => {}}">${msg('Renombrar')}</button>
                    <button @click="${() => {}}" style="border-bottom: 1px solid rgba(255, 255, 255, 0.05);">${msg('Duplicado')}</button>
                    <button class="delete" @click="${() => this.handleDeleteBox(box.id)}">${msg('Eliminar')}</button>
                  </div>
                ` : ''}
              </div>
              <div class="box-footer">
                <button 
                  class="btn-edit"
                  @click="${() => this.onEdit(box.id)}"
                >
                  ${msg('Editar alertas')}
                </button>
              </div>
            </div>
          `)}
        </div>
      </div>
    `;
  }
}
