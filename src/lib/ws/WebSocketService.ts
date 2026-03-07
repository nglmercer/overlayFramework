/**
 * WebSocket Service
 * 
 * Manages a WebSocket connection for receiving and dispatching 
 * alert events in real-time. Handles:
 * - Auto-reconnection with exponential backoff
 * - Message validation via Zod schemas
 * - Event queue management (FIFO with optional deduplication)
 * - Heartbeat (ping/pong) to detect stale connections
 * - Typed event emitter for alert, control, and config events
 * 
 * @module lib/ws/WebSocketService
 * @version 1.0.0
 */

import {
  WsIncomingMessage,
  WsAlertMessage,
  WsControlMessage,
  WsConfigMessage,
  parseWsMessage,
  serializeWsMessage,
  validateEventData,
  eventDataToRecord,
} from './schemas';

/**
 * ============================================
 * TYPES & INTERFACES
 * ============================================
 */

/** Connection states */
export type WsConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

/** Event listener callback types */
export type AlertEventHandler = (event: WsAlertMessage, eventData: Record<string, string>) => void;
export type ControlEventHandler = (action: WsControlMessage['action']) => void;
export type ConfigEventHandler = (key: string, value: unknown) => void;
export type ConnectionEventHandler = (state: WsConnectionState) => void;
export type ErrorEventHandler = (error: Error) => void;
export type RawMessageHandler = (message: WsIncomingMessage) => void;

/** Listener map for typed events */
interface EventListeners {
  alert: Set<AlertEventHandler>;
  control: Set<ControlEventHandler>;
  config: Set<ConfigEventHandler>;
  connection: Set<ConnectionEventHandler>;
  error: Set<ErrorEventHandler>;
  message: Set<RawMessageHandler>;
}

/** WebSocket service configuration */
export interface WsServiceConfig {
  /** WebSocket server URL (ws:// or wss://) */
  url: string;

  /** Auto-reconnect on disconnect (default: true) */
  autoReconnect?: boolean;

  /** Maximum reconnection attempts (default: Infinity) */
  maxReconnectAttempts?: number;

  /** Base delay between reconnection attempts in ms (default: 1000) */
  reconnectBaseDelay?: number;

  /** Maximum reconnection delay in ms (default: 30000) */
  reconnectMaxDelay?: number;

  /** Enable heartbeat ping/pong (default: true) */
  enableHeartbeat?: boolean;

  /** Heartbeat interval in ms (default: 30000) */
  heartbeatInterval?: number;

  /** Heartbeat timeout in ms - disconnect if no pong (default: 10000) */
  heartbeatTimeout?: number;

  /** Enable event queue for sequential alert playback (default: true) */
  enableQueue?: boolean;

  /** Maximum queue size (default: 50) */
  maxQueueSize?: number;

  /** Client identifier sent on connection (default: auto-generated) */
  clientId?: string;

  /** Whether to validate event data against schemas (default: true) */
  validateEvents?: boolean;

  /** Whether to log debug messages (default: false) */
  debug?: boolean;
}

/**
 * Get the WebSocket URL based on environment
 * In production, uses relative URL (same origin)
 */
function getDefaultWsUrl(): string {
  // Check if running in production by examining window.location
  // This is more reliable than NODE_ENV which may not be set correctly at runtime
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    const port = window.location.port;
    
    // In production, the app is served from the same origin as the backend
    // If we're not on localhost or file://, use relative URL
    if (hostname !== 'localhost' && hostname !== '127.0.0.1' && protocol !== 'file:') {
      return '/ws'; // Use relative WebSocket URL in production
    }
    
    // In development, use the same port as the current window
    // This handles cases where the backend runs on a random port (e.g., Vite dev server)
    if (port && port !== '80' && port !== '443') {
      return `ws://localhost:${port}/ws`;
    }
  }
  
  // Default to localhost:3001/ws for development
  return 'ws://localhost:3001/ws';
}

/** Default configuration values */
const DEFAULT_CONFIG: Required<WsServiceConfig> = {
  url: getDefaultWsUrl(),
  autoReconnect: true,
  maxReconnectAttempts: Infinity,
  reconnectBaseDelay: 1000,
  reconnectMaxDelay: 30000,
  enableHeartbeat: true,
  heartbeatInterval: 30000,
  heartbeatTimeout: 10000,
  enableQueue: true,
  maxQueueSize: 50,
  clientId: '',
  validateEvents: true,
  debug: false,
};

/**
 * ============================================
 * WEBSOCKET SERVICE CLASS
 * ============================================
 */

