import { html, css, LitElement, render } from 'lit';
import { Component, property, state, query } from '../litcomponents';
import { dbManager, AlertVariant } from '../lib/db';
import { platformEventsSchema, PlatformEventDefinition } from '../lib/alertEvents';
import { consume } from '@lit/context';
import { platformSchemaContext } from '../context/schemaContext';
import { Task } from '@lit/task';
import { confirm } from '../lib/dialog';
import { LocalizeController } from '../locales/localization';
import './FormControls';
import './MediaLibrary';
import './AlertView';
import './editor';

// Import editor sub-components
import { EditorTopbar } from './editor/EditorTopbar';
import { EditorLeftSidebar } from './editor/EditorLeftSidebar';
import { EditorPreview } from './editor/EditorPreview';
import { EditorRightSidebar } from './editor/EditorRightSidebar';

type BgColor = 'transparent' | '#000000' | '#ffffff' | '#ff0000';

@Component('app-editor')
export class AppEditor extends LitElement {
  @property({ type: String }) boxId = '';
  @property({ type: Function }) onBack: () => void = () => {};

  @consume({ context: platformSchemaContext })
  @property({ attribute: false })
  public schema!: PlatformEventDefinition[];

  @state() private expandedSection: string | null = null;
  @state() private rightExpandedSection: string | null = 'general';
  @state() private randomize = false;
  @state() private showMediaLibrary: 'image' | 'sound' | null = null;
  @state() private selectedVariantId: string | null = null;
  
  @state() private previewWidth = 800;
  @state() private previewHeight = 600;
  @state() private previewBgColor: BgColor = 'transparent';

  private _localize = new LocalizeController(this);
  
  private _variantsTask = new Task(this, {
    task: async ([boxId], {signal}) => {
      const data = await dbManager.getVariants(boxId);
      if (data.length > 0 && !this.selectedVariantId) {
        this.selectedVariantId = data[0].id;
      }
      return data;
    },
    args: () => [this.boxId]
  });

