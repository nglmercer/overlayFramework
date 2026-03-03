/**
 * Webhook HTTP Handler
 * 
 * Processes incoming HTTP webhook requests and dispatches them
 * to connected WS overlay clients. Supports:
 * - POST /webhook/alert  — trigger an alert
 * - POST /webhook/control — send control actions
 * - POST /webhook/schema — register new event schemas
 * - GET  /webhook/status — server + client info
 * - GET  /webhook/schemas — list registered schemas
 * - GET  /webhook/events — recent event log
 * 
 * @module backend/webhook
 * @version 1.0.0
 */

import {
  WebhookAlertPayloadSchema,
  WebhookControlPayloadSchema,
  WebhookSchemaPayloadSchema,
  WsAlertMessageSchema,
  validateEventData,
  registerEventSchema,
  getAllEventSchemas,
  getRegisteredEventIds,
  WebhookTarget,
} from './schemas';
import type { WsAlertMessage } from './schemas';
import { wsManager } from './ws-manager';
import { initializeStorage, saveOverlayData, loadOverlayData, deleteOverlayData, listOverlayKeys, getAllOverlayData, generatePreviewUrl } from './storage';

/** CORS headers for webhook responses */
const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Webhook-Secret',
};

/** Optional webhook secret for basic auth */
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET ?? '';

/**
 * Handle all HTTP requests (webhook + status endpoints)
 */
export async function handleHttpRequest(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname;
  const method = req.method;

  // CORS preflight
  if (method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  // Auth check (if WEBHOOK_SECRET is set)
  if (WEBHOOK_SECRET && method === 'POST') {
    const secret = req.headers.get('X-Webhook-Secret') ?? req.headers.get('Authorization')?.replace('Bearer ', '');
    if (secret !== WEBHOOK_SECRET) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }
  }

  try {
    // ==========================================
    // POST endpoints (webhooks)
    // ==========================================

    if (method === 'POST' && path === '/webhook/alert') {
      return await handleAlertWebhook(req);
    }

    if (method === 'POST' && path === '/webhook/control') {
      return await handleControlWebhook(req);
    }

    if (method === 'POST' && path === '/webhook/schema') {
      return await handleSchemaWebhook(req);
    }

    // Storage endpoints
    if (method === 'POST' && path === '/webhook/save') {
      return await handleSaveWebhook(req);
    }

    if (method === 'POST' && path === '/webhook/delete') {
      return await handleDeleteWebhook(req);
    }

    // ==========================================
    // GET endpoints (status & info)
    // ==========================================

    if (method === 'GET' && path === '/webhook/status') {
      return handleStatusEndpoint();
    }

    if (method === 'GET' && path === '/webhook/schemas') {
      return handleSchemasEndpoint();
    }

    if (method === 'GET' && path === '/webhook/events') {
      const limit = parseInt(url.searchParams.get('limit') ?? '20', 10);
      return handleEventsEndpoint(limit);
    }

    // Storage GET endpoints
    if (method === 'GET' && path === '/webhook/overlays') {
      return handleOverlaysEndpoint();
    }

    if (method === 'GET' && path.startsWith('/webhook/overlay/')) {
      const key = path.replace('/webhook/overlay/', '');
      return handleGetOverlayEndpoint(key);
    }

    // Health check
    if (method === 'GET' && (path === '/' || path === '/health')) {
      return jsonResponse({ status: 'ok', uptime: process.uptime() });
    }

    return jsonResponse({ error: 'Not found' }, 404);
  } catch (err) {
    console.error('[Webhook] Unhandled error:', err);
    return jsonResponse({ error: 'Internal server error' }, 500);
  }
}

// ============================================================================
// WEBHOOK HANDLERS
// ============================================================================

/**
 * POST /webhook/save
 * 
 * Saves overlay data and generates a preview URL.
 * 
 * @example
 * ```bash
 * curl -X POST http://localhost:3001/webhook/save \
 *   -H "Content-Type: application/json" \
 *   -d '{"key":"my-overlay","data":{"type":"alert","message":"Hello!"}}'
 * ```
 */
