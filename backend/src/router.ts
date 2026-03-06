/**
 * Router Wrapper for the Overlay Backend Server
 * @module backend/src/router
 */

import { Router, RouterConfig } from './router-engine';
import { registerWebhookRoutes } from './routes/webhook';
import { registerSystemRoutes } from './routes/system';
import { registerProxyRoutes } from './routes/proxy';
import { registerSyncRoutes } from './sync';
import { ApiPath } from './constants';
import { wsManager, type WsClientData } from './ws-manager';
import { generateId } from './utils';

/**
 * Singleton router instance
 */
export const router = new Router();

/**
 * Register all routes from modular sub-files
 */
export function registerRoutes(): void {
  // Register modular routes in order of priority
  registerWebhookRoutes(router);
  registerProxyRoutes(router);
  registerSyncRoutes(router); // Sync API for offline-first functionality
  
  // System routes usually contain catch-all static serving, so register last
  registerSystemRoutes(router);
}

/**
 * Handle WebSocket upgrade (Bun specific)
 */
export function handleWebSocketUpgrade(
  req: Request,
  server: any
): Response | undefined {
  const url = new URL(req.url);
  
  if (url.pathname !== ApiPath.WS) {
    return undefined;
  }

  const clientData: WsClientData = {
    id: generateId('ws'),
    connectedAt: Date.now(),
    lastPong: Date.now(),
  };

  const success = server.upgrade(req, { data: clientData });
  if (success) {
    return undefined; // Bun handles the upgrade
  }
  
  return new Response('WebSocket upgrade failed', { status: 400 });
}

/**
 * Main route entry point called from server.fetch()
 */
export async function routeRequest(
  req: Request,
  server: any,
  config: RouterConfig
): Promise<Response | undefined> {
  // 1. WebSocket upgrade first (highest priority)
  const wsResponse = handleWebSocketUpgrade(req, server);
  if (wsResponse !== undefined) return wsResponse;

  // 2. Execute router (standard HTTP routes)
  const response = await router.execute(req, config);
  
  // Handle fallback if no route matched
  if (!response) {
    return new Response('Not Found', { status: 404 });
  }

  return response;
}
