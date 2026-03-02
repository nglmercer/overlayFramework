/**
 * Core Module - Index File
 * Exports all core utilities and schemas
 */

// Re-export all schemas and types from utils
export * from './utils';

// Export schemas
export {
  AppConfigSchema,
  EnvironmentSchema,
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
  FrameworkConfigSchema,
  defaultSchemas,
} from './utils';

// Export validation utilities
export {
  makeValidator,
  validateData,
  mergeDefaults,
} from './utils';

// Export inferred types
export type {
  AppConfig,
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
} from './utils';
