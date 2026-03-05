/**
 * Router for the Overlay Backend Server
 * 
 * Modular routing logic that handles different endpoint types:
 * - WebSocket upgrades
 * - Static file serving
 * - Service discovery
 * - API proxying
 * - Webhook handling
 * 
 * @module backend/src/router
 * @version 1.0.0
 */

import type { Discovery } from '../discover';
import type { WsClientData } from './ws-manager';
import { handleHttpRequest } from './webhook';
import { join } from 'path';
import { 
  ApiPath, 
  ContentType, 
  HttpStatus,
  HttpHeader,
  CacheControl,
  ServiceName,
  ClientId,
  Discovery as DiscoveryConfig,
} from './constants';

// ============================================================================
// ROUTER TYPES
// ============================================================================

export interface RouterConfig {
  distPath: string;
  discovery: Discovery | null;
}

export interface ProxyTarget {
  target: string;
  path: string;
  search: string;
}

// ============================================================================
// ROUTER HELPERS
// ============================================================================

/**
 * Generate a unique client ID for WebSocket connections
 */
export function generateClientId(): string {
  return `${ClientId.PREFIX}${Date.now()}-${Math.random().toString(36).slice(2, ClientId.RANDOM_LENGTH + 2)}`;
}

/**
 * Check if a path should be served as static file
 */
export function isStaticFilePath(pathname: string): boolean {
  return !pathname.startsWith(ApiPath.WEBHOOK) && 
         !pathname.startsWith(ApiPath.API) && 
         !pathname.startsWith(ApiPath.UPLOADS);
}

/**
 * Get the file path for static file serving
 */
export function getStaticFilePath(url: URL, distPath: string): string {
  const filePath = url.pathname === ApiPath.ROOT ? ApiPath.INDEX_HTML : url.pathname;
  return join(distPath, filePath);
}

/**
 * Build discovery service map from discovered services
 */
export function buildDiscoveryServiceMap(discovery: Discovery | null): Record<string, string> {
  const services = discovery ? discovery.getInternalRegistry().getAll() : [];
  return services.reduce<Record<string, string>>((acc, s) => {
    if (s && s.name) {
      acc[s.name] = `${s.schema || DiscoveryConfig.DEFAULT_SCHEMA}://${s.ip}:${s.port}`;
    }
    return acc;
  }, {});
}

// ============================================================================
// ROUTE HANDLERS
// ============================================================================

/**
 * Handle WebSocket upgrade
 * Returns undefined if path is not /ws, undefined if upgrade succeeded, or Response on failure
 */
export function handleWebSocketUpgrade(
  req: Request,
  server: any
): Response | undefined {
  const url = new URL(req.url);
  
  if (url.pathname !== ApiPath.WS) {
    return undefined;
  }

  const clientData: WsClientData = {
    id: generateClientId(),
    connectedAt: Date.now(),
    lastPong: Date.now(),
  };

  const success = server.upgrade(req, { data: clientData });
  if (success) {
    return undefined; // Bun handles the upgrade - return undefined
  }
  
  return new Response('WebSocket upgrade failed', { 
    status: HttpStatus.BAD_REQUEST 
  });
}

/**
 * Handle static file serving (including local uploads)
 */
export async function handleStaticFile(
  req: Request,
  config: RouterConfig
): Promise<Response | null> {
  const url = new URL(req.url);
  
  // Check if this is a local uploads path
  if (url.pathname.startsWith(ApiPath.UPLOADS)) {
    const filePath = getStaticFilePath(url, config.distPath);
    const file = Bun.file(filePath);
    
    // Check if file exists locally first
    if (await file.exists()) {
      return new Response(file);
    }
    // If local file doesn't exist, return null to continue to proxy
    return null;
  }
  
  if (!isStaticFilePath(url.pathname)) {
    return null;
  }

  const filePath = getStaticFilePath(url, config.distPath);
  const file = Bun.file(filePath);
  
  if (await file.exists()) {
    return new Response(file);
  }

  // SPA Fallback: Try index.html
  const indexFile = Bun.file(join(config.distPath, ApiPath.INDEX_HTML));
  if (await indexFile.exists()) {
    return new Response(indexFile);
  }

  return null;
}

/**
 * Handle service discovery endpoint
 */
