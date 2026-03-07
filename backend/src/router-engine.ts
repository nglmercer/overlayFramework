/**
 * Router Engine for the Overlay Backend Server
 * 
 * Core routing logic that handles:
 * - Path parameter extraction (:id)
 * - Zod schema validation for body, params, and query
 * - Middleware-like handling logic
 * - CORS support for cross-origin requests
 * 
 * @module backend/src/router-engine
 * @version 1.2.0
 */

import { z } from 'zod';
import { 
  HttpStatus, 
  HttpHeader, 
  ContentType,
  HttpMethod,
} from './constants';
import type { Discovery } from '../discover';

// ============================================================================
// TYPES
// ============================================================================

export interface RouterConfig {
  distPath: string;
  discovery: Discovery | null;
}

export interface RouteContext<B = any, P = any, Q = any> {
  req: Request;
  config: RouterConfig;
  body: B;
  params: P;
  query: Q;
  url: URL;
  extras?: any;
}

export type RouteHandler<B = any, P = any, Q = any> = (
  ctx: RouteContext<B, P, Q>
) => Promise<Response | null> | Response | null | undefined;

export interface RouteSchema {
  body?: z.ZodSchema;
  params?: z.ZodSchema;
  query?: z.ZodSchema;
}

export interface RouteDefinition {
  method: string;
  path: string;
  handler: RouteHandler;
  schema?: RouteSchema;
  description?: string;
}

// ============================================================================
// CORS MIDDLEWARE
// ============================================================================

/**
 * CORS configuration
 */
export const CORS_CONFIG = {
  allowedOrigins: process.env.CORS_ALLOWED_ORIGINS?.split(',') || ['*'],
  allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    HttpHeader.CONTENT_TYPE,
    HttpHeader.ACCESS_CONTROL_ALLOW_ORIGIN,
    'Authorization',
    'X-Requested-With',
  ],
  exposedHeaders: [
    HttpHeader.ACCESS_CONTROL_ALLOW_ORIGIN,
  ],
  maxAge: 86400, // 24 hours
  credentials: false,
};

/**
 * Check if origin is allowed
 */
function isOriginAllowed(origin: string): boolean {
  if (CORS_CONFIG.allowedOrigins.includes('*')) return true;
  return CORS_CONFIG.allowedOrigins.includes(origin);
}

/**
 * Build CORS headers for a response
 */
export function buildCORSHeaders(origin: string): Record<string, string> {
  const headers: Record<string, string> = {
    [HttpHeader.ACCESS_CONTROL_ALLOW_ORIGIN]: isOriginAllowed(origin) ? origin : '*',
    'Access-Control-Allow-Methods': CORS_CONFIG.allowedMethods.join(', '),
    'Access-Control-Allow-Headers': CORS_CONFIG.allowedHeaders.join(', '),
    'Access-Control-Max-Age': String(CORS_CONFIG.maxAge),
  };
  
  if (CORS_CONFIG.credentials) {
    headers['Access-Control-Allow-Credentials'] = 'true';
  }
  
  return headers;
}

/**
 * Handle CORS preflight (OPTIONS) request
 */
export function handleCORSPreflight(req: Request): Response {
  const origin = req.headers.get('Origin') || '*';
  const headers = buildCORSHeaders(origin);
  
  return new Response(null, {
    status: HttpStatus.OK,
    headers: {
      ...headers,
      [HttpHeader.CONTENT_TYPE]: ContentType.PLAIN,
    },
  });
}

// ============================================================================
// ROUTER CLASS
// ============================================================================

export class Router {
  private routes: RouteDefinition[] = [];
  private staticRoutes: Map<string, RouteHandler> = new Map();
  private wsHandler: RouteHandler | null = null;
  private wsPath: string | null = null;
  private corsEnabled: boolean = true;

  /**
   * Enable or disable CORS for this router
   */
  setCORS(enabled: boolean): this {
    this.corsEnabled = enabled;
    return this;
  }

