import './index.css';
import { html, LitElement } from 'lit';
import { Component, state } from './litcomponents';
import { provide } from '@lit/context';
import { platformSchemaContext } from './context/schemaContext';
import { platformEvents } from './lib/alertEvents';
import { loadSchemas, schemaLoader, SchemaMap, LifecycleHooks } from './lib/schema-loader';
import { initializeFramework, cleanupFramework } from './lib/index';
import { patchAllGlobals } from './lib/dialog';
import './components/index';
import { getLocale, setLocale, LocalizeController, initLocale } from './locales/localization';
import { discoverServices } from './lib/config';

// Define custom schemas map
// No custom schemas needed, using centralized PLATFORM_EVENTS from core
const customSchemas: SchemaMap = new Map();

// Define lifecycle hooks
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

@Component('main-app')
export class MainApp extends LitElement {
  @state() private currentView: 'dashboard' | 'editor' = 'dashboard';
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
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    // Cleanup on unload
    cleanupFramework();
  }

  render() {
    if (this.currentView === 'dashboard') {
      return html`
        <app-dashboard
          .onEdit="${(id: string) => {
            this.currentBoxId = id;
            this.currentView = 'editor';
          }}"
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

const root = document.getElementById('root');
if (root) {
  root.innerHTML = '<main-app></main-app>';
}
