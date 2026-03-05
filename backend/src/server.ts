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
import { initializeStorage } from './storage';
import { join } from 'path';
import { initDiscovery, createDiscoveryShutdownHandler, stopDiscovery } from './discover';
import type { Discovery } from '../discover';

// Import new modular components
import { 
  Env, 
  ServerConfig, 
  ApiPath,
  WsMessageType,
} from './constants';
import { routeRequest, generateClientId, router, registerRoutes } from './router';

// ============================================================================
// CONFIGURATION
// ============================================================================

const PORT = parseInt(process.env[Env.PORT] ?? String(ServerConfig.DEFAULT_PORT), 10);
const HEARTBEAT_MS = parseInt(process.env[Env.HEARTBEAT_MS] ?? String(ServerConfig.DEFAULT_HEARTBEAT_MS), 10);
const DIST_PATH = join(import.meta.dir, '../../dist');

// Initialize Discovery
const discovery = await initDiscovery(PORT);
const discoveryShutdown = createDiscoveryShutdownHandler(discovery);

// Register all routes
registerRoutes();

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
    const response = await routeRequest(req, server, {
      distPath: DIST_PATH,
      discovery: discovery as Discovery | null,
    });
    
    // If router returns undefined (WebSocket upgrade in progress), return nothing
    if (response === undefined) {
      return;
    }
    return response;
  },

  /**
   * WebSocket handlers (Bun native)
   */
  websocket: {
    /** New client connected */
    open(ws) {
      console.log("Client connected", ws.data);
      wsManager.addClient(ws);
    },

    /** Message received from client */
    message(ws, raw) {
      const message = parseClientMessage(raw as string);
      if (!message) return;

      switch (message.type) {
        case WsMessageType.READY:
          wsManager.updateClient(ws, message.clientId, message.capabilities);
          break;

        case WsMessageType.ACK:
          // Log acknowledgement
          console.log(`[WS] ACK from ${ws.data.clientId ?? ws.data.id}: event=${message.eventId} status=${message.status}`);
          break;

        case WsMessageType.PONG:
          wsManager.recordPong(ws);
          break;
        
        case WsMessageType.ALERT:
          // Client sent an alert - broadcast to all other clients
          console.log(`[WS] Alert from ${ws.data.clientId ?? ws.data.id}: ${message.eventName}`);
          wsManager.broadcastAlert({
            type: WsMessageType.ALERT,
            eventName: message.eventName,
            data: message.data,
            timestamp: Date.now(),
            id: message.id,
            target: (message as any).target,
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
    maxPayloadLength: ServerConfig.WS_MAX_PAYLOAD_LENGTH,

    /** Idle timeout: 60 seconds */
    idleTimeout: ServerConfig.WS_IDLE_TIMEOUT,
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

// Print all registered routes using router.printRoutes()
console.log(` HTTP/WS   → http://localhost:${PORT}         `);
console.log(` WebSocket → ws://localhost:${PORT}${ApiPath.WS}         `);
router.printRoutes();
