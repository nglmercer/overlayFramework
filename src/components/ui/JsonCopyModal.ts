import { html, css, LitElement } from 'lit';
import { Component, property, state } from '../../litcomponents';
import { LocalizeController } from '../../locales/localization';
import './UIJsonExplorer';

@Component('json-copy-modal')
export class JsonCopyModal extends LitElement {
  @property({ type: Object }) data: any = {};
  @property({ type: String }) title: string = '';
  
  private _localize = new LocalizeController(this);

  static styles = css`
    :host {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0, 0, 0, 0.85);
      backdrop-filter: blur(8px);
    }
    
    .modal {
      width: 90%;
      max-width: 600px;
      max-height: 85vh;
      background: #18181b;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 1rem;
      display: flex;
      flex-direction: column;
      box-shadow: 
        0 20px 25px -5px rgba(0, 0, 0, 0.5),
        0 10px 10px -5px rgba(0, 0, 0, 0.5),
        0 0 0 1px rgba(255, 255, 255, 0.05);
      animation: modalEnter 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    
    @keyframes modalEnter {
      from { transform: scale(0.9) translateY(20px); opacity: 0; }
      to { transform: scale(1) translateY(0); opacity: 1; }
    }
    
    .header {
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    
    h2 {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 700;
      color: white;
      letter-spacing: -0.01em;
    }
    
    .btn-close {
      background: transparent;
      border: none;
      color: #71717a;
      cursor: pointer;
      padding: 0.5rem;
      border-radius: 0.5rem;
      display: flex;
      transition: all 0.2s;
    }
    
    .btn-close:hover {
      background: rgba(255, 255, 255, 0.05);
      color: white;
    }
    
    .content {
      padding: 1.5rem;
      overflow-y: auto;
      flex: 1;
    }
    
    .footer {
      padding: 1.25rem 1.5rem;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
    }
    
    .btn {
      padding: 0.625rem 1.25rem;
      border-radius: 0.5rem;
      font-weight: 600;
      font-size: 0.875rem;
      cursor: pointer;
      transition: all 0.2s;
      border: none;
    }
    
    .btn-secondary {
      background: #27272a;
      color: white;
    }
    
    .btn-secondary:hover {
      background: #3f3f46;
    }
    
    .btn-primary {
      background: #9146FF;
      color: white;
      box-shadow: 0 4px 12px rgba(145, 70, 255, 0.3);
    }
    
    .btn-primary:hover {
      background: #a970ff;
      transform: translateY(-1px);
      box-shadow: 0 6px 16px rgba(145, 70, 255, 0.4);
    }
    
    .btn-primary:active {
      transform: translateY(0);
    }
  `;

  private _handleClose() {
    this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
  }

  render() {
    return html`
      <div class="modal" @click="${(e: Event) => e.stopPropagation()}">
        <div class="header">
          <h2>${this.title || this._localize.t('variant.copyJsonTitle')}</h2>
          <button class="btn-close" @click="${this._handleClose}">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        
        <div class="content custom-scrollbar">
          <ui-json-explorer .data="${this.data}"></ui-json-explorer>
        </div>
        
        <div class="footer">
          <button class="btn btn-secondary" @click="${this._handleClose}">
            ${this._localize.t('common.ok')}
          </button>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'json-copy-modal': JsonCopyModal;
  }
}
