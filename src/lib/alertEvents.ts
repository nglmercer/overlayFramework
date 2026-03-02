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
 * 
 * @module lib/alertEvents
 */

import { 
  PlatformEventDefinitionSchema, 
  PlatformEventDefinition,
  EventVariableSchema,
  EventVariable,
  validatePlatformEvent
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

// Use pre-built validator from core
// Note: validatePlatformEvent is now exported from core/utils.ts

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
 */
export function registerPlatformEvents(events: PlatformEventDefinition[]): void {
  // Validate each event before adding
  for (const event of events) {
    const result = validatePlatformEvent(event);
    if (!result.success) {
      console.warn(`Invalid platform event:`, result);
      continue;
    }
    customPlatformEvents.push(event);
  }
}

/**
 * Clear all custom platform events
 */
export function clearCustomPlatformEvents(): void {
  customPlatformEvents = [];
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
