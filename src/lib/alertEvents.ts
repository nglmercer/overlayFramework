/**
 * Alert Events Module
 * 
 * Módulo simplificado para alertas - sin schemas, sin tipos, sin validaciones.
 * Todo es dinámico basado en el objeto JSON que el usuario provee.
 * 
 * @module lib/alertEvents
 * @version 4.0.0
 */

import { getAllPlatformEvents, getPlatformEventById, PlatformEventDefinition } from './core/platform-events';

// Import platform variables for autocomplete
import { 
  setPlatformSample,
  getPlatformSample,
  getPlatformVariables,
  getPlatformVariableGroups,
  getAvailablePlatforms,
  resolveVariables,
  extractVariablesFromTemplate,
  getVariablePattern,
  getNestedValue,
  setNestedValue,
  type DynamicVariable,
  type VariableGroup,
} from './platform-variables';

/**
 * ============================================
 * SINGLE GLOBAL EVENT
 * ============================================
 */

export const platformEvents: PlatformEventDefinition[] = getAllPlatformEvents();

/**
 * Get all events
 */
export function getAllEvents(): PlatformEventDefinition[] {
  return getAllPlatformEvents();
}

/**
 * Get event by ID
 */
export function getEventById(id: string): PlatformEventDefinition | undefined {
  return getPlatformEventById(id);
}

/**
 * Get default message for an event
 */
export function getDefaultMessage(eventType: string): string {
  const event = getEventById(eventType);
  return event?.defaultMessage || '';
}

/**
 * Get label for an event
 */
export function getEventLabel(eventType: string): string {
  const event = getEventById(eventType);
  return event?.label || '';
}

/**
 * Get condition label for an event
 */
export function getConditionLabel(eventType: string): string {
  const event = getEventById(eventType);
  return event?.conditionLabel || '';
}

/**
 * ============================================
 * PLATFORM VARIABLES - For Autocompletion
 * ============================================
 */

export type { DynamicVariable, VariableGroup };

export {
  setPlatformSample,
  getPlatformSample,
  getPlatformVariables,
  getPlatformVariableGroups,
  getAvailablePlatforms,
  resolveVariables,
  extractVariablesFromTemplate,
  getVariablePattern,
  getNestedValue,
  setNestedValue,
};

/**
 * ============================================
 * TEMPLATE PROCESSING
 * ============================================
 */

/**
 * Process template with event data
 * 
 * @param template - Template with $[data.xxx] variables
 * @param eventData - Data object from the event
 * @returns Processed template
 */
export function formatMessage(
  template: string, 
  eventData: Record<string, unknown>
): string {
  return resolveVariables(template, eventData);
}

/**
 * ============================================
 * LEGACY COMPATIBILITY EXPORTS
 * ============================================
 */

export type { PlatformEventDefinition } from './core/platform-events';

/**
 * @deprecated No longer needed - autocompletion is now dynamic
 */
export function getEventVariables(_eventType: string, _platform?: string): any[] {
  console.warn('getEventVariables is deprecated - use getPlatformVariables instead');
  return [];
}

/**
 * @deprecated 
 */
export function getVariableNames(_event: PlatformEventDefinition): string[] {
  console.warn('getVariableNames is deprecated');
  return [];
}

/**
 * @deprecated
 */
export function createPlatformEventSafe(data: Partial<PlatformEventDefinition>): PlatformEventDefinition {
  console.warn('createPlatformEventSafe is deprecated');
  return data as PlatformEventDefinition;
}

/**
 * @deprecated
 */
export function isPlatformEventDefinition(_value: unknown): boolean {
  console.warn('isPlatformEventDefinition is deprecated');
  return true;
}

/**
 * @deprecated
 */
export function hasEventType(_eventType: string): boolean {
  // Now we only have 'alert', so always return true for that
  return true;
}

/**
 * @deprecated
 */
export function registerPlatformEvents(_events: PlatformEventDefinition[]): PlatformEventDefinition[] {
  console.warn('registerPlatformEvents is deprecated - now using dynamic samples');
  return [];
}

/**
 * @deprecated
 */
export function clearCustomPlatformEvents(): void {
  console.warn('clearCustomPlatformEvents is deprecated');
}

/**
 * @deprecated
 */
export function getCustomPlatformEventsCount(): number {
  return 0;
}

/**
 * @deprecated - use platformEvents instead
 */
export const platformEventsSchema: PlatformEventDefinition[] = platformEvents;
