import { 
  AlertRenderer, 
  AlertConfig, 
  createAlertRenderer, 
  variantToAlertConfig,
  createAlertConfig,
} from './core/alertRenderer';
import { getWebSocketUrl } from './lib/config';
import { CONFIG } from './lib/constants';

// Types for messages
interface AlertMessage {
  type: 'alert';
  eventName: string;
  data: Record<string, string>;
  timestamp: number;
  id: string;
}

interface WindowMessage {
  type: string;
  payload?: unknown;
}

interface VariantPayload {
  variant: Record<string, unknown>;
  eventData?: Record<string, string>;
}

const root = document.getElementById('render-root');

if (root) {
  const alertRenderer = createAlertRenderer(root);
  console.log('[Preview] AlertRenderer initialized');

  // Store current variant and config for replay
  let currentVariant: Record<string, unknown> | null = null;
  let currentEventData: Record<string, string> = {};

  // WebSocket service reference
  let ws: WebSocket | null = null;
  let wsReconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  let wsUrl: string | null = null;

  // BroadcastChannel reference
  let broadcastChannel: BroadcastChannel | null = null;
  const CHANNEL_NAME = 'overlay-alerts';

  /**
   * Connect to WebSocket server for real-time alerts
   */
  function connectWebSocket(): void {
    if (ws) return;

    wsUrl = getWebSocketUrl();
    console.log('[Preview] Connecting to WebSocket:', wsUrl);

    try {
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('[Preview] WebSocket connected');
        // Notify parent of connection state change
        window.parent.postMessage({ 
          type: 'connection-change', 
          payload: { state: 'connected', type: 'websocket' } 
        }, '*');
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'alert') {
            handleAlertMessage(message as AlertMessage);
          }
        } catch (err) {
          console.error('[Preview] Failed to parse WS message:', err);
        }
      };

      ws.onclose = () => {
        console.log('[Preview] WebSocket disconnected');
        ws = null;
        // Notify parent of connection state change
        window.parent.postMessage({ 
          type: 'connection-change', 
          payload: { state: 'disconnected', type: 'websocket' } 
        }, '*');
        // Auto-reconnect after 3 seconds
        wsReconnectTimeout = setTimeout(connectWebSocket, 3000);
      };

      ws.onerror = (error) => {
        console.error('[Preview] WebSocket error:', error);
        window.parent.postMessage({ 
          type: 'connection-error', 
          payload: { error: 'WebSocket error' } 
        }, '*');
      };
    } catch (err) {
      console.error('[Preview] Failed to create WebSocket:', err);
    }
  }

  /**
   * Disconnect from WebSocket
   */
  function disconnectWebSocket(): void {
    if (wsReconnectTimeout) {
      clearTimeout(wsReconnectTimeout);
      wsReconnectTimeout = null;
    }
    if (ws) {
      ws.close();
      ws = null;
    }
  }

  /**
   * Initialize BroadcastChannel for cross-tab communication
   */
  function initBroadcastChannel(): void {
    if (typeof BroadcastChannel === 'undefined') {
      console.log('[Preview] BroadcastChannel not supported');
      return;
    }

    try {
      broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
      broadcastChannel.onmessage = (event) => {
        if (event.data && event.data.type === 'alert') {
          handleAlertMessage(event.data as AlertMessage);
        }
      };
      console.log('[Preview] BroadcastChannel connected:', CHANNEL_NAME);
      
      // Notify parent of connection state change
      window.parent.postMessage({ 
        type: 'connection-change', 
        payload: { state: 'connected', type: 'broadcast' } 
      }, '*');
    } catch (err) {
      console.error('[Preview] Failed to create BroadcastChannel:', err);
    }
  }

  /**
   * Cleanup BroadcastChannel
   */
  function cleanupBroadcastChannel(): void {
    if (broadcastChannel) {
      broadcastChannel.close();
      broadcastChannel = null;
    }
  }

  /**
   * Handle incoming alert message
   */
  function handleAlertMessage(message: AlertMessage): void {
    console.log('[Preview] Alert received:', message.eventName, message.data);

    // Dispatch custom event for external listeners
    window.dispatchEvent(new CustomEvent('preview-alert', {
      detail: { eventName: message.eventName, data: message.data, id: message.id }
    }));

    // Forward to parent via postMessage
    window.parent.postMessage({
      type: 'alert',
      payload: { eventName: message.eventName, data: message.data, id: message.id }
    }, '*');
  }

  /**
   * Get connection info for diagnostics
   */
  function getConnectionInfo(): { type: string; wsConnected: boolean; broadcastConnected: boolean } {
    return {
      type: ws ? 'websocket' : (broadcastChannel ? 'broadcast' : 'none'),
      wsConnected: ws?.readyState === WebSocket.OPEN,
      broadcastConnected: !!broadcastChannel,
    };
  }

  /**
   * Update the variant to render using AlertRenderer
   */
  function updateVariant(variant: Record<string, unknown>, eventData?: Record<string, string>): void {
    currentVariant = variant;
    currentEventData = eventData || {};
    
    console.log('[Preview] updateVariant called:', { 
      variantType: variant?.type, 
      message: variant?.message,
      imageUrl: variant?.imageUrl,
      eventData: currentEventData 
    });
    
    try {
      // Convert variant to AlertConfig using the core library
      const config = variantToAlertConfig(
        variant as Parameters<typeof variantToAlertConfig>[0],
        currentEventData,
        { containerWidth: CONFIG.PREVIEW.DEFAULT_SIZE, containerHeight: CONFIG.PREVIEW.DEFAULT_SIZE }
      );
      
      console.log('[Preview] AlertConfig created:', { 
        message: config.message, 
        imageUrl: config.imageUrl 
      });
      
      alertRenderer.render(config);
      console.log('[Preview] Variant rendered');
    } catch (error) {
      console.error('[Preview] Failed to render variant:', error);
    }
  }

  /**
   * Play/render the current variant (replay animation)
   */
  function playPreview(): void {
    if (currentVariant) {
      try {
        const config = variantToAlertConfig(
          currentVariant as Parameters<typeof variantToAlertConfig>[0],
          currentEventData,
          { containerWidth: CONFIG.PREVIEW.DEFAULT_SIZE, containerHeight: CONFIG.PREVIEW.DEFAULT_SIZE }
        );
        
        alertRenderer.playPreview(config);
        console.log('[Preview] Playing preview');
      } catch (error) {
        console.error('[Preview] Failed to play preview:', error);
      }
    } else {
      console.warn('[Preview] No variant to play');
    }
  }

  /**
   * Send a test alert via BroadcastChannel (for cross-tab testing)
   */
  function sendTestAlert(eventName: string, data: Record<string, string>): void {
    if (broadcastChannel) {
      broadcastChannel.postMessage({
        type: 'alert',
        eventName,
        data,
        timestamp: Date.now(),
      });
      console.log('[Preview] Test alert sent via BroadcastChannel:', eventName);
    } else {
      // Direct handling if no BroadcastChannel
      handleAlertMessage({
        type: 'alert',
        eventName,
        data,
        timestamp: Date.now(),
        id: `test-${Date.now()}`
      });
    }
  }

  /**
   * Emit an alert (alias for sendTestAlert for API compatibility)
   */
  function emitAlert(eventName: string, data: Record<string, string>): void {
    sendTestAlert(eventName, data);
  }

  // Expose API globally for debugging and parent communication
  const previewApi = {
    updateVariant,
    playPreview,
    connectWebSocket,
    disconnectWebSocket,
    sendTestAlert,
    emitAlert,
    getConnectionInfo,
  };
  (window as unknown as { previewApi: typeof previewApi }).previewApi = previewApi;

  // Listen for messages from the dashboard/editor
  window.addEventListener('message', (event: MessageEvent<WindowMessage>) => {
    // Validate origin in production, but allow all for development
    console.log('[Preview] Message received:', event.data);
    const { type, payload } = event.data;

    if (type === 'UPDATE_VARIANT') {
      // Update variant and optional event data
      const { variant, eventData } = payload as VariantPayload;
      console.log('[Preview] UPDATE_VARIANT received:', { variantType: variant?.type, eventData });
      updateVariant(variant, eventData);
    }
    else if (type === 'play-preview') {
      // Trigger animation replay if we have a variant
      playPreview();
    }
    else if (type === 'connect-ws') {
      connectWebSocket();
    }
    else if (type === 'disconnect-ws') {
      disconnectWebSocket();
    }
    else if (type === 'send-test-alert') {
      // Send test alert with event name and data
      const { eventName, data } = payload as { eventName: string; data: Record<string, string> };
      sendTestAlert(eventName, data);
    }
    else if (type === 'emit-alert') {
      // Emit alert (alias)
      const { eventName, data } = payload as { eventName: string; data: Record<string, string> };
      emitAlert(eventName, data);
    }
    else if (type === 'get-connection-info') {
      // Send connection info back to parent
      window.parent.postMessage({
        type: 'connection-info',
        payload: getConnectionInfo()
      }, '*');
    }
  });

  // Initialize connections
  initBroadcastChannel();
  connectWebSocket();

  // Signal that we are ready
  window.parent.postMessage({ type: 'PREVIEW_READY' }, '*');
  console.log('[Preview] Ready - Connection info:', getConnectionInfo());
}
