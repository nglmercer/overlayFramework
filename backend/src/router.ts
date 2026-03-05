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
 * Features:
 * - Dynamic route registration with map() method
 * - Automatic route logging at startup
 * - Support for route descriptions
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
  HttpMethod,
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

export type RouteHandler = (req: Request, config: RouterConfig, extras?: any) => Promise<Response | null> | Response | null | undefined;

export interface RouteDefinition {
  method: string;
  path: string;
  handler: RouteHandler;
  description?: string;
}

// ============================================================================
// ROUTER CLASS
// ============================================================================

/**
 * Router class for registering and managing routes
 * Provides dynamic route registration and automatic logging
 */
export class Router {
  private routes: RouteDefinition[] = [];
  private staticRoutes: Map<string, RouteHandler> = new Map();
  private wsHandler: RouteHandler | null = null;

  /**
   * Register a route with method, path, handler, and optional description
   * @param method - HTTP method (GET, POST, etc.) or '*' for all
   * @param path - Route path pattern
   * @param handler - Handler function for the route
   * @param description - Optional description for logging
   */
  map(method: string, path: string, handler: RouteHandler, description?: string): this {
    this.routes.push({
      method: method.toUpperCase(),
      path,
      handler,
      description,
    });
    return this;
  }

  /**
   * Register a GET route
   */
  get(path: string, handler: RouteHandler, description?: string): this {
    return this.map(HttpMethod.GET, path, handler, description);
  }

  /**
   * Register a POST route
   */
  post(path: string, handler: RouteHandler, description?: string): this {
    return this.map(HttpMethod.POST, path, handler, description);
  }

  /**
   * Register a PUT route
   */
  put(path: string, handler: RouteHandler, description?: string): this {
    return this.map(HttpMethod.PUT, path, handler, description);
  }

  /**
   * Register a DELETE route
   */
  delete(path: string, handler: RouteHandler, description?: string): this {
    return this.map(HttpMethod.DELETE, path, handler, description);
  }

  /**
   * Register WebSocket handler
   */
  ws(path: string, handler: RouteHandler): this {
    this.wsHandler = handler;
    this.staticRoutes.set(path, handler);
    return this;
  }

  /**
   * Register a static path handler (exact match)
   */
  set(path: string, handler: RouteHandler): this {
    this.staticRoutes.set(path, handler);
    return this;
  }

  /**
   * Get all registered routes for logging
   */
  getRoutes(): RouteDefinition[] {
    return [...this.routes];
  }

  /**
   * Print all registered routes to console
   * Uses method and path with optional description
   */
  printRoutes(): void {
    console.log(' Endpoints:                                 ');
    
    // Print HTTP routes
    for (const route of this.routes) {
      const method = route.method.padEnd(6);
      const path = route.path.padEnd(32);
      const desc = route.description ? ` — ${route.description}` : '';
      console.log(` ${method} ${path}${desc}`);
    }

    // Print WebSocket routes
    if (this.wsHandler) {
      console.log(` WS    ${ApiPath.WS.padEnd(32)} — Overlay connection `);
    }
  }

  /**
   * Match a request to a registered route
   * @returns Handler and route info if matched, null otherwise
   */
  match(req: Request): { handler: RouteHandler; route: RouteDefinition } | null {
    const url = new URL(req.url);
    const method = req.method.toUpperCase();
    const pathname = url.pathname;

    // Check static routes first (WebSocket, special paths)
    for (const [path, handler] of this.staticRoutes) {
      if (pathname === path) {
        return { 
          handler, 
          route: { method: 'WS', path, handler, description: 'WebSocket' } 
        };
      }
    }

    // Check registered routes
    for (const route of this.routes) {
      // Match exact path or wildcard method
      if (route.path === pathname && (route.method === '*' || route.method === method)) {
        return { handler: route.handler, route };
      }
    }

    return null;
  }
}

