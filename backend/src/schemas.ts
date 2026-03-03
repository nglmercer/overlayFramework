/**
 * Backend WebSocket & Webhook Schemas
 * 
 * Zod schemas shared between WS and webhook handlers.
 * These mirror the frontend message format and add
 * webhook-specific schemas for incoming HTTP events.
 * 
 * @module backend/schemas
 * @version 1.0.0
 */

import { z } from 'zod';
import { PLATFORM_EVENTS } from '../../src/lib/core/platform-events';

// ============================================================================
// EVENT SCHEMA DEFINITIONS (dynamic registry)
// ============================================================================

/**
 * Schema for defining a platform event type.
 * These define what fields each event requires/supports.
 */
export const EventSchemaDefinition = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  conditionLabel: z.string().default(''),
  requiredFields: z.array(z.string()).default([]),
  optionalFields: z.array(z.string()).default([]),
  defaultMessage: z.string().default(''),
  variables: z.array(z.object({
    name: z.string().min(1),
    description: z.string().default(''),
  })).default([]),
});

export type EventSchemaDefinition = z.infer<typeof EventSchemaDefinition>;

/**
 * Registry of event schemas — can be loaded/extended at runtime
 */
const eventSchemas = new Map<string, EventSchemaDefinition>();

// Built-in event schemas
// Built-in event schemas derived from centralized registry
const BUILTIN_EVENTS: EventSchemaDefinition[] = Object.values(PLATFORM_EVENTS).map(event => ({
  id: event.id,
  label: event.label,
  conditionLabel: event.conditionLabel,
  requiredFields: event.requiredFields,
  optionalFields: event.optionalFields,
  defaultMessage: event.defaultMessage,
  variables: event.variables,
}));

// Initialize built-in schemas
for (const schema of BUILTIN_EVENTS) {
  eventSchemas.set(schema.id, schema);
}

/** Register a new event schema */
export function registerEventSchema(schema: EventSchemaDefinition): void {
  eventSchemas.set(schema.id, schema);
}

/** Get an event schema by ID */
export function getEventSchema(id: string): EventSchemaDefinition | undefined {
  return eventSchemas.get(id);
}

/** Get all registered event schemas */
export function getAllEventSchemas(): Map<string, EventSchemaDefinition> {
  return new Map(eventSchemas);
}

/** Get registered event IDs */
export function getRegisteredEventIds(): string[] {
  return Array.from(eventSchemas.keys());
}

// ============================================================================
// WEBHOOK SCHEMAS
// ============================================================================

/**
 * Target filter for alert messages.
 * Used to select specific variants by ID, name, or randomly, or by specific client instance.
 */
export const WebhookTargetSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  random: z.boolean().optional(),
  first: z.boolean().optional(),
  instanceId: z.string().optional(),
});

// Note: target is optional - when not provided, alert broadcasts to all

export type WebhookTarget = z.infer<typeof WebhookTargetSchema>;

/**
 * Webhook payload: received via HTTP POST from external services.
 * 
 * @example POST /webhook/alert
 * ```json
 * {
 *   "eventName": "seguimientos",
 *   "data": { "username": "viewer123" }
 * }
 * ```
 * 
 * @example POST /webhook/alert with target filtering
 * ```json
 * {
 *   "eventName": "seguimientos",
 *   "data": { "username": "viewer123" },
 *   "target": {
 *     "id": "variant-uuid-123"      // OR
 *     // "name": "My Variant Name"   // OR
 *     // "random": true
 *   }
 * }
 * ```
 */
export const WebhookAlertPayloadSchema = z.object({
  eventName: z.string().min(1, 'eventName is required'),
  data: z.record(z.string(), z.unknown()).default({}),
  target: WebhookTargetSchema.optional(),
});

export type WebhookAlertPayload = z.infer<typeof WebhookAlertPayloadSchema>;

/**
 * Webhook schema payload - for registering new event schemas
 */
export const WebhookSchemaPayloadSchema = EventSchemaDefinition;

export type WebhookSchemaPayload = z.infer<typeof WebhookSchemaPayloadSchema>;

/**
 * Webhook control payload
 * 
 * @example POST /webhook/control
 * ```json
 * { "action": "pause" }
 * ```
 */
