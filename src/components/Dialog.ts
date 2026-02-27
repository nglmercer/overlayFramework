import { html, css, LitElement } from 'lit';
import { Component, property, state, query } from '../litcomponents';
import { LocalizeController } from '../locales/localization';

export type DialogTheme = 'light' | 'dark' | 'system';
export type DialogType = 'alert' | 'confirm' | 'prompt' | 'modal';
export type DialogResult = boolean | string | null;

export interface DialogOptions {
  title?: string;
  message: string;
  type?: DialogType;
  theme?: DialogTheme;
  confirmText?: string;
  cancelText?: string;
  placeholder?: string;
  defaultValue?: string;
  showClose?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  danger?: boolean;
}

export interface DialogCloseEvent extends CustomEvent {
  detail: {
    result: DialogResult;
    action: 'confirm' | 'cancel' | 'close';
  };
}

declare global {
  interface HTMLElementEventMap {
    'dialog-close': DialogCloseEvent;
  }
}

@Component('app-dialog')
export class AppDialog extends LitElement {
  @property({ type: String }) title = '';
  @property({ type: String }) message = '';
  @property({ type: String }) type: DialogType = 'alert';
  @property({ type: String }) theme: DialogTheme = 'dark';
  @property({ type: String }) confirmText = '';
  @property({ type: String }) cancelText = '';
  @property({ type: String }) placeholder = '';
  @property({ type: String }) defaultValue = '';
  @property({ type: Boolean }) showClose = true;
  @property({ type: Boolean }) closeOnOverlayClick = true;
  @property({ type: Boolean }) closeOnEscape = true;
  @property({ type: Boolean }) danger = false;

  @state() private _isOpen = false;
  @state() private _inputValue = '';
  @state() private _theme: 'light' | 'dark' = 'dark';

  // Localization controller
  localizer = new LocalizeController(this);

  @query('#dialog-input') private _inputElement!: HTMLInputElement;
  @query('#dialog-overlay') private _overlayElement!: HTMLDivElement;

  private _resolvePromise: ((value: DialogResult) => void) | null = null;

