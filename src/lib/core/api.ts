/**
 * Core API Module
 * 
 * Provides a simple fetch-based API for making HTTP requests to the backend.
 * This module wraps the native fetch API with common configurations and utilities.
 * 
 * @module lib/core/api
 * @version 1.0.0
 */

// =============================================================================
// Types
// =============================================================================

/**
 * HTTP methods supported by the API
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * Options for API requests
 */
export interface ApiRequestOptions {
  /** Request method */
  method?: HttpMethod;
  /** Request headers */
  headers?: Record<string, string>;
  /** Request body (will be JSON stringified if object) */
  body?: unknown;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Whether to include credentials (cookies) */
  credentials?: RequestCredentials;
}

/**
 * API response wrapper
 */
export interface ApiResponse<T> {
  /** Response data */
  data: T;
  /** HTTP status code */
  status: number;
  /** Whether the response was successful */
  ok: boolean;
}

/**
 * API error class
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public response?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// =============================================================================
// Configuration
// =============================================================================

/**
 * Default API configuration
 * Uses relative URL in production, localhost:3001 for development
 */
const DEFAULT_CONFIG = {
  baseUrl: getApiBaseUrl(),
  timeout: 30000,
  credentials: 'same-origin' as RequestCredentials,
};

/**
 * Get the API base URL based on environment
 * In production, uses relative URL (same origin)
 */
function getApiBaseUrl(): string {
  // Check if running in production by examining window.location
  // This is more reliable than NODE_ENV which may not be set correctly at runtime
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    
    // In production, the app is served from the same origin as the backend
    // If we're not on localhost or file://, use relative URL
    if (hostname !== 'localhost' && hostname !== '127.0.0.1' && protocol !== 'file:') {
      return ''; // Use relative URL in production
    }
  }
  
  // Default to localhost:3001 for development
  return 'http://localhost:3001';
}

// =============================================================================
// API Client
// =============================================================================

/**
 * Core API client for making HTTP requests
 */
class CoreApi {
  private baseUrl: string;
  private timeout: number;
  private credentials: RequestCredentials;
  private defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  constructor(config?: Partial<typeof DEFAULT_CONFIG>) {
    this.baseUrl = config?.baseUrl ?? DEFAULT_CONFIG.baseUrl;
    this.timeout = config?.timeout ?? DEFAULT_CONFIG.timeout;
    this.credentials = config?.credentials ?? DEFAULT_CONFIG.credentials;
  }

  /**
   * Set the base URL for all requests
   */
  setBaseUrl(url: string): void {
    this.baseUrl = url;
  }

  /**
   * Set default headers for all requests
   */
  setDefaultHeader(key: string, value: string): void {
    this.defaultHeaders[key] = value;
  }

  /**
   * Set authorization token
   */
  setAuthToken(token: string): void {
    this.defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  /**
   * Clear authorization token
   */
  clearAuthToken(): void {
    delete this.defaultHeaders['Authorization'];
  }

  /**
   * Build full URL from path
   */
  private buildUrl(path: string, queryParams?: Record<string, string>): string {
    // If path is absolute URL, use it directly
    if (path.startsWith('http')) {
      return path;
    }
    
    // If baseUrl is empty (production with same origin), use relative path
    if (!this.baseUrl) {
      const url = path.startsWith('/') ? path : '/' + path;
      if (queryParams) {
        const params = new URLSearchParams(queryParams);
        return `${url}?${params.toString()}`;
      }
      return url;
    }
    
    const url = `${this.baseUrl}${path.startsWith('/') ? path : '/' + path}`;
    
    if (queryParams) {
      const params = new URLSearchParams(queryParams);
      return `${url}?${params.toString()}`;
    }
    
    return url;
  }

  /**
   * Execute a fetch request with timeout
   */
  private async fetchWithTimeout(
    url: string,
    options: RequestInit
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        credentials: this.credentials,
      });
      return response;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new ApiError('Request timeout', 408);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Make an API request
   */
  async request<T>(path: string, options: ApiRequestOptions = {}): Promise<ApiResponse<T>> {
    const {
      method = 'GET',
      headers = {},
      body,
      timeout = this.timeout,
    } = options;

    // Build headers
    const requestHeaders: Record<string, string> = {
      ...this.defaultHeaders,
      ...headers,
    };

    // Prepare body
    let requestBody: BodyInit | undefined;
    if (body !== undefined) {
      if (typeof body === 'string') {
        requestBody = body;
      } else if (body instanceof FormData) {
        requestBody = body;
        delete requestHeaders['Content-Type']; // Let browser set boundary
      } else {
        requestBody = JSON.stringify(body);
      }
    }

    // Build URL
    const url = this.buildUrl(path);

    try {
      const response = await this.fetchWithTimeout(url, {
        method,
        headers: requestHeaders,
        body: requestBody,
      });

      // Parse response
      let data: T;
      const contentType = response.headers.get('content-type');
      
      if (contentType?.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text() as T;
      }

      if (!response.ok) {
        throw new ApiError(
          (data as Record<string, unknown>)?.message as string || `HTTP ${response.status}`,
          response.status,
          data
        );
      }

      return {
        data,
        status: response.status,
        ok: response.ok,
      };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        error instanceof Error ? error.message : 'Network request failed',
        0
      );
    }
  }

  /**
   * GET request
   */
  async get<T>(path: string, queryParams?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.request<T>(path, { method: 'GET', queryParams } as ApiRequestOptions);
  }

  /**
   * POST request
   */
  async post<T>(path: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(path, { method: 'POST', body });
  }

  /**
   * PUT request
   */
  async put<T>(path: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(path, { method: 'PUT', body });
  }

  /**
   * PATCH request
   */
  async patch<T>(path: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(path, { method: 'PATCH', body });
  }

  /**
   * DELETE request
   */
  async delete<T>(path: string): Promise<ApiResponse<T>> {
    return this.request<T>(path, { method: 'DELETE' });
  }
}

// =============================================================================
// Default API Instance
// =============================================================================

/**
 * Default API instance with common configuration
 */
export const api = new CoreApi();

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Create a new API instance with custom configuration
 */
export function createApi(config?: Partial<typeof DEFAULT_CONFIG>): CoreApi {
  return new CoreApi(config);
}

/**
 * Generate preview URL for an overlay
 * 
 * @param boxId - The box ID to generate preview for
 * @param variant - The variant data to preview
 * @returns The preview URL
 */
export async function generatePreviewUrl(
  boxId: string,
  variant: unknown
): Promise<string | null> {
  try {
    const response = await api.post<{ previewUrl: string }>('/webhook/save', {
      key: boxId,
      data: {
        variant,
        preview: true,
      },
    });
    
    return response.data.previewUrl;
  } catch (error) {
    console.error('Failed to generate preview URL:', error);
    return null;
  }
}

// =============================================================================
// Export Types
// =============================================================================

export type { CoreApi as ApiClient };