async function handleSaveWebhook(req: Request): Promise<Response> {
  const body = await req.json();
  
  const { key, data } = body as { key: string; data: unknown };
  
  if (!key || !data) {
    return jsonResponse({
      error: 'Invalid payload',
      details: 'Required fields: key, data',
    }, 400);
  }

  try {
    const result = await saveOverlayData(key, data);
    return jsonResponse({
      ok: true,
      key: result.key,
      previewUrl: result.previewUrl,
    });
  } catch (error) {
    console.error('[Storage] Save error:', error);
    return jsonResponse({ error: 'Failed to save data' }, 500);
  }
}

/**
 * POST /webhook/delete
 * 
 * Deletes saved overlay data.
 * 
 * @example
 * ```bash
 * curl -X POST http://localhost:3001/webhook/delete \
 *   -H "Content-Type: application/json" \
 *   -d '{"key":"my-overlay"}'
 * ```
 */
async function handleDeleteWebhook(req: Request): Promise<Response> {
  const body = await req.json();
  
  const { key } = body as { key: string };
  
  if (!key) {
    return jsonResponse({
      error: 'Invalid payload',
      details: 'Required field: key',
    }, 400);
  }

  try {
    const existed = await deleteOverlayData(key);
    return jsonResponse({
      ok: true,
      deleted: existed,
      key,
    });
  } catch (error) {
    console.error('[Storage] Delete error:', error);
    return jsonResponse({ error: 'Failed to delete data' }, 500);
  }
}

/**
 * POST /webhook/alert
 * 
 * Receives an alert event and broadcasts it to all connected overlays.
 * Supports optional target filtering to select specific variants.
 * 
 * @example
 * ```bash
 * # Simple alert (broadcasts to all)
 * curl -X POST http://localhost:3001/webhook/alert \
 *   -H "Content-Type: application/json" \
 *   -d '{"eventName":"seguimientos","data":{"username":"viewer123"}}'
 * ```
 * 
 * @example
 * ```bash
 * # Alert with target ID (only selected variant receives it)
 * curl -X POST http://localhost:3001/webhook/alert \
 *   -H "Content-Type: application/json" \
 *   -d '{"eventName":"seguimientos","data":{"username":"viewer123"},"target":{"id":"variant-uuid-123"}}'
 * ```
 * 
 * @example
 * ```bash
 * # Alert with random target (one random variant receives it)
 * curl -X POST http://localhost:3001/webhook/alert \
 *   -H "Content-Type: application/json" \
 *   -d '{"eventName":"seguimientos","data":{"username":"viewer123"},"target":{"random":true}}'
 * ```
 */
async function handleAlertWebhook(req: Request): Promise<Response> {
  const body = await req.json();

  // Validate webhook payload
  const payloadResult = WebhookAlertPayloadSchema.safeParse(body);
  if (!payloadResult.success) {
    return jsonResponse({
      error: 'Invalid payload',
      details: payloadResult.error.issues.map(i => `${i.path.join('.')}: ${i.message}`),
    }, 400);
  }

  const { eventName, data, target } = payloadResult.data;

  // Validate event data against registered schema
  const validation = validateEventData(eventName, data);
  if (!validation.valid) {
    return jsonResponse({
      error: 'Invalid event data',
      eventName,
      details: validation.errors,
    }, 422);
  }

  // Build WS alert message with optional target info
  const alertMessage: WsAlertMessage = {
    type: 'alert',
    eventName,
    data,
    timestamp: Date.now(),
    id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  };

  // Add target filter if provided
  if (target) {
    (alertMessage as any).target = target;
  }

  // Send to specific instance(s) or broadcast to all
  if (target?.instanceId) {
    // Send to specific instance(s)
    const instanceIds = Array.isArray(target.instanceId) ? target.instanceId : [target.instanceId];
    wsManager.sendAlertToInstance(alertMessage, instanceIds);
  } else {
    // Broadcast to all connected overlays
    wsManager.broadcastAlert(alertMessage);
  }

  return jsonResponse({
    ok: true,
    eventId: alertMessage.id,
    clients: wsManager.getClientCount(),
    target: target || 'all', // Report what was targeted
  });
}

