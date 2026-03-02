/**
 * Alert View Component
 * 
 * Renders alert variants using the core AlertRenderer.
 * Handles preview playback, content updates, and real-time
 * WebSocket event integration for live alert display.
 * 
 * When `wsUrl` is provided, the component connects to a WebSocket
 * server and automatically plays alerts when matching events arrive.
 * 
 * @module components/AlertView
 * @version 2.1.0
 */

import { html, css, LitElement } from 'lit';
import { Component, property, query, state } from '../litcomponents';
import { AlertVariant } from '../lib/db';
import { 
  AlertRenderer, 
  AlertConfig, 
  createAlertRenderer, 
  variantToAlertConfig,
  createAlertConfig,
} from '../core/alertRenderer';

import { 
  WebSocketService, 
  createWebSocketService,
  WsAlertMessage,
  WsConnectionState,
} from '../lib/ws';

// Import platform events for matching
import { getPlatformEventById } from '../lib/alertEvents';

// Import constants for default values
import { CONFIG } from '../lib/constants';

// Import config helpers
import { getWebSocketUrl, getBackendUrl } from '../lib/config';

@Component('app-alert-view')
export class AppAlertView extends LitElement {
  /** The alert variant to render/preview */
  @property({ type: Object }) variant?: AlertVariant;

  /** Event data for variable replacement (manual mode) */
  @property({ type: Object }) eventData: Record<string, string> = {};

  /** WebSocket server URL - set to enable live mode */
  @property({ type: String }) wsUrl?: string;

  /** Get the effective WebSocket URL (defaults to backend URL if not specified) */
  public get effectiveWsUrl(): string {
    return this.wsUrl || getWebSocketUrl();
  }

  /** Automatically connect to WS on mount (default: true) */
  @property({ type: Boolean }) wsAutoConnect: boolean = true;

  /** Enable debug logging for WS (default: false) */
  @property({ type: Boolean }) wsDebug: boolean = false;

  /** BroadcastChannel name for cross-tab communication */
  @property({ type: String }) channelName?: string;

  /** Current WS connection state (reactive) */
  @state() private connectionState: WsConnectionState = 'disconnected';

  /** Current connection type: 'websocket' | 'broadcast' | 'none' */
  @state() private connectionType: 'websocket' | 'broadcast' | 'none' = 'none';

  /** Current queue length */
  @state() private queueLength: number = 0;

  // Query for the renderer container
  @query('.alert-container') private containerRef!: HTMLDivElement;

  // AlertRenderer instance from core library
  private alertRenderer?: AlertRenderer;

  // WebSocket service instance
  private wsService?: WebSocketService;

  // BroadcastChannel for cross-tab communication
  private broadcastChannel?: BroadcastChannel;

  // Unsubscribe functions for WS listeners
  private wsUnsubscribers: (() => void)[] = [];

  static styles = css`
    :host {
      display: block;
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }

    .hidden { opacity: 0; pointer-events: none; }
  `;

  // ========================================
  // PUBLIC API
  // ========================================

  /** Trigger a preview playback of the current variant */
  public async playPreview() {
    if (!this.variant || !this.alertRenderer) return;
    
    // Build config and play preview using the core renderer
    const config = this.buildAlertConfig();
    await this.alertRenderer.playPreview(config);
  }

  /** 
   * Connect to WebSocket server manually 
   * (use when wsAutoConnect is false)
   */
  public connectWs(): void {
    this.initWebSocket();
  }

  /** Disconnect from WebSocket server */
  public disconnectWs(): void {
    this.cleanupWebSocket();
  }

  /** Get the WebSocket service instance for advanced usage */
  public getWsService(): WebSocketService | undefined {
    return this.wsService;
  }

  /**
   * Get current connection information
   * 
   * @returns Object with connection type, WebSocket state, and other diagnostics
   */
  public getConnectionInfo(): {
    type: 'websocket' | 'broadcast' | 'none';
    wsState: WsConnectionState;
    wsUrl: string | null;
    wsConnected: boolean;
    broadcastConnected: boolean;
    channelName: string | undefined;
  } {
    return {
      type: this.connectionType,
      wsState: this.connectionState,
      wsUrl: this.wsService ? this.effectiveWsUrl : null,
      wsConnected: this.connectionState === 'connected',
      broadcastConnected: !!this.broadcastChannel,
      channelName: this.channelName,
    };
  }

  /**
   * Check if connected to WebSocket
   */
  public get isWsConnected(): boolean {
    return this.connectionState === 'connected';
  }

  /**
   * Check if connected to BroadcastChannel
   */
  public get isBroadcastConnected(): boolean {
    return !!this.broadcastChannel;
  }

  /**
   * Check if any connection is active
   */
   public get isConnected(): boolean {
    return this.connectionType !== 'none';
  }

