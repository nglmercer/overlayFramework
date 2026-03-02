/**
 * Alert Events Module
 * 
 * Defines platform event types and their variable schemas.
 * Used for alert configurations and event handling.
 * 
 * This module provides:
 * - Built-in platform event definitions (seguimientos, suscripciones, bits)
 * - Custom event registration
 * - Event variable extraction and message formatting
 * - Factory functions for creating platform events
 * 
 * @module lib/alertEvents
 * @version 2.0.0
 */

import { z } from 'zod';
import { 
  PlatformEventDefinitionSchema, 
  PlatformEventDefinition,
  EventVariableSchema,
  EventVariable,
  validatePlatformEvent,
  createPlatformEvent,
  makeValidator,
} from './core';

/**
 * ============================================
 * DEFAULT PLATFORM EVENTS
 * ============================================
 * 
 * These are the built-in event types supported by the framework.
 * Each event has a unique ID, display label, condition label,
 * available variables, and a default message template.
 */

/**
 * Built-in platform event definitions
 * These define the structure of alert events for different platforms
 */
export const platformEvents: PlatformEventDefinition[] = [
  {
    id: 'seguimientos',
    label: 'Seguimientos',
    conditionLabel: 'Cualquier nuevo seguimiento',
    variables: [
      { name: 'username', description: 'Nombre del usuario' }
    ],
    defaultMessage: '¡{username} acaba de seguir!',
  },
  {
    id: 'suscripciones',
    label: 'Suscripciones',
    conditionLabel: 'Cualquier nueva suscripción',
    variables: [
      { name: 'username', description: 'Nombre del usuario' },
      { name: 'months', description: 'Meses suscrito' }
    ],
    defaultMessage: '¡{username} se ha suscrito por {months} meses!',
  },
  {
    id: 'bits',
    label: 'Bits',
    conditionLabel: 'Cualquier donación de bits',
    variables: [
      { name: 'username', description: 'Nombre del usuario' },
      { name: 'amount', description: 'Cantidad de bits' }
    ],
    defaultMessage: '¡{username} ha donado {amount} bits!',
  },
];

/**
 * Array to hold additional platform-specific event schemas
 * Can be extended by implementing applications
 */
let customPlatformEvents: PlatformEventDefinition[] = [];

/**
 * ============================================
 * EVENT REGISTRATION
 * ============================================
 */

/**
 * Register custom platform events
 * These will be merged with built-in events
 * 
 * @param events - Array of platform event definitions to add
 * @returns Array of successfully registered events
 */
export function registerPlatformEvents(events: PlatformEventDefinition[]): PlatformEventDefinition[] {
  const registered: PlatformEventDefinition[] = [];
  
  for (const event of events) {
    const result = validatePlatformEvent(event);
    if (!result.success) {
      console.warn(`Invalid platform event:`, (result as { success: false; errors: string[] }).errors);
      continue;
    }
    customPlatformEvents.push(result.data);
    registered.push(result.data);
  }
  
  return registered;
}

/**
 * Clear all custom platform events
 */
export function clearCustomPlatformEvents(): void {
  customPlatformEvents = [];
}

/**
 * Get count of custom platform events
 * 
 * @returns Number of custom events registered
 */
export function getCustomPlatformEventsCount(): number {
  return customPlatformEvents.length;
}

/**
 * ============================================
 * EVENT ACCESS
 * ============================================
 */

/**
 * Get all available platform events (built-in + custom)
 * 
 * @returns Array of all platform event definitions
 */
export function getAllPlatformEvents(): PlatformEventDefinition[] {
  return [...platformEvents, ...customPlatformEvents];
}

/**
 * Get a specific platform event by ID
 * 
 * @param id - The event ID to look up
 * @returns The platform event definition or undefined if not found
 */
export function getPlatformEventById(id: string): PlatformEventDefinition | undefined {
  return getAllPlatformEvents().find(event => event.id === id);
}

/**
 * Get event variables for a specific event type
 * 
 * @param eventType - The event type ID
 * @returns Array of event variables or empty array if not found
 */
export function getEventVariables(eventType: string): EventVariable[] {
  const event = getPlatformEventById(eventType);
  return event?.variables ?? [];
}

