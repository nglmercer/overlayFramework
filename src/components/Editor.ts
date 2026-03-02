/**
 * Editor Component
 * 
 * Main Editor component for the overlay framework.
 * Manages variant selection, preview, and property editing.
 * 
 * @module components/Editor
 */

import { html, css, LitElement } from 'lit';
import { Component, property, state, query } from '../litcomponents';
import { dbManager, AlertVariant } from '../lib/db';
import { platformEventsSchema, PlatformEventDefinition } from '../lib/alertEvents';
import { consume } from '@lit/context';
import { platformSchemaContext } from '../context/schemaContext';
import { Task } from '@lit/task';
import { confirm } from '../lib/dialog';
import { LocalizeController } from '../locales/localization';
import { AnimationConfig } from '../schemas/animation-schemas';
import { duplicateAlertVariant, createAlertVariant } from '../lib/core';
import './FormControls';
import './MediaLibrary';

import './editor';

// Import editor sub-components
import { EditorTopbar } from './editor/EditorTopbar';
import { EditorLeftSidebar } from './editor/EditorLeftSidebar';
import { EditorPreview } from './editor/EditorPreview';
import { EditorRightSidebar } from './editor/EditorRightSidebar';

// Import sample data for testing
import kickChatSample from '../../schemas/sample/kick_ChatMessageEvent.json';
import tiktokChatSample from '../../schemas/sample/tiktok_chat.json';
import tiktokGiftSample from '../../schemas/sample/tiktok_gift.json';
import tiktokSocialSample from '../../schemas/sample/tiktok_social.json';

// Import constants
import { CONFIG, COLORS, EVENTS } from '../lib/constants';
import { getBackendEndpoint } from '../lib/config';

// =============================================================================
// Type Definitions
// =============================================================================

/**
 * Supported background colors for the preview area.
 */
type BgColor = 'transparent' | '#000000' | '#ffffff' | '#ff0000';

/**
 * Media library selection mode - determines which field gets updated.
 */
type MediaLibraryType = 'image' | 'sound';

/**
 * Animation configs combined (used by AnimationPanel for bulk updates).
 */
interface AnimationConfigs {
  entrance: AnimationConfig;
  exit: AnimationConfig;
}

// =============================================================================
// Component Definition
// =============================================================================

@Component('app-editor')
export class AppEditor extends LitElement {
  // ---------------------------------------------------------------------------
  // Properties (Public API)
  // ---------------------------------------------------------------------------
  
  /** The unique identifier of the alert box being edited */
  @property({ type: String }) 
  boxId = '';

  /** Callback function to navigate back to the dashboard */
  @property({ type: Function }) 
  onBack: () => void = () => {};

  /**
   * Platform event schema definitions.
   * Consumed from context to determine available alert types.
   */
  @consume({ context: platformSchemaContext })
  @property({ attribute: false })
  public schema!: PlatformEventDefinition[];

  // ---------------------------------------------------------------------------
  // Internal State
  // ---------------------------------------------------------------------------
  
  /** Currently expanded section in the left sidebar */
  @state() private expandedSection: string | null = null;
  
  /** Currently active panel in the right sidebar */
  @state() private rightExpandedSection: string | null = 'general';
  
  /** Whether random variant selection is enabled */
  @state() private randomize = false;
  
  /** Which media library to show (if any) */
  @state() private showMediaLibrary: MediaLibraryType | null = null;
  
  /** Currently selected variant ID */
  @state() private selectedVariantId: string | null = null;
  
  /** Local copy of variants for immediate UI updates without refetching */
  @state() private _localVariants: AlertVariant[] = [];
  
  /** Preview canvas width in pixels */
  @state() private previewWidth = CONFIG.PREVIEW.DEFAULT_SIZE;
  
  /** Preview canvas height in pixels */
  @state() private previewHeight = CONFIG.PREVIEW.DEFAULT_SIZE;
  
  /** Preview canvas background color */
  @state() private previewBgColor: BgColor = 'transparent';

  /** Whether the preview is connected to WebSocket */
  @state() private isWsConnected = false;

  // ---------------------------------------------------------------------------
  // Controllers and Tasks
  // ---------------------------------------------------------------------------
  
  /** Localization controller for translated strings */
  private _localize = new LocalizeController(this);
  