export const WebhookControlPayloadSchema = z.object({
  action: z.enum(['pause', 'resume', 'clear', 'skip', 'mute', 'unmute']),
});

export type WebhookControlPayload = z.infer<typeof WebhookControlPayloadSchema>;

// ============================================================================
// WS MESSAGE SCHEMAS (Server ↔ Client)
// ============================================================================

/**
 * Alert message: Server → Client overlay
 */
export const WsAlertMessageSchema = z.object({
  type: z.literal('alert'),
  eventName: z.string().min(1),
  data: z.record(z.string(), z.unknown()).default({}),
  timestamp: z.number().optional().default(() => Date.now()),
  id: z.string().optional(),
  target: WebhookTargetSchema.optional(),
});

export type WsAlertMessage = z.infer<typeof WsAlertMessageSchema>;

/**
 * Control message: Server → Client overlay
 */
export const WsControlMessageSchema = z.object({
  type: z.literal('control'),
  action: z.enum(['pause', 'resume', 'clear', 'skip', 'mute', 'unmute']),
  timestamp: z.number().optional().default(() => Date.now()),
  id: z.string().optional(),
});

export type WsControlMessage = z.infer<typeof WsControlMessageSchema>;

/**
 * Config update: Server → Client overlay
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
 * Ping/Pong for heartbeat
 */
export const WsPingSchema = z.object({
  type: z.literal('ping'),
  timestamp: z.number().optional().default(() => Date.now()),
});

export const WsPongSchema = z.object({
  type: z.literal('pong'),
  timestamp: z.number().optional().default(() => Date.now()),
});

/**
 * Client → Server: ready message
 */
export const WsReadyMessageSchema = z.object({
  type: z.literal('ready'),
  clientId: z.string().optional(),
  capabilities: z.array(z.string()).optional(),
  timestamp: z.number().optional().default(() => Date.now()),
});

export type WsReadyMessage = z.infer<typeof WsReadyMessageSchema>;

/**
 * Client → Server: acknowledgement
 */
export const WsAckMessageSchema = z.object({
  type: z.literal('ack'),
  eventId: z.string().min(1),
  status: z.enum(['received', 'displayed', 'completed', 'error']),
  timestamp: z.number().optional().default(() => Date.now()),
});

export type WsAckMessage = z.infer<typeof WsAckMessageSchema>;

/**
 * Client → Server: alert message (sent by preview to broadcast to all clients)
 */
export const WsClientAlertMessageSchema = z.object({
  type: z.literal('alert'),
  eventName: z.string().min(1),
  data: z.record(z.string(), z.string()).default({}),
  timestamp: z.number().optional().default(() => Date.now()),
  id: z.string().optional(),
  target: WebhookTargetSchema.optional(),
});

export type WsClientAlertMessage = z.infer<typeof WsClientAlertMessageSchema>;

/**
 * Union: all messages the server can RECEIVE from clients
 */
export const WsClientMessageSchema = z.discriminatedUnion('type', [
  WsReadyMessageSchema,
  WsAckMessageSchema,
  WsPongSchema,
  WsClientAlertMessageSchema,
]);

export type WsClientMessage = z.infer<typeof WsClientMessageSchema>;

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate event data against its registered schema (required fields check)
 */
export function validateEventData(
  eventName: string,
  data: Record<string, unknown>
): { valid: boolean; errors: string[] } {
  const schema = eventSchemas.get(eventName);

  if (!schema) {
    // Unknown event — pass through
    return { valid: true, errors: [] };
  }

  const errors: string[] = [];
  for (const field of schema.requiredFields) {
    if (!(field in data) || data[field] === undefined || data[field] === null) {
      errors.push(`Missing required field: "${field}"`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Parse a raw WS message from a client
 */
export function parseClientMessage(raw: string | Buffer): WsClientMessage | null {
  try {
    const data = typeof raw === 'string' ? JSON.parse(raw) : JSON.parse(raw.toString());
    const result = WsClientMessageSchema.safeParse(data);
    if (result.success) return result.data;
    console.warn('[Schema] Invalid client message:', result.error.issues);
    return null;
  } catch {
    return null;
  }
}

