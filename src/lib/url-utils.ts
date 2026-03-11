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
  
  // Only the most common local dev hostnames
  return (
    hostname === 'localhost' || 
    hostname === '127.0.0.1' || 
    hostname === '0.0.0.0' ||
    hostname === '::1' ||
    hostname.endsWith('.local')
  );
}

/**
 * Resolves the backend base URL dynamically based on the current environment
 */
export function resolveBackendUrl(envUrl?: string): string {
  const urlParam = envUrl || '';
  let url = urlParam;
  
  if (typeof window !== 'undefined' && window.location) {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    const port = window.location.port;
    const isLocal = isLocalHostname(hostname);

    // Hardening: Aggressively strip development ports if on a production domain
    if (!isLocal) {
      if (url) {
        url = url.replace(':3001', '').replace(':3000', '').replace(':5173', '');
      }
      
      if (url && url.startsWith('http')) {
        try {
          const parsedUrl = new URL(url);
          if (parsedUrl.hostname.replace('www.', '') === hostname.replace('www.', '')) {
            return `${protocol}//${hostname}${port ? `:${port}` : ''}`;
          }
        } catch { /* ... */ }
      }
    }

    if (url) return url;

    // Default to current origin (safe for production and local dev)
    let portPart = '';
    if (port && port !== '80' && port !== '443') {
      portPart = `:${port}`;
    } else if (!port && isLocal) {
      portPart = `:${DEFAULT_BACKEND_PORT}`;
    }

    return `${protocol}//${hostname}${portPart}`;
  }

  return url || `http://localhost:${DEFAULT_BACKEND_PORT}`;
}

let isNetworkPatched = false;

/**
 * Global Network Patch
 * 
 * Safely wraps window.fetch, XMLHttpRequest, and WebSocket to ensure that any request 
 * going to a production domain does NOT include common development ports like :3001.
 * This satisfies the "safety net" requirement for cloud deployments (Railway, etc).
 */
export function patchGlobalNetwork(): void {
  if (typeof window === 'undefined' || isNetworkPatched) return;

  const hostname = window.location.hostname;
  const isLocal = isLocalHostname(hostname);
  
  // LOG FOR DIAGNOSIS - User will see this in console
  console.log(`[URL-Utils] Initializing network patch. Hostname: ${hostname}, isLocal: ${isLocal}`);
  
  // If we are on a real domain (not localhost), we MUST patch to be safe
  if (isLocal) {
    isNetworkPatched = true;
    return;
  }

  const devPorts = [':3001', ':3000', ':5173'];
  const cleanHost = hostname.replace('www.', '');

  const shouldStrip = (url: string | URL | Request): boolean => {
    let urlStr = '';
    try {
      if (typeof url === 'string') urlStr = url;
      else if (url instanceof URL) urlStr = url.toString();
      else if (url instanceof Request) urlStr = url.url;
    } catch { return false; }

    if (!urlStr || !urlStr.startsWith('http') && !urlStr.startsWith('ws')) return false;
    
    // Quick check for any port pattern
    const hasPort = devPorts.some(p => urlStr.includes(p));
    if (!hasPort) return false;

    try {
      const u = new URL(urlStr);
      return u.hostname.replace('www.', '') === cleanHost;
    } catch {
      return false;
    }
  };

  const stripPort = (url: any): any => {
    let urlStr = typeof url === 'string' ? url : (url instanceof URL ? url.toString() : url.url);
    const originalUrl = urlStr;
    
    devPorts.forEach(p => { urlStr = urlStr.replace(p, ''); });
    
    if (originalUrl !== urlStr) {
      console.warn(`[URL-Utils] STRIPPED DEV PORT from URL: ${originalUrl} -> ${urlStr}`);
    }

    if (url instanceof URL) return new URL(urlStr);
    if (url instanceof Request) return new Request(urlStr, url as Request);
    return urlStr;
  };

  // 1. Patch Fetch
  const originalFetch = window.fetch;
  if (originalFetch) {
    window.fetch = function(this: any, input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
      if (shouldStrip(input)) {
        input = stripPort(input);
      }
      return originalFetch.call(this, input, init);
    } as typeof fetch;
    Object.assign(window.fetch, originalFetch);
  }

  // 2. Patch XMLHttpRequest
  const originalOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(this: any, method: string, url: string | URL, ...args: any[]): void {
    if (shouldStrip(url)) {
      url = stripPort(url);
    }
    return originalOpen.apply(this, [method, url, ...args] as any);
  };

  // 3. Patch WebSocket
  const OriginalWS = window.WebSocket;
  if (OriginalWS) {
    const PatchedWS = function(this: any, url: string | URL, protocols?: string | string[]): WebSocket {
      if (shouldStrip(url)) {
        url = stripPort(url);
      }
      return new OriginalWS(url, protocols);
    };
    PatchedWS.prototype = OriginalWS.prototype;
    Object.assign(PatchedWS, OriginalWS);
    window.WebSocket = PatchedWS as any;
  }

  isNetworkPatched = true;
  console.log('[URL-Utils] Global network patched successfully');
}

// AUTO-EXECUTE on load if in browser
if (typeof window !== 'undefined') {
  patchGlobalNetwork();
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
