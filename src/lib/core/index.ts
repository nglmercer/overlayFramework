/**
 * Core Module - Index File
 * 
 * Exports all core utilities, schemas, validation functions, and factories.
 * This is the main entry point for accessing framework core functionality.
 * 
 * The module is organized into:
 * - Schemas and types (from ./utils)
 * - Factory functions (from ./factories)
 * - Pre-built validators
 * 
 * @module lib/core
 * @version 2.0.0
 */

import { z } from 'zod';

// ============================================================================
// RE-EXPORT FROM UTILS
// ============================================================================

// Re-export all from utils
export * from './utils';

// ============================================================================
// RE-EXPORT FROM FACTORIES
// ============================================================================

// Re-export all from factories
export * from './factories';

// ============================================================================
// CONVENIENCE EXPORTS
// ============================================================================

// Re-export Zod for direct schema creation if needed
export { z };

// Pre-built validators from utils
export {
  validateAppConfig,
  validateAlertVariant,
  validateAlertBox,
  validateTemplate,
  validatePlatformEvent,
  validateDialogOptions,
} from './utils';

// Factory functions from factories
export {
  createAppConfig,
  createAlertBox,
  createAlertVariant,
  createPlatformEvent,
  createDialogOptions,
  createDialog,
  createTemplate,
  duplicateAlertVariant,
  
  // Environment utilities
  getEnvironment,
  isEnvironment,
  
  // Schema utilities
  extendSchema,
  partialSchema,
} from './factories';

// ============================================================================
// TYPE EXPORTS
// ============================================================================

// Additional type exports for convenience
export type {
  // From utils
  ValidationResult,
} from './utils';

// Additional type exports from factories
export type {
  FactoryOptions,
  VariantFactoryOptions,
} from './factories';
