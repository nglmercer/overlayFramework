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
import { AnimationConfig, defaultAnimationConfig } from '../schemas/animation-schemas';
import './FormControls';
import './MediaLibrary';

import './editor';

// Import editor sub-components
import { EditorTopbar } from './editor/EditorTopbar';
import { EditorLeftSidebar } from './editor/EditorLeftSidebar';
import { EditorPreview } from './editor/EditorPreview';
import { EditorRightSidebar } from './editor/EditorRightSidebar';

// Import constants
import { CONFIG, ALERT_DEFAULTS, COLORS } from '../lib/constants';
import { getBackendEndpoint } from '../lib/config';

// =============================================================================
// Type Definitions
// =============================================================================

/**
 * Supported background colors for the preview area.
 * Shared with EditorPreview component for consistency.
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

/**
 * Main Editor component for the overlay framework.
 * 
 * This component serves as the central hub for editing alert variants.
 * It manages:
 * - Variant selection and CRUD operations
 * - Preview configuration (size, background)
 * - Communication between sub-components (sidebar, preview, property panels)
 * - Media library integration
 * 
 * @example
 * ```html
 * <app-editor
 *   .boxId="${boxId}"
 *   .onBack="${() => navigateBack()}"
 * ></app-editor>
 * ```
 */
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
   * Uses Lit's Task pattern for async data loading with loading/error states.
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

    /* ── Responsive Styles ── */
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

  /**
   * Called when the component is added to the DOM.
   * Initializes the default expanded section based on available schema.
   */
  async connectedCallback() {
    super.connectedCallback();
    
    if (this.schema && this.schema.length > 0 && !this.expandedSection) {
      this.expandedSection = this.schema[0].id;
    }
  }

  /**
   * Called when component properties change.
   * Auto-generates preview URL when boxId changes.
   */
  updated(changedProperties: Map<string, unknown>) {
    // Auto-generate preview URL when boxId changes or when variants are loaded
    if (changedProperties.has('boxId') && this.boxId) {
      // Small delay to ensure variants are loaded
      setTimeout(() => {
        this._autoGeneratePreviewUrl();
      }, 500);
    }
  }

  /**
   * Auto-generate preview URL and notify topbar
   */
  private async _autoGeneratePreviewUrl() {
    const variants = (this._variantsTask?.value || this._localVariants || []);
    const variant = this.getSelectedVariant(variants);
    
    if (!variant) return;
    
    try {
      const url = await this.handleGetPreviewUrl();
      if (url) {
        // Get the topbar and update its preview URL
        const topbar = this.shadowRoot?.querySelector('editor-topbar') as any;
        if (topbar && topbar.previewUrl !== url) {
          topbar.previewUrl = url;
        }
      }
    } catch (error) {
      console.error('Auto-generate preview URL failed:', error);
    }
  }

  // =============================================================================
  // Public Helper Methods
  // =============================================================================

  /**
   * Translates a localization key using the current locale.
   * @param key - The localization key to translate
   * @returns The translated string
   */
  private t(key: string): string {
    return this._localize.t(key);
  }

  /**
   * Retrieves the currently selected variant from the variant list.
   * @param variants - Array of all available variants
   * @returns The selected variant or undefined if not found
   */
  getSelectedVariant(variants: AlertVariant[]): AlertVariant | undefined {
    return variants.find(v => v.id === this.selectedVariantId);
  }

  /**
   * Combined variants list: prioritizes local state over task value to avoid stale data.
   */
  private get variants(): AlertVariant[] {
    // If we have local changes, use them. Otherwise use the task value.
    if (this._localVariants && this._localVariants.length > 0) {
      return this._localVariants;
    }
    return (this._variantsTask.value as AlertVariant[]) || [];
  }

  // =============================================================================
  // Preview Control Methods
  // =============================================================================

  /**
   * Triggers the preview component to play the current alert animation.
   */
  handlePlayPreview = (): void => {
    if (this.editorPreview && this.editorPreview.playPreview) {
      this.editorPreview.playPreview();
    }
  }

  /**
   * Generates a preview URL for the current overlay by saving data to the backend.
   */
  handleGetPreviewUrl = async (): Promise<string | null> => {
    if (!this.boxId) return null;
    
    // Use the computed variants to avoid stale data
    const variants = this.variants;
    const variant = this.getSelectedVariant(variants);
    
    if (!variant) {
      console.warn('[Editor] handleGetPreviewUrl: No variant found to save');
      return null;
    }

    console.log('[Editor] Saving variant to backend for preview:', { 
      id: variant.id, 
      imageUrl: variant.imageUrl 
    });
    
    try {
      const response = await fetch(getBackendEndpoint('/webhook/save'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: this.boxId,
          data: {
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

  /**
   * Dispatches a test alert event to WebSocket and plays the preview.
   * Sends to backend via WebSocket for real testing.
   */
  handleSendTestAlert = async (): Promise<void> => {
    // Use computed variants
    const variants = this.variants;
    const variant = this.getSelectedVariant(variants);
    
    if (!variant) {
      console.warn('[Editor] No variant selected for test alert');
      this.handlePlayPreview();
      return;
    }
    
    const eventType = variant.type;
    
    // Default test data based on event type
    const testData: Record<string, string> = {
      username: 'TestUser',
      amount: '100',
      months: '1',
      message: 'Test Alert!',
    };

    // If WS is connected, prioritize sending via backend for real broadcast
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
    
    // Fallback: Send test alert to preview iframe via postMessage for local testing
    if (this.editorPreview) {
      // Access the iframe inside editor-preview and send message
      const iframe = this.editorPreview.shadowRoot?.querySelector('iframe') as HTMLIFrameElement;
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage({
          type: 'send-test-alert',
          payload: { eventName: eventType, data: testData }
        }, '*');
        console.log('[Editor] Test alert sent via iframe fallback:', eventType);
      }
    }
    
    // Also play local preview (in case WS is slow or as fallback)
    this.handlePlayPreview();
  }

  // =============================================================================
  // Variant CRUD Operations
  // =============================================================================

  /**
   * Creates a new alert variant with default values.
   * The variant is initialized based on the current schema type.
   * 
   * @returns The newly created variant object (not yet saved to DB)
   */
  private createNewVariantData(type: string, schemaDef: PlatformEventDefinition): AlertVariant {
    return {
      id: crypto.randomUUID(),
      boxId: this.boxId,
      type,
      name: ALERT_DEFAULTS.NAME,
      condition: schemaDef.conditionLabel,
      duration: ALERT_DEFAULTS.DURATION,
      animationIn: ALERT_DEFAULTS.ANIMATION.IN,
      animationOut: ALERT_DEFAULTS.ANIMATION.OUT,
      animationInDuration: ALERT_DEFAULTS.ANIMATION_DURATION,
      animationOutDuration: ALERT_DEFAULTS.ANIMATION_DURATION,
      entranceAnimation: { ...defaultAnimationConfig },
      exitAnimation: { ...defaultAnimationConfig },
      layout: ALERT_DEFAULTS.LAYOUT,
      bgColor: ALERT_DEFAULTS.COLORS.BG,
      bgOpacity: ALERT_DEFAULTS.OPACITY.BG,
      padding: ALERT_DEFAULTS.SPACING.PADDING,
      spacing: ALERT_DEFAULTS.SPACING.ITEM,
      rounded: ALERT_DEFAULTS.BOX.ROUNDED,
      shadow: ALERT_DEFAULTS.BOX.SHADOW,
      message: schemaDef.defaultMessage,
      fontFamily: ALERT_DEFAULTS.TYPOGRAPHY.FONT_FAMILY,
      fontWeight: ALERT_DEFAULTS.TYPOGRAPHY.FONT_WEIGHT,
      fontSize: ALERT_DEFAULTS.TYPOGRAPHY.FONT_SIZE,
      textAlign: ALERT_DEFAULTS.TYPOGRAPHY.TEXT_ALIGN as 'left' | 'center' | 'right' | 'justify',
      textColor: ALERT_DEFAULTS.COLORS.TEXT,
      highlightColor: ALERT_DEFAULTS.COLORS.HIGHLIGHT,
      textShadow: true,
      ttsEnabled: false,
      imageScale: ALERT_DEFAULTS.MEDIA.IMAGE_SCALE,
      imageVolume: ALERT_DEFAULTS.MEDIA.IMAGE_VOLUME,
      soundVolume: ALERT_DEFAULTS.MEDIA.SOUND_VOLUME,
      active: true,
    };
  }

  /**
   * Handles the creation of a new alert variant.
   * Creates a new variant with defaults, saves to DB, and selects it.
   */
  async handleCreateVariant(): Promise<void> {
    // Determine which alert type to create based on current selection or schema
    const type = this.expandedSection || 
      (this.schema && this.schema.length > 0 ? this.schema[0].id : '');
    const schemaDef = this.schema?.find(s => s.id === type) || this.schema?.[0];
    
    if (!schemaDef) return;
    
    // Create and save the new variant
    const newVariant: AlertVariant = this.createNewVariantData(type, schemaDef);
    await dbManager.saveVariant(newVariant);
    
    // Refresh the variants list and select the new one
    this._variantsTask.run();
    this.selectedVariantId = newVariant.id;
  }

  /**
   * Updates a variant's properties in the database.
   * Maintains local state for immediate UI feedback.
   * 
   * @param updates - Partial variant object with properties to update
   * @param variants - Current list of variants
   */
  async handlePropertyChange(updates: Partial<AlertVariant>, _variants: AlertVariant[]): Promise<void> {
    if (!this.selectedVariantId) return;
    
    // Use the computed variants list
    const variants = this.variants;
    const variant = variants.find(v => v.id === this.selectedVariantId);
    if (!variant) return;
    
    const updated = { ...variant, ...updates };
    await dbManager.saveVariant(updated);
    
    // Update local state - creates new array reference to trigger Lit reactivity
    this._localVariants = variants.map(v => v.id === this.selectedVariantId ? updated : v);
    
    // Auto-save to backend to keep standalone preview up to date
    this.handleGetPreviewUrl().catch(err => console.error('Auto-save to backend failed:', err));
  }

  /**
   * Creates a copy of an existing variant with a new ID and "(Copy)" suffix.
   * 
   * @param variant - The variant to duplicate
   */
  async handleDuplicateVariant(variant: AlertVariant): Promise<void> {
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

  /**
   * Deletes a variant after user confirmation.
   * 
   * @param id - The ID of the variant to delete
   */
  async handleDeleteVariant(id: string): Promise<void> {
    const confirmResult = await confirm(this.t('variant.confirmDelete'));
    if (confirmResult) {
      await dbManager.deleteVariant(id);
      this.selectedVariantId = null;
      this._variantsTask.run();
    }
  }

  // =============================================================================
  // Event Handlers - Section Change
  // =============================================================================

  /**
   * Handles changes to the expanded section in the left sidebar.
   * @param e - Custom event containing the new section ID
   */
  private _handleSectionChange(e: CustomEvent): void {
    this.expandedSection = e.detail;
  }

  // =============================================================================
  // Event Handlers - Variant Selection
  // =============================================================================

  /**
   * Handles variant selection from the sidebar.
   * @param e - Custom event containing the selected variant ID
   */
  private _handleVariantSelect(e: CustomEvent): void {
    this.selectedVariantId = e.detail;
  }

  /**
   * Toggles the randomize mode for variant selection.
   */
  private _handleRandomizeToggle(): void {
    this.randomize = !this.randomize;
  }

  // =============================================================================
  // Event Handlers - Preview Configuration
  // =============================================================================

  /**
   * Handles changes to the preview width.
   * @param e - Custom event containing the new width value
   */
  private _handlePreviewWidthChange(e: CustomEvent): void {
    this.previewWidth = e.detail;
  }

  /**
   * Handles changes to the preview height.
   * @param e - Custom event containing the new height value
   */
  private _handlePreviewHeightChange(e: CustomEvent): void {
    this.previewHeight = e.detail;
  }

  /**
   * Handles changes to the preview background color.
   * @param e - Custom event containing the new background color
   */
  private _handlePreviewBgChange(e: CustomEvent): void {
    this.previewBgColor = e.detail;
  }

  // =============================================================================
  // Event Handlers - Property Panel Changes
  // =============================================================================

  /**
   * Handles property changes from the right sidebar panels.
   * Processes both new animation config format and legacy single config fields.
   * 
   * @param e - Custom event containing the field name and new value
   * @param variants - Current list of variants
   */
  private _handlePropertyPanelChange(e: CustomEvent, variants: AlertVariant[]): void {
    const { field, value } = e.detail;
    
    // Handle combined animation configs (new format from AnimationPanel)
    if (field === 'animationConfigs' && value && typeof value === 'object') {
      const { entrance, exit } = value as AnimationConfigs;
      this.handlePropertyChange({ 
        entranceAnimation: entrance, 
        exitAnimation: exit 
      }, variants);
      return;
    }

    // Handle legacy animation fields
    if (field === 'animationIn' || field === 'animationOut') {
      this.handlePropertyChange({ [field]: value }, variants);
      return;
    }
    
    // Handle simple field updates
    this.handlePropertyChange({ [field]: value }, variants);
  }

  /**
   * Handles WebSocket connection state changes from the preview iframe
   */
  private _handleWsConnectionChange(e: CustomEvent): void {
    const { state, type } = e.detail;
    if (type === 'websocket') {
      this.isWsConnected = state === 'connected';
      console.log('[Editor] WS Connection state updated:', this.isWsConnected ? 'Connected' : 'Disconnected');
    }
  }

  // =============================================================================
  // Event Handlers - Media Library
  // =============================================================================

  /**
   * Opens the media library for image selection.
   */
  private _handleOpenImageLibrary(): void {
    this.showMediaLibrary = 'image';
  }

  /**
   * Opens the media library for sound selection.
   */
  private _handleOpenSoundLibrary(): void {
    this.showMediaLibrary = 'sound';
  }

  /**
   * Handles media selection from the media library.
   * @param e - Custom event containing the selected media URL and name
   */
  private _handleMediaSelect(e: CustomEvent<{ url: string; name: string }>): void {
    const { url, name } = e.detail;
    
    // Get current variants
    const variants = this._variantsTask.value || [];
    const variant = this.getSelectedVariant(variants);
    
    if (!variant) return;
    
    // Update the appropriate field based on which library was open
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

  /**
   * Closes the media library without selecting.
   */
  private _handleMediaClose(): void {
    this.showMediaLibrary = null;
  }

  // =============================================================================
  // Event Handlers - Right Sidebar Panel
  // =============================================================================

  /**
   * Handles panel changes in the right sidebar.
   * @param e - Custom event containing the panel name
   */
  private _handleRightPanelChange(e: CustomEvent): void {
    this.rightExpandedSection = e.detail;
  }

  // =============================================================================
  // Render Methods
  // =============================================================================

  render() {
    // Use the computed variants list
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
          @section-change="${this._handleSectionChange}"
          @variant-select="${this._handleVariantSelect}"
          @create-variant="${this.handleCreateVariant}"
          @duplicate-variant="${this.handleDuplicateVariant}"
          @delete-variant="${this.handleDeleteVariant}"
          @randomize-toggle="${this._handleRandomizeToggle}"
        ></editor-left-sidebar>

        <!-- Preview Area -->
        <editor-preview
          .variant="${this.getSelectedVariant(variants)}"
          .eventData="${{ username: 'Test User', months: '1', amount: '100' }}"
          .width="${this.previewWidth}"
          .height="${this.previewHeight}"
          .bgColor="${this.previewBgColor}"
          @play-preview="${this.handlePlayPreview}"
          @send-test="${this.handleSendTestAlert}"
          @width-change="${this._handlePreviewWidthChange}"
          @height-change="${this._handlePreviewHeightChange}"
          @bg-change="${this._handlePreviewBgChange}"
          @ws-connection-change="${this._handleWsConnectionChange}"
        ></editor-preview>

        <!-- Right Sidebar -->
        <editor-right-sidebar
          .variant="${this.getSelectedVariant(variants)}"
          .activePanel="${this.rightExpandedSection}"
          @panel-change="${this._handleRightPanelChange}"
          @property-change="${(e: CustomEvent) => this._handlePropertyPanelChange(e, variants)}"
          @open-image-library="${this._handleOpenImageLibrary}"
          @open-sound-library="${this._handleOpenSoundLibrary}"
        ></editor-right-sidebar>
      </div>

      <!-- Media Library Modal -->
      ${this.showMediaLibrary ? html`
        <media-library
          type="${this.showMediaLibrary}"
          .selectedUrl="${this.getSelectedVariant(variants)?.imageUrl || this.getSelectedVariant(variants)?.soundUrl || null}"
          @media-select="${this._handleMediaSelect}"
          @media-close="${this._handleMediaClose}"
        ></media-library>
      ` : ''}
    `;
  }
}