  /**
   * Register a route with schemas and handler
   */
  map(
    method: string, 
    path: string, 
    options: { 
      schema?: RouteSchema; 
      handler: RouteHandler; 
      description?: string 
    } | RouteHandler
  ): this {
    if (typeof options === 'function') {
      this.routes.push({
        method: method.toUpperCase(),
        path,
        handler: options,
      });
    } else {
      this.routes.push({
        method: method.toUpperCase(),
        path,
        handler: options.handler,
        schema: options.schema,
        description: options.description,
      });
    }
    return this;
  }

  get(path: string, options: { schema?: RouteSchema; handler: RouteHandler; description?: string } | RouteHandler): this {
    return this.map(HttpMethod.GET, path, options);
  }

  post(path: string, options: { schema?: RouteSchema; handler: RouteHandler; description?: string } | RouteHandler): this {
    return this.map(HttpMethod.POST, path, options);
  }

  put(path: string, options: { schema?: RouteSchema; handler: RouteHandler; description?: string } | RouteHandler): this {
    return this.map(HttpMethod.PUT, path, options);
  }

  delete(path: string, options: { schema?: RouteSchema; handler: RouteHandler; description?: string } | RouteHandler): this {
    return this.map(HttpMethod.DELETE, path, options);
  }

  patch(path: string, options: { schema?: RouteSchema; handler: RouteHandler; description?: string } | RouteHandler): this {
    return this.map(HttpMethod.PATCH, path, options);
  }

  ws(path: string, handler: RouteHandler): this {
    this.wsHandler = handler;
    this.wsPath = path;
    return this;
  }

  /**
   * Set a special exact match route (bypasses regex/params)
   */
  set(path: string, handler: RouteHandler): this {
    this.staticRoutes.set(path, handler);
    return this;
  }

  getRoutes(): RouteDefinition[] {
    return [...this.routes];
  }

  getWsInfo(): { path: string | null; handler: RouteHandler | null } {
    return { path: this.wsPath, handler: this.wsHandler };
  }

  printRoutes(): void {
    console.log(' Endpoints:                                 ');
    
    for (const route of this.routes) {
      const method = route.method.padEnd(6);
      const path = route.path.padEnd(32);
      const desc = route.description ? ` — ${route.description}` : '';
      console.log(` ${method} ${path}${desc}`);
    }

    if (this.wsHandler && this.wsPath) {
      console.log(` WS    ${this.wsPath.padEnd(32)} — WebSocket connection `);
    }
  }

  /**
   * Path matching logic supporting parameters (:id) and wildcards (*)
   */
  private matchPath(routePath: string, actualPath: string): Record<string, string> | null {
    if (routePath === '*') return {};
    
    // Handle wildcard suffix (/api/*)
    if (routePath.endsWith('/*')) {
      const prefix = routePath.slice(0, -2);
      if (actualPath.startsWith(prefix) || actualPath === prefix) {
        return { '*': actualPath.slice(prefix.length) };
      }
      return null;
    }

    const routeParts = routePath.split('/').filter(Boolean);
    const actualParts = actualPath.split('/').filter(Boolean);

    if (routeParts.length !== actualParts.length) {
      return null;
    }

    const params: Record<string, string> = {};

    for (let i = 0; i < routeParts.length; i++) {
      if (routeParts[i].startsWith(':')) {
        const paramName = routeParts[i].slice(1);
        params[paramName] = decodeURIComponent(actualParts[i]);
      } else if (routeParts[i] !== actualParts[i]) {
        return null;
      }
    }

    return params;
  }

  /**
   * Match a request to a registered route
   */
  async match(req: Request): Promise<{ 
    handler: RouteHandler; 
    route: RouteDefinition; 
    params: any 
  } | null> {
    const url = new URL(req.url);
    const method = req.method.toUpperCase();
    const pathname = url.pathname;

    // 1. Check WS route
    if (this.wsHandler && pathname === this.wsPath) {
      return {
        handler: this.wsHandler,
        route: { method: 'WS', path: this.wsPath!, handler: this.wsHandler, description: 'WebSocket' },
        params: {}
      };
    }

    // 2. Check static routes (exact match)
    const staticHandler = this.staticRoutes.get(pathname);
    if (staticHandler) {
      return {
        handler: staticHandler,
        route: { method: '*', path: pathname, handler: staticHandler },
        params: {}
      };
    }

    // 3. Check parameter routes
    for (const route of this.routes) {
      if (route.method !== '*' && route.method !== method) continue;

      const params = this.matchPath(route.path, pathname);
      if (params) {
        return { handler: route.handler, route, params };
      }
    }

    return null;
  }