  static styles = css`
    :host {
      display: contents;
    }

    .dialog-overlay {
      position: fixed;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      opacity: 0;
      visibility: hidden;
      transition: opacity 0.2s ease, visibility 0.2s ease;
    }

    .dialog-overlay.open {
      opacity: 1;
      visibility: visible;
    }

    .dialog-overlay.light {
      background: rgba(0, 0, 0, 0.4);
    }

    .dialog-overlay.dark {
      background: rgba(0, 0, 0, 0.7);
    }

    .dialog-container {
      position: relative;
      width: 90%;
      max-width: 420px;
      padding: 0;
      border-radius: 16px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
      transform: scale(0.9) translateY(20px);
      transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
      overflow: hidden;
    }

    .dialog-overlay.open .dialog-container {
      transform: scale(1) translateY(0);
    }

    /* Light theme */
    .dialog-container.light {
      background: #ffffff;
      border: 1px solid #e5e7eb;
      color: #111827;
    }

    .dialog-container.light .dialog-header {
      border-bottom: 1px solid #e5e7eb;
    }

    .dialog-container.light .dialog-title {
      color: #111827;
    }

    .dialog-container.light .dialog-message {
      color: #4b5563;
    }

    .dialog-container.light .dialog-input {
      background: #f9fafb;
      border: 1px solid #d1d5db;
      color: #111827;
    }

    .dialog-container.light .dialog-input:focus {
      border-color: #6366f1;
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
    }

    .dialog-container.light .dialog-input::placeholder {
      color: #9ca3af;
    }

    .dialog-container.light .dialog-close {
      color: #6b7280;
      background: transparent;
    }

    .dialog-container.light .dialog-close:hover {
      background: #f3f4f6;
      color: #111827;
    }

    .dialog-container.light .btn {
      font-weight: 500;
    }

    .dialog-container.light .btn-secondary {
      background: #f3f4f6;
      color: #374151;
      border: 1px solid #e5e7eb;
    }

    .dialog-container.light .btn-secondary:hover {
      background: #e5e7eb;
    }

    .dialog-container.light .btn-primary {
      background: #6366f1;
      color: #ffffff;
    }

    .dialog-container.light .btn-primary:hover {
      background: #4f46e5;
    }

    .dialog-container.light .btn-danger {
      background: #ef4444;
      color: #ffffff;
    }

    .dialog-container.light .btn-danger:hover {
      background: #dc2626;
    }

    /* Dark theme */
    .dialog-container.dark {
      background: #18181b;
      border: 1px solid #27272a;
      color: #fafafa;
    }

    .dialog-container.dark .dialog-header {
      border-bottom: 1px solid #27272a;
    }

    .dialog-container.dark .dialog-title {
      color: #fafafa;
    }

    .dialog-container.dark .dialog-message {
      color: #a1a1aa;
    }

    .dialog-container.dark .dialog-input {
      background: #27272a;
      border: 1px solid #3f3f46;
      color: #fafafa;
    }

    .dialog-container.dark .dialog-input:focus {
      border-color: #818cf8;
      box-shadow: 0 0 0 3px rgba(129, 140, 248, 0.1);
    }

    .dialog-container.dark .dialog-input::placeholder {
      color: #71717a;
    }

    .dialog-container.dark .dialog-close {
      color: #a1a1aa;
      background: transparent;
    }

    .dialog-container.dark .dialog-close:hover {
      background: #27272a;
      color: #fafafa;
    }

    .dialog-container.dark .btn {
      font-weight: 500;
    }

    .dialog-container.dark .btn-secondary {
      background: #27272a;
      color: #e4e4e7;
      border: 1px solid #3f3f46;
    }

    .dialog-container.dark .btn-secondary:hover {
      background: #3f3f46;
    }

    .dialog-container.dark .btn-primary {
      background: #6366f1;
      color: #ffffff;
    }

    .dialog-container.dark .btn-primary:hover {
      background: #818cf8;
    }

    .dialog-container.dark .btn-danger {
      background: #dc2626;
      color: #ffffff;
    }

    .dialog-container.dark .btn-danger:hover {
      background: #ef4444;
    }

    /* Common styles */
    .dialog-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 20px 24px 16px;
    }

    .dialog-title {
      font-size: 1.125rem;
      font-weight: 600;
      margin: 0;
      line-height: 1.4;
    }

    .dialog-close {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.15s ease;
      font-size: 1.25rem;
      line-height: 1;
    }

    .dialog-body {
      display: flex;
      gap: 10px;
      padding: 8px 24px 20px;
    }

    .dialog-message {
      font-size: 0.9375rem;
      line-height: 1.6;
      margin: 0;
    }

    .dialog-input {
      width: 100%;
      margin-top: 16px;
      padding: 12px 16px;
      border-radius: 10px;
      font-size: 0.9375rem;
      outline: none;
      transition: all 0.15s ease;
      box-sizing: border-box;
    }

    .dialog-footer {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 12px;
      padding: 16px 24px 20px;
      border-top: 1px solid transparent;
    }

    .dialog-container.light .dialog-footer {
      border-top-color: #e5e7eb;
    }

    .dialog-container.dark .dialog-footer {
      border-top-color: #27272a;
    }

    .btn {
      padding: 10px 20px;
      border-radius: 10px;
      font-size: 0.9375rem;
      cursor: pointer;
      transition: all 0.15s ease;
      border: none;
      outline: none;
    }

    .btn:focus-visible {
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.3);
    }

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Icon styles */
    .dialog-icon {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 16px;
      font-size: 1.5rem;
    }

    .dialog-container.light .dialog-icon.info {
      background: #e0e7ff;
      color: #4f46e5;
    }

    .dialog-container.light .dialog-icon.success {
      background: #dcfce7;
      color: #16a34a;
    }

    .dialog-container.light .dialog-icon.warning {
      background: #fef3c7;
      color: #d97706;
    }

    .dialog-container.light .dialog-icon.error {
      background: #fee2e2;
      color: #dc2626;
    }

    .dialog-container.light .dialog-icon.question {
      background: #e0e7ff;
      color: #6366f1;
    }

    .dialog-container.dark .dialog-icon.info {
      background: #312e81;
      color: #818cf8;
    }

    .dialog-container.dark .dialog-icon.success {
      background: #14532d;
      color: #4ade80;
    }

    .dialog-container.dark .dialog-icon.warning {
      background: #78350f;
      color: #fbbf24;
    }

    .dialog-container.dark .dialog-icon.error {
      background: #7f1d1d;
      color: #f87171;
    }

    .dialog-container.dark .dialog-icon.question {
      background: #312e81;
      color: #a5b4fc;
    }

    /* Responsive */
    @media (max-width: 480px) {
      .dialog-container {
        width: 95%;
        max-width: none;
        margin: 16px;
      }

      .dialog-header {
        padding: 16px 16px 12px;
      }

      .dialog-body {
        padding: 4px 16px 16px;
      }

      .dialog-footer {
        padding: 12px 16px 16px;
        flex-direction: column-reverse;
      }

      .dialog-footer .btn {
        width: 100%;
      }
    }
  `;

