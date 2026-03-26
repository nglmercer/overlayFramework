/**
 * WebSocket Message Schemas
 * 
 * Zod-based schemas for validating WebSocket message envelopes.
 * Event-specific data validation is delegated to the SchemaLoader,
 * which manages dynamic schemas (built-in + custom).
 * 
 * Message format follows a standard envelope pattern:
 * { type: string, payload: object, timestamp: number, id?: string }
 * 
 * @module lib/ws/schemas
 * @version 2.0.0
 */

import { z } from 'zod';
import { schemaLoader } from '../schema-loader';
import type { EventType } from '../core';

/**
 * ============================================
 * WS MESSAGE ENVELOPE SCHEMAS
 * ============================================
 * 
 * These define the structure of WS messages (the "envelope").
 * The actual event data inside `data` is validated dynamically
 * by the SchemaLoader based on the `eventName`.
 */

/**
 * Incoming alert event message (Server → Client)
 * 
 * The `eventName` determines which schema from SchemaLoader
 * is used to validate `data`.
 * 
 * @example
 * ```json
 * {
 *   "type": "alert",
 *   "eventName": "seguimientos",
 *   "data": { "username": "viewer123" },
 *   "timestamp": 1709337600000,
 *   "id": "evt-abc123"
 * }
 * ```
 */
export const WsAlertMessageSchema = z.object({
  type: z.literal('alert'),
  eventName: z.string().min(1, 'Event name is required'),
  data: z.record(z.string(), z.unknown()).default({}),
  timestamp: z.number().optional().default(() => Date.now()),
  id: z.string().optional(),
});

export type WsAlertMessage = z.infer<typeof WsAlertMessageSchema>;

/**
 * Control messages (pause, resume, clear, etc.)
 */
export const WsControlMessageSchema = z.object({
  type: z.literal('control'),
  action: z.enum(['pause', 'resume', 'clear', 'skip', 'mute', 'unmute']),
  timestamp: z.number().optional().default(() => Date.now()),
  id: z.string().optional(),
});

export type WsControlMessage = z.infer<typeof WsControlMessageSchema>;

/**
 * Configuration update messages (hot-reload settings)
 */
export const WsConfigMessageSchema = z.object({
  type: z.literal('config'),
  key: z.string().min(1),
  value: z.unknown(),
  timestamp: z.number().optional().default(() => Date.now()),
  id: z.string().optional(),
});

export type WsConfigMessage = z.infer<typeof WsConfigMessageSchema>;

/**
 * Heartbeat / ping-pong messages
 */
export const WsPingMessageSchema = z.object({
  type: z.literal('ping'),
  timestamp: z.number().optional().default(() => Date.now()),
});

export type WsPingMessage = z.infer<typeof WsPingMessageSchema>;

export const WsPongMessageSchema = z.object({
  type: z.literal('pong'),
  timestamp: z.number().optional().default(() => Date.now()),
});

export type WsPongMessage = z.infer<typeof WsPongMessageSchema>;

/**
 * ============================================
 * UNION MESSAGE SCHEMA
 * ============================================
 * 
 * Union of all possible incoming WS message types.
 * Use this to validate/parse raw WS messages.
 */

export const WsIncomingMessageSchema = z.discriminatedUnion('type', [
  WsAlertMessageSchema,
  WsControlMessageSchema,
  WsConfigMessageSchema,
  WsPingMessageSchema,
]);

export type WsIncomingMessage = z.infer<typeof WsIncomingMessageSchema>;

/**
 * ============================================
 * OUTGOING MESSAGE SCHEMAS (Client → Server)
 * ============================================
 */

/**
 * Client ready message (sent when overlay/alert view connects)
 */
export const WsReadyMessageSchema = z.object({
  type: z.literal('ready'),
  clientId: z.string().optional(),
  capabilities: z.array(z.string()).optional(),
  timestamp: z.number().optional().default(() => Date.now()),
});

export type WsReadyMessage = z.infer<typeof WsReadyMessageSchema>;

/**
 * Acknowledgement message (client confirms receipt of event)
 */
export const WsAckMessageSchema = z.object({
  type: z.literal('ack'),
  eventId: z.string().min(1),
  status: z.enum(['received', 'displayed', 'completed', 'error']),
  timestamp: z.number().optional().default(() => Date.now()),
});

export type WsAckMessage = z.infer<typeof WsAckMessageSchema>;

/**
 * Union of outgoing message types
 */
