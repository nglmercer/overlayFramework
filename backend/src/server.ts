/**
 * Overlay Backend Server
 * 
 * Bun-native server combining:
 * - WebSocket server for real-time overlay communication
 * - HTTP webhook endpoints for receiving external events
 * - Heartbeat system for connection health monitoring
 * - CORS support for cross-origin requests
 * - Offline-first sync API with Git-like operations
 * 
 * Usage:
 *   bun run src/server.ts
 *   bun run --watch src/server.ts  (dev mode with hot reload)
 * 
 * Environment:
 *   PORT            - Server port (default: 8080)
 *   WEBHOOK_SECRET  - Optional auth secret for webhook endpoints
 *   HEARTBEAT_MS    - Heartbeat interval in ms (default: 30000)
 *   CORS_ALLOWED_ORIGINS - Comma-separated list of allowed origins (default: *)
 * 
 * @module backend/server
 * @version 2.0.0
 */

import { parseClientMessage } from './schemas';
import { wsManager, type WsClientData } from './ws-manager';
import { initializeStorage } from './storage';
import { syncManager } from './sync';
import { join } from 'path';
import { initDiscovery, createDiscoveryShutdownHandler, stopDiscovery } from './discover';
import type { Discovery } from '../discover';
import '../mediaserver';
// Import new modular components
import { 
  Env, 
  ServerConfig, 
  ApiPath,
  WsMessageType,
} from './constants';
import { routeRequest, router, registerRoutes } from './router';
import { getEnvInt, logger, loggerError } from './utils';

// ============================================================================
// CONFIGURATION
// ============================================================================

const PORT = getEnvInt(Env.PORT, ServerConfig.DEFAULT_PORT);
const HEARTBEAT_MS = getEnvInt(Env.HEARTBEAT_MS, ServerConfig.DEFAULT_HEARTBEAT_MS);
const DIST_PATH = join(import.meta.dir, '../../dist');

// Initialize Discovery
const discovery = await initDiscovery(PORT);
const discoveryShutdown = createDiscoveryShutdownHandler(discovery);

registerRoutes();
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
      logger('WS', `Client connected: ${ws.data.id}`);
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
          logger('WS', `ACK from ${ws.data.clientId ?? ws.data.id}: event=${message.eventId} status=${message.status}`);
          break;

        case WsMessageType.PONG:
          wsManager.recordPong(ws);
          break;
        
        case WsMessageType.ALERT:
          // Client sent an alert - broadcast to all other clients
          logger('WS', `Alert from ${ws.data.clientId ?? ws.data.id}: ${message.eventName}`);
          wsManager.broadcastAlert({
            type: WsMessageType.ALERT,
            eventName: message.eventName,
            data: message.data,
            timestamp: Date.now(),
            id: message.id,
            target: message.target,
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
await initializeStorage();

// Initialize sync manager
await syncManager.init();

const heartbeatInterval = setInterval(() => {
  wsManager.pingAll();
}, HEARTBEAT_MS);

process.on('SIGINT', () => {
  logger('Server', 'SIGINT received, shutting down...');
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

console.log(` Overlay Backend is running!`);
console.log(` HTTP/WS   → http://${server.hostname}:${PORT}`);
console.log(` WebSocket → ws://${server.hostname}:${PORT}${ApiPath.WS}\n`);
router.printRoutes();