/**
 * POST /webhook/control
 * 
 * Sends a control action (pause, resume, clear, skip, mute, unmute)
 * to all connected overlays.
 * 
 * @example
 * ```bash
 * curl -X POST http://localhost:3001/webhook/control \
 *   -H "Content-Type: application/json" \
 *   -d '{"action":"pause"}'
 * ```
 */
async function handleControlWebhook(req: Request): Promise<Response> {
  const body = await req.json();

  const result = WebhookControlPayloadSchema.safeParse(body);
  if (!result.success) {
    return jsonResponse({
      error: 'Invalid payload',
      details: result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`),
    }, 400);
  }

  wsManager.broadcastControl(result.data.action);

  return jsonResponse({
    ok: true,
    action: result.data.action,
    clients: wsManager.getClientCount(),
  });
}

/**
 * POST /webhook/schema
 * 
 * Register a new event schema at runtime.
 * 
 * @example
 * ```bash
 * curl -X POST http://localhost:3001/webhook/schema \
 *   -H "Content-Type: application/json" \
 *   -d '{
 *     "id": "donations",
 *     "label": "Donaciones",
 *     "requiredFields": ["username", "amount"],
 *     "variables": [
 *       {"name": "username", "description": "Nombre del usuario"},
 *       {"name": "amount", "description": "Cantidad donada"}
 *     ],
 *     "defaultMessage": "¡{username} donó {amount}!"
 *   }'
 * ```
 */
async function handleSchemaWebhook(req: Request): Promise<Response> {
  const body = await req.json();

  const result = WebhookSchemaPayloadSchema.safeParse(body);
  if (!result.success) {
    return jsonResponse({
      error: 'Invalid schema',
      details: result.error.issues,
    }, 400);
  }

  registerEventSchema(result.data);

  return jsonResponse({
    ok: true,
    schemaId: result.data.id,
    registeredSchemas: getRegisteredEventIds(),
  });
}

// ============================================================================
// STATUS ENDPOINTS
// ============================================================================

function handleStatusEndpoint(): Response {
  return jsonResponse({
    status: 'ok',
    uptime: process.uptime(),
    clients: {
      count: wsManager.getClientCount(),
      list: wsManager.getClientsInfo(),
    },
    schemas: getRegisteredEventIds(),
  });
}

function handleSchemasEndpoint(): Response {
  const schemas = getAllEventSchemas();
  const result: Record<string, unknown> = {};
  for (const [id, schema] of schemas) {
    result[id] = schema;
  }
  return jsonResponse({ schemas: result });
}

function handleEventsEndpoint(limit: number): Response {
  return jsonResponse({
    events: wsManager.getEventLog(limit),
  });
}

// ============================================================================
// STORAGE ENDPOINTS
// ============================================================================

/**
 * GET /webhook/overlays
 * 
 * List all saved overlay keys.
 */
async function handleOverlaysEndpoint(): Promise<Response> {
  const keys = await listOverlayKeys();
  return jsonResponse({ keys });
}

/**
 * GET /webhook/overlay/:key
 * 
 * Get a specific overlay by key.
 */
async function handleGetOverlayEndpoint(key: string): Promise<Response> {
  const data = await loadOverlayData(key);
  if (!data) {
    return jsonResponse({ error: 'Not found' }, 404);
  }
  return jsonResponse({ key, data, previewUrl: generatePreviewUrl(key) });
}

// ============================================================================
// HELPERS
// ============================================================================

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
    },
  });
}
