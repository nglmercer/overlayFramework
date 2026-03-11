/**
 * URL Utilities
 * 
 * Centralized logic for resolving backend and WebSocket URLs
 * across different environments (local, production, cloud).
 */

const DEFAULT_BACKEND_PORT = '3001';

/**
 * Checks if a hostname is a local/development environment
 */
export function isLocalHostname(hostname: string): boolean {
  if (!hostname) return false;
  
  return (
    hostname === 'localhost' || 
    hostname === '127.0.0.1' || 
    hostname === '0.0.0.0' ||
    hostname === '::1' ||
    hostname.startsWith('192.168.') || 
    hostname.startsWith('10.') || 
    hostname.startsWith('172.16.') ||
    hostname.startsWith('172.17.') ||
    hostname.startsWith('172.18.') ||
    hostname.startsWith('172.19.') ||
    hostname.startsWith('172.20.') ||
    hostname.startsWith('172.21.') ||
    hostname.startsWith('172.22.') ||
    hostname.startsWith('172.23.') ||
    hostname.startsWith('172.24.') ||
    hostname.startsWith('172.25.') ||
    hostname.startsWith('172.26.') ||
    hostname.startsWith('172.27.') ||
    hostname.startsWith('172.28.') ||
    hostname.startsWith('172.29.') ||
    hostname.startsWith('172.30.') ||
    hostname.startsWith('172.31.') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.test') ||
    hostname.endsWith('.example')
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

    // Hardening: If we are on a production domain, aggressively strip development ports
    // even if they came from an environment variable or are hardcoded.
    if (!isLocal) {
      // Remove common dev ports if they appear in any URL when not in local dev
      if (url) {
        url = url.replace(':3001', '').replace(':3000', '').replace(':5173', '');
      }
      
      // If the URL hostname matches current hostname (production), use current origin
      // This ensures "Same IP" behavior and bypasses CORS/Port issues on cloud platforms.
      if (url) {
        try {
          const parsedUrl = new URL(url);
          if (parsedUrl.hostname === hostname) {
            // Use current window origin instead of the hardcoded URL with port
            return `${protocol}//${hostname}${port ? `:${port}` : ''}`;
          }
        } catch {
          // Fallback to hardened url string
        }
      }
    }

    // If we have a valid explicit URL after hardening, use it
    if (url) {
      return url;
    }

    // Otherwise, build from current window location
    let portPart = '';
    if (port && port !== '80' && port !== '443') {
      portPart = `:${port}`;
    } else if (!port && isLocal) {
      // Only append default port in local development if no port is present
      portPart = `:${DEFAULT_BACKEND_PORT}`;
    }

    return `${protocol}//${hostname}${portPart}`;
  }

  // Fallback for non-browser environments (SSR, Tests)
  if (url && url.includes('localhost') && url.includes(':3001')) {
     // Keep it as is if it's explicitly localhost:3001 in SSR
  } else if (url && !url.includes('localhost')) {
     // Strip 3001 from production URLs even in SSR if they contain it
     url = url.replace(':3001', '');
  }

  return url || `http://localhost:${DEFAULT_BACKEND_PORT}`;
}

/**
 * Global Fetch Patch
 * 
 * Safely wraps window.fetch to ensure that any request going to a production
 * domain does NOT include common development ports like :3001.
 * This is a safety net for cases where URLs might be hardcoded or 
 * incorrectly generated in third-party libraries.
 */
export function patchGlobalFetch(): void {
  if (typeof window === 'undefined' || !window.fetch) return;

  const originalFetch = window.fetch;
  const hostname = window.location.hostname;
  const isLocal = isLocalHostname(hostname);

  // We only patch if we are clearly NOT in a local environment
  if (isLocal) return;

  const patchedFetch = function(this: any, input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    let url: string = '';

    if (typeof input === 'string') {
      url = input;
    } else if (input instanceof URL) {
      url = input.toString();
    } else if (input instanceof Request) {
      url = input.url;
    }

    // If the URL contains a development port and matches our production domain
    if (url && (url.includes(':3001') || url.includes(':3000') || url.includes(':5173'))) {
      try {
        const urlObj = new URL(url);
        // If it's the same domain as our app (production)
        if (urlObj.hostname === hostname) {
          const newUrl = url.replace(':3001', '').replace(':3000', '').replace(':5173', '');
          
          if (input instanceof Request) {
            return originalFetch.call(this, new Request(newUrl, input), init);
          }
          
          return originalFetch.call(this, newUrl, init);
        }
      } catch {
        // Fallback to original if URL parsing fails
      }
    }

    return originalFetch.call(this, input, init);
  };

  // Copy properties like .close etc or whatever the environment adds
  Object.assign(patchedFetch, originalFetch);
  window.fetch = patchedFetch as typeof fetch;

  console.log('[URL-Utils] Global fetch patched for production safety');
}

/**
 * Resolves the WebSocket URL dynamically
 */
export function resolveWebSocketUrl(backendUrl: string): string {
  try {
    const url = new URL(backendUrl);
    url.protocol = url.protocol.replace('http', 'ws');
    
    // Ensure we don't have double slashes if pathname is empty or just /
    if (url.pathname === '/' || !url.pathname) {
      url.pathname = '/ws';
    } else if (!url.pathname.endsWith('/ws')) {
      // If there's a path, append /ws but avoid duplication
      url.pathname = url.pathname.replace(/\/$/, '') + '/ws';
    }
    
    return url.toString();
  } catch (e) {
    if (typeof window !== 'undefined') {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      // host already includes port if present
      return `${protocol}//${host}/ws`;
    }
    return `ws://localhost:${DEFAULT_BACKEND_PORT}/ws`;
  }
}
