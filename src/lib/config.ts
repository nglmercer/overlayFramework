/**
 * Safe configuration resolver wrapper
 * Handles fallback when Vite env is unavailable, resolving TypeScript import.meta.env issues
 * and allowing alternative configurations.
 */

// Basic interface for application configuration
export interface AppConfig {
  mediaUrl: string;
  baseMediaUrl: string;
  apiEndpoint?: string;
  environment: 'development' | 'production' | 'test';
}

function getEnvValue(key: string, fallback: string): string {
  try {
    // We cast to any to avoid TypeScript complaints when vite/client types are missing
    const env = (import.meta as any).env;
    if (env && typeof env === 'object' && env[key]) {
      return env[key];
    }
  } catch (e) {
    // Ignore error if import.meta.env is totally unavailable
  }
  
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
      return process.env[key] as string;
  }

  return fallback;
}

export const appConfig: AppConfig = {
  mediaUrl: getEnvValue('VITE_MEDIA_URL', 'http://localhost:3000/media'),
  baseMediaUrl: getEnvValue('VITE_BASE_MEDIA_URL', 'https://cdn.example.com'),
  environment: (getEnvValue('NODE_ENV', 'development') as any),
};
