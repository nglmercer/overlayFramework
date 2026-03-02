/**
 * Core Utilities - Shared Schema Definitions and Validation
 * Provides Zod-based schemas and validation utilities for the overlay framework
 */

import { z } from 'zod';

/**
 * ============================================
 * ENVIRONMENT & CONFIGURATION SCHEMAS
 * ============================================
 */

// Environment type schema
export const EnvironmentSchema = z.enum(['development', 'production', 'test']);

// Application configuration schema
export const AppConfigSchema = z.object({
  mediaUrl: z.string().url().default('http://localhost:3000/media'),
  baseMediaUrl: z.string().url().default('https://cdn.example.com'),
  apiEndpoint: z.string().url().optional(),
  environment: EnvironmentSchema.default('development'),
});

export type AppConfig = z.infer<typeof AppConfigSchema>;

/**
 * ============================================
 * EVENT VARIABLE SCHEMAS
 * ============================================
 */

// Event variable definition schema
export const EventVariableSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
});

export type EventVariable = z.infer<typeof EventVariableSchema>;

// Platform event definition schema
export const PlatformEventDefinitionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  conditionLabel: z.string().min(1),
  variables: z.array(EventVariableSchema),
  defaultMessage: z.string(),
});

export type PlatformEventDefinition = z.infer<typeof PlatformEventDefinitionSchema>;

/**
 * ============================================
 * EVENT TYPE SCHEMAS (Schema Loader)
 * ============================================
 */

// Event types supported by the system
export const EventTypeSchema = z.enum(['seguimientos', 'suscripciones', 'bits']);

export type EventType = z.infer<typeof EventTypeSchema>;

// Schema definition for variant schemas
export const SchemaDefinitionSchema = z.object({
  $id: z.string(),
  eventType: EventTypeSchema,
  label: z.string(),
  conditionLabel: z.string(),
  variables: z.array(EventVariableSchema),
  defaultMessage: z.string(),
  requiredFields: z.array(z.string()),
  optionalFields: z.array(z.string()),
});

export type SchemaDefinition = z.infer<typeof SchemaDefinitionSchema>;

/**
 * ============================================
 * ALERT VARIANT SCHEMAS
 * ============================================
 */

// Layout options for alerts
export const AlertLayoutSchema = z.enum(['text-below', 'text-right', 'text-over']);

// Text alignment options
export const TextAlignSchema = z.enum(['left', 'center', 'right', 'justify']);

// Animation configuration schema (for reference - imports from animation-schemas)
export interface AnimationConfig {
  type: string;
  duration?: number;
  easing?: string;
  [key: string]: unknown;
}

// Alert variant schema with Zod validation
export const AlertVariantSchema = z.object({
  id: z.string().min(1),
  boxId: z.string().min(1),
  type: z.string().default('default'),
  name: z.string().default('New Variant'),
  condition: z.string().default(''),
  duration: z.number().int().positive().default(5000),
  
  // Legacy animation fields (backward compatibility)
  animationIn: z.string().default('fade-in'),
  animationOut: z.string().default('fade-out'),
  animationInDuration: z.number().int().positive().default(300),
  animationOutDuration: z.number().int().positive().default(300),
  
  // New schema-based animation config
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
  
  // State
  active: z.boolean().default(true),
  probability: z.string().optional(),
  customHtmlEnabled: z.boolean().optional(),
  customHtml: z.string().optional(),
  customCss: z.string().optional(),
  
  // Specific fields
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
 * ============================================
 * ALERT BOX SCHEMAS
 * ============================================
 */

export const AlertBoxSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  enabled: z.boolean().default(true),
});

export type AlertBox = z.infer<typeof AlertBoxSchema>;

/**
 * ============================================
 * TEMPLATE SCHEMAS
 * ============================================
 */

export const TemplateDBSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  data: z.any(), // The Template object
  updatedAt: z.number().int().positive(),
});

export type TemplateDB = z.infer<typeof TemplateDBSchema>;

/**
 * ============================================
 * DIALOG SCHEMAS
 * ============================================
 */

export const DialogThemeSchema = z.enum(['light', 'dark']);
export const DialogTypeSchema = z.enum(['alert', 'confirm', 'prompt', 'modal']);

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
export type DialogTheme = z.infer<typeof DialogThemeSchema>;
export type DialogType = z.infer<typeof DialogTypeSchema>;
export type DialogResult = unknown;

/**
 * ============================================
 * FRAMEWORK CONFIGURATION SCHEMAS
 * ============================================
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
 * VALIDATION UTILITIES
 * ============================================
 */

/**
 * Creates a validator function from a Zod schema with proper error handling
 */
export function makeValidator<T>(schema: z.ZodSchema<T>) {
  return (data: unknown): { success: true; data: T } | { success: false; errors: string[] } => {
    const result = schema.safeParse(data);
    if (result.success) {
      return { success: true, data: result.data };
    }
    const errors = result.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`);
    return { success: false, errors };
  };
}

/**
 * Validates data against a schema and returns typed data or throws
 */
export function validateData<T>(schema: z.ZodSchema<T>, data: unknown, context?: string): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const errors = result.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`);
    throw new Error(`Validation failed${context ? ` in ${context}` : ''}: ${errors.join(', ')}`);
  }
  return result.data;
}

/**
 * Creates a partial schema for optional updates
 */
export function createUpdateSchema<T extends z.ZodTypeAny>(schema: T): z.ZodOptional<T> {
  return schema.optional();
}

/**
 * Merges default values from schema with provided data
 */
export function mergeDefaults<T>(schema: z.ZodSchema<T>, data: Partial<T>): T {
  const defaults = schema.parse({});
  return { ...defaults, ...data } as T;
}

/**
 * ============================================
 * DEFAULT SCHEMAS (Built-in Event Types)
 * ============================================
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