  connectedCallback() {
    super.connectedCallback();
    this._updateTheme();
    this._addGlobalListeners();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._removeGlobalListeners();
  }

  private _addGlobalListeners() {
    document.addEventListener('keydown', this._handleKeyDown);
  }

  private _removeGlobalListeners() {
    document.removeEventListener('keydown', this._handleKeyDown);
  }

  private _handleKeyDown = (e: KeyboardEvent) => {
    if (!this._isOpen) return;
    
    if (this.closeOnEscape && e.key === 'Escape') {
      this._handleCancel();
    }
    
    if (e.key === 'Enter' && this.type !== 'prompt') {
      if (e.shiftKey || e.ctrlKey || !e.altKey) {
        this._handleConfirm();
      }
    }
  };

  private _updateTheme() {
    if (this.theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      this._theme = prefersDark ? 'dark' : 'light';
    } else {
      this._theme = this.theme as 'light' | 'dark';
    }
  }

  public open(options: DialogOptions): Promise<DialogResult> {
    this.title = options.title || '';
    this.message = options.message;
    this.type = options.type || 'alert';
    this.theme = options.theme || 'dark';
    
    // Use localized default texts if not provided
    if (!options.confirmText) {
      this.confirmText = this.localizer.t(`dialog.${this.type === 'alert' ? 'ok' : 'confirm'}`);
    } else {
      this.confirmText = options.confirmText;
    }
    
    if (!options.cancelText) {
      this.cancelText = this.localizer.t('dialog.cancel');
    } else {
      this.cancelText = options.cancelText;
    }
    
    if (!options.placeholder && this.type === 'prompt') {
      this.placeholder = this.localizer.t('dialog.placeholder.default');
    } else {
      this.placeholder = options.placeholder || '';
    }
    this.defaultValue = options.defaultValue || '';
    this.showClose = options.showClose !== undefined ? options.showClose : true;
    this.closeOnOverlayClick = options.closeOnOverlayClick !== undefined ? options.closeOnOverlayClick : true;
    this.closeOnEscape = options.closeOnEscape !== undefined ? options.closeOnEscape : true;
    this.danger = options.danger || false;
    
    this._inputValue = this.defaultValue;
    this._updateTheme();
    
    this._isOpen = true;
    this.requestUpdate();
    
    // Focus input for prompt
    setTimeout(() => {
      if (this.type === 'prompt' && this._inputElement) {
        this._inputElement.focus();
        this._inputElement.select();
      }
    }, 100);
    
    return new Promise((resolve) => {
      this._resolvePromise = resolve;
    });
  }

  public close(result: DialogResult = null, action: 'confirm' | 'cancel' | 'close' = 'close') {
    this._isOpen = false;
    this._resolvePromise?.(result);
    this._resolvePromise = null;
    this.requestUpdate();
    
    this.dispatchEvent(new CustomEvent('dialog-close', {
      detail: { result, action },
      bubbles: true,
      composed: true
    }));
  }

