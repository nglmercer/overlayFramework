/**
 * Core Utilities - Zod-Based Schema Definitions and Validation
 * 
 * This module provides comprehensive Zod schemas with proper defaults,
 * validation utilities, and type inference for the overlay framework.
 * 
 * All schemas include sensible defaults that can be used when creating
 * new instances or when partial data is provided.
 * 
 * @module lib/core/utils
 * @version 2.1.0
 */

import { z, ZodSchema, ZodError, ZodIssueCode } from 'zod';

/**
 * ============================================
 * CUSTOM ZOD REFINEMENTS
 * ============================================
 * 
 * Custom refinements for stricter validation rules.
 */

// Hex color validation refinement
const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
const hexColorRefinement = (val: string) => hexColorRegex.test(val);

/**
 * ============================================
 * ENVIRONMENT & CONFIGURATION SCHEMAS
 * ============================================
 * 
 * Defines schemas for application configuration and environment handling.
 * Uses Zod's `.default()` for automatic default value generation.
 */

// Environment type enum
export const EnvironmentSchema = z.enum(['development', 'production', 'test']);
export type Environment = z.infer<typeof EnvironmentSchema>;

/**
 * Application configuration schema
 * 
 * Provides type-safe configuration with sensible defaults:
 * - mediaUrl: Default media server URL
 * - baseMediaUrl: CDN base URL for assets
 * - apiEndpoint: Optional API endpoint
 * - environment: Current runtime environment
 */
export const AppConfigSchema = z.object({
  mediaUrl: z.string().url().default('http://localhost:3000/media'),
  baseMediaUrl: z.string().url().default('https://cdn.example.com'),
  apiEndpoint: z.string().url().optional(),
  environment: EnvironmentSchema.default('development'),
});

export type AppConfig = z.infer<typeof AppConfigSchema>;

/**
 * Framework configuration schema
 * 
 * Controls framework-level features and localization settings.
 */
export const FrameworkConfigSchema = z.object({
  defaultLocale: z.string().default('es'),
  supportedLocales: z.array(z.string()).default(['es', 'en']),
  enableLocalization: z.boolean().default(true),
  enableContext: z.boolean().default(true),
  enableTasks: z.boolean().default(true),
});

export type FrameworkConfig = z.infer<typeof FrameworkConfigSchema>;

/**
 * ============================================
 * EVENT VARIABLE SCHEMAS
 * ============================================
 * 
 * Defines schemas for event variables used in alert templates.
 * Variables represent dynamic data that can be inserted into messages.
 */

/**
 * Single event variable definition
 * 
 * @property name - Variable identifier used in message templates
 * @property description - Human-readable description for UI display
 */
export const EventVariableSchema = z.object({
  name: z.string().min(1, 'Variable name is required'),
  description: z.string().default(''),
});

export type EventVariable = z.infer<typeof EventVariableSchema>;

/**
 * Platform event definition
 * 

/**
 * ============================================
 * EVENT TYPE SCHEMAS (Schema Loader)
 * ============================================
 * 
 * Defines schemas for the dynamic schema loader system.
 * These are used to validate and manage alert event schemas.
 */

// Supported event types in the system
export const EventTypeSchema = z.enum(['seguimientos', 'suscripciones', 'bits']);
export type EventType = z.infer<typeof EventTypeSchema>;

/**
 * Schema definition for variant schemas (Schema Loader)
 * 
 * Extends PlatformEventDefinition with additional fields for schema validation.
 */
export const SchemaDefinitionSchema = z.object({
  $id: z.string().default(''),
  eventType: EventTypeSchema,
  label: z.string().default(''),
  conditionLabel: z.string().default(''),
  variables: z.array(EventVariableSchema).default([]),
  defaultMessage: z.string().default(''),
  requiredFields: z.array(z.string()).default([]),
  optionalFields: z.array(z.string()).default([]),
});

export type SchemaDefinition = z.infer<typeof SchemaDefinitionSchema>;

/**
 * ============================================
 * ALERT LAYOUT & DESIGN SCHEMAS
 * ============================================
 * 
 * Defines schemas for alert layout options and text styling.
 */

// Layout options for alerts
export const AlertLayoutSchema = z.enum(['text-below', 'text-right', 'text-over']);
export type AlertLayout = z.infer<typeof AlertLayoutSchema>;

