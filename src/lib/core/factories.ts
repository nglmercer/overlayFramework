/**
 * Factory Functions - Zod-Based Instance Creation Utilities
 * 
 * This module provides factory functions for creating properly typed and
 * validated instances with sensible defaults for the overlay framework.
 * 
 * All factories use Zod's parsing to ensure type safety and apply defaults
 * from the schema definitions.
 * 
 * @module lib/core/factories
 * @version 2.1.0
 */

import { z } from 'zod';
import {
  // Schemas
  AppConfigSchema,
  AlertVariantSchema,
  AlertBoxSchema,
  TemplateDBSchema,
  PlatformEventDefinitionSchema,
  DialogOptionsSchema,
  EnvironmentSchema,
  AlertLayoutSchema,
  TextAlignSchema,
  EventVariableSchema,
  // Types
  type AppConfig,
  type AlertVariant,
  type AlertBox,
  type TemplateDB,
  type PlatformEventDefinition,
  type DialogOptions,
  type Environment,
  type AlertLayout,
  type TextAlign,
  type EventVariable,
  // Utilities
  makeValidator,
  mergeDefaults,
} from './utils';
import { PLATFORM_EVENTS } from './platform-events';

// Import constants
import { ALERT_DEFAULTS, ENVIRONMENT } from '../constants';

// ============================================================================
// CRYPTO UUID HELPER - Cross-browser compatible
// ============================================================================

/**
 * Generate a UUID v4
 * Uses crypto.randomUUID() when available, falls back to a manual implementation
 */
export function generateUUID(): string {
  // Use native API if available
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  
  // Fallback for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * ============================================
 * FACTORY CONFIGURATION
 * ============================================
 * 
 * Configuration options for factory functions.
 */

export interface FactoryOptions<T> {
  /** Partial data to merge with defaults */
  data?: Partial<T>;
  /** Whether to throw on validation failure (default: false) */
  throwOnError?: boolean;
  /** Context string for error messages */
  context?: string;
}

export interface VariantFactoryOptions extends FactoryOptions<AlertVariant> {
  /** The box ID this variant belongs to */
  boxId: string;
  /** The event type for this variant */
  eventType?: string;
}

/**
 * ============================================
 * APP CONFIG FACTORY
 * ============================================
 */

// Re-export validateAppConfig from utils
export { validateAppConfig } from './utils';

/**
 * Creates an AppConfig with validated defaults
 * 
 * @param options - Factory options
 * @returns Validated AppConfig instance
 */
export function createAppConfig(options?: FactoryOptions<AppConfig>): AppConfig {
  const result = AppConfigSchema.safeParse(options?.data || {});
  if (!result.success) {
    const errors = result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`);
    if (options?.throwOnError) {
      throw new Error(`Invalid AppConfig: ${errors.join(', ')}`);
    }
    console.warn(`Invalid AppConfig, using defaults: ${errors.join(', ')}`);
    return AppConfigSchema.parse({});
  }
  return result.data;
}

/**
 * Gets the current environment with type safety
 * 
 * @returns Current environment value
 */
export function getEnvironment(): Environment {
  const env = typeof process !== 'undefined' ? process?.env?.NODE_ENV : undefined;
  const result = EnvironmentSchema.safeParse(env);
  return result.success ? result.data : ENVIRONMENT.DEFAULT;
}

/**
 * Checks if running in a specific environment
 * 
 * @param env - Environment to check against
 * @returns True if current environment matches
 */
export function isEnvironment(env: Environment): boolean {
  return getEnvironment() === env;
}

/**
 * ============================================
 * ALERT BOX FACTORY
 * ============================================
 */

// Re-export validateAlertBox from utils
export { validateAlertBox } from './utils';

/**
 * Creates an AlertBox with validated defaults
 * 
 * @param options - Factory options including required boxId
 * @returns Validated AlertBox instance
 * 
 * @example
 * ```typescript
 * const box = createAlertBox({
 *   data: { name: 'My Alerts' },
 *   throwOnError: true
 * });
 * ```
 */
export function createAlertBox(options?: FactoryOptions<AlertBox>): AlertBox {
  const result = AlertBoxSchema.safeParse(options?.data || {});
  if (!result.success) {
    const errors = result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`);
    if (options?.throwOnError) {
      throw new Error(`Invalid AlertBox${options?.context ? ` in ${options.context}` : ''}: ${errors.join(', ')}`);
    }
    console.warn(`Invalid AlertBox, using defaults: ${errors.join(', ')}`);
    return AlertBoxSchema.parse({});
  }
  return result.data;
}

