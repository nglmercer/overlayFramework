import { html, css, LitElement, render } from 'lit';
import { Component, property, state, query } from '../litcomponents';
import { dbManager, AlertVariant } from '../lib/db';
import { platformEventsSchema, PlatformEventDefinition } from '../lib/alertEvents';
import { consume } from '@lit/context';
import { platformSchemaContext } from '../context/schemaContext';
import { Task } from '@lit/task';
import { confirm } from '../lib/dialog';
import { getLocale, setLocale, LocalizeController } from '../locales/localization';
import './FormControls';
import './MediaLibrary';
import './AlertView';

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
  @state() private previewBgColor: 'transparent' | '#000000' | '#ffffff' | '#ff0000' = 'transparent';

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

  handlePlayPreview() {
    if (this.alertView && this.alertView.playPreview) {
      this.alertView.playPreview();
    }
  }

  handleSendTestAlert() {
    // Dispatch a standard custom event that your other components might be listening to
    window.dispatchEvent(new CustomEvent('test-alert', { 
      detail: { type: 'test' }
    }));
    
    // Play local preview as well to provide immediate feedback
    this.handlePlayPreview();
  }

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
    .btn-back:hover { background-color: #464649; }
    
    .workspace { display: flex; flex: 1; overflow: hidden; }
    
    .sidebar-left {
      width: 20rem;
      border-right: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      flex-direction: column;
      background-color: #18181b;
      overflow-y: auto;
    }
    .sidebar-header {
      padding: 1rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }
    .sidebar-header span { font-size: 0.75rem; font-weight: 700; color: #9ca3af; letter-spacing: 0.05em; }
    
    .section-btn {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.875rem;
      background: transparent;
      border: none;
      color: white;
      cursor: pointer;
      transition: background-color 0.2s;
    }
    .section-btn:hover { background-color: rgba(255, 255, 255, 0.05); }
    .section-content { background-color: #0e0e10; padding: 1rem; }
    
    .variant-card {
      background-color: transparent;
      border-radius: 0.375rem;
      padding: 0.625rem;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      cursor: pointer;
      transition: background-color 0.2s;
      margin-bottom: 0.5rem;
    }
    .variant-card.active { background-color: #9146FF; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); }
    .variant-card:not(.active):hover { background-color: rgba(255, 255, 255, 0.05); }

    .preview-area { flex: 1; display: flex; flex-direction: column; background-color: #0e0e10; position: relative; }
    
    .preview-header {
      padding: 0.75rem 1rem;
      background-color: #1a1a1c;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      display: flex;
      gap: 0.5rem;
    }
    .btn-preview {
      background-color: #3a3a3d;
      color: white;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 9999px;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      transition: background-color 0.2s;
    }
    .btn-preview:hover { background-color: #464649; }

    .preview-content {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: auto;
      padding: 2rem;
    }

    .preview-canvas {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 0 1px rgba(255,255,255,0.1);
      overflow: hidden;
      transition: all 0.2s;
    }
    .bg-checker {
      background-image: linear-gradient(45deg, #18181b 25%, transparent 25%), linear-gradient(-45deg, #18181b 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #18181b 75%), linear-gradient(-45deg, transparent 75%, #18181b 75%);
      background-size: 24px 24px;
      background-position: 0 0, 0 12px, 12px -12px, -12px 0px;
    }
    
    .preview-footer {
      padding: 0.75rem 1rem;
      background-color: #1a1a1c;
      border-top: 1px solid rgba(255, 255, 255, 0.05);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .preview-options {
      display: flex;
      align-items: center;
      gap: 1.5rem;
    }
    .size-input {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;
      font-weight: 500;
    }
    .size-input input {
      background-color: #0e0e10;
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: white;
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
      width: 60px;
      text-align: center;
    }
    .bg-toggles {
      display: flex;
      gap: 0.25rem;
      background-color: #0e0e10;
      padding: 0.25rem;
      border-radius: 0.5rem;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
    .bg-btn {
      width: 1.5rem;
      height: 1.5rem;
      border-radius: 0.25rem;
      border: 2px solid transparent;
      cursor: pointer;
    }
    .bg-btn.active {
      border-color: #9146FF;
    }
    
    .sidebar-right {
      width: 20rem;
      border-left: 1px solid rgba(255, 255, 255, 0.1);
      background-color: #18181b;
      display: flex;
      flex-direction: column;
      overflow-y: auto;
    }
    
    .custom-scrollbar::-webkit-scrollbar { width: 4px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #3a3a3d; border-radius: 10px; }
    
    /* SVGs and Icons */
    .icon { width: 1.25rem; height: 1.25rem; }
    
    .toggle {
      width: 2.5rem;
      height: 1.25rem;
      border-radius: 1.25rem;
      padding: 0.125rem;
      cursor: pointer;
      transition: background-color 0.2s;
      display: flex;
      align-items: center;
    }
    .toggle.on { background-color: #9146FF; }
    .toggle.off { background-color: #4b5563; }
    .toggle-knob {
      width: 1rem;
      height: 1rem;
      background-color: white;
      border-radius: 50%;
      transition: transform 0.2s;
    }
    .toggle.on .toggle-knob { transform: translateX(1.25rem); }
  `;

  async connectedCallback() {
    super.connectedCallback();
    
    if (this.schema && this.schema.length > 0 && !this.expandedSection) {
        this.expandedSection = this.schema[0].id;
    }
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
    this._variantsTask.run(); // trigger task rerun
    this.selectedVariantId = newVariant.id;
  }

  async handleUpdateVariant(updates: Partial<AlertVariant>, variants: AlertVariant[]) {
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
    const confirmResult = await confirm(this._localize.t('variant.confirmDelete'))
    if (confirmResult) {
      await dbManager.deleteVariant(id);
      this.selectedVariantId = null;
      this._variantsTask.run();
    }
  }

  getSelectedVariant(variants: AlertVariant[]) {
    return variants.find(v => v.id === this.selectedVariantId);
  }

  render() {
    return this._variantsTask.render({
      pending: () => html`<div class="preview-canvas">${this._localize.t('preview.loading')}</div>`,
      complete: (variants) => this.renderEditor(variants),
      error: (e) => html`<div>${this._localize.t('errors.loadFailed')}</div>`
    });
  }

  renderEditor(variants: AlertVariant[]) {
    const variant = this.getSelectedVariant(variants);

    return html`
      <div class="topbar">
        <button class="btn-back" @click="${this.onBack}">
          <span>&larr; ${this._localize.t('app.back')}</span>
        </button>
        <div class="flex-center">
          <span style="font-weight: 700;">${this._localize.t('app.editor')}</span>
        </div>
        <div style="width: auto; display: flex; align-items: center; gap: 1rem;">
          <select 
            style="background: #3a3a3d; color: white; border: none; padding: 0.25rem 0.5rem; border-radius: 0.25rem; cursor: pointer; font-size: 0.875rem;"
            @change="${(e: any) => setLocale(e.target.value)}"
            .value="${getLocale()}"
          >
            <option value="es">Español</option>
            <option value="en">English</option>
          </select>
        </div>
      </div>

      <div class="workspace">
        <!-- Sidebar Left -->
        <div class="sidebar-left custom-scrollbar">
          <div class="sidebar-header">
            <span>${this._localize.t('sidebar.variants')}</span>
            <button @click="${this.handleCreateVariant}" style="background: transparent; border: none; color: #a970ff; cursor: pointer;">+</button>
          </div>
          
          ${this.schema?.map(item => html`
            <div class="section">
              <button 
                class="section-btn" 
                @click="${() => this.expandedSection = this.expandedSection === item.id ? null : item.id}"
              >
                <span style="font-weight: 600; font-size: 0.875rem;">${this._localize.t('event.' + item.id)}</span>
                <span>${this.expandedSection === item.id ? '▲' : '▼'}</span>
              </button>
              
              ${this.expandedSection === item.id ? html`
                <div class="section-content">
                  ${variants.filter(v => v.type === item.id).length >= 2 ? html`
                    <div style="margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
                      <div 
                        class="toggle ${this.randomize ? 'on' : 'off'}" 
                        @click="${() => this.randomize = !this.randomize}"
                      >
                        <div class="toggle-knob"></div>
                      </div>
                      <span style="font-size: 0.75rem;">${this._localize.t('variant.random')}</span>
                    </div>
                  ` : ''}
                  
                  ${variants.filter(v => v.type === item.id).map(v => html`
                    <div 
                      class="variant-card ${this.selectedVariantId === v.id ? 'active' : ''}"
                      @click="${() => this.selectedVariantId = v.id}"
                    >
                      <div style="flex: 1;">
                        <div style="font-weight: 700; font-size: 0.875rem;">${v.name}</div>
                        <div style="font-size: 0.75rem; opacity: 0.8;">${v.condition}</div>
                      </div>
                    </div>
                  `)}
                </div>
              ` : ''}
            </div>
          `)}
        </div>

        <!-- Preview Area -->
        <div class="preview-area">
          ${variant ? html`
          <div class="preview-header">
            <button class="btn-preview" @click="${this.handlePlayPreview}">${this._localize.t('preview.alert')}</button>
            <button class="btn-preview" @click="${this.handleSendTestAlert}">${this._localize.t('preview.sendTest')}</button>
          </div>
          <div class="preview-content">
            <div 
              class="preview-canvas ${this.previewBgColor === 'transparent' ? 'bg-checker' : ''}" 
              style="width: ${this.previewWidth}px; height: ${this.previewHeight}px; background-color: ${this.previewBgColor === 'transparent' ? 'transparent' : this.previewBgColor};"
            >
              <app-alert-view 
                .variant="${variant}" 
                .eventData="${{ username: 'FlavioliRavioli', amount: '1000', months: '6' }}"
              ></app-alert-view>
            </div>
          </div>
          <div class="preview-footer">
            <div style="font-size: 0.875rem; font-weight: 600;">${this._localize.t('preview.options')}</div>
            <div class="preview-options">
              <div class="size-input">
                <label>${this._localize.t('preview.width')}</label>
                <input type="number" .value="${this.previewWidth.toString()}" @change="${(e: any) => this.previewWidth = Number(e.target.value)}">
              </div>
              <div class="size-input">
                <label>${this._localize.t('preview.height')}</label>
                <input type="number" .value="${this.previewHeight.toString()}" @change="${(e: any) => this.previewHeight = Number(e.target.value)}">
              </div>
              <div class="bg-toggles">
                <button class="bg-btn bg-checker ${this.previewBgColor === 'transparent' ? 'active' : ''}" @click="${() => this.previewBgColor = 'transparent'}"></button>
                <button class="bg-btn ${this.previewBgColor === '#000000' ? 'active' : ''}" style="background-color: #000000;" @click="${() => this.previewBgColor = '#000000'}"></button>
                <button class="bg-btn ${this.previewBgColor === '#ffffff' ? 'active' : ''}" style="background-color: #ffffff;" @click="${() => this.previewBgColor = '#ffffff'}"></button>
                <button class="bg-btn ${this.previewBgColor === '#ff0000' ? 'active' : ''}" style="background-color: #ff0000;" @click="${() => this.previewBgColor = '#ff0000'}"></button>
              </div>
            </div>
          </div>
          ` : html`<div class="preview-content"><div class="preview-canvas bg-checker">${this._localize.t('preview.select')}</div></div>`}
        </div>

        <!-- Sidebar Right -->
        <div class="sidebar-right custom-scrollbar">
          ${variant ? html`
            <div class="section">
              <button class="section-btn" @click="${() => this.rightExpandedSection = 'general'}">
                <span style="font-weight: 600;">${this._localize.t('sidebar.general')}</span>
              </button>
              ${this.rightExpandedSection === 'general' ? html`
                <div class="section-content">
                  <ui-input 
                    label="${this._localize.t('variant.name')}" 
                    .value="${variant.name}" 
                    @change="${(e: any) => this.handleUpdateVariant({ name: e.detail }, variants)}"
                  ></ui-input>
                  
                  ${this.randomize ? html`
                    <button 
                      @click="${() => this.handleDuplicateVariant(variant)}"
                      style="width: 100%; padding: 0.5rem; background: #3a3a3d; border: none; color: white; border-radius: 0.375rem; cursor: pointer; margin-bottom: 0.75rem; display: flex; align-items: center; justify-content: center; gap: 0.5rem;"
                    >
                      <svg style="width: 1.25rem; height: 1.25rem;" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                      ${this._localize.t('variant.duplicate')}
                    </button>
                    
                    <ui-select 
                      label="${this._localize.t('variant.probability')}" 
                      .value="${variant.probability || 'always'}"
                      .options="${[
                        { value: 'always', label: this._localize.t('variant.prob.always') }, 
                        { value: 'common', label: this._localize.t('variant.prob.common') }, 
                        { value: 'rare', label: this._localize.t('variant.prob.rare') }, 
                        { value: 'epic', label: this._localize.t('variant.prob.epic') }
                      ]}"
                      @change="${(e: any) => this.handleUpdateVariant({ probability: e.detail }, variants)}"
                    ></ui-select>
                  ` : ''}

                  <ui-input 
                    label="${this._localize.t('variant.duration')}" 
                    type="number" 
                    .value="${variant.duration.toString()}" 
                    @change="${(e: any) => this.handleUpdateVariant({ duration: Number(e.detail) }, variants)}"
                  ></ui-input>

                  <ui-toggle 
                    label="${this._localize.t('variant.customHtml')}" 
                    .checked="${!!variant.customHtmlEnabled}"
                    @change="${(e: any) => this.handleUpdateVariant({ customHtmlEnabled: e.detail }, variants)}"
                  ></ui-toggle>
                </div>
              ` : ''}
            </div>

            <div class="section">
              <button class="section-btn" @click="${() => this.rightExpandedSection = 'typography'}">
                <span style="font-weight: 600;">${this._localize.t('sidebar.typography')}</span>
              </button>
              ${this.rightExpandedSection === 'typography' ? html`
                <div class="section-content">
                  <ui-input 
                    label="${this._localize.t('variant.message')}" 
                    .value="${variant.message}" 
                    @change="${(e: any) => this.handleUpdateVariant({ message: e.detail }, variants)}"
                  ></ui-input>
                  <ui-select 
                    label="${this._localize.t('variant.fontFamily')}" 
                    .value="${variant.fontFamily}"
                    .options="${[{ value: 'Roboto', label: 'Roboto' }, { value: 'Inter', label: 'Inter' }, { value: 'Arial', label: 'Arial' }, { value: 'impact', label: 'Impact' }]}"
                    @change="${(e: any) => this.handleUpdateVariant({ fontFamily: e.detail }, variants)}"
                  ></ui-select>
                  <ui-select 
                    label="${this._localize.t('variant.fontWeight')}" 
                    .value="${variant.fontWeight}"
                    .options="${[{ value: 'Normal', label: 'Normal' }, { value: 'Bold', label: 'Bold' }, { value: 'Lighter', label: 'Lighter' }]}"
                    @change="${(e: any) => this.handleUpdateVariant({ fontWeight: e.detail }, variants)}"
                  ></ui-select>
                  <ui-select 
                    label="${this._localize.t('variant.textAlign')}" 
                    .value="${variant.textAlign}"
                    .options="${[{ value: 'left', label: this._localize.t('variant.alignLeft') }, { value: 'center', label: this._localize.t('variant.alignCenter') }, { value: 'right', label: this._localize.t('variant.alignRight') }]}"
                    @change="${(e: any) => this.handleUpdateVariant({ textAlign: e.detail }, variants)}"
                  ></ui-select>
                  <ui-input 
                    label="${this._localize.t('variant.fontSize')}" 
                    type="number" 
                    .value="${variant.fontSize.toString()}" 
                    @change="${(e: any) => this.handleUpdateVariant({ fontSize: Number(e.detail) }, variants)}"
                  ></ui-input>
                  <ui-color-picker 
                    label="${this._localize.t('variant.textColor')}" 
                    .value="${variant.textColor}"
                    @change="${(e: any) => this.handleUpdateVariant({ textColor: e.detail }, variants)}"
                  ></ui-color-picker>
                  <ui-color-picker 
                    label="${this._localize.t('variant.highlightColor')}" 
                    .value="${variant.highlightColor}"
                    @change="${(e: any) => this.handleUpdateVariant({ highlightColor: e.detail }, variants)}"
                  ></ui-color-picker>
                  <ui-toggle 
                    label="${this._localize.t('variant.textShadow')}" 
                    .checked="${variant.textShadow}"
                    @change="${(e: any) => this.handleUpdateVariant({ textShadow: e.detail }, variants)}"
                  ></ui-toggle>
                  <ui-toggle 
                    label="${this._localize.t('variant.ttsEnabled')}" 
                    .checked="${variant.ttsEnabled}"
                    @change="${(e: any) => this.handleUpdateVariant({ ttsEnabled: e.detail }, variants)}"
                  ></ui-toggle>
                </div>
              ` : ''}
            </div>

            <div class="section">
              <button class="section-btn" @click="${() => this.rightExpandedSection = 'animations'}">
                <span style="font-weight: 600;">${this._localize.t('sidebar.animations')}</span>
              </button>
              ${this.rightExpandedSection === 'animations' ? html`
                <div class="section-content">
                  <ui-select 
                    label="${this._localize.t('variant.animIn')}" 
                    .value="${variant.animationIn}"
                    .options="${[{ value: 'fade-in', label: this._localize.t('variant.anim.fadeIn') }, { value: 'slide-in-up', label: this._localize.t('variant.anim.slideInUp') }, { value: 'zoom-in', label: this._localize.t('variant.anim.zoomIn') }, { value: 'bounce-in', label: this._localize.t('variant.anim.bounceIn') }]}"
                    @change="${(e: any) => this.handleUpdateVariant({ animationIn: e.detail }, variants)}"
                  ></ui-select>
                  <ui-input 
                    label="${this._localize.t('variant.animInDuration')}" 
                    type="number" 
                    .value="${variant.animationInDuration.toString()}" 
                    @change="${(e: any) => this.handleUpdateVariant({ animationInDuration: Number(e.detail) }, variants)}"
                  ></ui-input>
                  <ui-select 
                    label="${this._localize.t('variant.animOut')}" 
                    .value="${variant.animationOut}"
                    .options="${[{ value: 'fade-out', label: this._localize.t('variant.anim.fadeOut') }, { value: 'slide-out-down', label: this._localize.t('variant.anim.slideOutDown') }, { value: 'zoom-out', label: this._localize.t('variant.anim.zoomOut') }]}"
                    @change="${(e: any) => this.handleUpdateVariant({ animationOut: e.detail }, variants)}"
                  ></ui-select>
                  <ui-input 
                    label="${this._localize.t('variant.animOutDuration')}" 
                    type="number" 
                    .value="${variant.animationOutDuration.toString()}" 
                    @change="${(e: any) => this.handleUpdateVariant({ animationOutDuration: Number(e.detail) }, variants)}"
                  ></ui-input>
                </div>
              ` : ''}
            </div>

            <div class="section">
              <button class="section-btn" @click="${() => this.rightExpandedSection = 'design'}">
                <span style="font-weight: 600;">${this._localize.t('sidebar.design')}</span>
              </button>
              ${this.rightExpandedSection === 'design' ? html`
                <div class="section-content">
                  <ui-select 
                    label="${this._localize.t('variant.layout')}" 
                    .value="${variant.layout}"
                    .options="${[{ value: 'text-below', label: this._localize.t('variant.layout.textBelow') }, { value: 'text-right', label: this._localize.t('variant.layout.textRight') }]}"
                    @change="${(e: any) => this.handleUpdateVariant({ layout: e.detail }, variants)}"
                  ></ui-select>
                  <ui-color-picker 
                    label="${this._localize.t('variant.bgColor')}" 
                    .value="${variant.bgColor}"
                    @change="${(e: any) => this.handleUpdateVariant({ bgColor: e.detail }, variants)}"
                  ></ui-color-picker>
                  <ui-range 
                    label="${this._localize.t('variant.bgOpacity')}" 
                    .value="${variant.bgOpacity}"
                    @change="${(e: any) => this.handleUpdateVariant({ bgOpacity: e.detail }, variants)}"
                  ></ui-range>
                  <ui-input 
                    label="${this._localize.t('variant.padding')}" 
                    type="number" 
                    .value="${variant.padding.toString()}" 
                    @change="${(e: any) => this.handleUpdateVariant({ padding: Number(e.detail) }, variants)}"
                  ></ui-input>
                  <ui-input 
                    label="${this._localize.t('variant.spacing')}" 
                    type="number" 
                    .value="${variant.spacing.toString()}" 
                    @change="${(e: any) => this.handleUpdateVariant({ spacing: Number(e.detail) }, variants)}"
                  ></ui-input>
                  <div style="display: flex; flex-direction: column; gap: 1rem; margin-top: 0.5rem;">
                    <ui-toggle 
                      label="${this._localize.t('variant.rounded')}" 
                      .checked="${variant.rounded}"
                      @change="${(e: any) => this.handleUpdateVariant({ rounded: e.detail }, variants)}"
                    ></ui-toggle>
                    <ui-toggle 
                      label="${this._localize.t('variant.shadow')}" 
                      .checked="${variant.shadow}"
                      @change="${(e: any) => this.handleUpdateVariant({ shadow: e.detail }, variants)}"
                    ></ui-toggle>
                  </div>
                </div>
              ` : ''}
            </div>

            <div class="section">
              <button class="section-btn" @click="${() => this.rightExpandedSection = 'media'}">
                <span style="font-weight: 600;">${this._localize.t('sidebar.media')}</span>
              </button>
              ${this.rightExpandedSection === 'media' ? html`
                <div class="section-content">
                  <button @click="${() => this.showMediaLibrary = 'image'}" style="width: 100%; padding: 0.5rem; background: #3a3a3d; border: none; color: white; border-radius: 0.375rem; cursor: pointer; margin-bottom: 0.5rem;">
                    ${this._localize.t('media.changeImage')}
                  </button>
                  <ui-range label="${this._localize.t('media.imageScale')}" .value="${variant.imageScale}" @change="${(e: any) => this.handleUpdateVariant({ imageScale: e.detail }, variants)}"></ui-range>
                  <ui-range label="${this._localize.t('media.imageVolume')}" .value="${variant.imageVolume}" @change="${(e: any) => this.handleUpdateVariant({ imageVolume: e.detail }, variants)}"></ui-range>
                  <div style="height: 1px; background: rgba(255,255,255,0.1); margin: 1rem 0;"></div>
                  <button @click="${() => this.showMediaLibrary = 'sound'}" style="width: 100%; padding: 0.5rem; background: #3a3a3d; border: none; color: white; border-radius: 0.375rem; cursor: pointer; margin-bottom: 0.5rem;">
                    ${this._localize.t('media.changeSound')}
                  </button>
                  <ui-range label="${this._localize.t('media.soundVolume')}" .value="${variant.soundVolume}" @change="${(e: any) => this.handleUpdateVariant({ soundVolume: e.detail }, variants)}"></ui-range>
                </div>
              ` : ''}
            </div>
            
            <div style="margin-top: 1rem; padding: 0 1rem 2rem 1rem;">
              <button 
                @click="${() => this.handleDeleteVariant(variant.id)}"
                style="width: 100%; padding: 0.75rem; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); color: #ef4444; border-radius: 0.375rem; cursor: pointer; font-weight: 600; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 0.5rem;"
                onmouseover="this.style.background='rgba(239, 68, 68, 0.2)'"
                onmouseout="this.style.background='rgba(239, 68, 68, 0.1)'"
              >
                <svg style="width: 1.25rem; height: 1.25rem;" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                ${this._localize.t('variant.delete')}
              </button>
            </div>
          ` : html`
            <div class="flex-center" style="height: 100%; color: #9ca3af; padding: 2rem; text-align: center;">
              ${this._localize.t('preview.select')}
            </div>
          `}
        </div>
      </div>

      ${this.showMediaLibrary ? html`
        <media-library 
          .type="${this.showMediaLibrary}"
          .onClose="${() => this.showMediaLibrary = null}"
          .onSelect="${(url: string, name: string) => {
            if (this.showMediaLibrary === 'image') this.handleUpdateVariant({ imageUrl: url, imageName: name }, variants);
            else this.handleUpdateVariant({ soundUrl: url, soundName: name }, variants);
            this.showMediaLibrary = null;
          }}"
        ></media-library>
      ` : ''}
    `;
  }
}