// Text alignment options
export const TextAlignSchema = z.enum(['left', 'center', 'right', 'justify']);
export type TextAlign = z.infer<typeof TextAlignSchema>;

/**
 * ============================================
 * ALERT VARIANT SCHEMAS
 * ============================================
 * 
 * Comprehensive schema for alert variants with all styling options.
 * Includes both legacy animation fields and new schema-based animation config.
 */

/**
 * Alert variant schema
 * 
 * Complete configuration for an alert variant including:
 * - Basic info (id, boxId, type, name)
 * - Animation settings (legacy and new format)
 * - Design options (layout, colors, spacing)
 * - Text styling (font, size, color, alignment)
 * - Media settings (image and sound)
 * - State management (active, probability)
 */
export const AlertVariantSchema = z.object({
  // Basic identification
  id: z.string().min(1, 'Variant ID is required'),
  boxId: z.string().min(1, 'Box ID is required'),
  type: z.string().default('default'),
  name: z.string().default('New Variant'),
  condition: z.string().default(''),
  
  // Timing
  duration: z.number().int().positive().default(5000),
  
  // Legacy animation fields (backward compatibility)
  animationIn: z.string().default('fade-in'),
  animationOut: z.string().default('fade-out'),
  animationInDuration: z.number().int().positive().default(300),
  animationOutDuration: z.number().int().positive().default(300),
  
  // New schema-based animation config (optional)
  entranceAnimation: z.any().optional(),
  exitAnimation: z.any().optional(),
  
  // Design options
  layout: AlertLayoutSchema.default('text-below'),
  bgColor: z.string().default('#000000'),
  bgOpacity: z.number().min(0).max(1).default(0.8),
  padding: z.number().int().nonnegative().default(16),
  spacing: z.number().int().nonnegative().default(8),
  rounded: z.boolean().default(true),
  shadow: z.boolean().default(true),
  
  // Text styling
  message: z.string().default(''),
  fontFamily: z.string().default('Inter, sans-serif'),
  fontWeight: z.string().default('normal'),
  fontSize: z.number().int().positive().default(16),
  textAlign: TextAlignSchema.default('left'),
  textColor: z.string().default('#ffffff'),
  highlightColor: z.string().default('#ff0000'),
  textShadow: z.boolean().default(false),
  ttsEnabled: z.boolean().default(false),
  
  // Media settings
  imageScale: z.number().min(0).max(2).default(1),
  imageVolume: z.number().min(0).max(1).default(1),
  soundVolume: z.number().min(0).max(1).default(1),
  
  // State management
  active: z.boolean().default(true),
  probability: z.string().optional(),
  customHtmlEnabled: z.boolean().optional(),
  customHtml: z.string().optional(),
  customCss: z.string().optional(),
  
  // Event-specific fields
  level: z.string().optional(),
  giftAmount: z.number().int().nonnegative().optional(),
  bitsFunction: z.string().optional(),
  bitsAmount: z.number().int().nonnegative().optional(),
  imageUrl: z.string().optional(),
  imageName: z.string().optional(),
  soundUrl: z.string().optional(),
  soundName: z.string().optional(),
});

export type AlertVariant = z.infer<typeof AlertVariantSchema>;

/**
 * Creates a new AlertVariant with all defaults applied
 * 
 * @param partial - Partial variant data to merge with defaults
 * @returns Complete AlertVariant with all defaults applied
 */
export function createDefaultAlertVariant(partial?: Partial<AlertVariant>): AlertVariant {
  return AlertVariantSchema.parse(partial || {});
}

/**
 * ============================================
 * ALERT BOX SCHEMAS
 * ============================================
 * 
 * Schema for alert box containers that hold multiple variants.
 */

/**
 * Alert box schema
 * 
 * A container for organizing alert variants.
 * 
 * @property id - Unique identifier for the box
 * @property name - Display name for the box
 * @property enabled - Whether alerts from this box are active
 */
export const AlertBoxSchema = z.object({
  id: z.string().min(1, 'Box ID is required'),
  name: z.string().min(1, 'Box name is required'),
  enabled: z.boolean().default(true),
});

export type AlertBox = z.infer<typeof AlertBoxSchema>;

/**
 * Creates a new AlertBox with default values
 * 
 * @param partial - Partial box data
 * @returns Complete AlertBox with defaults
 */