export class WebSocketService {
  private config: Required<WsServiceConfig>;
  private ws: WebSocket | null = null;
  private state: WsConnectionState = 'disconnected';
  private reconnectAttempts = 0;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private heartbeatIntervalId: ReturnType<typeof setInterval> | null = null;
  private heartbeatTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private alertQueue: { event: WsAlertMessage; data: Record<string, string> }[] = [];
  private isProcessingQueue = false;
  private isPaused = false;

  /** Typed event listeners */
  private listeners: EventListeners = {
    alert: new Set(),
    control: new Set(),
    config: new Set(),
    connection: new Set(),
    error: new Set(),
    message: new Set(),
  };

  constructor(config: Partial<WsServiceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    if (!this.config.clientId) {
      // Try to get existing clientId from localStorage, or generate new one
      const storedId = localStorage.getItem('overlay-instance-id');
      if (storedId) {
        this.config.clientId = storedId;
      } else {
        this.config.clientId = `overlay-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        localStorage.setItem('overlay-instance-id', this.config.clientId);
      }
    }
  }

  // ========================================
  // PUBLIC API
  // ========================================

  /**
   * Connect to the WebSocket server
   */
  connect(): void {
    if (this.ws && (this.state === 'connected' || this.state === 'connecting')) {
      this.log('Already connected or connecting');
      return;
    }

    this.setState(this.reconnectAttempts > 0 ? 'reconnecting' : 'connecting');
    this.log(`Connecting to ${this.config.url}...`);

    try {
      this.ws = new WebSocket(this.config.url);
      this.setupWebSocket();
    } catch (err) {
      this.emitError(new Error(`Failed to create WebSocket: ${err}`));
      this.scheduleReconnect();
    }
  }

  /**
   * Disconnect from the WebSocket server
   */
  disconnect(): void {
    this.log('Disconnecting...');
    this.config.autoReconnect = false; // Prevent reconnection
    this.cleanup();
    this.setState('disconnected');
  }

  /**
   * Get current connection state
   */
  getState(): WsConnectionState {
    return this.state;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.state === 'connected';
  }

  /**
   * Get the client instance ID
   */
  getClientId(): string | undefined {
    return this.config.clientId;
  }

  /**
   * Pause alert processing (alerts still queue up)
   */
  pause(): void {
    this.isPaused = true;
    this.log('Alert processing paused');
  }

  /**
   * Resume alert processing
   */
  resume(): void {
    this.isPaused = false;
    this.log('Alert processing resumed');
    this.processNextInQueue();
  }

  /**
   * Clear the alert queue
   */
  clearQueue(): void {
    this.alertQueue = [];
    this.isProcessingQueue = false;
    this.log('Alert queue cleared');
  }

  /**
   * Skip current alert and process next
   */
  skip(): void {
    this.isProcessingQueue = false;
    this.processNextInQueue();
  }

  /**
   * Get current queue length
   */
  getQueueLength(): number {
    return this.alertQueue.length;
  }

  /**
   * Mark the current alert as completed (call after animation finishes)
   * This allows the queue to proceed to the next alert.
   */
  alertCompleted(): void {
    this.isProcessingQueue = false;
    this.processNextInQueue();
  }

  /**
   * Send a test alert event for preview purposes
   * 
   * @param eventName - The event type to test
   * @param data - Event variables
   */
  sendTestAlert(eventName: string, data: Record<string, string>): void {
    const testMessage: WsAlertMessage = {
      type: 'alert',
      eventName,
      data,
      timestamp: Date.now(),
      id: `test-${Date.now()}`,
    };

    this.handleAlertMessage(testMessage);
  }

  // ========================================
  // EVENT LISTENERS
  // ========================================

  /**
   * Listen for alert events
   * 
   * @param handler - Callback for alert events
   * @returns Unsubscribe function
   */
  onAlert(handler: AlertEventHandler): () => void {
    this.listeners.alert.add(handler);
    return () => this.listeners.alert.delete(handler);
  }

  /**
   * Listen for control messages
   * 
   * @param handler - Callback for control events
   * @returns Unsubscribe function
   */
  onControl(handler: ControlEventHandler): () => void {
    this.listeners.control.add(handler);
    return () => this.listeners.control.delete(handler);
  }

  /**
   * Listen for config updates
   * 
   * @param handler - Callback for config changes
   * @returns Unsubscribe function
   */
  onConfig(handler: ConfigEventHandler): () => void {
    this.listeners.config.add(handler);
    return () => this.listeners.config.delete(handler);
  }

  /**
   * Listen for connection state changes
   * 
   * @param handler - Callback for state changes
   * @returns Unsubscribe function
   */
  onConnection(handler: ConnectionEventHandler): () => void {
    this.listeners.connection.add(handler);
    return () => this.listeners.connection.delete(handler);
  }

  /**
   * Listen for errors
   * 
   * @param handler - Callback for errors
   * @returns Unsubscribe function
   */
  onError(handler: ErrorEventHandler): () => void {
    this.listeners.error.add(handler);
    return () => this.listeners.error.delete(handler);
  }

  /**
   * Listen for all raw incoming messages (after validation)
   * 
   * @param handler - Callback for any valid message
   * @returns Unsubscribe function
   */
  onMessage(handler: RawMessageHandler): () => void {
    this.listeners.message.add(handler);
    return () => this.listeners.message.delete(handler);
  }

  /**
   * Remove all listeners
   */
  removeAllListeners(): void {
    for (const set of Object.values(this.listeners)) {
      set.clear();
    }
  }

  // ========================================
  // PRIVATE: WebSocket Setup
  // ========================================

  private setupWebSocket(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      this.log('Connected');
      this.setState('connected');
      this.reconnectAttempts = 0;

      // Send ready message
      const readyMsg = serializeWsMessage({
        type: 'ready',
        clientId: this.config.clientId,
        capabilities: ['alert', 'control', 'config'],
        timestamp: Date.now(),
      });
      if (readyMsg && this.ws) {
        this.ws.send(readyMsg);
      }

      // Start heartbeat
      if (this.config.enableHeartbeat) {
        this.startHeartbeat();
      }
    };

    this.ws.onmessage = (event: MessageEvent) => {
      this.handleMessage(event.data);
    };

    this.ws.onclose = (event: CloseEvent) => {
      this.log(`Connection closed: code=${event.code}, reason=${event.reason}`);
      this.stopHeartbeat();

      if (this.config.autoReconnect && event.code !== 1000) {
        this.scheduleReconnect();
      } else {
        this.setState('disconnected');
      }
    };

    this.ws.onerror = () => {
      this.emitError(new Error('WebSocket connection error'));
    };
  }

  // ========================================
  // PRIVATE: Message Handling
  // ========================================

  private handleMessage(raw: string | unknown): void {
    const message = parseWsMessage(raw);
    if (!message) return;

    // Emit raw message event
    for (const handler of this.listeners.message) {
      try { handler(message); } catch (err) { console.error('[WS] Message handler error:', err); }
    }

    switch (message.type) {
      case 'alert':
        this.handleAlertMessage(message);
        break;
      case 'control':
        this.handleControlMessage(message);
        break;
      case 'config':
        this.handleConfigMessage(message);
        break;
      case 'ping':
        this.handlePing();
        break;
    }
  }

  private handleAlertMessage(message: WsAlertMessage): void {
    // Validate event-specific data via SchemaLoader if enabled
    let validatedData = message.data;
    if (this.config.validateEvents) {
      const result = validateEventData(message.eventName, message.data);
      if (!result.valid) {
        this.log(`Invalid event data for '${message.eventName}':`, result.errors);
        this.log('Using raw data as fallback');
      } else {
        validatedData = result.data;
      }
    }

    // Convert to string record for AlertRenderer
    const eventData = eventDataToRecord(validatedData);

    if (this.config.enableQueue) {
      // Add to queue
      if (this.alertQueue.length >= this.config.maxQueueSize) {
        this.log(`Queue full (${this.config.maxQueueSize}), dropping oldest alert`);
        this.alertQueue.shift();
      }
      this.alertQueue.push({ event: message, data: eventData });
      this.processNextInQueue();
    } else {
      // Dispatch immediately
      this.emitAlert(message, eventData);
    }

    // Send ACK if the event has an ID
    if (message.id) {
      this.sendAck(message.id, 'received');
    }
  }

  private handleControlMessage(message: WsControlMessage): void {
    this.log(`Control action: ${message.action}`);

    // Internal handling
    switch (message.action) {
      case 'pause':
        this.pause();
        break;
      case 'resume':
        this.resume();
        break;
      case 'clear':
        this.clearQueue();
        break;
      case 'skip':
        this.skip();
        break;
    }

    // Emit to external listeners
    for (const handler of this.listeners.control) {
      try { handler(message.action); } catch (err) { console.error('[WS] Control handler error:', err); }
    }
  }

  private handleConfigMessage(message: WsConfigMessage): void {
    this.log(`Config update: ${message.key} =`, message.value);
    for (const handler of this.listeners.config) {
      try { handler(message.key, message.value); } catch (err) { console.error('[WS] Config handler error:', err); }
    }
  }

  // ========================================
  // PRIVATE: Alert Queue
  // ========================================

  private processNextInQueue(): void {
    if (this.isPaused || this.isProcessingQueue || this.alertQueue.length === 0) {
      return;
    }

    const next = this.alertQueue.shift();
    if (!next) return;

    this.isProcessingQueue = true;
    this.emitAlert(next.event, next.data);
  }

  private emitAlert(event: WsAlertMessage, eventData: Record<string, string>): void {
    for (const handler of this.listeners.alert) {
      try {
        handler(event, eventData);
      } catch (err) {
        console.error('[WS] Alert handler error:', err);
      }
    }
  }

  // ========================================
  // PRIVATE: Heartbeat
  // ========================================

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatIntervalId = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
        
        // Set timeout for pong response
        this.heartbeatTimeoutId = setTimeout(() => {
          this.log('Heartbeat timeout - no pong received');
          this.ws?.close(4000, 'Heartbeat timeout');
        }, this.config.heartbeatTimeout);
      }
    }, this.config.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatIntervalId) {
      clearInterval(this.heartbeatIntervalId);
      this.heartbeatIntervalId = null;
    }
    if (this.heartbeatTimeoutId) {
      clearTimeout(this.heartbeatTimeoutId);
      this.heartbeatTimeoutId = null;
    }
  }

  private handlePing(): void {
    // Clear heartbeat timeout (we received activity)
    if (this.heartbeatTimeoutId) {
      clearTimeout(this.heartbeatTimeoutId);
      this.heartbeatTimeoutId = null;
    }
    // Respond with pong
    const pong = serializeWsMessage({ type: 'pong', timestamp: Date.now() });
    if (pong && this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(pong);
    }
  }

  // ========================================
  // PRIVATE: Reconnection
  // ========================================

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      this.log('Max reconnection attempts reached');
      this.setState('disconnected');
      this.emitError(new Error('Max reconnection attempts reached'));
      return;
    }

    // Exponential backoff with jitter
    const delay = Math.min(
      this.config.reconnectBaseDelay * Math.pow(2, this.reconnectAttempts) + Math.random() * 1000,
      this.config.reconnectMaxDelay
    );

    this.reconnectAttempts++;
    this.setState('reconnecting');
    this.log(`Reconnecting in ${Math.round(delay)}ms (attempt ${this.reconnectAttempts})`);

    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, delay);
  }

  // ========================================
  // PRIVATE: Helpers
  // ========================================

  private sendAck(eventId: string, status: 'received' | 'displayed' | 'completed' | 'error'): void {
    const ack = serializeWsMessage({
      type: 'ack',
      eventId,
      status,
      timestamp: Date.now(),
    });
    if (ack && this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(ack);
    }
  }

  private setState(newState: WsConnectionState): void {
    if (this.state === newState) return;
    this.state = newState;
    for (const handler of this.listeners.connection) {
      try { handler(newState); } catch (err) { console.error('[WS] Connection handler error:', err); }
    }
  }

  private emitError(error: Error): void {
    for (const handler of this.listeners.error) {
      try { handler(error); } catch (err) { console.error('[WS] Error handler error:', err); }
    }
  }

  private cleanup(): void {
    this.stopHeartbeat();

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onclose = null;
      this.ws.onerror = null;
      
      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        this.ws.close(1000, 'Client disconnect');
      }
      this.ws = null;
    }
  }

  private log(...args: unknown[]): void {
    if (this.config.debug) {
      console.log('[WebSocketService]', ...args);
    }
  }

  /**
   * Clean up all resources
   */
  destroy(): void {
    this.removeAllListeners();
    this.clearQueue();
    this.disconnect();
  }
}

/**
 * ============================================
 * SINGLETON FACTORY
 * ============================================
 */

let _instance: WebSocketService | null = null;

/**
 * Get or create the global WebSocket service instance
 * 
 * @param config - Configuration (only used on first call)
 * @returns The singleton WebSocketService instance
 */
export function getWebSocketService(config?: Partial<WsServiceConfig>): WebSocketService {
  if (!_instance) {
    _instance = new WebSocketService(config);
  }
  return _instance;
}

/**
 * Destroy the global WebSocket service instance
 */
export function destroyWebSocketService(): void {
  if (_instance) {
    _instance.destroy();
    _instance = null;
  }
}

/**
 * Create a new WebSocket service instance (non-singleton)
 * 
 * @param config - Service configuration
 * @returns New WebSocketService instance
 */
export function createWebSocketService(config?: Partial<WsServiceConfig>): WebSocketService {
  return new WebSocketService(config);
}
