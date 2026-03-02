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

// ============================================================================
// CONFIGURATION
// ============================================================================

const PORT = parseInt(process.env.PORT ?? '3001', 10);
const HEARTBEAT_MS = parseInt(process.env.HEARTBEAT_MS ?? '30000', 10);

// ============================================================================
// SERVER
// ============================================================================

const server = Bun.serve<WsClientData>({
  port: PORT,

  /**
   * HTTP request handler
   * Routes to webhook handler or upgrades to WebSocket
   */
  fetch(req, server) {
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

    // All other paths → HTTP webhook handler
    return handleHttpRequest(req);
  },

  /**
   * WebSocket handlers (Bun native)
   */
  websocket: {
    /** New client connected */
    open(ws) {
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
  server.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  clearInterval(heartbeatInterval);
  server.stop();
  process.exit(0);
});

// ============================================================================
// STARTUP
// ============================================================================

console.log('');
console.log('╔══════════════════════════════════════════════╗');
console.log('║          🎬 Overlay Backend Server           ║');
console.log('╠══════════════════════════════════════════════╣');
console.log(`║  HTTP/WS   → http://localhost:${PORT}          ║`);
console.log(`║  WebSocket → ws://localhost:${PORT}/ws          ║`);
console.log('╠══════════════════════════════════════════════╣');
console.log('║  Endpoints:                                  ║');
console.log('║  GET  /health            — Health check       ║');
console.log('║  GET  /webhook/status    — Server status      ║');
console.log('║  GET  /webhook/schemas   — List schemas       ║');
console.log('║  GET  /webhook/events    — Recent events      ║');
console.log('║  GET  /webhook/overlays  — List saved overlays║');
console.log('║  GET  /webhook/overlay/:key — Get overlay     ║');
console.log('║  POST /webhook/alert     — Trigger alert      ║');
console.log('║  POST /webhook/control   — Control overlay    ║');
console.log('║  POST /webhook/schema    — Register schema    ║');
console.log('║  POST /webhook/save     — Save overlay data   ║');
console.log('║  POST /webhook/delete    — Delete overlay     ║');
console.log('║  WS   /ws               — Overlay connection  ║');
console.log('╚══════════════════════════════════════════════╝');
console.log('');
