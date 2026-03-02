/**
 * Overlay Backend Server
 * 
 * Bun-native server combining:
 * - WebSocket server for real-time overlay communication
 * - HTTP webhook endpoints for receiving external events
 * - Heartbeat system for connection health monitoring
 * 
 * Usage:
 *   bun run src/server.ts
 *   bun run --watch src/server.ts  (dev mode with hot reload)
 * 
 * Environment:
 *   PORT            - Server port (default: 3001)
 *   WEBHOOK_SECRET  - Optional auth secret for webhook endpoints
 *   HEARTBEAT_MS    - Heartbeat interval in ms (default: 30000)
 * 
 * @module backend/server
 * @version 1.0.0
 */

import { parseClientMessage } from './schemas';
import { wsManager, type WsClientData } from './ws-manager';
import { handleHttpRequest } from './webhook';
import { initializeStorage } from './storage';
import { join } from 'path';
import { initDiscovery, createDiscoveryShutdownHandler, stopDiscovery } from './discover';
import type { Discovery } from '../discover';

// ============================================================================
// CONFIGURATION
// ============================================================================

const PORT = parseInt(process.env.PORT ?? '3001', 10);
const HEARTBEAT_MS = parseInt(process.env.HEARTBEAT_MS ?? '30000', 10);
const DIST_PATH = join(import.meta.dir, '../../dist');

// Initialize Discovery
const discovery = await initDiscovery(PORT);
const discoveryShutdown = createDiscoveryShutdownHandler(discovery);

// ============================================================================
// SERVER
// ============================================================================

