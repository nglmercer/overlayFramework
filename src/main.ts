import './index.css';
import { html, LitElement } from 'lit';
import { Component, state } from './litcomponents';
import { provide } from '@lit/context';
import { platformSchemaContext } from './context/schemaContext';
import { platformEventsSchema } from './lib/alertEvents';
import './components/index';

@Component('main-app')
export class MainApp extends LitElement {
  @state() private currentView: 'dashboard' | 'editor' = 'dashboard';
  @state() private currentBoxId: string = '';

  @provide({ context: platformSchemaContext })
  schema = platformEventsSchema;

  protected createRenderRoot() {
    return this; // Disable shadow DOM so global CSS applies
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
