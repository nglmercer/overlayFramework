/**
 * Constants and Enums for the Overlay Backend Server
 * 
 * Centralizes all magic strings, paths, and configuration values
 * to eliminate hardcoded values throughout the codebase.
 * 
 * @module backend/src/constants
 * @version 1.0.0
 */

// ============================================================================
// ENVIRONMENT VARIABLES
// ============================================================================

export const Env = {
  PORT: 'PORT',
  WEBHOOK_SECRET: 'WEBHOOK_SECRET',
  HEARTBEAT_MS: 'HEARTBEAT_MS',
  MEDIA_UPLOAD_API_URL: 'MEDIA_UPLOAD_API_URL',
} as const;

// ============================================================================
// SERVER CONFIGURATION DEFAULTS
// ============================================================================

export const ServerConfig = {
  DEFAULT_PORT: 3001,
  DEFAULT_HEARTBEAT_MS: 30000,
  WS_MAX_PAYLOAD_LENGTH: 1024 * 1024, // 1MB
  WS_IDLE_TIMEOUT: 60, // seconds
} as const;

// ============================================================================
// HTTP METHODS
// ============================================================================

export const HttpMethod = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  DELETE: 'DELETE',
  PATCH: 'PATCH',
  HEAD: 'HEAD',
  OPTIONS: 'OPTIONS',
} as const;

// ============================================================================
// HTTP HEADERS
// ============================================================================

export const HttpHeader = {
  CONTENT_TYPE: 'Content-Type',
  ACCESS_CONTROL_ALLOW_ORIGIN: 'Access-Control-Allow-Origin',
  CACHE_CONTROL: 'Cache-Control',
} as const;

// ============================================================================
// CONTENT TYPES
// ============================================================================

export const ContentType = {
  JSON: 'application/json',
  HTML: 'text/html',
  PLAIN: 'text/plain',
} as const;

// ============================================================================
// HTTP STATUS CODES
// ============================================================================

export const HttpStatus = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  GATEWAY_TIMEOUT: 502,
  INTERNAL_SERVER_ERROR: 500,
} as const;

// ============================================================================
// API ROUTES - PATH CONSTANTS
// ============================================================================

export const ApiPath = {
  // WebSocket
  WS: '/ws',
  
  // Root & Static
  ROOT: '/',
  INDEX_HTML: '/index.html',
  
  // Webhook endpoints
  WEBHOOK: '/webhook',
  WEBHOOK_DISCOVERY: '/webhook/discovery',
  WEBHOOK_STATUS: '/webhook/status',
  WEBHOOK_SCHEMAS: '/webhook/schemas',
  WEBHOOK_EVENTS: '/webhook/events',
  WEBHOOK_OVERLAYS: '/webhook/overlays',
  WEBHOOK_OVERLAY_KEY: '/webhook/overlay/:key',
  WEBHOOK_ALERT: '/webhook/alert',
  WEBHOOK_CONTROL: '/webhook/control',
  WEBHOOK_SCHEMA: '/webhook/schema',
  WEBHOOK_SAVE: '/webhook/save',
  WEBHOOK_DELETE: '/webhook/delete',
  
  // Health check
  HEALTH: '/health',
  
  // Proxy paths
  API: '/api',
  UPLOADS: '/uploads',
} as const;

// ============================================================================
// WEBSOCKET MESSAGE TYPES
// ============================================================================

export const WsMessageType = {
  READY: 'ready',
  ACK: 'ack',
  PONG: 'pong',
  ALERT: 'alert',
} as const;

// ============================================================================
// SERVICE NAMES
// ============================================================================

export const ServiceName = {
  MEDIA_UPLOAD_API: 'media-upload-api',
  OVERLAY_SERVICE: 'overlay-service',
} as const;

// ============================================================================
// DISCOVERY
// ============================================================================

export const Discovery = {
  DEFAULT_SCHEMA: 'http',
} as const;

// ============================================================================
// CACHE CONTROL
// ============================================================================

export const CacheControl = {
  NO_CACHE: 'no-cache',
} as const;

// ============================================================================
// CLIENT DATA
// ============================================================================

export const ClientId = {
  PREFIX: 'ws-',
  RANDOM_LENGTH: 4,
} as const;