const server = Bun.serve<WsClientData>({
  port: PORT,

  /**
   * HTTP request handler
   * Routes to webhook handler or upgrades to WebSocket
   */
  async fetch(req, server) {
    const url = new URL(req.url);

    // Upgrade to WebSocket on /ws path
    if (url.pathname === '/ws') {
      const clientData: WsClientData = {
        id: `ws-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        connectedAt: Date.now(),
        lastPong: Date.now(),
      };

      const success = server.upgrade(req, { data: clientData });
      if (success) return; // Bun handles the upgrade response
      
      return new Response('WebSocket upgrade failed', { status: 400 });
    }

    // Try serving static files from /dist
    const filePath = url.pathname === '/' ? '/index.html' : url.pathname;
    const file = Bun.file(join(DIST_PATH, filePath));
    if (await file.exists()) {
      return new Response(file);
    }

    // SPA Fallback: Default to index.html for non-webhook paths that aren't files or API
    if (!url.pathname.startsWith('/webhook') && !url.pathname.startsWith('/api')) {
      const indexFile = Bun.file(join(DIST_PATH, 'index.html'));
      if (await indexFile.exists()) {
        return new Response(indexFile);
      }
    }

    // Handle /webhook/discovery endpoint
    if (url.pathname === '/webhook/discovery') {
      const services = discovery ? discovery.getInternalRegistry().getAll() : [];
      const serviceMap = services.reduce((acc, s) => {
        if (s.name) {
          acc[s.name] = `${s.schema}://${s.ip}:${s.port}`;
        }
        return acc;
      }, {} as Record<string, string>);
      
      console.log('[Discovery] Internal Registry:', serviceMap);
      
      // Add manually configured services as fallback/override
      const manualMediaUrl = process.env.MEDIA_UPLOAD_API_URL;
      if (manualMediaUrl) {
         serviceMap['media-upload-api'] = manualMediaUrl;
      }
      
      return new Response(JSON.stringify({
        services: serviceMap,
        self: { id: discovery?.getServiceId(), name: 'overlay-service' }
      }), {
        headers: { 
          'Content-Type': 'application/json', 
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-cache'
        }
      });
    }

    // Proxy /api requests to the media-upload-api
    if (url.pathname.startsWith('/api')) {
      const mediaServices = discovery ? discovery.filter({ name: 'media-upload-api' }) : [];
      const manualMediaUrl = process.env.MEDIA_UPLOAD_API_URL;
      
      if (mediaServices.length > 0 || manualMediaUrl) {
        const target = mediaServices.length > 0 
          ? `${mediaServices[0].schema}://${mediaServices[0].ip}:${mediaServices[0].port}`
          : manualMediaUrl!;

        const proxyUrl = `${target}${url.pathname}${url.search}`;
        console.log(`[Proxy] Routing ${url.pathname} to media-upload-api at ${target}`);
        
        try {
           const proxyResp = await fetch(proxyUrl, {
             method: req.method,
             headers: req.headers,
             body: req.method !== 'GET' ? await req.blob() : undefined
           });
           return proxyResp;
        } catch (err) {
           console.error(`[Proxy] Failed to route to media-upload-api:`, err);
           return new Response(JSON.stringify({ error: 'Proxy Error', details: String(err) }), { 
             status: 502,
             headers: { 'Content-Type': 'application/json' }
           });
        }
      } else {
        console.warn(`[Proxy] No media-upload-api discovered and no MEDIA_UPLOAD_API_URL set`);
        return new Response(JSON.stringify({ error: 'Service not found', service: 'media-upload-api' }), { 
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // All other paths → HTTP webhook handler (API)
    return handleHttpRequest(req);
  },

  /**
   * WebSocket handlers (Bun native)
   */
  websocket: {
    /** New client connected */
    open(ws) {
      console.log("Client connected", ws.data)
      wsManager.addClient(ws);
    },

    /** Message received from client */
    message(ws, raw) {
      const message = parseClientMessage(raw as string);
      if (!message) return;

      switch (message.type) {
        case 'ready':
          wsManager.updateClient(ws, message.clientId, message.capabilities);
          break;

        case 'ack':
          // Log acknowledgement
          console.log(`[WS] ACK from ${ws.data.clientId ?? ws.data.id}: event=${message.eventId} status=${message.status}`);
          break;

        case 'pong':
          wsManager.recordPong(ws);
          break;
        
        case 'alert':
          // Client sent an alert - broadcast to all other clients
          console.log(`[WS] Alert from ${ws.data.clientId ?? ws.data.id}: ${message.eventName}`);
          wsManager.broadcastAlert({
            type: 'alert',
            eventName: message.eventName,
            data: message.data,
            timestamp: Date.now(),
            id: message.id,
          });
          break;
      }
    },

    /** Client disconnected */
    close(ws) {
      wsManager.removeClient(ws);
    },

    /** Drain backpressure */
    drain(ws) {
      // Bun calls this when the send buffer is drained
    },

    /** Max message size: 1MB */
    maxPayloadLength: 1024 * 1024,

    /** Idle timeout: 60 seconds */
    idleTimeout: 60,
  },
});

// Initialize storage
initializeStorage();

// ============================================================================
// HEARTBEAT
// ============================================================================

const heartbeatInterval = setInterval(() => {
  wsManager.pingAll();
}, HEARTBEAT_MS);

// Cleanup on shutdown
process.on('SIGINT', () => {
  console.log('\n[Server] Shutting down...');
  clearInterval(heartbeatInterval);
  discoveryShutdown();
  server.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  clearInterval(heartbeatInterval);
  discoveryShutdown();
  server.stop();
  process.exit(0);
});

// ============================================================================
// STARTUP
// ============================================================================

console.log(` HTTP/WS   → http://localhost:${PORT}         `);
console.log(` WebSocket → ws://localhost:${PORT}/ws         `);
console.log(' Endpoints:                                 ');
console.log(' GET  /health            — Health check      ');
console.log(' GET  /webhook/status    — Server status     ');
console.log(' GET  /webhook/schemas   — List schemas      ');
console.log(' GET  /webhook/events    — Recent events     ');
console.log(' GET  /webhook/overlays  — List saved overlays');
console.log(' GET  /webhook/overlay/:key — Get overlay    ');
console.log(' POST /webhook/alert     — Trigger alert     ');
console.log(' POST /webhook/control   — Control overlay   ');
console.log(' POST /webhook/schema    — Register schema   ');
console.log(' POST /webhook/save     — Save overlay data  ');
console.log(' POST /webhook/delete    — Delete overlay    ');
console.log(' WS   /ws               — Overlay connection ');
