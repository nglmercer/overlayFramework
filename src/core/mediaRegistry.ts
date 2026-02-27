import { MediaHandler } from './types';

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
    if (!url) return '';
    
    for (const [protocol, parser] of this.handlers.entries()) {
      if (url.startsWith(protocol)) {
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

export const mediaRegistry = new MediaRegistry();

// Default handlers
mediaRegistry.registerBaseUrlHandler('asset:', 'https://cdn.example.com/assets');
mediaRegistry.registerBaseUrlHandler('media:', import.meta.env.VITE_MEDIA_URL || 'http://localhost:3000/media');

mediaRegistry.registerHandler('id:', (url) => {
  const id = url.replace('id:', '');
  const baseUrl = import.meta.env.VITE_BASE_MEDIA_URL || 'https://cdn.example.com';
  return `${baseUrl}/media/${id}`;
});