  /**
   * Apply CORS headers to a response
   */
  private applyCORSHeaders(response: Response, req: Request): Response {
    if (!this.corsEnabled) return response;
    
    const origin = req.headers.get('Origin') || '*';
    const corsHeaders = buildCORSHeaders(origin);
    
    // Merge CORS headers into existing response headers
    const newHeaders = new Headers(response.headers);
    for (const [key, value] of Object.entries(corsHeaders)) {
      newHeaders.set(key, value);
    }
    
    return new Response(response.body, {
      status: response.status,
      headers: newHeaders,
    });
  }

  /**
   * Main router execution logic
   */
  async execute(
    req: Request, 
    config: RouterConfig, 
    extras?: any
  ): Promise<Response | null | undefined> {
    const url = new URL(req.url);
    const method = req.method.toUpperCase();
    
    // Handle CORS preflight
    if (this.corsEnabled && method === HttpMethod.OPTIONS) {
      return handleCORSPreflight(req);
    }

    const matched = await this.match(req);
    if (!matched) return null;

    const { handler, route, params } = matched;

    // 1. Validate Path Params
    let validatedParams = params;
    if (route.schema?.params) {
      const result = route.schema.params.safeParse(params);
      if (!result.success) {
        return this.errorResponse('Invalid path parameters', result.error.issues, HttpStatus.BAD_REQUEST, req);
      }
      validatedParams = result.data;
    }

    // 2. Validate Query Params
    let validatedQuery: any = Object.fromEntries(url.searchParams.entries());
    if (route.schema?.query) {
      const result = route.schema.query.safeParse(validatedQuery);
      if (!result.success) {
        return this.errorResponse('Invalid query parameters', result.error.issues, HttpStatus.BAD_REQUEST, req);
      }
      validatedQuery = result.data;
    }

    // 3. Validate Body
    let validatedBody: any = null;
    if (req.method !== HttpMethod.GET && req.method !== HttpMethod.HEAD && req.method !== HttpMethod.OPTIONS) {
      if (route.schema?.body) {
        try {
          const contentType = req.headers.get(HttpHeader.CONTENT_TYPE);
          if (contentType?.includes(ContentType.JSON)) {
            const body = await req.json();
            const result = route.schema.body.safeParse(body);
            if (!result.success) {
              return this.errorResponse('Invalid request body', result.error.issues, HttpStatus.BAD_REQUEST, req);
            }
            validatedBody = result.data;
          }
        } catch (err) {
          return this.errorResponse('Malformed JSON body', String(err), HttpStatus.BAD_REQUEST, req);
        }
      }
    }

    // 4. Create Context and Run Handler
    const ctx: RouteContext = {
      req,
      config,
      body: validatedBody,
      params: validatedParams,
      query: validatedQuery,
      url,
      extras,
    };

    const response = await handler(ctx);
    
    // Apply CORS headers to response if enabled
    if (response && this.corsEnabled) {
      return this.applyCORSHeaders(response, req);
    }
    
    return response;
  }

  private errorResponse(message: string, details: any, status: number, req?: Request): Response {
    const response = new Response(JSON.stringify({ error: message, details }), {
      status,
      headers: { [HttpHeader.CONTENT_TYPE]: ContentType.JSON }
    });
    
    // Apply CORS headers to error responses as well
    if (req && this.corsEnabled) {
      return this.applyCORSHeaders(response, req);
    }
    
    return response;
  }
}

/**
 * Json response helper for handlers
 */
export function json(data: any, status: number = HttpStatus.OK, headers: any = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      [HttpHeader.CONTENT_TYPE]: ContentType.JSON,
      ...headers
    }
  });
}
