import { html, css, LitElement } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { AlertVariant } from '../../lib/db';
import { LocalizeController } from '../../locales/localization';
import { AppAlertView } from '../AlertView';

type BgColor = 'transparent' | '#000000' | '#ffffff' | '#ff0000';

@customElement('editor-preview')
export class EditorPreview extends LitElement {
  static styles = css`
    :host {
      display: block;
      flex: 1;
    }
    
    .preview-area {
      flex: 1;
      display: flex;
      flex-direction: column;
      background-color: #0e0e10;
      position: relative;
      height: 99%;
    }
    
    .preview-header {
      padding: 0.75rem 1rem;
      background-color: #1a1a1c;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      display: flex;
      gap: 0.5rem;
    }
    
    .btn-preview {
      background-color: #3a3a3d;
      color: white;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 9999px;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      transition: background-color 0.2s;
    }
    
    .btn-preview:hover {
      background-color: #464649;
    }
    
    .preview-content {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: auto;
      padding: 2rem;
    }
    
    .preview-canvas {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.1);
      overflow: hidden;
      transition: all 0.2s;
    }
    
    .bg-checker {
      background-image: linear-gradient(45deg, #18181b 25%, transparent 25%), linear-gradient(-45deg, #18181b 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #18181b 75%), linear-gradient(-45deg, transparent 75%, #18181b 75%);
      background-size: 24px 24px;
      background-position: 0 0, 0 12px, 12px -12px, -12px 0px;
    }
    
    .preview-footer {
      padding: 0.75rem 1rem;
      background-color: #1a1a1c;
      border-top: 1px solid rgba(255, 255, 255, 0.05);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    
    .preview-options {
      display: flex;
      align-items: center;
      gap: 1.5rem;
    }
    
    .size-input {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;
      font-weight: 500;
    }
    
    .size-input input {
      background-color: #0e0e10;
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: white;
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
      width: 60px;
      text-align: center;
    }
    
    .bg-toggles {
      display: flex;
      gap: 0.25rem;
      background-color: #0e0e10;
      padding: 0.25rem;
      border-radius: 0.5rem;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
    
    .bg-btn {
      width: 1.5rem;
      height: 1.5rem;
      border-radius: 0.25rem;
      border: 2px solid transparent;
      cursor: pointer;
    }
    
    .bg-btn.active {
      border-color: #9146FF;
    }

    /* ── Responsive Styles ── */
    @media (max-width: 1024px) {
      .preview-content {
        padding: 1rem;
      }

      .preview-footer {
        flex-wrap: wrap;
        gap: 0.5rem;
      }

      .preview-options {
        gap: 1rem;
      }
    }

    @media (max-width: 768px) {
      .preview-header {
        flex-wrap: wrap;
        gap: 0.5rem;
      }

      .preview-content {
        padding: 0.5rem;
      }

      .preview-footer {
        flex-direction: column;
        align-items: stretch;
      }

      .preview-options {
        justify-content: center;
      }

      .size-input {
        justify-content: center;
      }
    }
  `;

  @property({ type: Object }) variant: AlertVariant | null = null;
  @property({ type: Number }) width = 600;
  @property({ type: Number }) height = 600;
  @property({ type: String }) bgColor: BgColor = 'transparent';

  @query('app-alert-view') private alertView!: AppAlertView;

  private _localize = new LocalizeController(this);

  private _t(key: string): string {
    return this._localize.t(key);
  }

  private _handlePlay() {
    this.dispatchEvent(new CustomEvent('play-preview', { bubbles: true, composed: true }));
  }

  private _handleSendTest() {
    this.dispatchEvent(new CustomEvent('send-test', { bubbles: true, composed: true }));
  }

  private _handleWidthChange(e: Event) {
    const input = e.target as HTMLInputElement;
    this.dispatchEvent(new CustomEvent('width-change', {
      detail: Number(input.value),
      bubbles: true,
      composed: true
    }));
  }

  private _handleHeightChange(e: Event) {
    const input = e.target as HTMLInputElement;
    this.dispatchEvent(new CustomEvent('height-change', {
      detail: Number(input.value),
      bubbles: true,
      composed: true
    }));
  }

  private _handleBgChange(color: BgColor) {
    this.dispatchEvent(new CustomEvent('bg-change', {
      detail: color,
      bubbles: true,
      composed: true
    }));
  }

  // Public method to trigger preview animation - called by parent Editor
  public async playPreview() {
    if (this.alertView && this.alertView.playPreview) {
      await this.alertView.playPreview();
    }
  }

  render() {
    const bgClass = this.bgColor === 'transparent' ? 'bg-checker' : '';
    const bgStyle = this.bgColor === 'transparent' ? 'transparent' : this.bgColor;

    return html`
      <div class="preview-area">
        ${this.variant ? html`
          <div class="preview-header">
            <button class="btn-preview" @click="${this._handlePlay}">${this._t('preview.alert')}</button>
            <button class="btn-preview" @click="${this._handleSendTest}">${this._t('preview.sendTest')}</button>
          </div>
          <div class="preview-content">
            <div 
              class="preview-canvas ${bgClass}" 
              style="width: ${this.width}px; height: ${this.height}px; background-color: ${bgStyle};"
            >
              <app-alert-view 
                .variant="${this.variant}" 
                .eventData="${{ username: 'FlavioliRavioli', amount: '1000', months: '6' }}"
              ></app-alert-view>
            </div>
          </div>
          <div class="preview-footer">
            <div style="font-size: 0.875rem; font-weight: 600;">${this._t('preview.options')}</div>
            <div class="preview-options">
              <div class="size-input">
                <label>${this._t('preview.width')}</label>
                <input 
                  type="number" 
                  .value="${this.width.toString()}" 
                  @change="${this._handleWidthChange}"
                >
              </div>
              <div class="size-input">
                <label>${this._t('preview.height')}</label>
                <input 
                  type="number" 
                  .value="${this.height.toString()}" 
                  @change="${this._handleHeightChange}"
                >
              </div>
              <div class="bg-toggles">
                <button 
                  class="bg-btn bg-checker ${this.bgColor === 'transparent' ? 'active' : ''}" 
                  @click="${() => this._handleBgChange('transparent')}"
                ></button>
                <button 
                  class="bg-btn ${this.bgColor === '#000000' ? 'active' : ''}" 
                  style="background-color: #000000;" 
                  @click="${() => this._handleBgChange('#000000')}"
                ></button>
                <button 
                  class="bg-btn ${this.bgColor === '#ffffff' ? 'active' : ''}" 
                  style="background-color: #ffffff;" 
                  @click="${() => this._handleBgChange('#ffffff')}"
                ></button>
                <button 
                  class="bg-btn ${this.bgColor === '#ff0000' ? 'active' : ''}" 
                  style="background-color: #ff0000;" 
                  @click="${() => this._handleBgChange('#ff0000')}"
                ></button>
              </div>
            </div>
          </div>
        ` : html`
          <div class="preview-content">
            <div class="preview-canvas bg-checker" style="width: 400px; height: 400px;">
              ${this._t('preview.select')}
            </div>
          </div>
        `}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'editor-preview': EditorPreview;
  }
}
