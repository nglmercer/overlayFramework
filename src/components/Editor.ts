import { html, css, LitElement, render } from 'lit';
import { Component, property, state, query } from '../litcomponents';
import { dbManager, AlertVariant } from '../lib/db';
import { platformEventsSchema, PlatformEventDefinition } from '../lib/alertEvents';
import { consume } from '@lit/context';
import { platformSchemaContext } from '../context/schemaContext';
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
  @state() private variants: AlertVariant[] = [];
  @state() private selectedVariantId: string | null = null;

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
    await this.loadVariants();
    
    if (this.schema && this.schema.length > 0 && !this.expandedSection) {
        this.expandedSection = this.schema[0].id;
    }
  }

  async loadVariants() {
    const data = await dbManager.getVariants(this.boxId);
    this.variants = data;
    if (data.length > 0 && !this.selectedVariantId) {
      this.selectedVariantId = data[0].id;
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
    await this.loadVariants();
    this.selectedVariantId = newVariant.id;
  }

  async handleUpdateVariant(updates: Partial<AlertVariant>) {
    if (!this.selectedVariantId) return;
    const variant = this.variants.find(v => v.id === this.selectedVariantId);
    if (!variant) return;
    
    const updated = { ...variant, ...updates };
    this.variants = this.variants.map(v => v.id === this.selectedVariantId ? updated : v);
    await dbManager.saveVariant(updated);
  }

  get selectedVariant() {
    return this.variants.find(v => v.id === this.selectedVariantId);
  }

  render() {
    const variant = this.selectedVariant;

    return html`
      <div class="topbar">
        <button class="btn-back" @click="${this.onBack}">
          <span>&larr; Regresar</span>
        </button>
        <div class="flex-center">
          <span style="font-weight: 700;">Alerts Box Editor</span>
        </div>
        <div style="width: 100px;"></div> <!-- Spacer -->
      </div>

      <div class="workspace">
        <!-- Sidebar Left -->
        <div class="sidebar-left custom-scrollbar">
          <div class="sidebar-header">
            <span>VARIANTES</span>
            <button @click="${this.handleCreateVariant}" style="background: transparent; border: none; color: #a970ff; cursor: pointer;">+</button>
          </div>
          
          ${this.schema?.map(item => html`
            <div class="section">
              <button 
                class="section-btn" 
                @click="${() => this.expandedSection = this.expandedSection === item.id ? null : item.id}"
              >
                <span style="font-weight: 600; font-size: 0.875rem;">${item.label}</span>
                <span>${this.expandedSection === item.id ? '▲' : '▼'}</span>
              </button>
              
              ${this.expandedSection === item.id ? html`
                <div class="section-content">
                  ${this.variants.filter(v => v.type === item.id).length >= 2 ? html`
                    <div style="margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
                      <div 
                        class="toggle ${this.randomize ? 'on' : 'off'}" 
                        @click="${() => this.randomize = !this.randomize}"
                      >
                        <div class="toggle-knob"></div>
                      </div>
                      <span style="font-size: 0.75rem;">Aleatorio</span>
                    </div>
                  ` : ''}
                  
                  ${this.variants.filter(v => v.type === item.id).map(v => html`
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
            ` : 'Selecciona una variante para previsualizar'}
          </div>
        </div>

        <!-- Sidebar Right -->
        <div class="sidebar-right custom-scrollbar">
          ${variant ? html`
            <div class="section">
              <button class="section-btn" @click="${() => this.rightExpandedSection = 'general'}">
                <span style="font-weight: 600;">Configuración general</span>
              </button>
              ${this.rightExpandedSection === 'general' ? html`
                <div class="section-content">
                  <ui-input 
                    label="Nombre" 
                    .value="${variant.name}" 
                    @change="${(e: any) => this.handleUpdateVariant({ name: e.detail })}"
                  ></ui-input>
                  <ui-input 
                    label="Duración" 
                    type="number" 
                    .value="${variant.duration.toString()}" 
                    @change="${(e: any) => this.handleUpdateVariant({ duration: Number(e.detail) })}"
                  ></ui-input>
                </div>
              ` : ''}
            </div>

            <div class="section">
              <button class="section-btn" @click="${() => this.rightExpandedSection = 'design'}">
                <span style="font-weight: 600;">Diseño</span>
              </button>
              ${this.rightExpandedSection === 'design' ? html`
                <div class="section-content">
                  <ui-select 
                    label="Diseño" 
                    .value="${variant.layout}"
                    .options="${[{ value: 'text-below', label: 'Texto abajo' }, { value: 'text-right', label: 'Texto derecha' }]}"
                    @change="${(e: any) => this.handleUpdateVariant({ layout: e.detail })}"
                  ></ui-select>
                  <ui-color-picker 
                    label="Color de fondo" 
                    .value="${variant.bgColor}"
                    @change="${(e: any) => this.handleUpdateVariant({ bgColor: e.detail })}"
                  ></ui-color-picker>
                  <ui-range 
                    label="Opacidad" 
                    .value="${variant.bgOpacity}"
                    @change="${(e: any) => this.handleUpdateVariant({ bgOpacity: e.detail })}"
                  ></ui-range>
                  <ui-toggle 
                    label="Redondeado" 
                    .checked="${variant.rounded}"
                    @change="${(e: any) => this.handleUpdateVariant({ rounded: e.detail })}"
                  ></ui-toggle>
                </div>
              ` : ''}
            </div>

            <div class="section">
              <button class="section-btn" @click="${() => this.rightExpandedSection = 'media'}">
                <span style="font-weight: 600;">Imágenes y sonido</span>
              </button>
              ${this.rightExpandedSection === 'media' ? html`
                <div class="section-content">
                  <button @click="${() => this.showMediaLibrary = 'image'}" style="width: 100%; padding: 0.5rem; background: #3a3a3d; border: none; color: white; border-radius: 0.375rem; cursor: pointer;">
                    Cambiar imagen
                  </button>
                  <ui-range label="Volumen" .value="${variant.soundVolume}" @change="${(e: any) => this.handleUpdateVariant({ soundVolume: e.detail })}"></ui-range>
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
            if (this.showMediaLibrary === 'image') this.handleUpdateVariant({ imageUrl: url, imageName: name });
            else this.handleUpdateVariant({ soundUrl: url, soundName: name });
            this.showMediaLibrary = null;
          }}"
        ></media-library>
      ` : ''}
    `;
  }
}