  @query('#file-input') private fileInput!: HTMLInputElement;
  @query('app-alert-view') private alertView!: any;

  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      height: 100vh;
      background-color: #0e0e10;
      color: white;
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      overflow: hidden;
    }
    
    .workspace { 
      display: flex; 
      flex: 1; 
      overflow: hidden; 
    }
    
    .custom-scrollbar::-webkit-scrollbar { width: 4px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #3a3a3d; border-radius: 10px; }
  `;

  async connectedCallback() {
    super.connectedCallback();
    
    if (this.schema && this.schema.length > 0 && !this.expandedSection) {
        this.expandedSection = this.schema[0].id;
    }
  }

  // Translation helper
  private t(key: string): string {
    return this._localize.t(key);
  }

  handlePlayPreview() {
    if (this.alertView && this.alertView.playPreview) {
      this.alertView.playPreview();
    }
  }

  handleSendTestAlert() {
    window.dispatchEvent(new CustomEvent('test-alert', { 
      detail: { type: 'test' }
    }));
    this.handlePlayPreview();
  }

  async handleCreateVariant() {
    const type = this.expandedSection || (this.schema && this.schema.length > 0 ? this.schema[0].id : '');
    const schemaDef = this.schema?.find(s => s.id === type) || this.schema?.[0];
    
    if (!schemaDef) return;
    
    const newVariant: AlertVariant = {
      id: crypto.randomUUID(),
      boxId: this.boxId,
      type,
      name: 'Nueva variante',
      condition: schemaDef.conditionLabel,
      duration: 10,
      animationIn: 'fade-in',
      animationOut: 'fade-out',
      animationInDuration: 1,
      animationOutDuration: 1,
      layout: 'text-below',
      bgColor: '#000000',
      bgOpacity: 0,
      padding: 16,
      spacing: 16,
      rounded: true,
      shadow: false,
      message: schemaDef.defaultMessage,
      fontFamily: 'Roboto',
      fontWeight: 'Normal',
      fontSize: 24,
      textAlign: 'center',
      textColor: '#FFFFFF',
      highlightColor: '#9146FF',
      textShadow: true,
      ttsEnabled: false,
      imageScale: 50,
      imageVolume: 50,
      soundVolume: 50,
      active: true,
    };
    await dbManager.saveVariant(newVariant);
    this._variantsTask.run();
    this.selectedVariantId = newVariant.id;
  }

  async handlePropertyChange(updates: Partial<AlertVariant>, variants: AlertVariant[]) {
    if (!this.selectedVariantId) return;
    const variant = variants.find(v => v.id === this.selectedVariantId);
    if (!variant) return;
    
    const updated = { ...variant, ...updates };
    await dbManager.saveVariant(updated);
    this._variantsTask.run();
  }

  async handleDuplicateVariant(variant: AlertVariant) {
    if (!this.boxId) return;
    const duplicated: AlertVariant = {
      ...variant,
      id: crypto.randomUUID(),
      name: `${variant.name} (Copy)`
    };
    await dbManager.saveVariant(duplicated);
    this.selectedVariantId = duplicated.id;
    this._variantsTask.run();
  }

  async handleDeleteVariant(id: string) {
    const confirmResult = await confirm(this.t('variant.confirmDelete'))
    if (confirmResult) {
      await dbManager.deleteVariant(id);
      this.selectedVariantId = null;
      this._variantsTask.run();
    }
  }

  getSelectedVariant(variants: AlertVariant[]) {
    return variants.find(v => v.id === this.selectedVariantId);
  }

  // Event handlers for sub-components
  private _handleSectionChange(e: CustomEvent) {
    this.expandedSection = e.detail;
  }

  private _handleVariantSelect(e: CustomEvent) {
    this.selectedVariantId = e.detail;
  }

  private _handleRandomizeToggle() {
    this.randomize = !this.randomize;
  }

  private _handlePreviewWidthChange(e: CustomEvent) {
    this.previewWidth = e.detail;
  }

  private _handlePreviewHeightChange(e: CustomEvent) {
    this.previewHeight = e.detail;
  }

  private _handlePreviewBgChange(e: CustomEvent) {
    this.previewBgColor = e.detail;
  }

  private _handlePropertyPanelChange(e: CustomEvent, variants: AlertVariant[]) {
    const { field, value } = e.detail;
    this.handlePropertyChange({ [field]: value }, variants);
  }

  private _handleOpenMediaLibrary(type: 'image' | 'sound') {
    this.showMediaLibrary = type;
  }

  private _handleMediaSelect(url: string, name: string, variants: AlertVariant[]) {
    if (this.showMediaLibrary === 'image') {
      this.handlePropertyChange({ imageUrl: url, imageName: name }, variants);
    } else {
      this.handlePropertyChange({ soundUrl: url, soundName: name }, variants);
    }
    this.showMediaLibrary = null;
  }

  render() {
    return this._variantsTask.render({
      pending: () => html`<div style="display: flex; align-items: center; justify-content: center; height: 100%;">${this.t('preview.loading')}</div>`,
      complete: (variants) => this.renderEditor(variants),
      error: (e) => html`<div style="padding: 2rem;">${this.t('errors.loadFailed')}</div>`
    });
  }

  renderEditor(variants: AlertVariant[]) {
    const variant = this.getSelectedVariant(variants);

    return html`
      <editor-topbar
        .title="${this.t('app.editor')}"
        .backLabel="${this.t('app.back')}"
        .onBack="${this.onBack}"
      ></editor-topbar>

      <div class="workspace">
        <editor-left-sidebar
          class="custom-scrollbar"
          .variants="${variants}"
          .schema="${this.schema}"
          .selectedVariantId="${this.selectedVariantId}"
          .expandedSection="${this.expandedSection}"
          .randomize="${this.randomize}"
          @section-change="${this._handleSectionChange}"
          @variant-select="${this._handleVariantSelect}"
          @randomize-toggle="${this._handleRandomizeToggle}"
          @create-variant="${this.handleCreateVariant}"
        ></editor-left-sidebar>

        <editor-preview
          .variant="${variant}"
          .width="${this.previewWidth}"
          .height="${this.previewHeight}"
          .bgColor="${this.previewBgColor}"
          @play-preview="${this.handlePlayPreview}"
          @send-test="${this.handleSendTestAlert}"
          @width-change="${this._handlePreviewWidthChange}"
          @height-change="${this._handlePreviewHeightChange}"
          @bg-change="${this._handlePreviewBgChange}"
        ></editor-preview>

        <editor-right-sidebar
          class="custom-scrollbar"
          .variant="${variant}"
          .randomize="${this.randomize}"
          @property-change="${(e: CustomEvent) => this._handlePropertyPanelChange(e, variants)}"
          @duplicate-variant="${() => variant && this.handleDuplicateVariant(variant)}"
          @delete-variant="${() => variant && this.handleDeleteVariant(variant.id)}"
          @open-media-library="${(e: CustomEvent) => this._handleOpenMediaLibrary(e.detail)}"
        ></editor-right-sidebar>
      </div>

      ${this.showMediaLibrary ? html`
        <media-library 
          .type="${this.showMediaLibrary}"
          .onClose="${() => this.showMediaLibrary = null}"
          .onSelect="${(url: string, name: string) => this._handleMediaSelect(url, name, variants)}"
        ></media-library>
      ` : ''}
    `;
  }
}
