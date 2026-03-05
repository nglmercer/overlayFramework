/**
 * Router Engine for the Overlay Backend Server
 * 
 * Core routing logic that handles:
 * - Path parameter extraction (:id)
 * - Zod schema validation for body, params, and query
 * - Middleware-like handling logic
 * 
 * @module backend/src/router-engine
 * @version 1.1.0
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
// ROUTER CLASS
// ============================================================================

export class Router {
  private routes: RouteDefinition[] = [];
  private staticRoutes: Map<string, RouteHandler> = new Map();
  private wsHandler: RouteHandler | null = null;
  private wsPath: string | null = null;

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
      const desc = route.description ? ` \u2014 ${route.description}` : '';
      console.log(` ${method} ${path}${desc}`);
    }

    if (this.wsHandler && this.wsPath) {
      console.log(` WS    ${this.wsPath.padEnd(32)} \u2014 WebSocket connection `);
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
   * Main router execution logic
   */
  async execute(
    req: Request, 
    config: RouterConfig, 
    extras?: any
  ): Promise<Response | null | undefined> {
    const matched = await this.match(req);
    if (!matched) return null;

    const { handler, route, params } = matched;
    const url = new URL(req.url);

    // 1. Validate Path Params
    let validatedParams = params;
    if (route.schema?.params) {
      const result = route.schema.params.safeParse(params);
      if (!result.success) {
        return this.errorResponse('Invalid path parameters', result.error.issues, HttpStatus.BAD_REQUEST);
      }
      validatedParams = result.data;
    }

    // 2. Validate Query Params
    let validatedQuery: any = Object.fromEntries(url.searchParams.entries());
    if (route.schema?.query) {
      const result = route.schema.query.safeParse(validatedQuery);
      if (!result.success) {
        return this.errorResponse('Invalid query parameters', result.error.issues, HttpStatus.BAD_REQUEST);
      }
      validatedQuery = result.data;
    }

    // 3. Validate Body
    let validatedBody: any = null;
    if (req.method !== HttpMethod.GET && req.method !== HttpMethod.HEAD) {
      if (route.schema?.body) {
        try {
          const contentType = req.headers.get(HttpHeader.CONTENT_TYPE);
          if (contentType?.includes(ContentType.JSON)) {
            const body = await req.json();
            const result = route.schema.body.safeParse(body);
            if (!result.success) {
              return this.errorResponse('Invalid request body', result.error.issues, HttpStatus.BAD_REQUEST);
            }
            validatedBody = result.data;
          }
        } catch (err) {
          return this.errorResponse('Malformed JSON body', String(err), HttpStatus.BAD_REQUEST);
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

    return handler(ctx);
  }

  private errorResponse(message: string, details: any, status: number): Response {
    return new Response(JSON.stringify({ error: message, details }), {
      status,
      headers: { [HttpHeader.CONTENT_TYPE]: ContentType.JSON }
    });
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
      [HttpHeader.ACCESS_CONTROL_ALLOW_ORIGIN]: '*',
      ...headers
    }
  });
}
