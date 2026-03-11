/**
 * Utility Functions for the Overlay Backend Server
 * 
 * Centralizes common patterns to avoid code repetition across:
 * - server.ts
 * - router.ts
 * - router-engine.ts
 * - routes/webhook.ts
 * - ws-manager.ts
 * 
 * @module backend/src/utils
 * @version 1.0.0
 */

import { HttpStatus, ContentType, HttpHeader, ClientId } from './constants';
import type { ServerWebSocket } from 'bun';

// ============================================================================
// ID GENERATION
// ============================================================================

/**
 * Generate a unique client WebSocket ID
 * Format: ws-{timestamp}-{random4chars}
 */
export function generateClientId(): string {
  return `${ClientId.PREFIX}${Date.now()}-${Math.random().toString(36).slice(2, 2 + ClientId.RANDOM_LENGTH)}`;
}

/**
 * Generate a unique event ID
 * Format: evt-{timestamp}-{random4chars}
 */
export function generateEventId(): string {
  return `evt-${Date.now()}-${Math.random().toString(36).slice(2, 2 + ClientId.RANDOM_LENGTH)}`;
}

/**
 * Generate a unique generic ID with custom prefix
 * @param prefix - Prefix for the ID (e.g., 'ws', 'evt', 'alert')
 */
export function generateId(prefix: string = 'id'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 2 + ClientId.RANDOM_LENGTH)}`;
}

// ============================================================================
// ENVIRONMENT HELPERS
// ============================================================================

/**
 * Get environment variable as integer with fallback
 */
export function getEnvInt(envKey: string, fallback: number): number {
  const value = process.env[envKey];
  if (!value) return fallback;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? fallback : parsed;
}

// ============================================================================
// RESPONSE HELPERS
// ============================================================================

/**
 * Create a text/plain error response
 */
export function errorResponse(message: string, status: number = HttpStatus.NOT_FOUND): Response {
  return new Response(message, {
    status,
    headers: { [HttpHeader.CONTENT_TYPE]: ContentType.PLAIN }
  });
}

/**
 * Create a JSON error response with optional details
 */
export function jsonError(
  message: string, 
  status: number = HttpStatus.NOT_FOUND, 
  details?: Record<string, unknown>
): Response {
  const body: Record<string, unknown> = { error: message };
  if (details) {
    body.details = details;
  }
  
  return new Response(JSON.stringify(body), {
    status,
    headers: { 
      [HttpHeader.CONTENT_TYPE]: ContentType.JSON,
      [HttpHeader.ACCESS_CONTROL_ALLOW_ORIGIN]: '*'
    }
  });
}

/**
 * Create a JSON success response
 */
export function jsonSuccess(data: Record<string, unknown> = {}, status: number = HttpStatus.OK): Response {
  return new Response(JSON.stringify({ ok: true, ...data }), {
    status,
    headers: { 
      [HttpHeader.CONTENT_TYPE]: ContentType.JSON,
      [HttpHeader.ACCESS_CONTROL_ALLOW_ORIGIN]: '*'
    }
  });
}

/**
 * Create an empty response (for WebSocket upgrades)
 */
export function emptyResponse(): Response {
  return new Response(undefined, { status: 0 });
}

// ============================================================================
// LOGGING
// ============================================================================

/**
 * Simple logger function with prefix support
 * @param prefix - Log prefix (e.g., 'WS', 'Server', 'Router')
 * @param args - Arguments to log
 */
export function logger(prefix: string, ...args: unknown[]): void {
  console.log(`[${prefix}]`, ...args);
}

/**
 * Logger error function with prefix support
 * @param prefix - Log prefix
 * @param args - Arguments to log as error
 */
export function loggerError(prefix: string, ...args: unknown[]): void {
  console.error(`[${prefix}]`, ...args);
}

// Convenience logger exports for typed access
export const loggerWs = {
  log: (message: string) => logger('WS', message),
  info: (message: string) => logger('WS', message),
  warn: (message: string) => logger('WS', message),
  error: (message: string, ...args: unknown[]) => loggerError('WS', message, ...args),
};

export const loggerServer = {
  log: (message: string) => logger('Server', message),
  info: (message: string) => logger('Server', message),
  warn: (message: string) => logger('Server', message),
  error: (message: string, ...args: unknown[]) => loggerError('Server', message, ...args),
};

export const loggerRouter = {
  log: (message: string) => logger('Router', message),
  info: (message: string) => logger('Router', message),
  warn: (message: string) => logger('Router', message),
  error: (message: string, ...args: unknown[]) => loggerError('Router', message, ...args),
};

// ============================================================================
// SHUTDOWN HANDLER
// ============================================================================

/**
 * Create a standardized shutdown handler for the server
 * @param options - Cleanup functions and options
 */
export function createShutdownHandler(options: {
  onCleanup?: () => void | Promise<void>;
  onStopServer?: () => void | Promise<void>;
  message?: string;
}): (signal: string) => void {
  const { onCleanup, onStopServer, message = 'Shutting down...' } = options;
  
  return (signal: string) => {
    loggerServer.warn(`\n${message} (${signal})`);
    
    if (onCleanup) {
      onCleanup();
    }
    
    if (onStopServer) {
      onStopServer();
    }
    
    process.exit(0);
  };
}

// ============================================================================
// WEBSOCKET HELPERS
// ============================================================================

/**
 * Generic broadcast function for WebSocket clients
 * @param clients - Set of WebSocket clients
 * @param message - Message object to broadcast
 * @param logPrefix - Prefix for log messages
 */
export function broadcastToClients<T>(
  clients: Set<ServerWebSocket<any>>, 
  message: T,
  logPrefix?: string
): number {
  const json = JSON.stringify(message);
  let sent = 0;
  
  for (const client of clients) {
    try {
      client.send(json);
      sent++;
    } catch (err) {
      if (logPrefix) {
        loggerWs.error(`Failed to send to ${client.data?.id}:`, err);
      }
    }
  }
  
  return sent;
}

/**
 * Create a send helper for a single WebSocket client
 */
export function sendToClient<T>(ws: ServerWebSocket<any>, message: T): boolean {
  try {
    ws.send(JSON.stringify(message));
    return true;
  } catch (err) {
    loggerWs.error(`Failed to send to ${ws.data?.id}:`, err);
    return false;
  }
}

/**
 * Create a ping message object
 */
export function createPingMessage(): string {
  return JSON.stringify({ type: 'ping', timestamp: Date.now() });
}

// ============================================================================
// REQUEST HELPERS
// ============================================================================

/**
 * Get client IP from request headers
 */
export function getClientIp(req: Request): string | null {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.headers.get('x-real-ip') ?? null;
}

/**
 * Get normalized origin for production/local environments.
 * Strips internal development ports (like :3001) from production origins
 * while preserving them for local discovery.
 */
export function getCleanOrigin(req: Request): string {
  const url = new URL(req.url);
  const hostname = url.hostname;
  let origin = url.origin;

  // Detection list: Add common local environments
  const isLocal = 
    hostname === 'localhost' || 
    hostname === '127.0.0.1' || 
    hostname === '0.0.0.0' ||
    hostname.startsWith('192.168.') ||
    hostname.startsWith('10.');

  // If not local, aggressively strip the development port 3001
  // This is crucial for Railway/Heroku where internal port is 3001 
  // but public access is via 443 (standard HTTPS).
  if (!isLocal && origin.includes(':3001')) {
    origin = origin.replace(':3001', '');
  }

  return origin;
}

/**
 * Check if request accepts HTML
 */
export function acceptsHtml(req: Request): boolean {
  const accept = req.headers.get('accept') ?? '';
  return accept.includes('text/html');
}

/**
 * Check if request accepts JSON
 */
export function acceptsJson(req: Request): boolean {
  const accept = req.headers.get('accept') ?? '';
  return accept.includes('application/json');
}

// ============================================================================
// WEBHOOK AUTH HELPERS
// ============================================================================

/**
 * Check request secret for webhook authentication
 */
export function checkRequestSecret(req: Request, secret: string): boolean {
  if (!secret) return true;
  const provided = req.headers.get('X-Webhook-Secret') ?? 
    req.headers.get('Authorization')?.replace('Bearer ', '') ?? 
    req.headers.get('Authorization');
  return provided === secret;
}

// ============================================================================
// ARRAY HELPERS
// ============================================================================

/**
 * Safely get an item from an array, returning default if index out of bounds
 */
export function getOrDefault<T>(arr: T[], index: number, defaultValue: T): T {
  return arr[index] ?? defaultValue;
}

/**
 * Group array items by a key function
 */
export function groupBy<T>(arr: T[], keyFn: (item: T) => string): Record<string, T[]> {
  return arr.reduce((acc, item) => {
    const key = keyFn(item);
    (acc[key] = acc[key] ?? []).push(item);
    return acc;
  }, {} as Record<string, T[]>);
}

// ============================================================================
// OBJECT HELPERS
// ============================================================================

/**
 * Merge partial data into a target object, only setting defined values
 */
export function mergeDefined<T extends Record<string, any>>(target: T, partial: Partial<T>): T {
  const result: any = { ...target };
  for (const [key, value] of Object.entries(partial)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Pick specific keys from an object
 */
export function pick<T extends Record<string, unknown>, K extends keyof T>(
  obj: T, 
  keys: K[]
): Pick<T, K> {
  const result = {} as Pick<T, K>;
  for (const key of keys) {
    if (key in obj) {
      result[key] = obj[key];
    }
  }
  return result;
}

/**
 * Omit specific keys from an object
 */
export function omit<T extends Record<string, unknown>, K extends keyof T>(
  obj: T, 
  keys: K[]
): Omit<T, K> {
  const result = { ...obj };
  for (const key of keys) {
    delete result[key];
  }
  return result;
}

// ============================================================================
// PARSING HELPERS
// ============================================================================

/**
 * Parse integer with fallback
 */
export function parseIntSafe(value: string | null, fallback: number, radix: number = 10): number {
  if (!value) return fallback;
  const parsed = parseInt(value, radix);
  return isNaN(parsed) ? fallback : parsed;
}

/**
 * Parse boolean from string
 */
export function parseBool(value: string | null, fallback: boolean = false): boolean {
  if (!value) return fallback;
  const lower = value.toLowerCase();
  return lower === 'true' || lower === '1' ? true : lower === 'false' || lower === '0' ? false : fallback;
}
