/**
 * Configuration Module
 * 
 * Handles application configuration with environment variable resolution
 * and Zod-based validation.
 * 
 * Provides:
 * - Environment variable resolution (Vite and Node.js)
 * - Type-safe configuration with Zod schemas
 * - Helper functions for environment detection and URL building
 * - Factory functions for creating configurations
 * 
 * @module lib/config
 * @version 2.1.0
 */

import { 
  AppConfigSchema, 
  AppConfig,
  EnvironmentSchema,
  validateAppConfig,
  createAppConfig,
  getEnvironment,
  isEnvironment,
} from './core';

// Import constants
import { ENVIRONMENT, CONFIG } from './constants';

/**
 * ============================================
 * ENVIRONMENT RESOLUTION
 * ============================================
 * 
 * Handles fallback when Vite env is unavailable, resolving 
 * TypeScript import.meta.env issues and allowing alternative configurations.
 */

/**
 * Attempts to get an environment variable value with fallback support
 * Tries multiple sources: Vite's import.meta.env, Node process.env
 * 
 * @param key - The environment variable key to look up
 * @param fallback - Default value if key is not found
 * @returns The resolved value or fallback
 */
function getEnvValue(key: string, fallback: string): string {
  // Try Vite's import.meta.env first
  try {
    const env = (import.meta as unknown as { env?: Record<string, string> }).env;
    if (env && typeof env === 'object' && key in env) {
      return env[key];
    }
  } catch {
    // import.meta.env might be unavailable in some contexts
  }
  
  // Fall back to Node.js process.env
  if (typeof process !== 'undefined' && process?.env && key in process.env) {
    return process.env[key] as string;
  }

  return fallback;
}

/**
 * ============================================
 * CONFIGURATION BUILDING
 * ============================================
 */

// Use pre-built validator from core
const validateConfig = validateAppConfig;

/**
 * Application configuration object
 * Uses Zod schema for type safety and validation
 * 
 * @example
 * ```typescript
 * // Access config values
 * console.log(appConfig.mediaUrl); // 'http://localhost:3000/media'
 * console.log(appConfig.environment); // 'development'
 * 
 * // Check environment
 * if (appConfig.environment === 'production') {
 *   // Production-specific logic
 * }
 * ```
 */
export const appConfig: AppConfig = createAppConfig({
  data: {
    mediaUrl: getEnvValue('VITE_MEDIA_URL', ENVIRONMENT.MEDIA_URL.DEFAULT),
    baseMediaUrl: getEnvValue('VITE_BASE_MEDIA_URL', ENVIRONMENT.MEDIA_URL.CDN),
    apiEndpoint: getEnvValue('VITE_API_ENDPOINT', ''),
    environment: getEnvValue('NODE_ENV', ENVIRONMENT.DEFAULT) as AppConfig['environment'],
  },
});

/**
 * ============================================
 * CONFIGURATION HELPERS
 * ============================================
 */

/**
 * Check if the application is running in development mode
 * 
 * @returns True if environment is 'development'
 */
export function isDevelopment(): boolean {
  return isEnvironment('development');
}

/**
 * Check if the application is running in production mode
 * 
 * @returns True if environment is 'production'
 */
export function isProduction(): boolean {
  return isEnvironment('production');
}

/**
 * Check if the application is running in test mode
 * 
 * @returns True if environment is 'test'
 */
export function isTest(): boolean {
  return isEnvironment('test');
}

/**
 * Get the full media URL for a given path
 * 
 * @param path - The relative path to the media file
 * @returns The full absolute URL
 */
export function getMediaUrl(path: string): string {
  // If already absolute URL, return as-is
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  // Remove leading slash if present
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `${appConfig.mediaUrl}/${cleanPath}`;
}

/**
 * Get the CDN base URL for assets
 * 
 * @param path - Optional path to append
 * @returns The base CDN URL or full path if provided
 */
export function getCdnUrl(path?: string): string {
  if (!path) return appConfig.baseMediaUrl;
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `${appConfig.baseMediaUrl}/${cleanPath}`;
}

/**
 * Reload configuration from environment
 * Useful when environment variables change at runtime
 * 
 * @returns New AppConfig instance
 */
export function reloadConfig(): AppConfig {
  return createAppConfig({
    data: {
      mediaUrl: getEnvValue('VITE_MEDIA_URL', ENVIRONMENT.MEDIA_URL.DEFAULT),
      baseMediaUrl: getEnvValue('VITE_BASE_MEDIA_URL', ENVIRONMENT.MEDIA_URL.CDN),
      apiEndpoint: getEnvValue('VITE_API_ENDPOINT', ''),
      environment: getEnvValue('NODE_ENV', ENVIRONMENT.DEFAULT) as AppConfig['environment'],
    },
  });
}

/**
 * ============================================
 * RE-EXPORTS
 * ============================================
 */

export type { AppConfig } from './core';
export { AppConfigSchema, EnvironmentSchema } from './core';

// Re-export factory functions for convenience
export { createAppConfig, getEnvironment, isEnvironment } from './core';

// Export constants for convenience
export { CONFIG, ENVIRONMENT } from './constants';
