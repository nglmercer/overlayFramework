/**
 * Core Module - Index File
 * 
 * Exports all core utilities, schemas, and validation functions.
 * This is the main entry point for accessing framework core functionality.
 * 
 * @module lib/core
 */

// Re-export all schemas and types from utils
export * from './utils';

// Export schemas
export {
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
  // Helper functions
  createDefaultAlertVariant,
  createDefaultAlertBox,
  getDefaultSchema,
  getSchemaDefaults,
  isValid,
} from './utils';

// Export validation utilities
export {
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
  // Types
  type ValidationResult,
} from './utils';
