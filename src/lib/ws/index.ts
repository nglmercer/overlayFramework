/**
 * WebSocket Module - Index
 * 
 * Re-exports all WebSocket schemas, types, and services.
 * Event-specific data validation is handled dynamically by the SchemaLoader.
 * 
 * @module lib/ws
 * @version 2.0.0
 */

// Message envelope schemas
export {
  WsAlertMessageSchema,
  WsControlMessageSchema,
  WsConfigMessageSchema,
  WsPingMessageSchema,
  WsPongMessageSchema,
  WsIncomingMessageSchema,
  WsReadyMessageSchema,
  WsAckMessageSchema,
  WsOutgoingMessageSchema,

  // Validation & parsing helpers
  parseWsMessage,
  validateEventData,
  serializeWsMessage,
  eventDataToRecord,

  // Schema introspection helpers (delegates to SchemaLoader)
  getRegisteredEventTypes,
  isKnownEventType,
  getRequiredFields,
  getDefaultMessage,
} from './schemas';

// Message types
export type {
  WsAlertMessage,
  WsControlMessage,
  WsConfigMessage,
  WsPingMessage,
  WsPongMessage,
  WsIncomingMessage,
  WsReadyMessage,
  WsAckMessage,
  WsOutgoingMessage,
} from './schemas';

// WebSocket service
export {
  WebSocketService,
  getWebSocketService,
  destroyWebSocketService,
  createWebSocketService,
} from './WebSocketService';

export type {
  WsConnectionState,
  WsServiceConfig,
  AlertEventHandler,
  ControlEventHandler,
  ConfigEventHandler,
  ConnectionEventHandler,
  ErrorEventHandler,
  RawMessageHandler,
} from './WebSocketService';
