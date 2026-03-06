import { html, unsafeCSS, LitElement } from 'lit';
import { Component, state } from '../../litcomponents';
import { profileManager, type Profile } from '../../lib/profile-manager';
import { getBackendEndpoint } from '../../lib/config';
import { t as translate } from '../../locales/localization';

import styles from './ProfileSetupModal.css?inline';

// ============================================================================
// TYPES
// ============================================================================

type CheckState = 'idle' | 'checking' | 'found' | 'notfound' | 'error';
type SubmitState = 'idle' | 'loading' | 'done' | 'error';
type ProfilesLoadingState = 'idle' | 'loading' | 'done' | 'error';

// ============================================================================
// PRESET COLORS
// ============================================================================

const PROFILE_COLORS = [
  '#9146FF', // Twitch purple
  '#22c55e', // Green
  '#3b82f6', // Blue
  '#f97316', // Orange
  '#ec4899', // Pink
  '#eab308', // Yellow
];

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * First-run setup modal — shown when no active profile exists.
 * Fires 'profile-ready' CustomEvent when the user completes setup.
 */
@Component('app-profile-setup')
export class AppProfileSetup extends LitElement {
  static styles = unsafeCSS(styles);

  // --- Sync panel state ---
  @state() private syncId = '';
  @state() private syncCheckState: CheckState = 'idle';
  @state() private syncCheckMessage = '';
  @state() private syncSubmitState: SubmitState = 'idle';
  @state() private syncError = '';

  // --- Backend profiles list state ---
  @state() private backendProfiles: Profile[] = [];
  @state() private profilesLoadingState: ProfilesLoadingState = 'idle';
  @state() private profilesError = '';

  // --- Create panel state ---
  @state() private createName = '';
  @state() private createColor = PROFILE_COLORS[0];
  @state() private createSubmitState: SubmitState = 'idle';
  @state() private createError = '';

  // -------------------------------------------------------------------------
  // LIFECYCLE
  // -------------------------------------------------------------------------

  connectedCallback() {
    super.connectedCallback();
    this._fetchBackendProfiles();
  }

  // -------------------------------------------------------------------------
  // BACKEND PROFILES FETCH
  // -------------------------------------------------------------------------

