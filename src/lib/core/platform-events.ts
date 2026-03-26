/**
 * Centralized Platform Event Definitions
 * 
 * Simplified - single global "alert" event.
 * The autocompletion is now handled dynamically via platform-variables.
 * 
 * @module lib/core/platform-events
 * @version 4.0.0
 */

/**
 * Platform Event Definition - mínima sin validaciones
 */
export interface PlatformEventDefinition {
  id: string;
  label: string;
  conditionLabel: string;
  defaultMessage: string;
  variables?: any[];
  requiredFields?: string[];
  optionalFields?: string[];
}

/**
 * SINGLE GLOBAL EVENT
 * 
 * We use a single "alert" event - the autocompletion is dynamic
 * based on the sample object the user provides.
 */
export const PLATFORM_EVENTS: Record<string, PlatformEventDefinition> = {
  'alert': {
    id: 'alert',
    label: 'Alerta',
    conditionLabel: 'Cualquier evento de alerta',
    defaultMessage: '$[data.content]',
  },
};

/**
 * Get all events as an array
 */
export function getAllPlatformEvents(): PlatformEventDefinition[] {
  return Object.values(PLATFORM_EVENTS);
}

/**
 * Get an event by ID
 */
export function getPlatformEventById(id: string): PlatformEventDefinition | undefined {
  return PLATFORM_EVENTS[id];
}
