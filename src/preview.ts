import { 
  AlertRenderer, 
  AlertConfig, 
  createAlertRenderer, 
  variantToAlertConfig,
  createAlertConfig,
} from './core/alertRenderer';
import { getWebSocketUrl, getBackendUrl } from './lib/config';
import { CONFIG, EVENTS } from './lib/constants';

// Types for messages
interface AlertMessage {
  type: 'alert';
  eventName: string;
  data: Record<string, string>;
  timestamp: number;
  id: string;
  target?: {
    id?: string;
    name?: string;
    random?: boolean;
    first?: boolean;
    instanceId?: string;
  };
}

interface WindowMessage {
  type: string;
  payload?: unknown;
}



const root = document.getElementById('render-root');

if (root) {
  const alertRenderer = createAlertRenderer(root);
  console.log('[Preview] AlertRenderer initialized');

  // Store all variants for matching against events
  let allVariants: Record<string, unknown>[] = [];
  let currentVariant: Record<string, unknown> | null = null;
  let currentEventData: Record<string, string> = {};

  // Instance ID for this preview (persisted in localStorage)
  let instanceId: string = localStorage.getItem('overlay-instance-id') || 
    `overlay-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  localStorage.setItem('overlay-instance-id', instanceId);

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
        // Send ready message with clientId
        ws?.send(JSON.stringify({
          type: 'ready',
          clientId: instanceId
        }));
        // Notify parent of connection state change
        window.parent.postMessage({ 
          type: EVENTS.COMPONENT.WS_CONNECTION_CHANGE, 
          payload: { state: 'connected', type: 'websocket' } 
        }, '*');
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === EVENTS.COMPONENT.ALERT) {
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
          type: EVENTS.COMPONENT.WS_CONNECTION_CHANGE, 
          payload: { state: 'disconnected', type: 'websocket' } 
        }, '*');
        // Auto-reconnect after 3 seconds
        wsReconnectTimeout = setTimeout(connectWebSocket, 3001);
      };

      ws.onerror = (error) => {
        console.error('[Preview] WebSocket error:', error);
        window.parent.postMessage({ 
          type: EVENTS.COMPONENT.WS_CONNECTION_ERROR, 
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
        if (event.data && event.data.type === EVENTS.COMPONENT.ALERT) {
          handleAlertMessage(event.data as AlertMessage);
        } else if (event.data && event.data.type === EVENTS.WINDOW.UPDATE_VARIANT) {
          const { variant, variants, eventData } = event.data.payload as any;
          console.log('[Preview] UPDATE received via BroadcastChannel:', { 
            variantType: variant?.type, 
            variantsCount: variants?.length 
          });
          
          if (variants) {
            updateVariants(variants);
          }
          if (variant) {
            updateVariant(variant, eventData);
          }
        }
      };
      console.log('[Preview] BroadcastChannel connected:', CHANNEL_NAME);
      
      // Notify parent of connection state change
      window.parent.postMessage({ 
        type: EVENTS.COMPONENT.WS_CONNECTION_CHANGE, 
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
    console.log('[Preview] Alert received:', message.eventName, message.data, message.target);

    // Extract target from message if present
    const target = (message as any).target;
    
    // Match the incoming alert to one of our variants
    const targetVariant = findMatchingVariant(message.eventName, message.data, target);
    
    if (targetVariant) {
      try {
        const config = variantToAlertConfig(
          targetVariant as Parameters<typeof variantToAlertConfig>[0],
          message.data,
          { containerWidth: CONFIG.PREVIEW.DEFAULT_SIZE, containerHeight: CONFIG.PREVIEW.DEFAULT_SIZE }
        );
        
        // Play the entrance animation
        alertRenderer.playPreview(config);
        console.log(`[Preview] Alert rendered with variant: ${targetVariant.name || targetVariant.id}`);
      } catch (error) {
        console.error('[Preview] Failed to render alert:', error);
      }
    } else {
      console.warn(`[Preview] No matching variant found for event: ${message.eventName}`);
    }

    // Dispatch custom event for external listeners
    window.dispatchEvent(new CustomEvent('preview-alert', {
      detail: { eventName: message.eventName, data: message.data, id: message.id }
    }));

    // Forward to parent via postMessage
    window.parent.postMessage({
      type: EVENTS.COMPONENT.ALERT,
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
   * Find the best matching variant for an event
   * @param eventName - The event type to match
   * @param data - The event data (may contain target info)
   * @param target - Optional target filter (id, name, random, first)
   */
  function findMatchingVariant(eventName: string, data: Record<string, string>, target?: { id?: string; name?: string; random?: boolean; first?: boolean; instanceId?: string }): Record<string, unknown> | null {
    // 1. Filter variants by event type
    let potentialVariants = allVariants.filter(v => v.type === eventName);
    
    if (potentialVariants.length === 0) {
      // If no variants for this type, fallback to currentVariant if it matches
      if (currentVariant && currentVariant.type === eventName) return currentVariant;
      return null;
    }
    
    // 2. Apply target filter if provided
    if (target) {
      // Filter by ID
      if (target.id) {
        const found = potentialVariants.find(v => v.id === target.id);
        if (found) return found;
        console.warn(`[Preview] Target ID "${target.id}" not found in variants`);
      }
      
      // Filter by name
      if (target.name) {
        const found = potentialVariants.find(v => v.name === target.name);
        if (found) return found;
        console.warn(`[Preview] Target name "${target.name}" not found in variants`);
      }
      
      // Random selection
      if (target.random && potentialVariants.length > 0) {
        const randomIndex = Math.floor(Math.random() * potentialVariants.length);
        return potentialVariants[randomIndex];
      }
      
      // First variant
      if (target.first && potentialVariants.length > 0) {
        return potentialVariants[0];
      }
      
      // Instance ID filtering is handled at server level, not needed here
      // The server sends only to the targeted instance
    }
    
    // 3. If only one variant for this type, use it
    if (potentialVariants.length === 1) return potentialVariants[0];
    
    // 4. If multiple variants and no target specified, return first active one or first one
    return potentialVariants.find(v => v.active !== false) || potentialVariants[0];
  }

  /**
   * Update the collection of all variants
   */
  function updateVariants(variants: Record<string, unknown>[]): void {
    if (!Array.isArray(variants)) return;
    allVariants = variants;
    console.log('[Preview] updateVariants: Store updated with', variants.length, 'variants');
  }

  /**
   * Update the variant to render (legacy/active selection)
   */
  function updateVariant(variant: Record<string, unknown>, eventData?: Record<string, string>): void {
    currentVariant = variant;
    currentEventData = eventData || {};
    
    // Also add to allVariants if not present
    if (variant && variant.id) {
      const exists = allVariants.find(v => v.id === variant.id);
      if (!exists) {
        allVariants.push(variant);
      } else {
        // Update existing item in the collection
        allVariants = allVariants.map(v => v.id === variant.id ? variant : v);
      }
    }
    
    console.log('[Preview] updateVariant called:', { 
      variantType: variant?.type, 
      message: variant?.message,
      eventData: currentEventData 
    });
    
    try {
      // Convert variant to AlertConfig using the core library
      const config = variantToAlertConfig(
        variant as Parameters<typeof variantToAlertConfig>[0],
        currentEventData,
        { containerWidth: CONFIG.PREVIEW.DEFAULT_SIZE, containerHeight: CONFIG.PREVIEW.DEFAULT_SIZE }
      );
      
      alertRenderer.render(config);
      console.log('[Preview] Current variant rendered');
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
  function sendTestAlert(eventName: string, data: Record<string, string>, target?: { id?: string; name?: string; random?: boolean; first?: boolean }): void {
    // Create alert message
    const message: AlertMessage = {
      type: EVENTS.COMPONENT.ALERT,
      eventName,
      data,
      timestamp: Date.now(),
      id: `test-${Date.now()}`,
      target
    };
    
    // Send via BroadcastChannel (same browser tabs)
    if (broadcastChannel) {
      broadcastChannel.postMessage(message);
      console.log('[Preview] Test alert sent via BroadcastChannel:', eventName, { target });
    }
    
    // Also handle locally
    handleAlertMessage(message);
    
    // Send via WebSocket to backend for broadcasting to all clients
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: EVENTS.COMPONENT.ALERT,
        eventName,
        data,
        timestamp: Date.now(),
        id: `ws-test-${Date.now()}`,
        target
      }));
      console.log('[Preview] Test alert sent via WebSocket:', eventName, { target });
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

    if (type === EVENTS.WINDOW.UPDATE_VARIANT) {
      // Update variant and optional event data
      const { variant, variants, eventData } = payload as any;
      console.log('[Preview] UPDATE_VARIANT received:', { 
        variantType: variant?.type, 
        variantsCount: variants?.length 
      });

      if (variants) {
        updateVariants(variants);
      }
      
      if (variant) {
        updateVariant(variant, eventData);
      }

      // Broadcast to other tabs (standalone preview)
      if (broadcastChannel) {
        broadcastChannel.postMessage({ type: EVENTS.WINDOW.UPDATE_VARIANT, payload });
      }
    }
    else if (type === EVENTS.WINDOW.PLAY_PREVIEW) {
      // Trigger animation replay if we have a variant
      playPreview();
    }
    else if (type === EVENTS.WINDOW.CONNECT_WS) {
      connectWebSocket();
    }
    else if (type === EVENTS.WINDOW.DISCONNECT_WS) {
      disconnectWebSocket();
    }
    else if (type === EVENTS.WINDOW.SEND_TEST_ALERT) {
      // Send test alert with event name, data, and optional target
      const { eventName, data, target } = payload as { eventName: string; data: Record<string, string>; target?: { id?: string; name?: string; random?: boolean; first?: boolean } };
      sendTestAlert(eventName, data, target);
    }
    else if (type === EVENTS.WINDOW.EMIT_ALERT) {
      // Emit alert (alias)
      const { eventName, data } = payload as { eventName: string; data: Record<string, string> };
      emitAlert(eventName, data);
    }
    else if (type === EVENTS.WINDOW.GET_CONNECTION_INFO) {
      // Send connection info back to parent
      window.parent.postMessage({
        type: EVENTS.COMPONENT.CONNECTION_INFO,
        payload: getConnectionInfo()
      }, '*');
    }
  });

  // Initialize connections
  initBroadcastChannel();
  connectWebSocket();

  // Check if opened standalone with overlay ID in query params
  async function loadOverlayFromParams(): Promise<void> {
    const urlParams = new URLSearchParams(window.location.search);
    const overlayId = urlParams.get('id');
    
    if (overlayId) {
      console.log('[Preview] Loading overlay from params:', overlayId);
      try {
        const backendUrl = getBackendUrl();
        const response = await fetch(`${backendUrl}/webhook/overlay/${overlayId}`);
        if (response.ok) {
          const result = await response.json();
          if (result.data) {
            // Load all variants if available
            if (Array.isArray(result.data.variants)) {
              updateVariants(result.data.variants);
            }

            if (result.data.variant) {
              // Provide default dummy data for initial render
              const defaultTestData = { 
                username: 'Viewer', 
                amount: '1000', 
                months: '1', 
                message: '¡Gracias por el apoyo!' 
              };
              
              updateVariant(result.data.variant, defaultTestData);
              // Auto-play preview when loaded from params
              setTimeout(() => playPreview(), 500);
            }
          }
        } else {
          console.error('[Preview] Failed to load overlay:', response.status);
        }
      } catch (error) {
        console.error('[Preview] Error loading overlay:', error);
      }
    }
  }

  // Load overlay if ID provided in URL (for OBS/external usage)
  loadOverlayFromParams();

  // Signal that we are ready
  window.parent.postMessage({ type: EVENTS.WINDOW.PREVIEW_READY }, '*');
  console.log('[Preview] Ready - Connection info:', getConnectionInfo());
}
