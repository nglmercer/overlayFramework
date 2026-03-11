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
  // If we have an explicit URL from environment
  let url = envUrl || '';
  
  if (typeof window !== 'undefined' && window.location) {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    const port = window.location.port;
    const isLocal = isLocalHostname(hostname);

    // Hardening: Strip common development ports if we are on a production domain
    // even if they came from the environment variable.
    if (url && !isLocal) {
      url = url.replace(':3001', '').replace(':8080', '');
    }

    // If we have a valid explicit URL after hardening
    if (url) {
      // If the URL hostname matches current hostname but has a different port, 
      // and we are NOT in local dev, just use the current origin to ensure "Same IP" behavior.
      try {
        const parsedUrl = new URL(url);
        if (parsedUrl.hostname === hostname && !isLocal) {
          return `${protocol}//${hostname}${port ? `:${port}` : ''}`;
        }
      } catch {
        // Fallback to hardened url string
      }
      return url;
    }

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