export function createDefaultAlertBox(partial?: Partial<AlertBox>): AlertBox {
  return AlertBoxSchema.parse(partial || {});
}

/**
 * ============================================
 * TEMPLATE SCHEMAS
 * ============================================
 * 
 * Schema for saved templates in the database.
 */

/**
 * Template database schema
 * 
 * @property id - Unique template identifier
 * @property name - Template display name
 * @property data - Template data object
 * @property updatedAt - Last update timestamp
 */
export const TemplateDBSchema = z.object({
  id: z.string().min(1, 'Template ID is required'),
  name: z.string().min(1, 'Template name is required'),
  data: z.any(), // The Template object
  updatedAt: z.number().int().positive(),
});

export type TemplateDB = z.infer<typeof TemplateDBSchema>;

/**
 * ============================================
 * DIALOG SCHEMAS
 * ============================================
 * 
 * Schemas for the dialog/modal component system.
 */

export const DialogThemeSchema = z.enum(['light', 'dark']);
export type DialogTheme = z.infer<typeof DialogThemeSchema>;

export const DialogTypeSchema = z.enum(['alert', 'confirm', 'prompt', 'modal']);
export type DialogType = z.infer<typeof DialogTypeSchema>;

/**
 * Dialog options schema
 * 
 * Complete configuration for dialog components.
 */
export const DialogOptionsSchema = z.object({
  type: DialogTypeSchema.default('alert'),
  title: z.string().optional(),
  message: z.string(),
  theme: DialogThemeSchema.default('dark'),
  confirmText: z.string().default('OK'),
  cancelText: z.string().default('Cancel'),
  placeholder: z.string().default(''),
  defaultValue: z.string().default(''),
  showClose: z.boolean().default(true),
  closeOnOverlayClick: z.boolean().default(true),
  closeOnEscape: z.boolean().default(true),
  danger: z.boolean().default(false),
  width: z.string().optional(),
  maxWidth: z.string().optional(),
  customButtons: z.array(z.object({
    text: z.string(),
    action: z.string(),
    danger: z.boolean().default(false),
  })).optional(),
});

export type DialogOptions = z.infer<typeof DialogOptionsSchema>;
export type DialogResult = unknown;

/**
 * ============================================
 * VALIDATION UTILITIES
 * ============================================
 * 
 * Reusable validation functions built on Zod.
 */

/**
 * Validation result type
 * 
 * Represents either a successful validation with typed data,
 * or a failed validation with error messages.
 */
export type ValidationResult<T> = 
  | { success: true; data: T }
  | { success: false; errors: string[] };

/**
 * Creates a validator function from a Zod schema
 * 
 * Returns a function that validates data and returns a typed result.
 * This is the preferred way to create reusable validators.
 * 
 * @example
 * ```typescript
 * const validateUser = makeValidator(UserSchema);
 * const result = validateUser(someData);
 * if (result.success) {
 *   console.log(result.data.name); // TypeScript knows this is a User
 * } else {
 *   console.log(result.errors);
 * }
 * ```
 * 
 * @param schema - Zod schema to create validator from
 * @returns Validator function
 */
export function makeValidator<T>(schema: z.ZodSchema<T>) {
  return (data: unknown): ValidationResult<T> => {
    const result = schema.safeParse(data);
    if (result.success) {
      return { success: true, data: result.data };
    }
    const errors = result.error.issues.map(
      issue => `${issue.path.join('.')}: ${issue.message}`
    );
    return { success: false, errors };
  };
}

/**
 * Validates data against a schema and returns typed data or throws
 * 
 * Use this when you want the validation to throw on failure,
 * which is useful for critical data that must be valid.
 * 
 * @example
 * ```typescript
 * try {
 *   const user = validateData(UserSchema, userData, 'User creation');
 * } catch (e) {
 *   console.error('Invalid user data:', e.message);
 * }
 * ```
 * 
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @param context - Optional context for error messages
 * @returns Validated and typed data
 * @throws Error if validation fails
 */
export function validateData<T>(
  schema: z.ZodSchema<T>, 
  data: unknown, 
  context?: string
): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const errors = result.error.issues.map(
      issue => `${issue.path.join('.')}: ${issue.message}`
    );
    throw new Error(
      `Validation failed${context ? ` in ${context}` : ''}: ${errors.join(', ')}`
    );
  }
  return result.data;
}



