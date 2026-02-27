import './index.css';
import { html, LitElement } from 'lit';
import { Component, state } from './litcomponents';
import { provide } from '@lit/context';
import { platformSchemaContext } from './context/schemaContext';
import { twitchEventsSchema } from './lib/twitchEvents';
import { loadSchemas, schemaLoader, SchemaMap, LifecycleHooks } from './lib/schema-loader';
import { initializeFramework, cleanupFramework } from './lib/index';
import './components/index';

// Define custom schemas map
const customSchemas: SchemaMap = new Map([
  [
    'seguimientos',
    {
      $id: '#seguimientos',
      eventType: 'seguimientos',
      label: 'Seguimientos',
      conditionLabel: 'Cualquier nuevo seguimiento',
      variables: [{ name: 'username', description: 'Nombre del usuario' }],
      defaultMessage: '¡{username} acaba de seguir!',
      requiredFields: ['username'],
      optionalFields: ['followerName', 'isNewFollower', 'timestamp'],
    },
  ],
  [
    'suscripciones',
    {
      $id: '#suscripciones',
      eventType: 'suscripciones',
      label: 'Suscripciones',
      conditionLabel: 'Cualquier nueva suscripción',
      variables: [
        { name: 'username', description: 'Nombre del usuario' },
        { name: 'months', description: 'Meses suscrito' },
      ],
      defaultMessage: '¡{username} se ha suscrito por {months} meses!',
      requiredFields: ['username', 'months'],
      optionalFields: ['tier', 'isGift', 'gifterName', 'message', 'timestamp'],
    },
  ],
  [
    'bits',
    {
      $id: '#bits',
      eventType: 'bits',
      label: 'Bits',
      conditionLabel: 'Cualquier donación de bits',
      variables: [
        { name: 'username', description: 'Nombre del usuario' },
        { name: 'amount', description: 'Cantidad de bits' },
      ],
      defaultMessage: '¡{username} ha donado {amount} bits!',
      requiredFields: ['username', 'amount'],
      optionalFields: ['totalAmount', 'message', 'isAnonymous', 'timestamp'],
    },
  ],
]);

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
  schema = twitchEventsSchema;

  protected createRenderRoot() {
    return this; // Disable shadow DOM so global CSS applies
  }

  async firstUpdated() {
    // Initialize framework and load schemas
    await initializeFramework();
    await loadSchemas(customSchemas, lifecycleHooks);
    
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
