import { html, css, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { getLocale, setLocale } from '../../locales/localization';

@customElement('editor-topbar')
export class EditorTopbar extends LitElement {
  static styles = css`
    :host {
      display: block;
    }
    
    .topbar {
      height: 3.5rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 1rem;
      background-color: #18181b;
      flex-shrink: 0;
    }
    
    .btn-back {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;
      font-weight: 600;
      background-color: #3a3a3d;
      color: white;
      padding: 0.375rem 0.75rem;
      border-radius: 9999px;
      border: none;
      cursor: pointer;
      transition: background-color 0.2s;
    }
    
    .btn-back:hover {
      background-color: #464649;
    }
    
    .locale-select {
      background: #3a3a3d;
      color: white;
      border: none;
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
      cursor: pointer;
      font-size: 0.875rem;
    }
  `;

  @property({ type: String }) title = '';
  @property({ type: String }) backLabel = '';
  @property({ type: Function }) onBack: () => void = () => {};

  private _handleLocaleChange(e: Event) {
    const select = e.target as HTMLSelectElement;
    setLocale(select.value);
    this.requestUpdate();
  }

  render() {
    return html`
      <div class="topbar">
        <button class="btn-back" @click="${this.onBack}">
          <span>← ${this.backLabel}</span>
        </button>
        <div style="font-weight: 700;">${this.title}</div>
        <div style="display: flex; align-items: center; gap: 1rem;">
          <select 
            class="locale-select"
            @change="${this._handleLocaleChange}"
            .value="${getLocale()}"
          >
            <option value="es">Español</option>
            <option value="en">English</option>
          </select>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'editor-topbar': EditorTopbar;
  }
}
