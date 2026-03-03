/**
 * WebSocket Connection Manager
 * 
 * Manages connected overlay clients, broadcasting, and per-client state.
 * Uses Bun's native ServerWebSocket type.
 * 
 * @module backend/ws-manager
 * @version 1.0.0
 */

import type { ServerWebSocket } from 'bun';
import type { WsAlertMessage, WsControlMessage, WsConfigMessage } from './schemas';

/** Per-client data stored in ws.data */
export interface WsClientData {
  id: string;
  clientId?: string;
  capabilities?: string[];
  connectedAt: number;
  lastPong: number;
}

/**
 * Manages all connected WebSocket clients
 */
class WsManager {
  private clients = new Set<ServerWebSocket<WsClientData>>();
  private eventLog: WsAlertMessage[] = [];
  private maxEventLog = 100;

  /** Register a new client connection */
  addClient(ws: ServerWebSocket<WsClientData>): void {
    this.clients.add(ws);
    console.log(`[WS] Client connected: ${ws.data.id} (total: ${this.clients.size})`);
  }

  /** Remove a client connection */
  removeClient(ws: ServerWebSocket<WsClientData>): void {
    this.clients.delete(ws);
    console.log(`[WS] Client disconnected: ${ws.data.id} (total: ${this.clients.size})`);
  }

  /** Update client info (from ready message) */
  updateClient(ws: ServerWebSocket<WsClientData>, clientId?: string, capabilities?: string[]): void {
    ws.data.clientId = clientId;
    ws.data.capabilities = capabilities;
    console.log(`[WS] Client ready: ${clientId ?? ws.data.id}, capabilities: ${capabilities?.join(', ') ?? 'none'}`);
  }

  /** Record pong from client */
  recordPong(ws: ServerWebSocket<WsClientData>): void {
    ws.data.lastPong = Date.now();
  }

  /** Get connected client count */
  getClientCount(): number {
    return this.clients.size;
  }

  /** Get all connected clients info */
  getClientsInfo(): Array<{ id: string; clientId?: string; connectedAt: number }> {
    return Array.from(this.clients).map(ws => ({
      id: ws.data.id,
      clientId: ws.data.clientId,
      connectedAt: ws.data.connectedAt,
    }));
  }

  // ========================================
  // BROADCASTING
  // ========================================

  /**
   * Broadcast an alert to all connected overlay clients
   */
  broadcastAlert(message: WsAlertMessage): void {
    const json = JSON.stringify(message);
    let sent = 0;

    for (const client of this.clients) {
      try {
        client.send(json);
        sent++;
      } catch (err) {
        console.error(`[WS] Failed to send to ${client.data.id}:`, err);
      }
    }

    // Log the event
    this.eventLog.push(message);
    if (this.eventLog.length > this.maxEventLog) {
      this.eventLog.shift();
    }

    console.log(`[WS] Alert broadcasted to ${sent}/${this.clients.size} clients: ${message.eventName}`);
  }

  /**
   * Broadcast a control action to all clients
   */
  broadcastControl(action: WsControlMessage['action']): void {
    const message: WsControlMessage = {
      type: 'control',
      action,
      timestamp: Date.now(),
    };
    const json = JSON.stringify(message);

    for (const client of this.clients) {
      try {
        client.send(json);
      } catch (err) {
        console.error(`[WS] Failed to send control to ${client.data.id}:`, err);
      }
    }

    console.log(`[WS] Control broadcasted: ${action}`);
  }

  /**
   * Broadcast a config update to all clients
   */
  broadcastConfig(key: string, value: unknown): void {
    const message: WsConfigMessage = {
      type: 'config',
      key,
      value,
      timestamp: Date.now(),
    };
    const json = JSON.stringify(message);

    for (const client of this.clients) {
      try {
        client.send(json);
      } catch (err) {
        console.error(`[WS] Failed to send config to ${client.data.id}:`, err);
      }
    }

    console.log(`[WS] Config broadcasted: ${key}`);
  }

  /**
   * Send a ping to all clients
   */
  pingAll(): void {
    const json = JSON.stringify({ type: 'ping', timestamp: Date.now() });

    for (const client of this.clients) {
      try {
        client.send(json);
      } catch {
        // Client may have disconnected
      }
    }
  }

  /**
   * Get recent event log
   */
  getEventLog(limit = 20): WsAlertMessage[] {
    return this.eventLog.slice(-limit);
  }

  /**
   * Clear event log
   */
  clearEventLog(): void {
    this.eventLog = [];
  }

  /**
   * Send alert to specific client(s) by instance ID
   * @param message - The alert message to send
   * @param instanceIds - Array of client IDs to send to (if empty, broadcasts to all)
   */
  sendAlertToInstance(message: WsAlertMessage, instanceIds: string[]): void {
    const json = JSON.stringify(message);
    let sent = 0;

    for (const client of this.clients) {
      // Skip if we have specific instanceIds and this client isn't in the list
      if (instanceIds.length > 0 && !instanceIds.includes(client.data.clientId || client.data.id)) {
        continue;
      }

      try {
        client.send(json);
        sent++;
      } catch (err) {
        console.error(`[WS] Failed to send to ${client.data.id}:`, err);
      }
    }

    console.log(`[WS] Alert sent to ${sent} instance(s): ${message.eventName}`);
  }
}

/** Singleton instance */
export const wsManager = new WsManager();