  /**
   * Task for loading variants from the database.
   */
  private _variantsTask = new Task(this, {
    task: async ([boxId], {signal}) => {
      const data = await dbManager.getVariants(boxId);
      // Auto-select first variant if none selected
      if (data.length > 0 && !this.selectedVariantId) {
        this.selectedVariantId = data[0].id;
      }
      return data;
    },
    args: () => [this.boxId]
  });

  // ---------------------------------------------------------------------------
  // Query References
  // ---------------------------------------------------------------------------
  
  @query('#file-input') private fileInput!: HTMLInputElement;
  @query('editor-preview') private editorPreview!: EditorPreview;

  // ---------------------------------------------------------------------------
  // Styles
  // ---------------------------------------------------------------------------
  
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
      position: relative;
    }
    
    .custom-scrollbar::-webkit-scrollbar { width: 4px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #3a3a3d; border-radius: 10px; }

    @media (max-width: 1024px) {
      .workspace {
        flex-direction: row;
      }
    }

    @media (max-width: 768px) {
      .workspace {
        flex-direction: column;
      }
    }
  `;

  // ---------------------------------------------------------------------------
  // Lifecycle Methods
  // ---------------------------------------------------------------------------

  async connectedCallback() {
    super.connectedCallback();
    
    console.log('[Editor] connectedCallback - boxId:', this.boxId, 'schema:', this.schema);
    
    if (this.schema && this.schema.length > 0 && !this.expandedSection) {
      this.expandedSection = this.schema[0].id;
    }
  }

  willUpdate(changedProperties: Map<string, unknown>) {
    if (changedProperties.has('boxId') && this.boxId && this._localVariants.length > 0) {
      this._localVariants = [];
    }
  }

  updated(changedProperties: Map<string, unknown>) {
    if (changedProperties.has('boxId') && this.boxId) {
      setTimeout(() => {
        this._autoGeneratePreviewUrl();
      }, 500);
    }
  }

  // =============================================================================
  // Private Helpers
  // =============================================================================

  private async _autoGeneratePreviewUrl() {
    const variants = (this._variantsTask?.value || this._localVariants || []);
    const variant = this.getSelectedVariant(variants);
    
    if (!variant) return;
    
    try {
      const url = await this.handleGetPreviewUrl();
      if (url) {
        const topbar = this.shadowRoot?.querySelector('editor-topbar') as any;
        if (topbar && topbar.previewUrl !== url) {
          topbar.previewUrl = url;
        }
      }
    } catch (error) {
      console.error('Auto-generate preview URL failed:', error);
    }
  }

  private t(key: string): string {
    return this._localize.t(key);
  }

  getSelectedVariant(variants: AlertVariant[]): AlertVariant | undefined {
    return variants.find(v => v.id === this.selectedVariantId);
  }

  /**
   * Combined variants list: prioritizes local state over task value.
   */
  private get variants(): AlertVariant[] {
    if (this._localVariants && this._localVariants.length > 0) {
      return this._localVariants;
    }
    return (this._variantsTask.value as AlertVariant[]) || [];
  }

  /**
   * Creates the data object for a new variant.
   */
  private createNewVariantData(type: string, schemaDef: PlatformEventDefinition): AlertVariant {
    return createAlertVariant({
      boxId: this.boxId,
      eventType: type,
      data: {
        type,
        name: schemaDef.label ? `${schemaDef.label} Variant` : 'Nueva variante',
        condition: schemaDef.conditionLabel,
        message: schemaDef.defaultMessage,
      },
    });
  }

  // =============================================================================
  // Preview Control Handlers (arrow functions for correct `this` binding)
  // =============================================================================

  handlePlayPreview = (): void => {
    if (this.editorPreview && this.editorPreview.playPreview) {
      this.editorPreview.playPreview();
    }
  }

  handleGetPreviewUrl = async (): Promise<string | null> => {
    if (!this.boxId) return null;
    
    const variants = this.variants;
    const variant = this.getSelectedVariant(variants);
    
    if (!variant) {
      console.warn('[Editor] handleGetPreviewUrl: No variant found to save');
      return null;
    }

    try {
      const response = await fetch(getBackendEndpoint('/webhook/save'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: this.boxId,
          data: {
            variants: variants,
            variant: variant,
            preview: true
          }
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        return result.previewUrl;
      }
    } catch (error) {
      console.error('Failed to generate preview URL:', error);
    }
    
    return null;
  }

  handleSendTestAlert = async (): Promise<void> => {
    const variants = this.variants;
    const variant = this.getSelectedVariant(variants);
    
    if (!variant) {
      console.warn('[Editor] No variant selected for test alert');
      this.handlePlayPreview();
      return;
    }
    
    const eventType = variant.type;
    
    let testData: Record<string, string> = {
      username: 'TestUser',
      message: 'Test Alert!',
    };

    if (eventType === 'kick_chat') {
      testData = {
        username: kickChatSample.sender?.username || 'KickUser',
        message: kickChatSample.content || 'Hello Kick!'
      };
    } else if (eventType === 'tiktok_chat') {
      testData = {
        username: tiktokChatSample.uniqueId || 'TikTokUser',
        message: tiktokChatSample.comment || 'Hi TikTok!'
      };
    } else if (eventType === 'tiktok_gift') {
      testData = {
        username: tiktokGiftSample.uniqueId || 'Gifter',
        giftName: tiktokGiftSample.giftName || 'Rose',
        amount: String(tiktokGiftSample.repeatCount || 1)
      };
    } else if (eventType === 'tiktok_social') {
      testData = {
        username: tiktokSocialSample.uniqueId || 'Follower',
        nickname: tiktokSocialSample.nickname || 'FollowerNick'
      };
    }

    if (this.isWsConnected) {
      try {
        const response = await fetch(getBackendEndpoint('/webhook/alert'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventName: eventType,
            data: testData
          })
        });

        if (response.ok) {
          console.log('[Editor] Test alert sent via backend (WebSocket broadcast)');
          return;
        }
      } catch (err) {
        console.warn('[Editor] Failed to send alert via backend, falling back to postMessage', err);
      }
    }
    
    if (this.editorPreview) {
      const iframe = this.editorPreview.shadowRoot?.querySelector('iframe') as HTMLIFrameElement;
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage({
          type: 'send-test-alert',
          payload: { eventName: eventType, data: testData }
        }, '*');
        console.log('[Editor] Test alert sent via iframe fallback:', eventType);
      }
    }
    
    this.handlePlayPreview();
  }

  // =============================================================================
  // Variant CRUD Operations (arrow functions for correct `this` binding)
  // =============================================================================

  /**
   * Creates a new variant and adds it to local state immediately (optimistic update).
   */
  handleCreateVariant = async (): Promise<void> => {
    console.log('[Editor] handleCreateVariant called');

    const type = this.expandedSection || 
      (this.schema && this.schema.length > 0 ? this.schema[0].id : '');
    const schemaDef = this.schema?.find(s => s.id === type) || this.schema?.[0];
    
    console.log('[Editor] handleCreateVariant - type:', type, 'schemaDef:', schemaDef);
    
    if (!schemaDef) {
      console.warn('[Editor] handleCreateVariant: no schemaDef found for type', type);
      return;
    }
    
    try {
      const newVariant: AlertVariant = this.createNewVariantData(type, schemaDef);
      console.log('[Editor] handleCreateVariant - newVariant:', newVariant);
      await dbManager.saveVariant(newVariant);
      
      // Optimistic update: show new variant immediately without waiting for task
      const currentVariants = this.variants;
      this._localVariants = [...currentVariants, newVariant];
      this.selectedVariantId = newVariant.id;
      
      // Auto-expand the section so the new variant is visible
      if (this.expandedSection !== type) {
        this.expandedSection = type;
      }
      
      // Refresh from DB in background
      this._variantsTask.run();
      dbManager.getVariants(this.boxId).then((freshVariants) => {
        if (freshVariants && freshVariants.length > 0) {
          this._localVariants = freshVariants;
        }
      }).catch(err => console.warn('[Editor] Background refresh failed:', err));
    } catch (err) {
      console.error('[Editor] handleCreateVariant failed:', err);
    }
  }

  /**
   * Updates a variant's properties in the database.
   */
  handlePropertyChange = async (updates: Partial<AlertVariant>, _variants: AlertVariant[]): Promise<void> => {
    if (!this.selectedVariantId) return;
    
    const variants = this.variants;
    const variant = variants.find(v => v.id === this.selectedVariantId);
    if (!variant) return;
    
    const updated = { ...variant, ...updates };

    try {
      await dbManager.saveVariant(updated);
    } catch (err) {
      console.error('[Editor] handlePropertyChange: saveVariant failed:', err);
      return;
    }
    
    this._localVariants = variants.map(v => v.id === this.selectedVariantId ? updated : v);
    
    this.handleGetPreviewUrl().catch(err => console.error('Auto-save to backend failed:', err));
  }

  /**
   * Duplicates an existing variant.
   */
  handleDuplicateVariant = async (id: string): Promise<void> => {
    try {
      const variant = await dbManager.getVariantById(id);
      if (!variant) return;

      const newVariant = duplicateAlertVariant(variant, { name: `${variant.name} (copy)` });

      await dbManager.saveVariant(newVariant);
      
      // Optimistic update
      const currentVariants = this.variants;
      this._localVariants = [...currentVariants, newVariant];
      this.selectedVariantId = newVariant.id;
      
      // Refresh from DB in background
      this._variantsTask.run();
      dbManager.getVariants(this.boxId).then((freshVariants) => {
        if (freshVariants && freshVariants.length > 0) {
          this._localVariants = freshVariants;
        }
      }).catch(err => console.warn('[Editor] Background refresh after duplicate failed:', err));
    } catch (err) {
      console.error('[Editor] handleDuplicateVariant failed:', err);
    }
  }

  /**
   * Deletes a variant from the database.
   */
  handleDeleteVariant = async (idOrEvent: string | CustomEvent): Promise<void> => {
    const id = typeof idOrEvent === 'string' ? idOrEvent : idOrEvent.detail;
    if (!id) return;

    const confirmResult = await confirm(this.t('variant.confirmDelete'));
    if (confirmResult) {
      await dbManager.deleteVariant(id);
      this._localVariants = [];
      
      if (this.selectedVariantId === id) {
        this.selectedVariantId = null;
      }
      
      this._variantsTask.run();
    }
  }

  // =============================================================================
  // Event Handlers (arrow functions for correct `this` binding)
  // =============================================================================

  private _handleSectionChange = (e: CustomEvent): void => {
    this.expandedSection = e.detail;
  }

  private _handleVariantSelect = (e: CustomEvent): void => {
    this.selectedVariantId = e.detail;
  }

  private _handleRandomizeToggle = (): void => {
    this.randomize = !this.randomize;
  }

  private _handlePreviewWidthChange = (e: CustomEvent): void => {
    this.previewWidth = e.detail;
  }

  private _handlePreviewHeightChange = (e: CustomEvent): void => {
    this.previewHeight = e.detail;
  }

  private _handlePreviewBgChange = (e: CustomEvent): void => {
    this.previewBgColor = e.detail;
  }

  private _handleWsAlert = (e: CustomEvent): void => {
    console.log('[Editor] WS Alert received:', e.detail);
  }

  private _handlePropertyPanelChange = (e: CustomEvent, variants: AlertVariant[]): void => {
    const { field, value } = e.detail;
    
    if (field === 'animationConfigs' && value && typeof value === 'object') {
      const { entrance, exit } = value as AnimationConfigs;
      this.handlePropertyChange({ 
        entranceAnimation: entrance, 
        exitAnimation: exit 
      }, variants);
      return;
    }

    if (field === 'animationIn' || field === 'animationOut') {
      this.handlePropertyChange({ [field]: value }, variants);
      return;
    }
    
    this.handlePropertyChange({ [field]: value }, variants);
  }

  private _handleWsConnectionChange = (e: CustomEvent): void => {
    const { state, type } = e.detail;
    if (type === 'websocket') {
      this.isWsConnected = state === 'connected';
      console.log('[Editor] WS Connection state updated:', this.isWsConnected ? 'Connected' : 'Disconnected');
    }
  }

  private _handleOpenMediaLibrary = (type: MediaLibraryType): void => {
    this.showMediaLibrary = type;
  }

  private _handleMediaSelect = (e: CustomEvent<{ url: string; name: string }>): void => {
    const { url, name } = e.detail;
    
    // Use computed variants (not stale _variantsTask.value)
    const variants = this.variants;
    const variant = this.getSelectedVariant(variants);
    
    if (!variant) return;
    
    if (this.showMediaLibrary === 'image') {
      this.handlePropertyChange({ 
        imageUrl: url,
        imageName: name 
      }, variants);
    } else if (this.showMediaLibrary === 'sound') {
      this.handlePropertyChange({ 
        soundUrl: url,
        soundName: name 
      }, variants);
    }
    
    this.showMediaLibrary = null;
  }

  private _handleMediaClose = (): void => {
    this.showMediaLibrary = null;
  }

  private _handleRightPanelChange = (e: CustomEvent): void => {
    this.rightExpandedSection = e.detail;
  }

  // =============================================================================
  // Render
  // =============================================================================

  render() {
    const variants = this.variants;
    
    return html`
      <!-- Top Bar -->
      <editor-topbar
        .onBack="${this.onBack}"
        .onPlayPreview="${this.handlePlayPreview}"
        .onSendTestAlert="${this.handleSendTestAlert}"
        .onGetPreviewUrl="${this.handleGetPreviewUrl}"
        .boxId="${this.boxId}"
        .autoPreview="${true}"
      ></editor-topbar>

      <div class="workspace custom-scrollbar">
        <!-- Left Sidebar -->
        <editor-left-sidebar
          .schema="${this.schema}"
          .variants="${variants}"
          .selectedVariantId="${this.selectedVariantId}"
          .expandedSection="${this.expandedSection}"
          .randomize="${this.randomize}"
          @${EVENTS.COMPONENT.SECTION_CHANGE}="${this._handleSectionChange}"
          @${EVENTS.COMPONENT.VARIANT_SELECT}="${this._handleVariantSelect}"
          @${EVENTS.COMPONENT.CREATE_VARIANT}="${this.handleCreateVariant}"
          @${EVENTS.COMPONENT.DUPLICATE_VARIANT}="${this.handleDuplicateVariant}"
          @${EVENTS.COMPONENT.DELETE_VARIANT}="${this.handleDeleteVariant}"
          @${EVENTS.COMPONENT.RANDOMIZE_TOGGLE}="${this._handleRandomizeToggle}"
        ></editor-left-sidebar>

        <!-- Preview Area -->
        <editor-preview
          .variant="${this.getSelectedVariant(variants)}"
          .variants="${variants}"
          .eventData="${{ username: 'Test User', months: '1', amount: '100' }}"
          .width="${this.previewWidth}"
          .height="${this.previewHeight}"
          .bgColor="${this.previewBgColor}"
          @${EVENTS.COMPONENT.PLAY_PREVIEW}="${this.handlePlayPreview}"
          @${EVENTS.COMPONENT.SEND_TEST}="${this.handleSendTestAlert}"
          @${EVENTS.COMPONENT.WIDTH_CHANGE}="${this._handlePreviewWidthChange}"
          @${EVENTS.COMPONENT.HEIGHT_CHANGE}="${this._handlePreviewHeightChange}"
          @${EVENTS.COMPONENT.BG_CHANGE}="${this._handlePreviewBgChange}"
          @${EVENTS.COMPONENT.WS_ALERT}="${this._handleWsAlert}"
          @${EVENTS.COMPONENT.WS_CONNECTION_CHANGE}="${this._handleWsConnectionChange}"
        ></editor-preview>

        <!-- Right Sidebar -->
        <editor-right-sidebar
          .variant="${this.getSelectedVariant(variants)}"
          .activePanel="${this.rightExpandedSection}"
          @${EVENTS.COMPONENT.PANEL_CHANGE}="${this._handleRightPanelChange}"
          @${EVENTS.COMPONENT.PROPERTY_CHANGE}="${(e: CustomEvent) => this._handlePropertyPanelChange(e, variants)}"
          @${EVENTS.COMPONENT.OPEN_MEDIA_LIBRARY}="${(e: CustomEvent) => this._handleOpenMediaLibrary(e.detail)}"
          @${EVENTS.COMPONENT.DELETE_VARIANT}="${this.handleDeleteVariant}"
          @${EVENTS.COMPONENT.DUPLICATE_VARIANT}="${(e: CustomEvent) => this.handleDuplicateVariant(e.detail)}"
        ></editor-right-sidebar>
      </div>

      <!-- Media Library Modal -->
      ${this.showMediaLibrary ? html`
        <media-library
          .type="${this.showMediaLibrary}"
          .selectedUrl="${this.getSelectedVariant(variants)?.imageUrl || this.getSelectedVariant(variants)?.soundUrl || null}"
          @${EVENTS.COMPONENT.MEDIA_SELECT}="${this._handleMediaSelect}"
          @${EVENTS.COMPONENT.MEDIA_CLOSE}="${this._handleMediaClose}"
        ></media-library>
      ` : ''}
    `;
  }
}