/**
 * Merges default values from schema with provided data
 * 
 * This is useful when you want to fill in defaults for
 * partial data while preserving provided values.
 * 
 * @example
 * ```typescript
 * const userWithDefaults = mergeDefaults(UserSchema, partialUserData);
 * // Returns partialUserData with any missing fields filled from defaults
 * ```
 * 
 * @param schema - Zod schema to get defaults from
 * @param data - Partial data to merge with defaults
 * @returns Complete data with defaults applied
 */
export function mergeDefaults<T>(schema: z.ZodSchema<T>, data: Partial<T>): T {
  const defaults = schema.parse({});
  return { ...defaults, ...data } as T;
}

/**
 * Creates a partial validator that allows undefined for all fields
 * 
 * @param schema - Base schema to make all fields optional
 * @returns Partial schema
 */
export function createPartialSchema<T extends z.ZodType<any>>(
  schema: T
) {
  return schema.partial();
}

/**
 * ============================================
 * DEFAULT SCHEMAS (Built-in Event Types)
 * ============================================
 * 
 * Pre-defined schema definitions for the framework's built-in event types.
 * These represent the default alert events supported out of the box.
 */

// Default schemas map for the framework
export const defaultSchemas: Map<string, SchemaDefinition> = new Map([
  [
    'seguimientos',
    {
      $id: '#seguimientos',
      eventType: 'seguimientos',
      label: 'Seguimientos',
      conditionLabel: 'Cualquier nuevo seguimiento',
      variables: [
        { name: 'username', description: 'Nombre del usuario' },
      ],
      defaultMessage: '¡{username} acaba de seguir!',
      requiredFields: ['username'],
      optionalFields: ['followerName', 'isNewFollower', 'timestamp'],
    },
  ],
  [
    'suscripciones',
    {
      $id: '#suscripciones',
      eventType: 'suscripciones',
      label: 'Suscripciones',
      conditionLabel: 'Cualquier nueva suscripción',
      variables: [
        { name: 'username', description: 'Nombre del usuario' },
        { name: 'months', description: 'Meses suscrito' },
      ],
      defaultMessage: '¡{username} se ha suscrito por {months} meses!',
      requiredFields: ['username', 'months'],
      optionalFields: ['tier', 'isGift', 'gifterName', 'message', 'timestamp'],
    },
  ],
  [
    'bits',
    {
      $id: '#bits',
      eventType: 'bits',
      label: 'Bits',
      conditionLabel: 'Cualquier donación de bits',
      variables: [
        { name: 'username', description: 'Nombre del usuario' },
        { name: 'amount', description: 'Cantidad de bits' },
      ],
      defaultMessage: '¡{username} ha donado {amount} bits!',
      requiredFields: ['username', 'amount'],
      optionalFields: ['totalAmount', 'message', 'isAnonymous', 'timestamp'],
    },
  ],
]);

/**
 * Get a default schema by event type
 * 
 * @param eventType - The event type to look up
 * @returns Schema definition or undefined if not found
 */
export function getDefaultSchema(eventType: string): SchemaDefinition | undefined {
  return defaultSchemas.get(eventType);
}

/**
 * ============================================
 * SCHEMA UTILITIES
 * ============================================
 * 
 * Additional utilities for working with schemas.
 */

/**
 * Gets the default values from a schema as an object
 * 
 * @param schema - Zod schema to extract defaults from
 * @returns Object with default values
 */
export function getSchemaDefaults<T>(schema: z.ZodSchema<T>): T {
  return schema.parse({});
}

/**
 * Checks if a value matches a schema
 * 
 * @param schema - Zod schema to validate against
 * @param data - Data to check
 * @returns true if valid, false otherwise
 */
export function isValid<T>(schema: z.ZodSchema<T>, data: unknown): boolean {
  return schema.safeParse(data).success;
}

/**
 * ============================================
 * EXPORTS
 * ============================================
 * 
 * Re-export commonly used items for convenience.
 */

// Pre-built validators for common schemas
export const validateAppConfig = makeValidator(AppConfigSchema);
export const validateAlertVariant = makeValidator(AlertVariantSchema);
export const validateAlertBox = makeValidator(AlertBoxSchema);
export const validateTemplate = makeValidator(TemplateDBSchema);
export const validatePlatformEvent = makeValidator(PlatformEventDefinitionSchema);
export const validateDialogOptions = makeValidator(DialogOptionsSchema);
