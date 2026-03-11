import './index.css';
import { patchGlobalNetwork } from './lib/url-utils';

// Patch network as soon as possible to prevent dev ports in production
patchGlobalNetwork();

import { html, LitElement } from 'lit';
import { Component, state } from './litcomponents';
import { provide } from '@lit/context';
import { platformSchemaContext } from './context/schemaContext';
import { platformEvents } from './lib/alertEvents';
import { loadSchemas, schemaLoader, SchemaMap, LifecycleHooks } from './lib/schema-loader';
import { initializeFramework, cleanupFramework } from './lib/index';
import { patchAllGlobals } from './lib/dialog';
import './components/index';
import { initLocale } from './locales/localization';
import { discoverServices } from './lib/config';
import { profileManager } from './lib/profile-manager';

// ============================================================================
// SCHEMA CONFIG
// ============================================================================

const customSchemas: SchemaMap = new Map();

const lifecycleHooks: LifecycleHooks = {
  onLoad: (schemas) => {
    console.log('Schemas loaded:', schemas.size, 'schemas available');
  },
  onRestart: (oldSchemas, newSchemas) => {
    console.log('Schemas restarted:', oldSchemas.size, '->', newSchemas.size);
  },
  onUnload: (schemas) => {
    console.log('Schemas unloaded:', schemas.size, 'schemas cleared');
  },
};

// ============================================================================
// MAIN APP COMPONENT
// ============================================================================

@Component('main-app')
export class MainApp extends LitElement {
  @state() private currentView: 'profile-setup' | 'dashboard' | 'editor' = 'dashboard';
  @state() private currentBoxId: string = '';

  @provide({ context: platformSchemaContext })
  schema = platformEvents;

  protected createRenderRoot() {
    return this; // Disable shadow DOM so global CSS applies
  }

  async firstUpdated() {
    // Initialize locale from localStorage
    await initLocale();

    // Initialize framework and load schemas
    await initializeFramework();
    await loadSchemas(customSchemas, lifecycleHooks);
    await discoverServices();

    // Patch global alert/confirm/prompt to use custom dialog
    patchAllGlobals();

    console.log('Framework initialized');
    console.log('Schema loader ready:', schemaLoader.isReady());

    // ── First-run detection ──
    // If no active profile exists, show the profile setup screen before the dashboard
    if (profileManager.isFirstRun()) {
      console.log('[App] First run detected — showing profile setup.');
      this.currentView = 'profile-setup';
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    cleanupFramework();
  }

  private _onProfileReady() {
    // Profile has been created or linked — proceed to normal dashboard
    this.currentView = 'dashboard';
  }

  private _onProfileAddRequested() {
    // Dashboard requests showing the setup modal (e.g. "Link another instance")
    this.currentView = 'profile-setup';
  }

  render() {
    if (this.currentView === 'profile-setup') {
      return html`
        <app-profile-setup
          @profile-ready="${this._onProfileReady}"
        ></app-profile-setup>
      `;
    }

    if (this.currentView === 'dashboard') {
      return html`
        <app-dashboard
          .onEdit="${(id: string) => {
            this.currentBoxId = id;
            this.currentView = 'editor';
          }}"
          @profile-add-requested="${this._onProfileAddRequested}"
        ></app-dashboard>
      `;
    }

    return html`
      <app-editor
        .boxId="${this.currentBoxId}"
        .onBack="${() => {
          this.currentView = 'dashboard';
        }}"
      ></app-editor>
    `;
  }
}

// ============================================================================
// BOOTSTRAP
// ============================================================================

const root = document.getElementById('root');
if (root) {
  root.innerHTML = '<main-app></main-app>';
}