/**
 * ============================================
 * ALERT VARIANT FACTORY
 * ============================================
 */

// Re-export validateAlertVariant from utils
export { validateAlertVariant } from './utils';

/**
 * Creates an AlertVariant with validated defaults
 * 
 * This factory applies both schema defaults and event-type-specific defaults.
 * 
 * @param options - Factory options including required boxId
 * @returns Validated AlertVariant instance
 * 
 * @example
 * ```typescript
 * const variant = createAlertVariant({
 *   boxId: 'box-123',
 *   data: { name: 'My Variant', type: 'seguimientos' },
 *   eventType: 'seguimientos'
 * });
 * ```
 */
export function createAlertVariant(options: VariantFactoryOptions): AlertVariant {
  const { boxId, eventType, throwOnError, context } = options;
  const data = options.data || {};
  
  // Start with event-type-specific defaults from centralized registry
  const platformEvent = eventType ? PLATFORM_EVENTS[eventType] : undefined;
  const eventDefaults = platformEvent ? {
    name: `${platformEvent.label} Variant`,
    message: platformEvent.defaultMessage,
    type: platformEvent.id,
  } : {};
  
  // Merge: explicit data > event defaults > schema defaults
  const mergedData = {
    ...eventDefaults,
    ...data,
    id: data.id || generateUUID(),
    boxId: data.boxId || boxId,
  };
  
  const result = AlertVariantSchema.safeParse(mergedData);
  if (!result.success) {
    const errors = result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`);
    if (throwOnError) {
      throw new Error(`Invalid AlertVariant${context ? ` in ${context}` : ''}: ${errors.join(', ')}`);
    }
    console.warn(`Invalid AlertVariant, using defaults: ${errors.join(', ')}`);
    return AlertVariantSchema.parse({ id: generateUUID(), boxId });
  }
  
  return result.data;
}

/**
 * Creates a copy of an existing AlertVariant with a new ID
 * 
 * @param variant - The variant to copy
 * @param overrides - Optional property overrides
 * @returns New variant instance
 * 
 * @example
 * ```typescript
 * const copy = duplicateAlertVariant(existingVariant, {
 *   name: 'My Copy'
 * });
 * ```
 */
export function duplicateAlertVariant(
  variant: AlertVariant, 
  overrides?: Partial<AlertVariant>
): AlertVariant {
  return createAlertVariant({
    boxId: variant.boxId,
    data: {
      ...variant,
      ...overrides,
      id: generateUUID(),
    },
  });
}

/**
 * ============================================
 * PLATFORM EVENT FACTORY
 * ============================================
 */

// Re-export validatePlatformEvent from utils
export { validatePlatformEvent } from './utils';

/**
 * Creates a PlatformEventDefinition with validated defaults
 * 
 * @param options - Factory options
 * @returns Validated PlatformEventDefinition instance
 */
export function createPlatformEvent(
  options?: FactoryOptions<PlatformEventDefinition>
): PlatformEventDefinition {
  const result = PlatformEventDefinitionSchema.safeParse(options?.data || {});
  if (!result.success) {
    const errors = result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`);
    if (options?.throwOnError) {
      throw new Error(`Invalid PlatformEventDefinition${options?.context ? ` in ${options.context}` : ''}: ${errors.join(', ')}`);
    }
    console.warn(`Invalid PlatformEventDefinition, using defaults: ${errors.join(', ')}`);
    return PlatformEventDefinitionSchema.parse({});
  }
  return result.data;
}

/**
 * ============================================
 * DIALOG OPTIONS FACTORY
 * ============================================
 */

// Re-export validateDialogOptions from utils
export { validateDialogOptions } from './utils';

/**
 * Creates DialogOptions with validated defaults
 * 
 * @param options - Factory options
 * @returns Validated DialogOptions instance
 */
