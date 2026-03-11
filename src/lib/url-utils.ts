/**
 * URL Utilities
 * 
 * Centralized logic for resolving backend and WebSocket URLs
 * across different environments (local, production, cloud).
 */

const DEFAULT_BACKEND_PORT = '8080';

/**
 * Checks if a hostname is a local/development environment
 */
export function isLocalHostname(hostname: string): boolean {
  return (
    hostname === 'localhost' || 
    hostname === '127.0.0.1' || 
    hostname.startsWith('192.168.') || 
    hostname.startsWith('10.') || 
    hostname.endsWith('.local')
  );
}

/**
 * Resolves the backend base URL dynamically based on the current environment
 */
export function resolveBackendUrl(envUrl?: string): string {
  // If we have an explicit URL from environment but we are on a production domain,
  // and the env URL incorrectly includes port 8080, we strip it.
  let url = envUrl || '';
  
  if (typeof window !== 'undefined' && window.location) {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    const port = window.location.port;
    const isLocal = isLocalHostname(hostname);

    // Hardening: Strip :8080 from production URLs if it leaked into the environment
    if (url && !isLocal && url.includes(':8080')) {
      url = url.replace(':8080', '');
    }

    // If we have a valid explicit URL, use it
    if (url) return url;

    // Otherwise, build from current window location
    let portPart = '';
    if (port && port !== '80' && port !== '443') {
      portPart = `:${port}`;
    } else if (!port && isLocal) {
      // Only append default port in local development
      portPart = `:${DEFAULT_BACKEND_PORT}`;
    }

    return `${protocol}//${hostname}${portPart}`;
  }

  // Fallback for non-browser environments (SSR, Tests)
  return url || `http://localhost:${DEFAULT_BACKEND_PORT}`;
}

/**
 * Resolves the WebSocket URL dynamically
 */
export function resolveWebSocketUrl(backendUrl: string): string {
  try {
    const url = new URL(backendUrl);
    url.protocol = url.protocol.replace('http', 'ws');
    url.pathname = '/ws';
    return url.toString();
  } catch (e) {
    if (typeof window !== 'undefined') {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${protocol}//${window.location.host}/ws`;
    }
    return `ws://localhost:${DEFAULT_BACKEND_PORT}/ws`;
  }
}