/**
 * Get the default message template for an event type
 * 
 * @param eventType - The event type ID
 * @returns The default message template or empty string
 */
export function getDefaultMessage(eventType: string): string {
  const event = getPlatformEventById(eventType);
  return event?.defaultMessage ?? '';
}

/**
 * Get the label for an event type
 * 
 * @param eventType - The event type ID
 * @returns The event label or empty string
 */
export function getEventLabel(eventType: string): string {
  const event = getPlatformEventById(eventType);
  return event?.label ?? '';
}

/**
 * Get the condition label for an event type
 * 
 * @param eventType - The event type ID
 * @returns The condition label or empty string
 */
export function getConditionLabel(eventType: string): string {
  const event = getPlatformEventById(eventType);
  return event?.conditionLabel ?? '';
}

/**
 * ============================================
 * EVENT VARIABLE HELPERS
 * ============================================
 */

/**
 * Extract variable names from an event definition
 * 
 * @param event - The platform event definition
 * @returns Array of variable names
 */
export function getVariableNames(event: PlatformEventDefinition): string[] {
  return event.variables.map(v => v.name);
}

/**
 * Replace placeholders in a message template with actual values
 * 
 * @param template - The message template with {variable} placeholders
 * @param values - Object mapping variable names to their values
 * @returns The formatted message
 */
export function formatMessage(template: string, values: Record<string, unknown>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    const value = values[key];
    return value !== undefined ? String(value) : `{${key}}`;
  });
}

/**
 * Validates that all required variables are provided for an event
 * 
 * @param eventType - The event type ID
 * @param values - Object mapping variable names to their values
 * @returns Validation result with success status and any errors
 */
export function validateEventVariables(
  eventType: string, 
  values: Record<string, unknown>
): { valid: boolean; missing: string[] } {
  const variables = getEventVariables(eventType);
  const missing = variables
    .map(v => v.name)
    .filter(name => !(name in values) || values[name] === undefined);
  
  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * ============================================
 * FACTORY FUNCTIONS
 * ============================================
 */

/**
 * Creates a new platform event definition with validation
 * 
 * @param data - Partial platform event data
 * @returns Validated PlatformEventDefinition
 * 
 * @example
 * ```typescript
 * const customEvent = createPlatformEventSafe({
 *   id: 'donations',
 *   label: 'Donaciones',
 *   conditionLabel: 'Cualquier nueva donación',
 *   variables: [{ name: 'amount', description: 'Cantidad donada' }],
 *   defaultMessage: '¡{amount} donado!'
 * });
 * ```
 */
export function createPlatformEventSafe(
  data: Partial<PlatformEventDefinition>
): PlatformEventDefinition {
  return createPlatformEvent({ data, throwOnError: true });
}

/**
 * ============================================
 * TYPE GUARDS AND CHECKS
 * ============================================
 */

/**
 * Type guard to check if an object is a valid PlatformEventDefinition
 * 
 * @param value - Value to check
 * @returns True if valid PlatformEventDefinition
 */
export function isPlatformEventDefinition(
  value: unknown
): value is PlatformEventDefinition {
  return validatePlatformEvent(value).success;
}

/**
 * Check if an event type exists
 * 
 * @param eventType - The event type ID to check
 * @returns True if event type exists
 */
export function hasEventType(eventType: string): boolean {
  return getPlatformEventById(eventType) !== undefined;
}

/**
 * ============================================
 * RE-EXPORTS FOR CONVENIENCE
 * ============================================
 */

// Re-export types and schemas from core for convenience
export type {
  EventVariable,
  PlatformEventDefinition,
} from './core';

// Re-export schemas
export {
  PlatformEventDefinitionSchema,
  EventVariableSchema,
} from './core';

// Keep the old export for backward compatibility
// This allows existing code that imports platformEventsSchema to continue working
export const platformEventsSchema: PlatformEventDefinition[] = platformEvents;

/**
 * ============================================
 * DEFAULT EXPORTS
 * ============================================
 */

export default {
  platformEvents,
  registerPlatformEvents,
  clearCustomPlatformEvents,
  getAllPlatformEvents,
  getPlatformEventById,
  getEventVariables,
  getDefaultMessage,
  getVariableNames,
  formatMessage,
};