export function createDialogOptions(
  options?: FactoryOptions<DialogOptions>
): DialogOptions {
  const result = DialogOptionsSchema.safeParse(options?.data || {});
  if (!result.success) {
    const errors = result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`);
    if (options?.throwOnError) {
      throw new Error(`Invalid DialogOptions${options?.context ? ` in ${options.context}` : ''}: ${errors.join(', ')}`);
    }
    console.warn(`Invalid DialogOptions, using defaults: ${errors.join(', ')}`);
    return DialogOptionsSchema.parse({ message: '' });
  }
  return result.data;
}

/**
 * Creates dialog options for common dialog types
 * 
 * @param type - The dialog type
 * @param message - The message to display
 * @param options - Additional options
 * @returns Configured DialogOptions
 */
export function createDialog(
  type: 'alert' | 'confirm' | 'prompt' | 'modal',
  message: string,
  options?: Partial<DialogOptions>
): DialogOptions {
  return createDialogOptions({
    data: {
      type,
      message,
      ...options,
    },
  });
}

/**
 * ============================================
 * TEMPLATE FACTORY
 * ============================================
 */

// Re-export validateTemplate from utils
export { validateTemplate } from './utils';

/**
 * Creates a TemplateDB with validated defaults
 * 
 * @param options - Factory options
 * @returns Validated TemplateDB instance
 */
export function createTemplate(options: FactoryOptions<TemplateDB> & { data: Partial<TemplateDB> }): TemplateDB {
  const data = {
    ...options.data,
    id: options.data.id || generateUUID(),
    updatedAt: options.data.updatedAt || Date.now(),
  };
  
  const result = TemplateDBSchema.safeParse(data);
  if (!result.success) {
    const errors = result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`);
    if (options.throwOnError) {
      throw new Error(`Invalid TemplateDB${options.context ? ` in ${options.context}` : ''}: ${errors.join(', ')}`);
    }
    console.warn(`Invalid TemplateDB, using defaults: ${errors.join(', ')}`);
    return TemplateDBSchema.parse({
      id: generateUUID(),
      name: 'Untitled',
      data: {},
      updatedAt: Date.now(),
    });
  }
  return result.data;
}

/**
 * ============================================
 * SCHEMA COMPOSITION UTILITIES
 * ============================================
 * 
 * Helpers for working with and extending schemas.
 */

/**
 * Extends a schema with additional fields
 * 
 * @param baseSchema - The base schema to extend
 * @param extensions - Additional field definitions
 * @returns Extended schema
 * 
 * @example
 * ```typescript
 * const ExtendedVariantSchema = extendSchema(AlertVariantSchema, {
 *   customField: z.string().optional(),
 * });
 * ```
 */
export function extendSchema<
  T extends z.ZodObject<z.ZodRawShape>,
  E extends z.ZodRawShape
>(
  baseSchema: T,
  extensions: E
): z.ZodObject<z.ZodRawShape> {
  return baseSchema.merge(z.object(extensions));
}

/**
 * Creates a partial version of a schema with all fields optional
 * 
 * @param schema - The schema to make partial
 * @returns Partial schema
 */
export function partialSchema<T extends z.ZodObject<z.ZodRawShape>>(
  schema: T
): T['shape'] extends z.ZodRawShape ? z.ZodObject<{ [K in keyof T['shape']]: z.ZodOptional<T['shape'][K]> }> : never {
  // Using any to bypass complex Zod type inference issues
  return schema.partial() as any;
}

/**
 * ============================================
 * DEFAULT EXPORTS
 * ============================================
 * 
 * Convenience exports for common use cases.
 */

export {
  // Schemas (re-exported for convenience)
  AppConfigSchema,
  AlertVariantSchema,
  AlertBoxSchema,
  TemplateDBSchema,
  PlatformEventDefinitionSchema,
  DialogOptionsSchema,
  EnvironmentSchema,
  AlertLayoutSchema,
  TextAlignSchema,
  EventVariableSchema,
  
  // Types (re-exported for convenience)
  type AppConfig,
  type AlertVariant,
  type AlertBox,
  type TemplateDB,
  type PlatformEventDefinition,
  type DialogOptions,
  type Environment,
  type AlertLayout,
  type TextAlign,
  type EventVariable,
  
  // Utilities (re-exported for convenience)
  makeValidator,
  mergeDefaults,
};