export async function handleDiscovery(
  req: Request,
  config: RouterConfig,
  manualMediaUrl: string | undefined
): Promise<Response | null> {
  const url = new URL(req.url);
  
  if (url.pathname !== ApiPath.WEBHOOK_DISCOVERY) {
    return null;
  }

  const serviceMap = buildDiscoveryServiceMap(config.discovery);
  
  // Add manually configured services as fallback/override
  if (manualMediaUrl) {
    serviceMap[ServiceName.MEDIA_UPLOAD_API] = manualMediaUrl;
  }

  console.log('[Discovery] Internal Registry:', serviceMap);

  return new Response(JSON.stringify({
    services: serviceMap,
    self: { id: config.discovery?.getServiceId(), name: ServiceName.OVERLAY_SERVICE }
  }), {
    headers: { 
      [HttpHeader.CONTENT_TYPE]: ContentType.JSON, 
      [HttpHeader.ACCESS_CONTROL_ALLOW_ORIGIN]: '*',
      [HttpHeader.CACHE_CONTROL]: CacheControl.NO_CACHE
    }
  });
}

/**
 * Get proxy target URL for API/uploads requests
 */
export function getProxyTarget(
  url: URL,
  discovery: Discovery | null,
  manualMediaUrl: string | undefined
): ProxyTarget | null {
  const isApiPath = url.pathname.startsWith(ApiPath.API);
  const isUploadsPath = url.pathname.startsWith(ApiPath.UPLOADS);
  
  if (!isApiPath && !isUploadsPath) {
    return null;
  }

  const mediaServices = discovery ? discovery.filter({ name: ServiceName.MEDIA_UPLOAD_API }) : [];
  
  if (mediaServices.length > 0 || manualMediaUrl) {
    const target = mediaServices.length > 0 
      ? `${mediaServices[0].schema}://${mediaServices[0].ip}:${mediaServices[0].port}`
      : manualMediaUrl!;

    return {
      target,
      path: url.pathname,
      search: url.search,
    };
  }

  return null;
}

/**
 * Handle API proxy requests to media-upload-api
 */
export async function handleProxy(
  req: Request,
  config: RouterConfig,
  manualMediaUrl: string | undefined
): Promise<Response | null> {
  const url = new URL(req.url);
  const proxyTarget = getProxyTarget(url, config.discovery, manualMediaUrl);
  
  if (!proxyTarget) {
    return null;
  }

  const proxyUrl = `${proxyTarget.target}${proxyTarget.path}${proxyTarget.search}`;
  console.log(`[Proxy] Routing ${url.pathname} to media-upload-api at ${proxyTarget.target}`);

  try {
    const proxyResp = await fetch(proxyUrl, {
      method: req.method,
      headers: req.headers,
      body: req.method !== 'GET' && req.method !== 'HEAD' ? await req.blob() : undefined
    });
    return proxyResp;
  } catch (err) {
    console.error(`[Proxy] Failed to route to media-upload-api:`, err);
    return new Response(JSON.stringify({ error: 'Proxy Error', details: String(err) }), { 
      status: HttpStatus.GATEWAY_TIMEOUT,
      headers: { [HttpHeader.CONTENT_TYPE]: ContentType.JSON }
    });
  }
}

/**
 * Handle service not found for proxy
 */
export function handleProxyNotFound(): Response {
  console.warn(`[Proxy] No media-upload-api discovered and no MEDIA_UPLOAD_API_URL set`);
  return new Response(JSON.stringify({ error: 'Service not found', service: ServiceName.MEDIA_UPLOAD_API }), { 
    status: HttpStatus.NOT_FOUND,
    headers: { [HttpHeader.CONTENT_TYPE]: ContentType.JSON }
  });
}

/**
 * Main router function that handles all requests
 */
export async function routeRequest(
  req: Request,
  server: any,
  config: RouterConfig
): Promise<Response | undefined> {
  const url = new URL(req.url);
  const manualMediaUrl = process.env.MEDIA_UPLOAD_API_URL;

  // 1. Try WebSocket upgrade
  const wsResult = handleWebSocketUpgrade(req, server);
  if (wsResult !== undefined) {
    // If it's a Response (failure), return it. If undefined (success), return empty
    return wsResult;
  }

  // 2. Try static file serving
  const staticResponse = await handleStaticFile(req, config);
  if (staticResponse !== null) {
    return staticResponse;
  }

  // 3. Try discovery endpoint
  const discoveryResponse = await handleDiscovery(req, config, manualMediaUrl);
  if (discoveryResponse !== null) {
    return discoveryResponse;
  }

  // 4. Try proxy to media-upload-api
  const proxyTarget = getProxyTarget(url, config.discovery, manualMediaUrl);
  if (url.pathname.startsWith(ApiPath.API) || url.pathname.startsWith(ApiPath.UPLOADS)) {
    if (!proxyTarget) {
      return handleProxyNotFound();
    }
    
    const proxyResponse = await handleProxy(req, config, manualMediaUrl);
    if (proxyResponse !== null) {
      return proxyResponse;
    }
  }

  // 5. Default: Handle webhook/API request
  return handleHttpRequest(req);
}