  private _handleOverlayClick(e: MouseEvent) {
    if (this.closeOnOverlayClick && e.target === this._overlayElement) {
      this._handleCancel();
    }
  }

  private _handleConfirm() {
    if (this.type === 'prompt') {
      this.close(this._inputValue, 'confirm');
    } else {
      this.close(true, 'confirm');
    }
  }

  private _handleCancel() {
    if (this.type === 'prompt') {
      this.close(null, 'cancel');
    } else {
      this.close(false, 'cancel');
    }
  }

  private _handleInputChange(e: Event) {
    this._inputValue = (e.target as HTMLInputElement).value;
  }

  private _getIcon(): string {
    switch (this.type) {
      case 'confirm':
      case 'modal':
        return '?';
      case 'prompt':
        return '?';
      case 'alert':
      default:
        return this.danger ? '!' : 'i';
    }
  }

  private _getIconClass(): string {
    if (this.danger) return 'error';
    switch (this.type) {
      case 'confirm':
      case 'modal':
        return 'question';
      case 'prompt':
        return 'question';
      default:
        return 'info';
    }
  }

  private _getDefaultTitle(): string {
    if (this.title) return this.title;
    
    switch (this.type) {
      case 'confirm':
        return this.localizer.t('dialog.title.confirm');
      case 'prompt':
        return this.localizer.t('dialog.title.input');
      case 'modal':
        return this.localizer.t('dialog.title.modal');
      default:
        return this.localizer.t('dialog.title.alert');
    }
  }

  render() {
    const title = this._getDefaultTitle();
    const iconClass = this._getIconClass();
    
    // Get localized button texts
    const confirmBtnText = this.confirmText || this.localizer.t(`dialog.${this.type === 'alert' ? 'ok' : 'confirm'}`);
    const cancelBtnText = this.cancelText || this.localizer.t('dialog.cancel');
    const inputPlaceholder = this.placeholder || this.localizer.t('dialog.placeholder.default');
    const closeLabel = this.localizer.t('dialog.close');
    
    return html`
      <div 
        id="dialog-overlay"
        class="dialog-overlay ${this._theme} ${this._isOpen ? 'open' : ''}"
        @click="${this._handleOverlayClick}"
      >
        <div class="dialog-container ${this._theme}" role="dialog" aria-modal="true">
          <div class="dialog-header">
            <h2 class="dialog-title">${title}</h2>
            ${this.showClose ? html`
              <button 
                class="dialog-close" 
                @click="${this._handleCancel}"
                aria-label="${closeLabel}"
              >
                ×
              </button>
            ` : ''}
          </div>
          
          <div class="dialog-body">
            ${this.type !== 'modal' ? html`
              <div class="dialog-icon ${iconClass}">
                ${this._getIcon()}
              </div>
            ` : ''}
            
            <p class="dialog-message">${this.message}</p>
            
            ${this.type === 'prompt' ? html`
              <input
                id="dialog-input"
                class="dialog-input"
                type="text"
                .value="${this._inputValue}"
                placeholder="${inputPlaceholder}"
                @input="${this._handleInputChange}"
                @keydown="${(e: KeyboardEvent) => {
                  if (e.key === 'Enter') {
                    this._handleConfirm();
                  }
                }}"
              />
            ` : ''}
          </div>
          
          <div class="dialog-footer">
            ${this.type === 'alert' ? html`
              <button 
                class="btn ${this.danger ? 'btn-danger' : 'btn-primary'}"
                @click="${this._handleConfirm}"
              >
                ${confirmBtnText}
              </button>
            ` : html`
              <button 
                class="btn btn-secondary"
                @click="${this._handleCancel}"
              >
                ${cancelBtnText}
              </button>
              <button 
                class="btn ${this.danger ? 'btn-danger' : 'btn-primary'}"
                @click="${this._handleConfirm}"
              >
                ${confirmBtnText}
              </button>
            `}
          </div>
        </div>
      </div>
    `;
  }
}
