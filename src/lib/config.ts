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
 * - Backend URL and WebSocket URL helpers
 * 
 * @module lib/config
 * @version 2.2.0
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
 * DEFAULT BACKEND CONFIGURATION
 * ============================================
 * 
 * The backend server runs on port 3001 by default.
 * All frontend requests should go through these URLs.
 * 
 * IMPORTANT: For local development, the backend is always at localhost:3001.
 * for production deployments where the backend is on a different host.
 */

const DEFAULT_BACKEND_HOST = 'localhost';
const DEFAULT_BACKEND_PORT = '3001';

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
    environment: getEnvValue('NODE_ENV', ENVIRONMENT.DEFAULT) as AppConfig['environment'],
  },
});

// Cache for discovered services
let discoveredServicesCache: Record<string, string> = {};

/**
 * ============================================
 * SERVICE DISCOVERY
 * ============================================
 */

/**
 * Fetches the list of known services from the backend discovery endpoint
 */
export async function discoverServices(): Promise<Record<string, string>> {
  try {
    const backendUrl = getBackendUrl();
    const response = await fetch(`${backendUrl}/webhook/discovery`);
    if (response.ok) {
      const data = await response.json();
      discoveredServicesCache = data.services || {};
      return discoveredServicesCache;
    }
  } catch (err) {
    console.warn('[Discovery] Failed to fetch services:', err);
  }
  return discoveredServicesCache;
}

/**
 * Resolves a service URL by name
 * Priority: 
 * 1. Matching VITE_{NAME}_URL env var
 * 2. Discovered service from backend
 * 3. Default fallback (current backend)
 */
export function resolveServiceUrl(name: string, fallback?: string): string {
  // Try environment variable first (e.g., VITE_MEDIA_SERVICE_URL)
  const envKey = `VITE_${name.toUpperCase().replace(/-/g, '_')}_URL`;
  const envValue = getEnvValue(envKey, '');
  if (envValue) return envValue;

  // Try discovered services
  if (discoveredServicesCache[name]) {
    return discoveredServicesCache[name];
  }

  // Fallback to provided default or backend URL
  return fallback || getBackendUrl();
}

/**
 * ============================================
 * BACKEND URL HELPERS
 * ============================================
 */

/**
 * Get the backend HTTP URL
 * 
 * Resolves the backend server URL with proper fallback:
 * - Falls back to http://localhost:3001
 * 
 * @returns The backend HTTP URL
 */
export function getBackendUrl(): string {
  // Try VITE_BACKEND_URL first (preferred)
  let url = getEnvValue('VITE_BACKEND_URL', '');
  if (url) return url;
  
  // Default to localhost:3001
  return `http://localhost:${DEFAULT_BACKEND_PORT}`;
}

/**
 * Get the WebSocket URL for real-time alerts
 * 
 * @returns The WebSocket URL (ws:// or wss://)
 * @example
 * ```typescript
 * // For local development: ws://localhost:3001/ws
 * // For production: wss://your-backend.com/ws
 * ```
 */
export function getWebSocketUrl(): string {
  const backendUrl = getBackendUrl();
  // Convert http/https to ws/wss
  return backendUrl.replace(/^http/, 'ws') + '/ws';
}

/**
 * Get a full URL for a backend endpoint
 * 
 * @param path - The API path (e.g., '/webhook/save')
 * @returns The full URL
 */
export function getBackendEndpoint(path: string): string {
  const base = getBackendUrl();
  const cleanPath = path.startsWith('/') ? path : '/' + path;
  return `${base}${cleanPath}`;
}

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
