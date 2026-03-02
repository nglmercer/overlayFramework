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
import './AlertView';
import './editor';

// Import editor sub-components
import { EditorTopbar } from './editor/EditorTopbar';
import { EditorLeftSidebar } from './editor/EditorLeftSidebar';
import { EditorPreview } from './editor/EditorPreview';
import { EditorRightSidebar } from './editor/EditorRightSidebar';

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
// Constants - Magic values extracted for maintainability
// =============================================================================

namespace Constants {
  /** Default panel to show on right sidebar */
  export const DEFAULT_RIGHT_PANEL = 'general';
  
  /** Default variant name when creating new variants */
  export const NEW_VARIANT_NAME = 'Nueva variante';
  
  /** Default animation durations in seconds */
  export const DEFAULT_ANIMATION_DURATION = 1;
  
  /** Default variant properties */
  export const DEFAULT_DURATION = 10;
  export const DEFAULT_PADDING = 16;
  export const DEFAULT_SPACING = 16;
  export const DEFAULT_FONT_SIZE = 24;
  export const DEFAULT_IMAGE_SCALE = 50;
  export const DEFAULT_IMAGE_VOLUME = 50;
  export const DEFAULT_SOUND_VOLUME = 50;
  
  /** Legacy animation preset names */
  export const DEFAULT_ANIMATION_IN = 'fade-in';
  export const DEFAULT_ANIMATION_OUT = 'fade-out';
  
  /** Default text and styling values */
  export const DEFAULT_FONT_FAMILY = 'Roboto';
  export const DEFAULT_FONT_WEIGHT = 'Normal';
  export const DEFAULT_TEXT_ALIGN = 'center';
  export const DEFAULT_TEXT_COLOR = '#FFFFFF';
  export const DEFAULT_HIGHLIGHT_COLOR = '#9146FF';
  export const DEFAULT_BG_COLOR = '#000000';
  
  /** Preview dimensions */
  export const DEFAULT_PREVIEW_SIZE = 600;
  
  /** Responsive breakpoints */
  export const BREAKPOINT_TABLET = 1024;
  export const BREAKPOINT_MOBILE = 768;
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
  @state() private rightExpandedSection: string | null = Constants.DEFAULT_RIGHT_PANEL;
  
  /** Whether random variant selection is enabled */
  @state() private randomize = false;
  
  /** Which media library to show (if any) */
  @state() private showMediaLibrary: MediaLibraryType | null = null;
  
  /** Currently selected variant ID */
  @state() private selectedVariantId: string | null = null;
  
  /** Local copy of variants for immediate UI updates without refetching */
  @state() private _localVariants: AlertVariant[] = [];
  
  /** Preview canvas width in pixels */
  @state() private previewWidth = Constants.DEFAULT_PREVIEW_SIZE;
  
  /** Preview canvas height in pixels */
  @state() private previewHeight = Constants.DEFAULT_PREVIEW_SIZE;
  
  /** Preview canvas background color */
  @state() private previewBgColor: BgColor = 'transparent';

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
  @query('app-alert-view') private alertView!: any;

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

  // =============================================================================
  // Preview Control Methods
  // =============================================================================

  /**
   * Triggers the preview component to play the current alert animation.
   */
  handlePlayPreview(): void {
    if (this.editorPreview && this.editorPreview.playPreview) {
      this.editorPreview.playPreview();
    }
  }

  /**
   * Dispatches a test alert event and plays the preview.
   * Used for testing alerts without triggering actual events.
   */
  handleSendTestAlert(): void {
    window.dispatchEvent(new CustomEvent('test-alert', { 
      detail: { type: 'test' }
    }));
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
      name: Constants.NEW_VARIANT_NAME,
      condition: schemaDef.conditionLabel,
      duration: Constants.DEFAULT_DURATION,
      animationIn: Constants.DEFAULT_ANIMATION_IN,
      animationOut: Constants.DEFAULT_ANIMATION_OUT,
      animationInDuration: Constants.DEFAULT_ANIMATION_DURATION,
      animationOutDuration: Constants.DEFAULT_ANIMATION_DURATION,
      entranceAnimation: { ...defaultAnimationConfig },
      exitAnimation: { ...defaultAnimationConfig },
      layout: 'text-below',
      bgColor: Constants.DEFAULT_BG_COLOR,
      bgOpacity: 0,
      padding: Constants.DEFAULT_PADDING,
      spacing: Constants.DEFAULT_SPACING,
      rounded: true,
      shadow: false,
      message: schemaDef.defaultMessage,
      fontFamily: Constants.DEFAULT_FONT_FAMILY,
      fontWeight: Constants.DEFAULT_FONT_WEIGHT,
      fontSize: Constants.DEFAULT_FONT_SIZE,
      textAlign: Constants.DEFAULT_TEXT_ALIGN as 'left' | 'center' | 'right' | 'justify',
      textColor: Constants.DEFAULT_TEXT_COLOR,
      highlightColor: Constants.DEFAULT_HIGHLIGHT_COLOR,
      textShadow: true,
      ttsEnabled: false,
      imageScale: Constants.DEFAULT_IMAGE_SCALE,
      imageVolume: Constants.DEFAULT_IMAGE_VOLUME,
      soundVolume: Constants.DEFAULT_SOUND_VOLUME,
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
    
    // Use local variants state for immediate update without refetching
    const variants = this._localVariants.length > 0 ? this._localVariants : _variants;
    const variant = variants.find(v => v.id === this.selectedVariantId);
    if (!variant) return;
    
    const updated = { ...variant, ...updates };
    await dbManager.saveVariant(updated);
    
    // Update local state - creates new array reference to trigger Lit reactivity
    this._localVariants = variants.map(v => v.id === this.selectedVariantId ? updated : v);
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
    
    // Handle legacy single animation config
    if (field === 'entranceAnimation' || field === 'exitAnimation') {
      this.handlePropertyChange({ [field]: value }, variants);
      return;
    }
    
    // Handle all other property changes
    this.handlePropertyChange({ [field]: value }, variants);
  }

