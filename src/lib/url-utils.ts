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
    if (!isLocal) {
      if (url) {
        // Strip common dev ports from any explicit URL
        url = url.replace(':3001', '').replace(':3000', '').replace(':5173', '');
      }
      
      // If the URL is already absolute, validate its hostname
      if (url && url.startsWith('http')) {
        try {
          const parsedUrl = new URL(url);
          // If the hostname matches (ignore www prefix difference if any)
          const cleanParsedHost = parsedUrl.hostname.replace('www.', '');
          const cleanCurrentHost = hostname.replace('www.', '');
          
          if (cleanParsedHost === cleanCurrentHost) {
            // Force same-origin behavior: use current protocol and host WITHOUT port
            // (since port would be 3001 if leaked, and 443/80 are empty in window.location.port)
            return `${protocol}//${hostname}${port ? `:${port}` : ''}`;
          }
        } catch { /* parse fail, use as is */ }
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
      portPart = `:${DEFAULT_BACKEND_PORT}`;
    }

    return `${protocol}//${hostname}${portPart}`;
  }

  // Fallback for non-browser environments (SSR, Tests)
  if (url && url.includes('localhost') && url.includes(':3001')) {
     // Keep it as is if it's explicitly localhost:3001 in SSR
  } else if (url && !url.includes('localhost')) {
     url = url.replace(':3001', '');
  }

  return url || `http://localhost:${DEFAULT_BACKEND_PORT}`;
}

/**
 * Global Network Patch
 * 
 * Safely wraps window.fetch, XMLHttpRequest, and WebSocket to ensure that any request 
 * going to a production domain does NOT include common development ports like :3001.
 * This satisfies the "safety net" requirement for cloud deployments (Railway, etc).
 */
export function patchGlobalNetwork(): void {
  if (typeof window === 'undefined') return;

  const hostname = window.location.hostname;
  const isLocal = isLocalHostname(hostname);
  if (isLocal) return;

  const devPorts = [':3001', ':3000', ':5173'];
  const cleanHost = hostname.replace('www.', '');

  const shouldStrip = (url: string | URL | Request): boolean => {
    let urlStr = '';
    if (typeof url === 'string') urlStr = url;
    else if (url instanceof URL) urlStr = url.toString();
    else if (url instanceof Request) urlStr = url.url;

    if (!urlStr) return false;
    
    // Check if it contains any dev port
    const hasPort = devPorts.some(p => urlStr.includes(p));
    if (!hasPort) return false;

    try {
      const u = new URL(urlStr);
      // Only strip if it matches OUR hostname
      return u.hostname.replace('www.', '') === cleanHost;
    } catch {
      return false;
    }
  };

  const stripPort = (url: any): any => {
    let urlStr = typeof url === 'string' ? url : (url instanceof URL ? url.toString() : url.url);
    devPorts.forEach(p => { urlStr = urlStr.replace(p, ''); });
    
    if (url instanceof URL) return new URL(urlStr);
    if (url instanceof Request) return new Request(urlStr, url);
    return urlStr;
  };

  // 1. Patch Fetch
  if (window.fetch) {
    const originalFetch = window.fetch;
    const patchedFetch = function(this: any, input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
      if (shouldStrip(input)) {
        input = stripPort(input);
      }
      return originalFetch.call(this, input, init);
    };
    Object.assign(patchedFetch, originalFetch);
    window.fetch = patchedFetch as typeof fetch;
  }

  // 2. Patch XMLHttpRequest
  if (window.XMLHttpRequest) {
    const originalOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(this: any, method: string, url: string | URL, ...args: any[]): void {
      if (shouldStrip(url)) {
        url = stripPort(url);
      }
      return originalOpen.apply(this, [method, url, ...args] as any);
    };
  }

  // 3. Patch WebSocket
  if (window.WebSocket) {
    const OriginalWS = window.WebSocket;
    const PatchedWS = function(this: any, url: string | URL, protocols?: string | string[]): WebSocket {
      if (shouldStrip(url)) {
        url = stripPort(url);
      }
      return new OriginalWS(url, protocols);
    };
    PatchedWS.prototype = OriginalWS.prototype;
    // Copy static properties (CONNECTING, OPEN, etc)
    Object.assign(PatchedWS, OriginalWS);
    window.WebSocket = PatchedWS as any;
  }

  console.log('[URL-Utils] Global network patched (Fetch, XHR, WS) for production safety');
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
