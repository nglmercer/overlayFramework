import { MediaHandler } from './types';
import { getBackendUrl } from '../lib/config';

class MediaRegistry {
  private handlers: Map<string, (url: string) => string> = new Map();

  /**
   * Register a new URL handler.
   * @param protocol The protocol or prefix to handle (e.g., 'asset:', 'id:')
   * @param parser A function that takes the raw URL and returns the parsed URL
   */
  registerHandler(protocol: string, parser: (url: string) => string) {
    this.handlers.set(protocol, parser);
  }

  /**
   * Resolves a URL using registered handlers.
   * If no handler matches, returns the original URL.
   */
  resolve(url: string): string {
    if (!url || typeof url !== 'string' || url === 'undefined') return '';
    
    // If it's a relative path starting with /api/ or /uploads/, point to backend
    if (url.startsWith('/api/') || url.startsWith('/uploads/')) {
      return `${getBackendUrl()}${url}`;
    }

    for (const [protocol, parser] of this.handlers.entries()) {
      if (typeof url === 'string' && url.startsWith(protocol)) {
        return parser(url);
      }
    }
    return url;
  }

  /**
   * Helper to register a simple replacement handler
   */
  registerBaseUrlHandler(protocol: string, baseUrl: string) {
    this.registerHandler(protocol, (url) => {
      const path = url.replace(protocol, '');
      return `${baseUrl}/${path}`.replace(/\/+/g, '/').replace(':/', '://');
    });
  }
}

import { appConfig } from '../lib/config';

export const mediaRegistry = new MediaRegistry();

// Default handlers
mediaRegistry.registerBaseUrlHandler('asset:', 'https://cdn.example.com/assets');
mediaRegistry.registerBaseUrlHandler('media:', appConfig.mediaUrl);

mediaRegistry.registerHandler('id:', (url) => {
  const id = url.replace('id:', '');
  const baseUrl = appConfig.baseMediaUrl;
  return `${baseUrl}/media/${id}`;
});
