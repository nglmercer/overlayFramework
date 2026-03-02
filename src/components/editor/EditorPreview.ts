import { html, css, LitElement,unsafeCSS } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { AlertVariant } from '../../lib/db';
import { LocalizeController } from '../../locales/localization';
import { getWebSocketUrl } from '../../lib/config';
import { EVENTS } from '../../lib/constants';
import EditorPreviewCSS from './EditorPreview.css?inline';

type BgColor = 'transparent' | '#000000' | '#ffffff' | '#ff0000';

@customElement('editor-preview')
export class EditorPreview extends LitElement {

  static styles = css`
    :host {
      display: block;
      flex: 1;
    }
      ${unsafeCSS(EditorPreviewCSS)}
  `;
  @property({ type: Object }) variant: AlertVariant | null = null;
  @property({ type: Array }) variants: AlertVariant[] = [];
  @property({ type: Number }) width = 600;
  @property({ type: Number }) height = 600;
  @property({ type: String }) bgColor: BgColor = 'transparent';

  @query('iframe') private iframeRef!: HTMLIFrameElement;

  private _localize = new LocalizeController(this);
  
  // Track if iframe is ready
  @state() private iframeReady = false;

  // Polling retry handle so we can cancel on disconnect
  private _sendRetryTimeout: ReturnType<typeof setTimeout> | null = null;

  private _t(key: string): string {
    return this._localize.t(key);
  }

  private _handlePlay() {
    this.dispatchEvent(new CustomEvent(EVENTS.COMPONENT.PLAY_PREVIEW, { bubbles: true, composed: true }));
  }

  private _handleSendTest() {
    this.dispatchEvent(new CustomEvent(EVENTS.COMPONENT.SEND_TEST, { bubbles: true, composed: true }));
  }

  private _handleWidthChange(e: Event) {
    const input = e.target as HTMLInputElement;
    this.dispatchEvent(new CustomEvent(EVENTS.COMPONENT.WIDTH_CHANGE, {
      detail: Number(input.value),
      bubbles: true,
      composed: true
    }));
  }

  private _handleHeightChange(e: Event) {
    const input = e.target as HTMLInputElement;
    this.dispatchEvent(new CustomEvent(EVENTS.COMPONENT.HEIGHT_CHANGE, {
      detail: Number(input.value),
      bubbles: true,
      composed: true
    }));
  }

  private _handleBgChange(color: BgColor) {
    this.dispatchEvent(new CustomEvent(EVENTS.COMPONENT.BG_CHANGE, {
      detail: color,
      bubbles: true,
      composed: true
    }));
  }

  // Public method to trigger preview animation - called by parent Editor
  public async playPreview() {
    if (this.iframeRef && this.iframeReady) {
      this.iframeRef.contentWindow?.postMessage({ type: EVENTS.WINDOW.PLAY_PREVIEW }, '*');
    }
  }

  // Send variant update to iframe
  private _sendVariantToIframe() {
    if (!this.iframeRef || !this.iframeReady) return;

    const eventData = { username: 'TestUser', amount: '100', months: '1' };

    const serializeVariant = (v: AlertVariant | null) => {
      if (!v) return null;
      return JSON.parse(JSON.stringify(v));
    };

    // Ensure variants is an array before mapping
    const safeVariants = Array.isArray(this.variants) ? this.variants : [];
    console.log('[EditorPreview] Sending variants to iframe:', safeVariants.length, 'variant:', this.variant?.id);

    this.iframeRef.contentWindow?.postMessage({
      type: EVENTS.WINDOW.UPDATE_VARIANT,
      payload: {
        variant: serializeVariant(this.variant),
        variants: safeVariants.map(serializeVariant),
        eventData: eventData
      }
    }, '*');
  }

  // Poll until we have real variant data, then send.
  // Needed because the IndexedDB Task in Editor.ts resolves async—
  // the iframe can fire PREVIEW_READY before the parent's variants arrive.
  private _scheduleSendVariant() {
    if (this._sendRetryTimeout) {
      clearTimeout(this._sendRetryTimeout);
      this._sendRetryTimeout = null;
    }

    const MAX_ATTEMPTS = 30; // 30 × 100ms = 3 seconds max
    let attempts = 0;

    const tryNow = () => {
      // If we have real data, send immediately
      if (this.variant || (Array.isArray(this.variants) && this.variants.length > 0)) {
        this._sendVariantToIframe();
        return;
      }

      // No data yet — retry after 100ms
      attempts++;
      if (attempts < MAX_ATTEMPTS) {
        this._sendRetryTimeout = setTimeout(tryNow, 100);
      } else {
        // Timed out — send whatever we have (even if empty)
        console.warn('[EditorPreview] Timed out waiting for variants, sending empty payload');
        this._sendVariantToIframe();
      }
    };

    // Start on the next tick so Lit can flush any pending updates first
    this._sendRetryTimeout = setTimeout(tryNow, 0);
  }

  // Handle messages from iframe
  private _handleIframeMessage = (event: MessageEvent) => {
    // Only handle messages from our iframe
    if (this.iframeRef && event.source !== this.iframeRef.contentWindow) {
      return;
    }

    const { type, payload } = event.data;

    if (type === EVENTS.WINDOW.PREVIEW_READY) {
      this.iframeReady = true;
      console.log('[EditorPreview] Iframe ready');
      // Delay send so Lit can finish flushing pending property updates
      this._scheduleSendVariant();
    }
    else if (type === 'connection-info') {
      console.log('[EditorPreview] Connection info:', payload);
    }
    else if (type === 'alert') {
      // Forward alert events to parent
      this.dispatchEvent(new CustomEvent(EVENTS.COMPONENT.WS_ALERT, {
        detail: payload,
        bubbles: true,
        composed: true,
      }));
    }
    else if (type === 'connection-change') {
      // Forward connection changes to parent
      this.dispatchEvent(new CustomEvent(EVENTS.COMPONENT.WS_CONNECTION_CHANGE, {
        detail: payload,
        bubbles: true,
        composed: true,
      }));
    }
  };

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener('message', this._handleIframeMessage);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('message', this._handleIframeMessage);
    if (this._sendRetryTimeout) {
      clearTimeout(this._sendRetryTimeout);
      this._sendRetryTimeout = null;
    }
  }

  // Send variant to iframe when relevant properties change
  updated(changedProperties: Map<string, unknown>) {
    const variantChanged = changedProperties.has('variant') || changedProperties.has('variants');
    const iframeJustReady = changedProperties.has('iframeReady') && this.iframeReady;

    if (iframeJustReady) {
      // iframeReady just flipped true — variants may or may not be here yet
      this._scheduleSendVariant();
    } else if (variantChanged && this.iframeReady) {
      // Variants/variant updated while iframe was already ready — send immediately
      this._sendVariantToIframe();
    }
  }

  render() {
    const bgClass = this.bgColor === 'transparent' ? 'bg-checker' : '';
    const bgStyle = this.bgColor === 'transparent' ? 'transparent' : this.bgColor;

    // Get the preview HTML URL
    const previewUrl = '/preview.html';

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
              <iframe 
                class="preview-iframe"
                src="${previewUrl}"
                sandbox="allow-scripts allow-same-origin"
              ></iframe>
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