// Create singleton router instance
export const router = new Router();

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

  // SPA Fallback: Try index.html only for potential page routes (no extension or .html)
  const isHtmlRequest = req.headers.get('accept')?.includes('text/html');
  const hasExtension = url.pathname.includes('.');
  const isPotentialPageRoute = !hasExtension || url.pathname.endsWith('.html');

  if (isHtmlRequest || isPotentialPageRoute) {
    const indexFile = Bun.file(join(config.distPath, ApiPath.INDEX_HTML));
    if (await indexFile.exists()) {
      return new Response(indexFile, {
        headers: { [HttpHeader.CONTENT_TYPE]: ContentType.HTML }
      });
    }
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
  
  // Use current host as proxy for media-upload-api if it exists in map or is manual
  if (serviceMap[ServiceName.MEDIA_UPLOAD_API] || manualMediaUrl) {
    serviceMap[ServiceName.MEDIA_UPLOAD_API] = url.origin;
    console.log(`[Discovery] Proxying ${ServiceName.MEDIA_UPLOAD_API} via ${url.origin}`);
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
  const isMediaFile = /\.(mp4|webm|mp3|wav|ogg|jpg|jpeg|png|gif|svg)$/i.test(url.pathname);
  
  if (!isApiPath && !isUploadsPath && !isMediaFile) {
    return null;
  }

  const mediaServices = discovery ? discovery.filter({ name: ServiceName.MEDIA_UPLOAD_API }) : [];
  
  if (manualMediaUrl || (discovery && discovery.filter({ name: ServiceName.MEDIA_UPLOAD_API }).length > 0)) {
    const mediaServices = discovery ? discovery.filter({ name: ServiceName.MEDIA_UPLOAD_API }) : [];
    const target = manualMediaUrl ?? `${mediaServices[0].schema}://${mediaServices[0].ip}:${mediaServices[0].port}`;

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
      body: req.method !== HttpMethod.GET && req.method !== HttpMethod.HEAD ? await req.blob() : undefined
    });

    // If it's a JSON response, rewrite absolute internal URLs to use the proxy origin
    const contentType = proxyResp.headers.get(HttpHeader.CONTENT_TYPE);
    if (contentType?.includes(ContentType.JSON)) {
      let bodyText = await proxyResp.text();
      const internalTarget = proxyTarget.target;
      const proxyOrigin = url.origin;

      if (bodyText.includes(internalTarget)) {
        console.log(`[Proxy] Rewriting response URLs: ${internalTarget} -> ${proxyOrigin}`);
        bodyText = bodyText.split(internalTarget).join(proxyOrigin);
      }

      return new Response(bodyText, {
        status: proxyResp.status,
        headers: proxyResp.headers
      });
    }

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

// ============================================================================
// ROUTE REGISTRATION
// ============================================================================

/**
 * Register all routes using the router.map() method
 * This enables automatic route logging
 */
export function registerRoutes(): void {
  // Health check
  router.get(ApiPath.HEALTH, async () => {
    return new Response(JSON.stringify({ status: 'ok', timestamp: Date.now() }), {
      headers: { [HttpHeader.CONTENT_TYPE]: ContentType.JSON }
    });
  }, 'Health check');

  // Webhook endpoints
  router.get(ApiPath.WEBHOOK_STATUS, async () => {
    return handleHttpRequest(new Request('http://localhost' + ApiPath.WEBHOOK_STATUS, { method: 'GET' }));
  }, 'Server status');

  router.get(ApiPath.WEBHOOK_SCHEMAS, async () => {
    return handleHttpRequest(new Request('http://localhost' + ApiPath.WEBHOOK_SCHEMAS, { method: 'GET' }));
  }, 'List schemas');

  router.get(ApiPath.WEBHOOK_EVENTS, async () => {
    return handleHttpRequest(new Request('http://localhost' + ApiPath.WEBHOOK_EVENTS, { method: 'GET' }));
  }, 'Recent events');

  router.get(ApiPath.WEBHOOK_OVERLAYS, async () => {
    return handleHttpRequest(new Request('http://localhost' + ApiPath.WEBHOOK_OVERLAYS, { method: 'GET' }));
  }, 'List saved overlays');

  router.get(ApiPath.WEBHOOK_OVERLAY_KEY, async (req) => {
    return handleHttpRequest(req);
  }, 'Get overlay');

  router.post(ApiPath.WEBHOOK_ALERT, async (req) => {
    return handleHttpRequest(req);
  }, 'Trigger alert');

  router.post(ApiPath.WEBHOOK_CONTROL, async (req) => {
    return handleHttpRequest(req);
  }, 'Control overlay');

  router.post(ApiPath.WEBHOOK_SCHEMA, async (req) => {
    return handleHttpRequest(req);
  }, 'Register schema');

  router.post(ApiPath.WEBHOOK_SAVE, async (req) => {
    return handleHttpRequest(req);
  }, 'Save overlay data');

  router.post(ApiPath.WEBHOOK_DELETE, async (req) => {
    return handleHttpRequest(req);
  }, 'Delete overlay');

  // WebSocket
  router.ws(ApiPath.WS, () => null);

  // Static file serving (handled separately)
  router.set('*static*', async (req, config) => {
    return handleStaticFile(req, config);
  });

  // Discovery endpoint
  router.set('*discovery*', async (req, config) => {
    const manualMediaUrl = process.env.MEDIA_UPLOAD_API_URL;
    return handleDiscovery(req, config, manualMediaUrl);
  });

  // Proxy handling
  router.set('*proxy*', async (req, config) => {
    const manualMediaUrl = process.env.MEDIA_UPLOAD_API_URL;
    const url = new URL(req.url);
    const proxyTarget = getProxyTarget(url, config.discovery, manualMediaUrl);
    
    if (url.pathname.startsWith(ApiPath.API) || url.pathname.startsWith(ApiPath.UPLOADS)) {
      if (!proxyTarget) {
        return handleProxyNotFound();
      }
      return handleProxy(req, config, manualMediaUrl);
    }
    return null;
  });
}

// ============================================================================
// MAIN ROUTER FUNCTION
// ============================================================================

/**
 * Main router function that handles all requests
 * Uses the router.match() method for route lookup
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
  if (proxyTarget) {
    const proxyResponse = await handleProxy(req, config, manualMediaUrl);
    if (proxyResponse !== null) {
      return proxyResponse;
    }
  }

  // 5. Check registered routes (Router class)
  const matched = router.match(req);
  if (matched) {
    const response = await matched.handler(req, config);
    if (response) return response;
  }

  // 6. Default: Handle webhook/API request
  return handleHttpRequest(req);
}