  // =============================================================================
  // Event Handlers - Media Library
  // =============================================================================

  /**
   * Opens the media library in the specified mode.
   * @param type - The type of media to select (image or sound)
   */
  private _handleOpenMediaLibrary(type: MediaLibraryType): void {
    this.showMediaLibrary = type;
  }

  /**
   * Handles media selection from the media library.
   * Updates the selected variant with the selected media URL.
   * 
   * @param url - The URL of the selected media
   * @param name - The name/label of the selected media
   */
  private async _handleMediaSelect(url: string, name: string): Promise<void> {
    const variants = this._variantsTask.value ?? [];
    
    if (this.showMediaLibrary === 'image') {
      await this.handlePropertyChange({ imageUrl: url, imageName: name }, variants);
    } else {
      await this.handlePropertyChange({ soundUrl: url, soundName: name }, variants);
    }
    
    this.showMediaLibrary = null;
  }

  // =============================================================================
  // Rendering Methods
  // =============================================================================

  /**
   * Main render method that handles the async variants loading state.
   * Uses Lit's Task pattern to render different UI for loading/error states.
   */
  render() {
    return this._variantsTask.render({
      // Loading state
      pending: () => html`
        <div style="display: flex; align-items: center; justify-content: center; height: 100%;">
          ${this.t('preview.loading')}
        </div>
      `,
      
      // Success state - render the editor
      complete: (variants) => {
        // Sync local variants state on initial load
        if (this._localVariants.length === 0 && variants.length > 0) {
          this._localVariants = [...variants];
        }
        return this.renderEditor(variants);
      },
      
      // Error state
      error: (e) => html`
        <div style="padding: 2rem;">
          ${this.t('errors.loadFailed')}
        </div>
      `
    });
  }

  /**
   * Renders the main editor layout with all sub-components.
   * 
   * @param variants - Array of all available alert variants
   */
  renderEditor(variants: AlertVariant[]) {
    // Use local variants state if available for immediate updates
    const currentVariants = this._localVariants.length > 0 ? this._localVariants : variants;
    const variant = this.getSelectedVariant(currentVariants);

    return html`
      <!-- Top navigation bar -->
      <editor-topbar
        .title="${this.t('app.editor')}"
        .onBack="${this.onBack}"
      ></editor-topbar>

      <!-- Main workspace area -->
      <div class="workspace">
        
        <!-- Left sidebar: Variant list and alert type selection -->
        <editor-left-sidebar
          class="custom-scrollbar"
          .variants="${currentVariants}"
          .schema="${this.schema}"
          .selectedVariantId="${this.selectedVariantId}"
          .expandedSection="${this.expandedSection}"
          .randomize="${this.randomize}"
          @section-change="${this._handleSectionChange}"
          @variant-select="${this._handleVariantSelect}"
          @randomize-toggle="${this._handleRandomizeToggle}"
          @create-variant="${this.handleCreateVariant}"
        ></editor-left-sidebar>

        <!-- Center: Preview canvas -->
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

        <!-- Right sidebar: Property panels for editing -->
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

      <!-- Media library modal overlay -->
      ${this.showMediaLibrary ? html`
        <media-library 
          .type="${this.showMediaLibrary}"
          .selectedUrl="${
            this.showMediaLibrary === 'image'
              ? (variant?.imageUrl ?? null)
              : (variant?.soundUrl ?? null)
          }"
          .onClose="${() => this.showMediaLibrary = null}"
          .onSelect="${(url: string, name: string) => this._handleMediaSelect(url, name)}"
        ></media-library>
      ` : ''}
    `;
  }
}
