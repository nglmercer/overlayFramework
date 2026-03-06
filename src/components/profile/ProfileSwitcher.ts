import { html, unsafeCSS, LitElement, css } from 'lit';
import { Component, state } from '../../litcomponents';
import { profileManager, type Profile } from '../../lib/profile-manager';

/**
 * Profile switcher dropdown — shown in the Dashboard header.
 * Fires 'profile-switched' when the user selects a different profile.
 */
@Component('app-profile-switcher')
export class AppProfileSwitcher extends LitElement {
  static styles = css`
    :host { position: relative; display: inline-block; }

    .trigger {
      display: flex; align-items: center; gap: 0.5rem;
      background: #27272a; border: 1px solid rgba(255,255,255,0.08);
      border-radius: 0.5rem; padding: 0.375rem 0.75rem;
      cursor: pointer; color: white; font-size: 0.8rem;
      font-weight: 500; font-family: inherit;
      transition: border-color 0.2s, background 0.2s;
      user-select: none;
    }
    .trigger:hover { border-color: rgba(145,70,255,0.4); background: #3f3f46; }

    .color-dot {
      width: 0.6rem; height: 0.6rem;
      border-radius: 50%; flex-shrink: 0;
    }

    .chevron {
      width: 0.75rem; height: 0.75rem; color: #71717a;
      transition: transform 0.2s;
    }
    .chevron.open { transform: rotate(180deg); }

    /* Dropdown */
    .dropdown {
      position: absolute; top: calc(100% + 0.375rem); right: 0;
      background: #18181b; border: 1px solid rgba(255,255,255,0.1);
      border-radius: 0.75rem; min-width: 220px;
      box-shadow: 0 16px 40px rgba(0,0,0,0.5);
      z-index: 1000; overflow: hidden;
      animation: dropIn 0.15s ease;
    }
    @keyframes dropIn {
      from { opacity: 0; transform: translateY(-6px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .dropdown-section { padding: 0.375rem; }
    .dropdown-label {
      padding: 0.375rem 0.625rem; font-size: 0.65rem;
      text-transform: uppercase; letter-spacing: 0.08em;
      color: #52525b; font-weight: 600;
    }

    .profile-item {
      display: flex; align-items: center; gap: 0.625rem;
      padding: 0.5rem 0.625rem; border-radius: 0.5rem;
      cursor: pointer; transition: background 0.15s;
    }
    .profile-item:hover { background: #27272a; }
    .profile-item.active { background: rgba(145,70,255,0.12); }

    .profile-item-name {
      flex: 1; font-size: 0.8rem; color: #e4e4e7; font-weight: 500;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .profile-item-active-badge {
      font-size: 0.65rem; background: rgba(145,70,255,0.25);
      color: #c084fc; padding: 0.1rem 0.375rem;
      border-radius: 999px; font-weight: 600;
    }

    .divider { height: 1px; background: rgba(255,255,255,0.06); margin: 0.25rem 0; }

    .action-item {
      display: flex; align-items: center; gap: 0.625rem;
      padding: 0.5rem 0.625rem; border-radius: 0.5rem;
      cursor: pointer; transition: background 0.15s;
      font-size: 0.8rem; color: #a1a1aa;
      background: transparent; border: none; width: 100%;
      font-family: inherit; text-align: left;
    }
    .action-item:hover { background: #27272a; color: #e4e4e7; }
    .action-item svg { width: 0.875rem; height: 0.875rem; flex-shrink: 0; }
  `;

  @state() private open = false;
  @state() private profiles: Profile[] = [];
  @state() private activeId: string | null = null;

  connectedCallback() {
    super.connectedCallback();
    this._load();
    // Close on outside click
    document.addEventListener('click', this._onDocClick);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('click', this._onDocClick);
  }

  private _load() {
    this.profiles = profileManager.listProfiles();
    this.activeId = profileManager.getActiveProfileId();
  }

  private _onDocClick = (e: MouseEvent) => {
    if (!this.contains(e.target as Node)) this.open = false;
  };

  private _toggle(e: MouseEvent) {
    e.stopPropagation();
    this.open = !this.open;
  }

  private _switch(id: string) {
    if (id === this.activeId) { this.open = false; return; }
    profileManager.switchProfile(id);
    this.activeId = id;
    this.open = false;
    this.dispatchEvent(new CustomEvent('profile-switched', {
      detail: { profileId: id },
      bubbles: true, composed: true,
    }));
    // Reload to refresh all data from the new profile
    window.location.reload();
  }

  private _addNew() {
    this.open = false;
    this.dispatchEvent(new CustomEvent('profile-add-requested', {
      bubbles: true, composed: true,
    }));
  }

  private async _export() {
    this.open = false;
    const result = await profileManager.pushToBackend();
    if (result.ok) {
      alert('Profile data pushed to backend successfully!');
    } else {
      alert(`Export failed: ${(result as any).error}`);
    }
  }

  private get _activeProfile(): Profile | null {
    return this.profiles.find(p => p.id === this.activeId) ?? null;
  }

  render() {
    const active = this._activeProfile;

    return html`
      <div class="trigger" @click="${this._toggle}">
        <div class="color-dot" style="background: ${active?.color ?? '#9146FF'}"></div>
        <span>${active?.name ?? 'No Profile'}</span>
        <svg class="chevron ${this.open ? 'open' : ''}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"/>
        </svg>
      </div>

      ${this.open ? html`
        <div class="dropdown">
          <div class="dropdown-section">
            <div class="dropdown-label">Profiles</div>
            ${this.profiles.map(p => html`
              <div
                class="profile-item ${p.id === this.activeId ? 'active' : ''}"
                @click="${() => this._switch(p.id)}"
              >
                <div class="color-dot" style="background: ${p.color ?? '#9146FF'}"></div>
                <span class="profile-item-name">${p.name}</span>
                ${p.id === this.activeId
                  ? html`<span class="profile-item-active-badge">active</span>`
                  : ''}
              </div>
            `)}
          </div>

          <div class="divider"></div>

          <div class="dropdown-section">
            <button class="action-item" @click="${this._addNew}">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/>
              </svg>
              Link another instance…
            </button>
            <button class="action-item" @click="${this._export}">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
              </svg>
              Push data to backend
            </button>
          </div>
        </div>
      ` : ''}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'app-profile-switcher': AppProfileSwitcher;
  }
}
