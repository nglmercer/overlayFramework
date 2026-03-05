/**
 * Overlay Framework - Library Exports
 * Main entry point for all framework features
 * 
 * @module lib/index
 * @version 2.1.0
 */

// ============================================
// RE-EXPORT FROM CORE MODULE (Schemas & Types)
// ============================================

// Core schemas and utilities
export { 
  // Zod schemas
  AppConfigSchema,
  EnvironmentSchema,
  FrameworkConfigSchema,
  EventVariableSchema,
  PlatformEventDefinitionSchema,
  EventTypeSchema,
  SchemaDefinitionSchema,
  AlertLayoutSchema,
  TextAlignSchema,
  AlertVariantSchema,
  AlertBoxSchema,
  TemplateDBSchema,
  DialogThemeSchema,
  DialogTypeSchema,
  DialogOptionsSchema,
  defaultSchemas,
  
  // Validation utilities
  makeValidator,
  validateData,
  mergeDefaults,
  createPartialSchema,
  
  // Pre-built validators
  validateAppConfig,
  validateAlertVariant,
  validateAlertBox,
  validateTemplate,
  validatePlatformEvent,
  validateDialogOptions,
  
  // Helper functions
  createDefaultAlertVariant,
  createDefaultAlertBox,
  getDefaultSchema,
  getSchemaDefaults,
  isValid,
  
  // Factory functions (from factories)
  createAppConfig,
  createAlertBox,
  createAlertVariant,
  createPlatformEvent,
  createDialogOptions,
  createDialog,
  createTemplate,
  duplicateAlertVariant,
  getEnvironment,
  isEnvironment,
  extendSchema,
  partialSchema,
  
  // Re-export Zod
  z,
} from './core';

// Core types
export type {
  AppConfig,
  Environment,
  EventVariable,
  PlatformEventDefinition,
  EventType,
  SchemaDefinition,
  AlertVariant,
  AlertBox,
  TemplateDB,
  DialogOptions,
  DialogTheme,
  DialogType,
  DialogResult,
  FrameworkConfig,
  AlertLayout,
  TextAlign,
  ValidationResult,
} from './core';

// ============================================
// CONSTANTS EXPORTS
// ============================================

export {
  DB,
  ALERT_DEFAULTS,
  CONFIG,
  ENVIRONMENT,
  DIALOG,
  COLORS,
  FILE_TYPES,
} from './constants';

export { PLATFORM_EVENTS } from './core/platform-events';

export type {
  FactoryOptions,
  VariantFactoryOptions,
} from './core/factories';

// ============================================
// CONFIG MODULE
// ============================================

export {
  appConfig,
  isDevelopment,
  isProduction,
  isTest,
  getMediaUrl,
  getCdnUrl,
  reloadConfig,
} from './config';

// ============================================
// DATABASE MODULE
// ============================================

export {
  initDB,
  dbManager,
} from './db';

// ============================================
// ALERT EVENTS MODULE
// ============================================

export {
  platformEvents,
  registerPlatformEvents,
  clearCustomPlatformEvents,
  getAllPlatformEvents,
  getPlatformEventById,
  getEventVariables,
  getDefaultMessage,
  getVariableNames,
  formatMessage,
  getEventLabel,
  getConditionLabel,
  validateEventVariables,
  createPlatformEventSafe,
  isPlatformEventDefinition,
  hasEventType,
  getCustomPlatformEventsCount,
} from './alertEvents';

// Backward compatibility
export { platformEventsSchema } from './alertEvents';

// ============================================
// SCHEMA LOADER MODULE
// ============================================

export {
  schemaLoader,
  loadSchemas,
  restartSchemas,
  unloadSchemas,
  getSchema,
  getAllSchemas,
  isSchemasReady,
  validateEvent,
  getEventValidationErrors,
  createEventData,
} from './schema-loader';

// ============================================
// DIALOG MODULE
// ============================================

export {
  alert,
  confirm,
  prompt,
  modal,
  setDialogTheme,
  getDialogTheme,
  patchGlobalAlert,
  patchGlobalConfirm,
  patchGlobalPrompt,
  patchAllGlobals,
} from './dialog';

// ============================================
// TASK CONTROLLERS MODULE
// ============================================

export {
  Task,
  TaskStatus,
  createLoadVariantsConfig,
  createSaveVariantConfig,
  createLoadTemplatesConfig,
  createLoadBoxesConfig,
  createFetchMediaConfig,
  createValidateEventConfig,
  isTaskStatus,
  getTaskStatusText,
  renderTask,
} from './task-controllers';

// All platform events are now centralized in core/platform-events

// ============================================
// CONTEXT EXPORTS
// ============================================

export * from '../context/index';
export * from '../context/schemaContext';

// ============================================
// LOCALIZATION EXPORTS
// ============================================

export * from '../locales/localization';

// ============================================
// SCHEMA EXPORTS (Animation)
// ============================================

export * from '../schemas/animation-schemas';

// ============================================
// MEDIA REGISTRY EXPORTS
// ============================================

export * from '../core/mediaRegistry';

// ============================================
// BROWSER UTILS EXPORTS
// ============================================

export * from './browser-utils';

// ============================================
// RENDERER EXPORTS
// ============================================

export * from '../core/renderer';

// ============================================
// CORE SCHEMAS EXPORTS
// ============================================

export { 
  UnitSchema, 
  ElementTypeSchema,
  BaseElementSchema,
  TextElementSchema,
  MediaElementSchema,
  BoxElementSchema,
  MultimediaElementSchema,
  GroupElementSchema,
  TemplateElementSchema,
  TemplateSchema
} from '../core/schemas';

export type { 
  UnitValue,
  GroupElement, 
  TemplateElement,
  Template
} from '../core/schemas';

// ============================================
// TYPES EXPORTS
// ============================================

export type { 
  ElementType, 
  BaseElement, 
  TextElement, 
  MediaElement, 
  BoxElement, 
  MultimediaElement,
  MediaHandler 
} from '../core/types';

/**
 * ============================================
 * FRAMEWORK CONFIGURATION
 * ============================================
 */

// Import FrameworkConfig type for use in this file
import type { FrameworkConfig } from './core';

/**
 * Framework version
 */
export const VERSION = '1.0.0';

/**
 * Default framework configuration
 */
export const defaultConfig: FrameworkConfig = {
  defaultLocale: 'es',
  supportedLocales: ['es', 'en'],
  enableLocalization: true,
  enableContext: true,
  enableTasks: true,
};

/**
 * Initialize the framework
 * 
 * @param config - Optional configuration overrides
 */
export async function initializeFramework(config: Partial<FrameworkConfig> = {}): Promise<void> {
  const finalConfig = { ...defaultConfig, ...config };
  
  if (finalConfig.enableContext) {
    const { loadSchemas } = await import('./schema-loader');
    await loadSchemas();
  }
  
  // Run Autofix/Migration tool
  // This automatically cleans up stale absolute URLs in IndexedDB without data loss
  const { dbManager } = await import('./db');
  try {
    const stats = await dbManager.autofixMediaUrls();
    if (stats.variantsFixed > 0 || stats.templatesFixed > 0) {
      console.log(`[Framework] Data migration complete: fixed ${stats.variantsFixed} variants.`);
    }
  } catch (err) {
    console.warn('[Framework] Autofix failed:', err);
  }
  
  console.log('Overlay Framework initialized');
}

/**
 * Cleanup the framework
 */
export async function cleanupFramework(): Promise<void> {
  const { unloadSchemas } = await import('./schema-loader');
  await unloadSchemas();
  console.log('Overlay Framework cleaned up');
}
