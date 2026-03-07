import { html, css, LitElement, TemplateResult } from 'lit';
import { Component, property, state } from '../../litcomponents';
import { copyToClipboard } from '../../lib/browser-utils';
import { LocalizeController } from '../../locales/localization';

@Component('ui-json-explorer')
export class UIJsonExplorer extends LitElement {
  @property({ type: Object }) data: any = {};
  @property({ type: String }) rootKey = 'Root';
  
  @state() private _expandedPaths = new Set<string>();
  @state() private _lastCopied: string | null = null;
  
  private _localize = new LocalizeController(this);

  static styles = css`
    :host {
      display: block;
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
      font-size: 0.8125rem;
      color: #e4e4e7;
      background: #09090b;
      padding: 1rem;
      border-radius: 0.5rem;
      overflow: auto;
      max-height: 400px;
    }
    
    .root {
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
    }
    
    .item {
      padding: 0.125rem 0;
    }
    
    .node {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 2px 8px;
      border-radius: 4px;
      transition: background 0.15s;
    }
    
    .node.clickable {
      cursor: pointer;
    }
    
    .node:hover {
      background: rgba(255, 255, 255, 0.05);
    }
    
    .node:hover .actions {
      opacity: 1;
    }
    
    .chevron {
      width: 0.875rem;
      height: 0.875rem;
      transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      opacity: 0.5;
    }
    
    .chevron.expanded {
      transform: rotate(90deg);
    }
    
    .key {
      color: #c084fc;
      font-weight: 500;
    }
    
    .separator {
      opacity: 0.4;
      margin-right: 0.25rem;
    }
    
    .value {
      word-break: break-all;
    }
    
    .value.string { color: #facc15; }
    .value.number { color: #60a5fa; }
    .value.boolean { color: #f87171; }
    .value.null { color: #94a3b8; }
    .value.object { color: #94a3b8; font-style: italic; font-size: 0.75rem; }
    
    .children {
      margin-left: 1.25rem;
      border-left: 1px solid rgba(255, 255, 255, 0.1);
      padding-left: 0.5rem;
      display: none;
    }
    
    .children.expanded {
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
    }
    
    .actions {
      display: flex;
      gap: 0.25rem;
      opacity: 0;
      transition: opacity 0.2s;
      margin-left: auto;
    }
    
    .btn-copy {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.05);
      color: #a1a1aa;
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    }
    
    .btn-copy:hover {
      background: rgba(145, 70, 255, 0.2);
      border-color: rgba(145, 70, 255, 0.3);
      color: #a78bfa;
    }
    
    .btn-copy.copied {
      color: #4ade80;
      border-color: rgba(74, 222, 128, 0.3);
      background: rgba(74, 222, 128, 0.1);
    }
    
    svg {
      width: 0.875rem;
      height: 0.875rem;
    }

    /* Scrollbar */
    :host::-webkit-scrollbar { width: 6px; }
    :host::-webkit-scrollbar-track { background: transparent; }
    :host::-webkit-scrollbar-thumb { background: #27272a; border-radius: 10px; }
    :host::-webkit-scrollbar-thumb:hover { background: #3f3f46; }
  `;

  private _toggle(path: string, e: Event) {
    e.stopPropagation();
    if (this._expandedPaths.has(path)) {
      this._expandedPaths.delete(path);
    } else {
      this._expandedPaths.add(path);
    }
    this._expandedPaths = new Set(this._expandedPaths);
  }

  private async _copy(value: any, path: string, e: Event) {
    e.stopPropagation();
    const text = typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);
    const success = await copyToClipboard(text);
    if (success) {
      this._lastCopied = path;
      setTimeout(() => {
        if (this._lastCopied === path) this._lastCopied = null;
      }, 2000);
    }
  }

  private _renderValue(value: any, path: string, key?: string): TemplateResult {
    const isExpanded = this._expandedPaths.has(path);
    const isCopied = this._lastCopied === path;

    if (value === null) {
      return html`
        <div class="node">
          ${key ? html`<span class="key">${key}</span><span class="separator">:</span>` : ''}
          <span class="value null">null</span>
          <div class="actions">
            ${this._renderCopyBtn(value, path, isCopied)}
          </div>
        </div>
      `;
    }
    
    const type = typeof value;
    
    if (type === 'object') {
      const isArray = Array.isArray(value);
      const keys = Object.keys(value);
      const label = isArray ? `Array(${value.length})` : `Object {${keys.length}}`;
      
      return html`
        <div class="item">
          <div class="node clickable" @click="${(e: Event) => this._toggle(path, e)}">
            <svg class="chevron ${isExpanded ? 'expanded' : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
            ${key ? html`<span class="key">${key}</span><span class="separator">:</span>` : ''}
            <span class="value object">${label}</span>
            <div class="actions">
              ${this._renderCopyBtn(value, path, isCopied)}
            </div>
          </div>
          <div class="children ${isExpanded ? 'expanded' : ''}">
            ${keys.map(k => this._renderValue(value[k], `${path}.${k}`, k))}
          </div>
        </div>
      `;
    }

    return html`
      <div class="node">
        ${key ? html`<span class="key">${key}</span><span class="separator">:</span>` : ''}
        <span class="value ${type}">${type === 'string' ? `"${value}"` : value}</span>
        <div class="actions">
          ${this._renderCopyBtn(value, path, isCopied)}
        </div>
      </div>
    `;
  }

  private _renderCopyBtn(value: any, path: string, isCopied: boolean) {
    return html`
      <button 
        class="btn-copy ${isCopied ? 'copied' : ''}" 
        title="${this._localize.t('variant.copyValue')}" 
        @click="${(e: Event) => this._copy(value, path, e)}"
      >
        ${isCopied ? 
          html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>` : 
          html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`
        }
      </button>
    `;
  }

  render() {
    return html`
      <div class="root">
        ${this._renderValue(this.data, this.rootKey)}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-json-explorer': UIJsonExplorer;
  }
}