export const WsOutgoingMessageSchema = z.discriminatedUnion('type', [
  WsReadyMessageSchema,
  WsAckMessageSchema,
  WsPongMessageSchema,
]);

export type WsOutgoingMessage = z.infer<typeof WsOutgoingMessageSchema>;

/**
 * ============================================
 * VALIDATION HELPERS
 * ============================================
 */

/**
 * Parse and validate an incoming WS message envelope
 * 
 * @param raw - Raw message string or object
 * @returns Parsed message or null if invalid
 */
export function parseWsMessage(raw: string | unknown): WsIncomingMessage | null {
  try {
    const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
    const result = WsIncomingMessageSchema.safeParse(data);
    if (result.success) {
      return result.data;
    }
    console.warn('[WS Schema] Invalid message:', result.error.issues);
    return null;
  } catch (err) {
    console.warn('[WS Schema] Failed to parse message:', err);
    return null;
  }
}

/**
 * Validate event data using the SchemaLoader.
 * 
 * Delegates to `schemaLoader.validate()` which checks required fields
 * based on the dynamically loaded schema for the given event type.
 * If the event type is not recognized by the SchemaLoader, data is 
 * accepted as-is (pass-through for custom events).
 * 
 * @param eventName - The event type identifier
 * @param data - The event data to validate
 * @returns Object with validation result and errors
 */
export function validateEventData(
  eventName: string, 
  data: Record<string, unknown>
): { valid: boolean; data: Record<string, unknown>; errors: string[] } {
  // Check if schema loader has a schema for this event
  const schema = schemaLoader.getSchema(eventName as EventType);
  
  if (!schema) {
    // Unknown event type — pass through (custom events are allowed)
    return { valid: true, data, errors: [] };
  }

  // Use schema loader's validation
  const isValid = schemaLoader.validate(eventName as EventType, data);
  
  if (isValid) {
    // Enrich with defaults (e.g., timestamp) 
    const enriched = schemaLoader.createEventData(eventName as EventType, data);
    return { valid: true, data: enriched, errors: [] };
  }
  
  // Get detailed errors
  const errors = schemaLoader.getValidationErrors(eventName as EventType, data);
  return { valid: false, data, errors };
}

/**
 * Serialize an outgoing WS message to JSON
 * 
 * @param message - The message to serialize
 * @returns JSON string or null if invalid
 */
export function serializeWsMessage(message: WsOutgoingMessage): string | null {
  const result = WsOutgoingMessageSchema.safeParse(message);
  if (result.success) {
    return JSON.stringify(result.data);
  }
  console.warn('[WS Schema] Invalid outgoing message:', result.error.issues);
  return null;
}

/**
 * ============================================
 * EVENT DATA CONVERTERS
 * ============================================
 * 
 * Converts validated event data into the Record<string, string>
 */

/**
 * Convert event data to the flat string record used by AlertRenderer
 * 
 * @param data - Validated event data
 * @returns Record<string, string> for template variable replacement
 */
export function eventDataToRecord(data: Record<string, unknown>): Record<string, string> {
  const record: Record<string, string> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined && value !== null) {
      record[key] = String(value);
    }
  }
  return record;
}

/**
 * ============================================
 * SCHEMA INTROSPECTION HELPERS
 * ============================================
 * 
 * Helper functions that leverage the SchemaLoader to provide
 * event-related information for the WS layer.
 */

/**
 * Get all registered event types from the SchemaLoader
 * 
 * @returns Array of event type identifiers
 */
export function getRegisteredEventTypes(): string[] {
  const schemas = schemaLoader.getAllSchemas();
  return Array.from(schemas.keys());
}

/**
 * Check if an event type is known to the SchemaLoader
 * 
 * @param eventName - The event type to check
 * @returns true if schema exists
 */
export function isKnownEventType(eventName: string): boolean {
  return schemaLoader.getSchema(eventName as EventType) !== undefined;
}

/**
 * Get the required fields for an event type
 * 
 * @param eventName - The event type
 * @returns Array of required field names, or empty array if unknown
 */
export function getRequiredFields(eventName: string): string[] {
  const schema = schemaLoader.getSchema(eventName as EventType);
  if (!schema) return [];
  return (schema as any)?.requiredFields ?? [];
}

/**
 * Get the default message template for an event type
 * 
 * @param eventName - The event type
 * @returns Default message or empty string
 */
export function getDefaultMessage(eventName: string): string {
  const schema = schemaLoader.getSchema(eventName as EventType);
  if (!schema) return '';
  return (schema as any)?.defaultMessage ?? '';
}