  /**
   * Send a test alert event (useful for previewing from external code)
   * 
   * @param eventName - The event type (e.g., 'seguimientos', 'bits')
   * @param data - Event variables (e.g., { username: 'viewer123' })
   */
  public sendTestAlert(eventName: string, data: Record<string, string>): void {
    if (this.wsService) {
      this.wsService.sendTestAlert(eventName, data);
    } else {
      // Direct dispatch without WS
      this.handleWsAlert(
        { type: 'alert', eventName, data, timestamp: Date.now(), id: `test-${Date.now()}` },
        data
      );
    }
  }

  /** Mark the current alert as completed (signals queue to advance) */
  public alertCompleted(): void {
    this.wsService?.alertCompleted();
  }

  /**
   * Emit an alert via BroadcastChannel to notify other tabs
   * 
   * @param eventName - The event type (e.g., 'seguimientos', 'bits')
   * @param data - Event variables (e.g., { username: 'viewer123' })
   */
  public emitAlert(eventName: string, data: Record<string, string>): void {
    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage({
        type: 'alert',
        eventName,
        data,
        timestamp: Date.now(),
      });
      console.log('[AlertView] Alert emitted via BroadcastChannel:', eventName);
    } else {
      // Direct handling if no BroadcastChannel
      this.handleWsAlert(
        { type: 'alert', eventName, data, timestamp: Date.now(), id: `emit-${Date.now()}` },
        data
      );
    }
  }

  // ========================================
  // LIFECYCLE
  // ========================================

  firstUpdated() {
    this.updateContent();
    
    // Initialize communication - prefer BroadcastChannel if available
    if (this.channelName) {
      this.initBroadcastChannel();
    }
    
    // Connect to WebSocket if URL is provided OR use default backend WebSocket
    if (this.wsUrl || getWebSocketUrl()) {
      if (!this.broadcastChannel && this.wsAutoConnect) {
        this.initWebSocket();
      }
    }
  }

  /**
   * Initialize BroadcastChannel for cross-tab communication
   */
  private initBroadcastChannel(): void {
    if (!this.channelName) return;
    
    // Check if BroadcastChannel is supported
    if (typeof BroadcastChannel === 'undefined') {
      console.warn('[AlertView] BroadcastChannel not supported, falling back to WebSocket');
      // Fall back to WebSocket if available
      if (getWebSocketUrl()) {
        this.initWebSocket();
      }
      return;
    }

    // Cleanup existing channel
    this.cleanupBroadcastChannel();

    try {
      this.broadcastChannel = new BroadcastChannel(this.channelName);
      
      this.broadcastChannel.onmessage = (event) => {
        this.handleBroadcastMessage(event.data);
      };
      
      this.connectionState = 'connected';
      this.connectionType = 'broadcast';
      console.log('[AlertView] Connected to BroadcastChannel:', this.channelName);
      
      // Dispatch connection event
      this.dispatchEvent(new CustomEvent('ws-connection-change', {
        detail: { state: 'connected', type: 'broadcast' },
        bubbles: true,
        composed: true,
      }));
    } catch (error) {
      console.error('[AlertView] Failed to create BroadcastChannel:', error);
      // Fall back to WebSocket
      if (getWebSocketUrl()) {
        this.initWebSocket();
      }
    }
  }

  /**
   * Handle incoming BroadcastChannel message
   */
  private handleBroadcastMessage(data: { type: string; eventName?: string; data?: Record<string, string>; timestamp?: number }): void {
    if (data.type === 'alert') {
      const eventData = data.data || {};
      const event = {
        type: 'alert',
        eventName: data.eventName || '',
        data: eventData,
        timestamp: data.timestamp || Date.now(),
        id: `bc-${Date.now()}`
      };
      
      this.handleWsAlert(event as WsAlertMessage, eventData);
      
      // Dispatch event for external listeners
      this.dispatchEvent(new CustomEvent('ws-alert', {
        detail: { event, eventData },
        bubbles: true,
        composed: true,
      }));
    }
  }

  /**
   * Cleanup BroadcastChannel
   */
  private cleanupBroadcastChannel(): void {
    if (this.broadcastChannel) {
      this.broadcastChannel.close();
      this.broadcastChannel = undefined;
    }
  }

  updated(changedProperties: Map<string, unknown>) {
    if (changedProperties.has('variant') || changedProperties.has('eventData')) {
      this.updateContent();
    }
    
    // Handle wsUrl changes or auto-connect to default WebSocket
    if (changedProperties.has('wsUrl')) {
      this.cleanupWebSocket();
      if (this.wsUrl && this.wsAutoConnect) {
        this.initWebSocket();
      } else if (!this.wsUrl && getWebSocketUrl() && this.wsAutoConnect && !this.broadcastChannel) {
        // Auto-connect to default WebSocket if no explicit URL provided
        this.initWebSocket();
      }
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.cleanupWebSocket();
    this.cleanupBroadcastChannel();
    if (this.alertRenderer) {
      this.alertRenderer.destroy();
      this.alertRenderer = undefined;
    }
  }

  // ========================================
  // PRIVATE: WebSocket Integration
  // ========================================

  /**
   * Initialize WebSocket service and set up event listeners
   */
  private initWebSocket(): void {
    if (!this.wsUrl && !getWebSocketUrl()) return;

    // Cleanup existing connection
    this.cleanupWebSocket();

    this.wsService = createWebSocketService({
      url: this.effectiveWsUrl,
      autoReconnect: true,
      enableQueue: true,
      debug: this.wsDebug,
      validateEvents: true,
    });

    // Subscribe to alert events
    this.wsUnsubscribers.push(
      this.wsService.onAlert((event, eventData) => {
        this.handleWsAlert(event, eventData);
      })
    );

    // Subscribe to connection state changes
    this.wsUnsubscribers.push(
      this.wsService.onConnection((state) => {
        this.connectionState = state;
        this.connectionType = state === 'connected' ? 'websocket' : this.connectionType;
        this.dispatchEvent(new CustomEvent('ws-connection-change', {
          detail: { state },
          bubbles: true,
          composed: true,
        }));
      })
    );

    // Subscribe to control events  
    this.wsUnsubscribers.push(
      this.wsService.onControl((action) => {
        this.handleWsControl(action);
        this.dispatchEvent(new CustomEvent('ws-control', {
          detail: { action },
          bubbles: true,
          composed: true,
        }));
      })
    );

    // Subscribe to errors
    this.wsUnsubscribers.push(
      this.wsService.onError((error) => {
        console.error('[AlertView WS Error]', error);
        this.dispatchEvent(new CustomEvent('ws-error', {
          detail: { error },
          bubbles: true,
          composed: true,
        }));
      })
    );

    // Connect
    this.wsService.connect();
  }

  /**
   * Handle an incoming alert event from WebSocket
   */
  private handleWsAlert(event: WsAlertMessage, eventData: Record<string, string>): void {
    // Update queue length reactively
    this.queueLength = this.wsService?.getQueueLength() ?? 0;

    // Check if we have a matching variant for this event type
    if (this.variant && this.variant.type === event.eventName) {
      // Use the existing variant with the incoming event data
      this.eventData = eventData;
      this.updateContent();
      
      // Auto-play the alert
      if (this.alertRenderer) {
        const config = this.buildAlertConfig(eventData);
        this.alertRenderer.playPreview(config).then(() => {
          // Mark completed so the queue advances
          this.wsService?.alertCompleted();
          this.queueLength = this.wsService?.getQueueLength() ?? 0;

          // Dispatch event for external listeners
          this.dispatchEvent(new CustomEvent('alert-completed', {
            detail: { eventName: event.eventName, eventId: event.id },
            bubbles: true,
            composed: true,
          }));
        });
      }
    }

    // Always dispatch the event for external handling
    this.dispatchEvent(new CustomEvent('ws-alert', {
      detail: { event, eventData },
      bubbles: true,
      composed: true,
    }));
  }

  /**
   * Handle control actions from WebSocket
   */
  private handleWsControl(action: string): void {
    switch (action) {
      case 'clear':
        if (this.alertRenderer) {
          this.alertRenderer.stop();
        }
        break;
      case 'skip':
        if (this.alertRenderer) {
          this.alertRenderer.stop();
        }
        // Queue skip is handled by WebSocketService
        break;
      case 'mute':
        if (this.alertRenderer) {
          this.alertRenderer.stopSound();
        }
        break;
    }
  }

  /**
   * Clean up WebSocket service and listeners
   */
  private cleanupWebSocket(): void {
    // Unsubscribe all listeners
    for (const unsub of this.wsUnsubscribers) {
      unsub();
    }
    this.wsUnsubscribers = [];

    // Destroy WS service
    if (this.wsService) {
      this.wsService.destroy();
      this.wsService = undefined;
    }

    this.connectionState = 'disconnected';
    this.queueLength = 0;
  }

  // ========================================
  // PRIVATE: Rendering
  // ========================================

  /**
   * Build AlertConfig from variant using core library mapper
   */
  private buildAlertConfig(overrideEventData?: Record<string, string>): AlertConfig {
    const containerWidth = CONFIG.PREVIEW.DEFAULT_SIZE;
    const containerHeight = CONFIG.PREVIEW.DEFAULT_SIZE;
    
    if (!this.variant) {
      return createAlertConfig({}, { containerWidth, containerHeight });
    }
    
    // Use the core library mapper for proper type-safe conversion
    return variantToAlertConfig(
      this.variant, 
      overrideEventData ?? this.eventData,
      { containerWidth, containerHeight }
    );
  }

  /**
   * Update content - delegates to core AlertRenderer
   */
  private updateContent() {
    const container = this.containerRef;
    if (!this.variant || !container) return;
    
    // Initialize AlertRenderer if not already done
    if (!this.alertRenderer) {
      this.alertRenderer = createAlertRenderer(container);
    }
    
    // Build alert config and render - core handles all styling
    const config = this.buildAlertConfig();
    this.alertRenderer.render(config);
  }

  render() {
    if (!this.variant) return html``;
    
    // Container that AlertRenderer will populate
    return html`
      <div class="alert-container"></div>
    `;
  }
}

