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
const BUILTIN_EVENTS: EventSchemaDefinition[] = [
  {
    id: 'seguimientos',
    label: 'Seguimientos',
    conditionLabel: 'Cualquier nuevo seguimiento',
    requiredFields: ['username'],
    optionalFields: ['followerName', 'isNewFollower', 'timestamp'],
    defaultMessage: '¡{username} acaba de seguir!',
    variables: [{ name: 'username', description: 'Nombre del usuario' }],
  },
  {
    id: 'suscripciones',
    label: 'Suscripciones',
    conditionLabel: 'Cualquier nueva suscripción',
    requiredFields: ['username', 'months'],
    optionalFields: ['tier', 'isGift', 'gifterName', 'message', 'timestamp'],
    defaultMessage: '¡{username} se ha suscrito por {months} meses!',
    variables: [
      { name: 'username', description: 'Nombre del usuario' },
      { name: 'months', description: 'Meses suscrito' },
    ],
  },
  {
    id: 'bits',
    label: 'Bits',
    conditionLabel: 'Cualquier donación de bits',
    requiredFields: ['username', 'amount'],
    optionalFields: ['totalAmount', 'message', 'isAnonymous', 'timestamp'],
    defaultMessage: '¡{username} ha donado {amount} bits!',
    variables: [
      { name: 'username', description: 'Nombre del usuario' },
      { name: 'amount', description: 'Cantidad de bits' },
    ],
  },
];

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
// WEBHOOK SCHEMAS
// ============================================================================

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
 */
export const WebhookAlertPayloadSchema = z.object({
  eventName: z.string().min(1, 'eventName is required'),
  data: z.record(z.string(), z.unknown()).default({}),
});

export type WebhookAlertPayload = z.infer<typeof WebhookAlertPayloadSchema>;

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

/**
 * Webhook for registering new event schemas at runtime
 * 
 * @example POST /webhook/schema
 * ```json
 * {
 *   "id": "donations",
 *   "label": "Donaciones",
 *   "requiredFields": ["username", "amount"],
 *   "defaultMessage": "¡{username} donó {amount}!"
 * }
 * ```
 */
export const WebhookSchemaPayloadSchema = EventSchemaDefinition;
export type WebhookSchemaPayload = EventSchemaDefinition;

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