  private async _fetchBackendProfiles() {
    this.profilesLoadingState = 'loading';
    this.profilesError = '';

    try {
      const url = getBackendEndpoint('/profiles');
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        this.backendProfiles = (data.profiles ?? []).map((p: any) => ({
          id: p.id,
          name: p.name,
          color: p.color,
          createdAt: p.createdAt,
        }));
        this.profilesLoadingState = 'done';
      } else {
        this.profilesLoadingState = 'error';
        this.profilesError = this._t('profile.error.loadFailed');
      }
    } catch {
      this.profilesLoadingState = 'error';
      this.profilesError = this._t('profile.error.cannotReach');
    }
  }

  // -------------------------------------------------------------------------
  // SYNC PANEL HANDLERS
  // -------------------------------------------------------------------------

  private _onSyncIdInput(e: Event) {
    this.syncId = (e.target as HTMLInputElement).value.trim();
    this.syncCheckState = 'idle';
    this.syncError = '';
  }

  private _onProfileSelect(e: Event) {
    const select = e.target as HTMLSelectElement;
    this.syncId = select.value;
    if (this.syncId) {
      this._checkInstance();
    }
  }

  private async _checkInstance() {
    if (!this.syncId) return;
    this.syncCheckState = 'checking';
    this.syncCheckMessage = translate('profile.checking');

    try {
      const url = getBackendEndpoint(`/profiles/${encodeURIComponent(this.syncId)}`);
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        this.syncCheckState = 'found';
        this.syncCheckMessage = translate('profile.found', { name: data.profile?.name ?? this.syncId });
      } else {
        this.syncCheckState = 'notfound';
        this.syncCheckMessage = translate('profile.notFound');
      }
    } catch {
      this.syncCheckState = 'error';
      this.syncCheckMessage = translate('profile.error');
    }
  }

  private async _doSync() {
    if (this.syncCheckState !== 'found') return;
    this.syncSubmitState = 'loading';
    this.syncError = '';

    const result = await profileManager.setActiveProfile(this.syncId, this.syncId, true);

    if (result.ok) {
      this.syncSubmitState = 'done';
      this._dispatchReady(result.profile);
    } else {
      this.syncSubmitState = 'error';
      this.syncError = (result as { ok: false; error: string }).error;
    }
  }

  // -------------------------------------------------------------------------
  // CREATE PANEL HANDLERS
  // -------------------------------------------------------------------------

  private _onCreateNameInput(e: Event) {
    this.createName = (e.target as HTMLInputElement).value;
    this.createError = '';
  }

  private _selectColor(color: string) {
    this.createColor = color;
  }

  private async _doCreate() {
    const name = this.createName.trim();
    if (!name) {
      this.createError = this._t('profile.error.enterName');
      return;
    }
    this.createSubmitState = 'loading';
    this.createError = '';

    try {
      const profile = await profileManager.createProfile(name, this.createColor);
      this.createSubmitState = 'done';
      this._dispatchReady(profile);
    } catch (err: any) {
      this.createSubmitState = 'error';
      this.createError = this._t('profile.error.createFailed');
    }
  }

  // -------------------------------------------------------------------------
  // HELPERS
  // -------------------------------------------------------------------------

  private _dispatchReady(profile: Profile) {
    this.dispatchEvent(new CustomEvent('profile-ready', {
      detail: { profile },
      bubbles: true,
      composed: true,
    }));
  }

  private _suggestDeviceName(): string {
    try {
      const ua = navigator.userAgent;
      if (/Android/i.test(ua)) return 'My Android';
      if (/iPhone|iPad/i.test(ua)) return 'My iPhone';
      if (/Mac/i.test(ua)) return 'My Mac';
      if (/Win/i.test(ua)) return 'My PC';
      if (/Linux/i.test(ua)) return 'My Linux PC';
    } catch { /* */ }
    return 'My Device';
  }

  // -------------------------------------------------------------------------
  // RENDER
  // -------------------------------------------------------------------------

  // Helper to get translations
  private _t(key: string, params?: Record<string, string | number>): string {
    return translate(key, params);
  }

  render() {
    const syncDisabled = this.syncCheckState !== 'found' || this.syncSubmitState === 'loading';
    const createDisabled = !this.createName.trim() || this.createSubmitState === 'loading';

    return html`
      <div class="modal-overlay">
        <div class="modal-card">

          <!-- Header -->
          <div class="modal-header">
            <div class="modal-icon">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h1>${this._t('profile.title')}</h1>
            <p>${this._t('profile.description')}</p>
          </div>

          <!-- Two columns -->
          <div class="panels">

            <!-- ── Sync Panel ── -->
            <div class="panel">
              <div class="panel-title">
                <div class="panel-title-icon sync">🔄</div>
                <div>
                  <h2>${this._t('profile.syncTitle')}</h2>
                  <p>${this._t('profile.syncDescription')}</p>
                </div>
              </div>

              ${this.backendProfiles.length > 0 ? html `
                <div class="form-group">
                  <label class="form-label">${this._t('profile.selectProfile')}</label>
                  <select
                    class="form-select"
                    @change="${this._onProfileSelect}"
                    .value="${this.syncId}"
                  >
                    <option value="">${this._t('profile.selectPlaceholder')}</option>
                    ${this.backendProfiles.map(p => html `
                      <option value="${p.id}">
                        ${p.name}
                      </option>
                    `)}
                  </select>
                </div>
              ` : html `
                ${this.profilesLoadingState === 'error' ? html `
                  <div class="alert-warning">
                    ${this._t('profile.warning.cannotLoadProfiles')}
                  </div>
                ` : html `
                  ${this.profilesLoadingState === 'loading' ? html `
                    <div class="check-status loading">
                      <div class="spinner"></div>
                      <span>${this._t('profile.loadingProfiles')}</span>
                    </div>
                  ` : ''}
                `}
              `}

              <div class="form-group">
                <label class="form-label">${this.backendProfiles.length > 0 ? this._t('profile.orEnterId') : this._t('profile.instanceId')}</label>
                <input
                  id="sync-id-input"
                  class="form-input ${this.syncCheckState === 'notfound' || this.syncCheckState === 'error' ? 'error' : ''}"
                  type="text"
                  placeholder="${this._t('profile.instanceIdPlaceholder')}"
                  .value="${this.syncId}"
                  @input="${this._onSyncIdInput}"
                  @keydown="${(e: KeyboardEvent) => e.key === 'Enter' && this._checkInstance()}"
                />
                ${this.syncCheckState !== 'idle' ? html`
                  <div class="check-status ${this.syncCheckState}">
                    ${this.syncCheckState === 'checking' ? html`<div class="spinner"></div>` : ''}
                    <span>${this.syncCheckMessage}</span>
                  </div>
                ` : ''}
              </div>

              ${this.syncCheckState === 'idle' || this.syncCheckState === 'notfound' || this.syncCheckState === 'error'
                ? html`
                    <button
                      class="btn btn-sync"
                      ?disabled="${!this.syncId}"
                      @click="${this._checkInstance}"
                    >
                      ${this.syncCheckState as string === 'checking'
                        ? html`<div class="spinner"></div> ${this._t('profile.checking')}`
                        : html`
                            <svg style="width:1rem;height:1rem" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                            </svg>
                            ${this._t('profile.checkInstance')}
                          `}
                    </button>
                  `
                : html`
                    <button
                      class="btn btn-sync"
                      ?disabled="${syncDisabled}"
                      @click="${this._doSync}"
                    >
                      ${this.syncSubmitState === 'loading'
                        ? html`<div class="spinner"></div> ${this._t('profile.syncingData')}`
                        : html`
                            <svg style="width:1rem;height:1rem" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                            </svg>
                            ${this._t('profile.syncImport')}
                          `}
                    </button>
                  `}

              ${this.syncError ? html`<div class="alert-error">${this.syncError}</div>` : ''}
            </div>

            <!-- ── Divider ── -->
            <div class="panel-divider"><span>${this._t('profile.orDivider')}</span></div>

            <!-- ── Create Panel ── -->
            <div class="panel">
              <div class="panel-title">
                <div class="panel-title-icon create">✨</div>
                <div>
                  <h2>${this._t('profile.createTitle')}</h2>
                  <p>${this._t('profile.createDescription')}</p>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">${this._t('profile.profileName')}</label>
                <input
                  id="profile-name-input"
                  class="form-input ${this.createError ? 'error' : ''}"
                  type="text"
                  placeholder="${this._suggestDeviceName()}"
                  .value="${this.createName}"
                  @input="${this._onCreateNameInput}"
                  @keydown="${(e: KeyboardEvent) => e.key === 'Enter' && this._doCreate()}"
                />
              </div>

              <div class="form-group">
                <label class="form-label">${this._t('profile.color')}</label>
                <div class="color-picker">
                  ${PROFILE_COLORS.map(color => html`
                    <div
                      class="color-swatch ${this.createColor === color ? 'selected' : ''}"
                      style="background: ${color};"
                      @click="${() => this._selectColor(color)}"
                    ></div>
                  `)}
                </div>
              </div>

              <button
                class="btn btn-create"
                ?disabled="${createDisabled}"
                @click="${this._doCreate}"
              >
                ${this.createSubmitState === 'loading'
                  ? html`<div class="spinner"></div> ${this._t('profile.creating')}`
                  : html`
                      <svg style="width:1rem;height:1rem" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/>
                      </svg>
                      ${this._t('profile.createProfile')}
                    `}
              </button>

              ${this.createError ? html`<div class="alert-error">${this.createError}</div>` : ''}
            </div>

          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'app-profile-setup': AppProfileSetup;
  }
}
