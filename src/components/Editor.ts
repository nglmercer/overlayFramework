import { html, css, LitElement, render } from 'lit';
import { Component, property, state, query } from '../litcomponents';
import { dbManager, AlertVariant } from '../lib/db';
import { platformEventsSchema, PlatformEventDefinition } from '../lib/alertEvents';
import { consume } from '@lit/context';
import { platformSchemaContext } from '../context/schemaContext';
import { Task } from '@lit/task';
import { msg, str } from '@lit/localize';
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
    .preview-canvas {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
      background-image: linear-gradient(45deg, #18181b 25%, transparent 25%), linear-gradient(-45deg, #18181b 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #18181b 75%), linear-gradient(-45deg, transparent 75%, #18181b 75%);
      background-size: 24px 24px;
      background-position: 0 0, 0 12px, 12px -12px, -12px 0px;
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

  getSelectedVariant(variants: AlertVariant[]) {
    return variants.find(v => v.id === this.selectedVariantId);
  }

  render() {
    return this._variantsTask.render({
      pending: () => html`<div class="preview-canvas">${msg('Cargando variantes...')}</div>`,
      complete: (variants) => this.renderEditor(variants),
      error: (e) => html`<div>${msg('Error al cargar')}</div>`
    });
  }

  renderEditor(variants: AlertVariant[]) {
    const variant = this.getSelectedVariant(variants);

    return html`
      <div class="topbar">
        <button class="btn-back" @click="${this.onBack}">
          <span>&larr; ${msg('Regresar')}</span>
        </button>
        <div class="flex-center">
          <span style="font-weight: 700;">${msg('Alerts Box Editor')}</span>
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
            <span>${msg('VARIANTES')}</span>
            <button @click="${this.handleCreateVariant}" style="background: transparent; border: none; color: #a970ff; cursor: pointer;">+</button>
          </div>
          
          ${this.schema?.map(item => html`
            <div class="section">
              <button 
                class="section-btn" 
                @click="${() => this.expandedSection = this.expandedSection === item.id ? null : item.id}"
              >
                <span style="font-weight: 600; font-size: 0.875rem;">${msg(str`${item.label}`)}</span>
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
                      <span style="font-size: 0.75rem;">${msg('Aleatorio')}</span>
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
          <div class="preview-canvas">
            ${variant ? html`
              <app-alert-view 
                .variant="${variant}" 
                .eventData="${{ username: 'FlavioliRavioli', amount: '1000', months: '6' }}"
              ></app-alert-view>
            ` : msg('Selecciona una variante para previsualizar')}
          </div>
        </div>

        <!-- Sidebar Right -->
        <div class="sidebar-right custom-scrollbar">
          ${variant ? html`
            <div class="section">
              <button class="section-btn" @click="${() => this.rightExpandedSection = 'general'}">
                <span style="font-weight: 600;">${msg('Configuración general')}</span>
              </button>
              ${this.rightExpandedSection === 'general' ? html`
                <div class="section-content">
                  <ui-input 
                    label="${msg('Nombre')}" 
                    .value="${variant.name}" 
                    @change="${(e: any) => this.handleUpdateVariant({ name: e.detail }, variants)}"
                  ></ui-input>
                  <ui-input 
                    label="${msg('Duración')}" 
                    type="number" 
                    .value="${variant.duration.toString()}" 
                    @change="${(e: any) => this.handleUpdateVariant({ duration: Number(e.detail) }, variants)}"
                  ></ui-input>
                </div>
              ` : ''}
            </div>

            <div class="section">
              <button class="section-btn" @click="${() => this.rightExpandedSection = 'typography'}">
                <span style="font-weight: 600;">${msg('Textos y Mensajes')}</span>
              </button>
              ${this.rightExpandedSection === 'typography' ? html`
                <div class="section-content">
                  <ui-input 
                    label="${msg('Mensaje de la alerta')}" 
                    .value="${variant.message}" 
                    @change="${(e: any) => this.handleUpdateVariant({ message: e.detail }, variants)}"
                  ></ui-input>
                  <ui-select 
                    label="${msg('Tipografía')}" 
                    .value="${variant.fontFamily}"
                    .options="${[{ value: 'Roboto', label: 'Roboto' }, { value: 'Inter', label: 'Inter' }, { value: 'Arial', label: 'Arial' }, { value: 'impact', label: 'Impact' }]}"
                    @change="${(e: any) => this.handleUpdateVariant({ fontFamily: e.detail }, variants)}"
                  ></ui-select>
                  <ui-select 
                    label="${msg('Grosor')}" 
                    .value="${variant.fontWeight}"
                    .options="${[{ value: 'Normal', label: 'Normal' }, { value: 'Bold', label: 'Bold' }, { value: 'Lighter', label: 'Lighter' }]}"
                    @change="${(e: any) => this.handleUpdateVariant({ fontWeight: e.detail }, variants)}"
                  ></ui-select>
                  <ui-select 
                    label="${msg('Alineación')}" 
                    .value="${variant.textAlign}"
                    .options="${[{ value: 'left', label: msg('Izquierda') }, { value: 'center', label: msg('Centro') }, { value: 'right', label: msg('Derecha') }]}"
                    @change="${(e: any) => this.handleUpdateVariant({ textAlign: e.detail }, variants)}"
                  ></ui-select>
                  <ui-input 
                    label="${msg('Tamaño (px)')}" 
                    type="number" 
                    .value="${variant.fontSize.toString()}" 
                    @change="${(e: any) => this.handleUpdateVariant({ fontSize: Number(e.detail) }, variants)}"
                  ></ui-input>
                  <ui-color-picker 
                    label="${msg('Color de texto')}" 
                    .value="${variant.textColor}"
                    @change="${(e: any) => this.handleUpdateVariant({ textColor: e.detail }, variants)}"
                  ></ui-color-picker>
                  <ui-color-picker 
                    label="${msg('Color de resaltado')}" 
                    .value="${variant.highlightColor}"
                    @change="${(e: any) => this.handleUpdateVariant({ highlightColor: e.detail }, variants)}"
                  ></ui-color-picker>
                  <ui-toggle 
                    label="${msg('Sombra de texto')}" 
                    .checked="${variant.textShadow}"
                    @change="${(e: any) => this.handleUpdateVariant({ textShadow: e.detail }, variants)}"
                  ></ui-toggle>
                  <ui-toggle 
                    label="${msg('Leer mensaje (TTS)')}" 
                    .checked="${variant.ttsEnabled}"
                    @change="${(e: any) => this.handleUpdateVariant({ ttsEnabled: e.detail }, variants)}"
                  ></ui-toggle>
                </div>
              ` : ''}
            </div>

            <div class="section">
              <button class="section-btn" @click="${() => this.rightExpandedSection = 'animations'}">
                <span style="font-weight: 600;">${msg('Animaciones')}</span>
              </button>
              ${this.rightExpandedSection === 'animations' ? html`
                <div class="section-content">
                  <ui-select 
                    label="${msg('Entrada')}" 
                    .value="${variant.animationIn}"
                    .options="${[{ value: 'fade-in', label: msg('Desvanecer') }, { value: 'slide-in-up', label: msg('Deslizar hacia arriba') }, { value: 'zoom-in', label: msg('Aumentar') }, { value: 'bounce-in', label: msg('Rebote') }]}"
                    @change="${(e: any) => this.handleUpdateVariant({ animationIn: e.detail }, variants)}"
                  ></ui-select>
                  <ui-input 
                    label="${msg('Duración entrada (s)')}" 
                    type="number" 
                    .value="${variant.animationInDuration.toString()}" 
                    @change="${(e: any) => this.handleUpdateVariant({ animationInDuration: Number(e.detail) }, variants)}"
                  ></ui-input>
                  <ui-select 
                    label="${msg('Salida')}" 
                    .value="${variant.animationOut}"
                    .options="${[{ value: 'fade-out', label: msg('Desvanecer') }, { value: 'slide-out-down', label: msg('Deslizar hacia abajo') }, { value: 'zoom-out', label: msg('Disminuir') }]}"
                    @change="${(e: any) => this.handleUpdateVariant({ animationOut: e.detail }, variants)}"
                  ></ui-select>
                  <ui-input 
                    label="${msg('Duración salida (s)')}" 
                    type="number" 
                    .value="${variant.animationOutDuration.toString()}" 
                    @change="${(e: any) => this.handleUpdateVariant({ animationOutDuration: Number(e.detail) }, variants)}"
                  ></ui-input>
                </div>
              ` : ''}
            </div>

            <div class="section">
              <button class="section-btn" @click="${() => this.rightExpandedSection = 'design'}">
                <span style="font-weight: 600;">${msg('Diseño')}</span>
              </button>
              ${this.rightExpandedSection === 'design' ? html`
                <div class="section-content">
                  <ui-select 
                    label="${msg('Diseño')}" 
                    .value="${variant.layout}"
                    .options="${[{ value: 'text-below', label: msg('Texto abajo') }, { value: 'text-right', label: msg('Texto derecha') }]}"
                    @change="${(e: any) => this.handleUpdateVariant({ layout: e.detail }, variants)}"
                  ></ui-select>
                  <ui-color-picker 
                    label="${msg('Color de fondo')}" 
                    .value="${variant.bgColor}"
                    @change="${(e: any) => this.handleUpdateVariant({ bgColor: e.detail }, variants)}"
                  ></ui-color-picker>
                  <ui-range 
                    label="${msg('Opacidad de fondo %')}" 
                    .value="${variant.bgOpacity}"
                    @change="${(e: any) => this.handleUpdateVariant({ bgOpacity: e.detail }, variants)}"
                  ></ui-range>
                  <ui-input 
                    label="${msg('Relleno (px)')}" 
                    type="number" 
                    .value="${variant.padding.toString()}" 
                    @change="${(e: any) => this.handleUpdateVariant({ padding: Number(e.detail) }, variants)}"
                  ></ui-input>
                  <ui-input 
                    label="${msg('Espaciado (px)')}" 
                    type="number" 
                    .value="${variant.spacing.toString()}" 
                    @change="${(e: any) => this.handleUpdateVariant({ spacing: Number(e.detail) }, variants)}"
                  ></ui-input>
                  <div style="display: flex; gap: 1rem; margin-top: 0.5rem;">
                    <ui-toggle 
                      label="${msg('Redondeado')}" 
                      .checked="${variant.rounded}"
                      @change="${(e: any) => this.handleUpdateVariant({ rounded: e.detail }, variants)}"
                    ></ui-toggle>
                    <ui-toggle 
                      label="${msg('Sombra de caja')}" 
                      .checked="${variant.shadow}"
                      @change="${(e: any) => this.handleUpdateVariant({ shadow: e.detail }, variants)}"
                    ></ui-toggle>
                  </div>
                </div>
              ` : ''}
            </div>

            <div class="section">
              <button class="section-btn" @click="${() => this.rightExpandedSection = 'media'}">
                <span style="font-weight: 600;">${msg('Imágenes y sonido')}</span>
              </button>
              ${this.rightExpandedSection === 'media' ? html`
                <div class="section-content">
                  <button @click="${() => this.showMediaLibrary = 'image'}" style="width: 100%; padding: 0.5rem; background: #3a3a3d; border: none; color: white; border-radius: 0.375rem; cursor: pointer; margin-bottom: 0.5rem;">
                    ${msg('Cambiar imagen')}
                  </button>
                  <ui-range label="${msg('Escala de imagen')}" .value="${variant.imageScale}" @change="${(e: any) => this.handleUpdateVariant({ imageScale: e.detail }, variants)}"></ui-range>
                  <ui-range label="${msg('Volumen de imagen (WebM)')}" .value="${variant.imageVolume}" @change="${(e: any) => this.handleUpdateVariant({ imageVolume: e.detail }, variants)}"></ui-range>
                  <div style="height: 1px; background: rgba(255,255,255,0.1); margin: 1rem 0;"></div>
                  <button @click="${() => this.showMediaLibrary = 'sound'}" style="width: 100%; padding: 0.5rem; background: #3a3a3d; border: none; color: white; border-radius: 0.375rem; cursor: pointer; margin-bottom: 0.5rem;">
                    ${msg('Cambiar sonido')}
                  </button>
                  <ui-range label="${msg('Volumen del sonido')}" .value="${variant.soundVolume}" @change="${(e: any) => this.handleUpdateVariant({ soundVolume: e.detail }, variants)}"></ui-range>
                </div>
              ` : ''}
            </div>
          ` : ''}
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
