import { html, css, LitElement, unsafeCSS } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { LocalizeController } from '../../locales/localization';

// Import external CSS
import styles from './EditorLeftSidebar.css?inline';

@customElement('editor-left-sidebar')
export class EditorLeftSidebar extends LitElement {
  static styles = css`
    ${unsafeCSS(styles)}
    :host {
      display: block;
      flex-shrink: 0;
    }
  `;

  @state() private _collapsed = false;

  private _localize = new LocalizeController(this);

  private _t(key: string): string {
    return this._localize.t(key);
  }

  private _toggleCollapse() {
    this._collapsed = !this._collapsed;
  }

  render() {
    const collapsed = this._collapsed;
    return html`
      <div class="sidebar-left ${collapsed ? 'collapsed' : ''}">
        <div class="sidebar-header">
          <div class="header-actions">
            <button class="btn-collapse" @click="${this._toggleCollapse}"
                    title="${collapsed ? 'Expand sidebar' : 'Collapse sidebar'}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                   stroke-linecap="round" stroke-linejoin="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>
          </div>
          <span class="header-title">${this._t('sidebar.global')}</span>
        </div>

        <div class="sidebar-body custom-scrollbar">
          <!-- Global settings content - handled separately -->
        </div>
      </div>
    `;
  }
}
