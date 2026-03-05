/**
 * Proxy Route Handlers
 * 
 * Defines /api/* and /uploads/* routes for proxying to media-upload-api.
 * 
 * @module backend/routes/proxy
 * @version 1.0.0
 */

import { Router, json } from '../router-engine';
import { 
  ApiPath, 
  HttpStatus, 
  HttpHeader, 
  ContentType,
  HttpMethod,
  ServiceName,
} from '../constants';

// ============================================================================
// HELPERS
// ============================================================================

interface ProxyTarget {
  target: string;
  path: string;
  search: string;
}

/**
 * Get proxy target URL
 */
function getProxyTarget(url: URL, config: any): ProxyTarget | null {
  const isApiPath = url.pathname.startsWith(ApiPath.API);
  const isUploadsPath = url.pathname.startsWith(ApiPath.UPLOADS);
  const isMediaFile = /\.(mp4|webm|mp3|wav|ogg|jpg|jpeg|png|gif|svg)$/i.test(url.pathname);
  
  if (!isApiPath && !isUploadsPath && !isMediaFile) {
    return null;
  }

  const manualMediaUrl = process.env.MEDIA_UPLOAD_API_URL;
  const discovery = config.discovery;
  const mediaServices = discovery ? discovery.filter({ name: ServiceName.MEDIA_UPLOAD_API }) : [];
  
  if (manualMediaUrl || mediaServices.length > 0) {
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
 * Handle API proxy requests
 */
async function handleProxy(req: Request, config: any): Promise<Response | null> {
  const url = new URL(req.url);
  const proxyTarget = getProxyTarget(url, config);
  
  if (!proxyTarget) {
    return json({ 
      error: 'Service not found', 
      service: ServiceName.MEDIA_UPLOAD_API 
    }, HttpStatus.NOT_FOUND);
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
    return json({ 
      error: 'Proxy Error', 
      details: String(err) 
    }, HttpStatus.GATEWAY_TIMEOUT);
  }
}

// ============================================================================
// ROUTE REGISTRATION
// ============================================================================

export function registerProxyRoutes(router: Router): void {
  // Catch all /api requests (e.g., /api/media/123)
  router.map('*', '/api/*', (ctx) => {
    return handleProxy(ctx.req, ctx.config);
  });

  // Also catch /api exactly if needed
  router.map('*', '/api', (ctx) => {
    return handleProxy(ctx.req, ctx.config);
  });

  // Catch all /uploads requests
  router.map('*', '/uploads/*', (ctx) => {
    return handleProxy(ctx.req, ctx.config);
  });

  router.map('*', '/uploads', (ctx) => {
    return handleProxy(ctx.req, ctx.config);
  });
}
