/**
 * System Route Handlers
 * 
 * Defines health check, discovery, and static file serving routes.
 * 
 * @module backend/routes/system
 * @version 1.0.0
 */

import { Router, json } from '../router-engine';
import { 
  ApiPath, 
  HttpStatus, 
  HttpHeader, 
  ContentType,
  ServiceName,
  Discovery as DiscoveryConfig,
  CacheControl,
} from '../constants';
import { join } from 'path';

// Optional import for embedded assets
let embeddedAssets: any = {};
try {
  // @ts-ignore - may not exist during development
  const assets = await import('../embedded-assets');
  embeddedAssets = assets.embeddedAssets;
} catch (e) {
  // Fallback to empty if not built
}


// ============================================================================
// HELPERS
// ============================================================================

/**
 * Build discovery service map from discovered services
 */
function buildDiscoveryServiceMap(config: any): Record<string, string> {
  const services = config.discovery ? (config.discovery as any).getInternalRegistry().getAll() : [];
  return services.reduce((acc: Record<string, string>, s: any) => {
    if (s && s.name) {
      acc[s.name] = `${s.schema || DiscoveryConfig.DEFAULT_SCHEMA}://${s.ip}:${s.port}`;
    }
    return acc;
  }, {} as Record<string, string>);
}

/**
 * Static file serving logic
 */
async function handleStaticFile(req: Request, distPath: string): Promise<Response | null> {
  const url = new URL(req.url);
  const filePath = url.pathname === ApiPath.ROOT ? ApiPath.INDEX_HTML : url.pathname;

  // 1. Check embedded assets (used when compiled)
  if (embeddedAssets && embeddedAssets[filePath]) {
    const asset = embeddedAssets[filePath];
    return new Response(asset.content, {
      headers: { [HttpHeader.CONTENT_TYPE]: asset.type }
    });
  }

  // 2. Service static frontend files from disk (development)
  const fullPath = join(distPath, filePath);
  const file = Bun.file(fullPath);
  
  if (await file.exists()) {
    return new Response(file);
  }

  // 3. SPA Fallback
  const isHtmlRequest = req.headers.get('accept')?.includes('text/html');
  const hasExtension = url.pathname.includes('.');
  if (isHtmlRequest || !hasExtension) {
    // Check embedded index first
    if (embeddedAssets && embeddedAssets[ApiPath.INDEX_HTML]) {
      const asset = embeddedAssets[ApiPath.INDEX_HTML];
      return new Response(asset.content, {
        headers: { [HttpHeader.CONTENT_TYPE]: asset.type }
      });
    }

    const indexFile = Bun.file(join(distPath, ApiPath.INDEX_HTML));
    if (await indexFile.exists()) {
      return new Response(indexFile, {
        headers: { [HttpHeader.CONTENT_TYPE]: ContentType.HTML }
      });
    }
  }

  return null;
}

// ============================================================================
// ROUTE REGISTRATION
// ============================================================================

export function registerSystemRoutes(router: Router): void {
  
  // Health check
  router.get(ApiPath.HEALTH, () => {
    return json({ status: 'ok', timestamp: Date.now() });
  });

  // Discovery endpoint
  router.get(ApiPath.WEBHOOK_DISCOVERY, (ctx) => {
    const serviceMap = buildDiscoveryServiceMap(ctx.config);
    const manualMediaUrl = process.env.MEDIA_UPLOAD_API_URL;
    
    // Use current host as proxy for media-upload-api if it exists in map or is manual
    if (serviceMap[ServiceName.MEDIA_UPLOAD_API] || manualMediaUrl) {
      serviceMap[ServiceName.MEDIA_UPLOAD_API] = ctx.url.origin;
    }

    return json({
      services: serviceMap,
      self: { 
        id: ctx.config.discovery?.getServiceId(), 
        name: ServiceName.OVERLAY_SERVICE 
      }
    }, HttpStatus.OK, {
      [HttpHeader.CACHE_CONTROL]: CacheControl.NO_CACHE
    });
  });

  // WebSocket (handled differently in Bun, but registered for logging)
  router.ws(ApiPath.WS, () => null);

  // Static file fallback (catch-all) using wildcard *
  router.get('*', async (ctx) => {
    return handleStaticFile(ctx.req, ctx.config.distPath);
  });
}
