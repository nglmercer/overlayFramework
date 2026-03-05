/**
 * Webhook Route Handlers
 * 
 * Defines all /webhook/* endpoints using the modular router engine.
 * 
 * @module backend/routes/webhook
 * @version 1.0.0
 */

import { z } from 'zod';
import { Router, json } from '../router-engine';
import { 
  ApiPath, 
  HttpStatus, 
  HttpHeader, 
  ContentType 
} from '../constants';
import { 
  WebhookAlertPayloadSchema, 
  WebhookControlPayloadSchema, 
  WebhookSchemaPayloadSchema,
  registerEventSchema,
  getAllEventSchemas,
  getRegisteredEventIds,
  validateEventData,
} from '../schemas';
import { wsManager } from '../ws-manager';
import { 
  saveOverlayData, 
  deleteOverlayData, 
  listOverlayKeys, 
  loadOverlayData, 
  generatePreviewUrl 
} from '../storage';
import { generateId, checkRequestSecret } from '../utils';

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET ?? '';

function isAuthenticated(req: Request): boolean {
  return checkRequestSecret(req, WEBHOOK_SECRET);
}

// ============================================================================
// ROUTE REGISTRATION
// ============================================================================

export function registerWebhookRoutes(router: Router): void {
  
  // Status check
  router.get(ApiPath.WEBHOOK_STATUS, (ctx) => {
    return json({
      status: 'ok',
      uptime: process.uptime(),
      clients: {
        count: wsManager.getClientCount(),
        list: wsManager.getClientsInfo(),
      },
      schemas: getRegisteredEventIds(),
    });
  });

  // List all schemas
  router.get(ApiPath.WEBHOOK_SCHEMAS, () => {
    const schemas = getAllEventSchemas();
    const result: Record<string, unknown> = {};
    for (const [id, schema] of schemas) {
      result[id] = schema;
    }
    return json({ schemas: result });
  });

  // Recent events log
  router.get(ApiPath.WEBHOOK_EVENTS, ({ url }) => {
    const limit = parseInt(url.searchParams.get('limit') ?? '20', 10);
    return json({
      events: wsManager.getEventLog(limit),
    });
  });

  // List all overlays
  router.get(ApiPath.WEBHOOK_OVERLAYS, async () => {
    const keys = await listOverlayKeys();
    return json({ keys });
  });

  // Get specific overlay
  router.get(ApiPath.WEBHOOK_OVERLAY_KEY, async (ctx) => {
    const { key } = ctx.params;
    const data = await loadOverlayData(key);
    if (!data) {
      return json({ error: 'Not found' }, HttpStatus.NOT_FOUND);
    }
    return json({ key, data, previewUrl: generatePreviewUrl(key) });
  });

  // Trigger alert webhook
  router.post(ApiPath.WEBHOOK_ALERT, {
    schema: { body: WebhookAlertPayloadSchema },
    handler: async (ctx) => {
      if (!isAuthenticated(ctx.req)) return json({ error: 'Unauthorized' }, 401);

      const { eventName, data, target } = ctx.body;

      // Validate event data against registered schema
      const validation = validateEventData(eventName, data);
      if (!validation.valid) {
        return json({
          error: 'Invalid event data',
          eventName,
          details: validation.errors,
        }, 422);
      }

      const alertMessage = {
        type: 'alert' as const,
        eventName,
        data,
        timestamp: Date.now(),
        id: generateId('evt'),
        target,
      };

      if (target?.instanceId) {
        const instanceIds = Array.isArray(target.instanceId) ? target.instanceId : [target.instanceId];
        wsManager.sendAlertToInstance(alertMessage, instanceIds);
      } else {
        wsManager.broadcastAlert(alertMessage);
      }

      return json({
        ok: true,
        eventId: alertMessage.id,
        clients: wsManager.getClientCount(),
        target: target || 'all',
      });
    },
    description: 'Trigger alert broadcast'
  });

  // Control overlay webhook
  router.post(ApiPath.WEBHOOK_CONTROL, {
    schema: { body: WebhookControlPayloadSchema },
    handler: async (ctx) => {
      if (!isAuthenticated(ctx.req)) return json({ error: 'Unauthorized' }, 401);
      
      const { action } = ctx.body;
      wsManager.broadcastControl(action);

      return json({
        ok: true,
        action,
        clients: wsManager.getClientCount(),
      });
    },
    description: 'Send control action'
  });

  // Register schema webhook
  router.post(ApiPath.WEBHOOK_SCHEMA, {
    schema: { body: WebhookSchemaPayloadSchema },
    handler: async (ctx) => {
      if (!isAuthenticated(ctx.req)) return json({ error: 'Unauthorized' }, 401);
      
      registerEventSchema(ctx.body);

      return json({
        ok: true,
        schemaId: ctx.body.id,
        registeredSchemas: getRegisteredEventIds(),
      });
    },
    description: 'Register event schema'
  });

  // Save overlay webhook
  router.post(ApiPath.WEBHOOK_SAVE, {
    schema: { 
      body: z.object({
        key: z.string().min(1),
        data: z.any(),
      }) 
    },
    handler: async (ctx) => {
      if (!isAuthenticated(ctx.req)) return json({ error: 'Unauthorized' }, 401);
      
      const { key, data } = ctx.body;
      const result = await saveOverlayData(key, data);
      
      return json({
        ok: true,
        key: result.key,
        previewUrl: result.previewUrl,
      });
    },
    description: 'Save overlay data'
  });

  // Delete overlay webhook
  router.post(ApiPath.WEBHOOK_DELETE, {
    schema: {
      body: z.object({
        key: z.string().min(1),
      })
    },
    handler: async (ctx) => {
      if (!isAuthenticated(ctx.req)) return json({ error: 'Unauthorized' }, 401);
      
      const { key } = ctx.body;
      const existed = await deleteOverlayData(key);
      
      return json({
        ok: true,
        deleted: existed,
        key,
      });
    },
    description: 'Delete overlay data'
  });
}
