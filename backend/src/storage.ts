/**
 * Storage Module - JsonObjManager Integration
 * 
 * Provides persistent storage using JsonObjManager with file-based adapter.
 * Supports saving overlay data and generating preview URLs.
 * 
 * @module backend/storage
 * @version 1.0.0
 */

import { JsonObjManager, createManager, type StorageAdapter, type ManagerConfig } from 'json-obj-manager';
import { readFile, writeFile, mkdir, readdir, rm } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname, basename, extname } from 'path';

// ============================================================================
// CONFIGURATION
// ============================================================================

const STORAGE_DIR = process.env.STORAGE_DIR ?? './data';
const PREVIEW_BASE_URL = process.env.PREVIEW_BASE_URL ?? 'http://localhost:3000/preview';

// ============================================================================
// FILE ADAPTER
// ============================================================================

/**
 * File-based storage adapter for JsonObjManager
 * Stores each key as a separate JSON file in the specified directory
 */
class FileStorageAdapter<T = unknown> implements StorageAdapter<T> {
  private dirPath: string;
  private extension: string;

  constructor(dirPath: string = STORAGE_DIR, extension: string = '.json') {
    this.dirPath = dirPath;
    this.extension = extension;
  }

  private async ensureDir(): Promise<void> {
    if (!existsSync(this.dirPath)) {
      await mkdir(this.dirPath, { recursive: true });
    }
  }

  private getFilePath(key: string): string {
    // Sanitize key to be a valid filename
    const safeKey = key.replace(/[^a-zA-Z0-9_-]/g, '_');
    return join(this.dirPath, `${safeKey}${this.extension}`);
  }

  async get(key: string): Promise<T | null> {
    try {
      const filePath = this.getFilePath(key);
      if (!existsSync(filePath)) {
        return null;
      }
      const content = await readFile(filePath, 'utf-8');
      return JSON.parse(content) as T;
    } catch (error) {
      console.error(`[Storage] Error reading key "${key}":`, error);
      return null;
    }
  }

  async set(key: string, data: T): Promise<void> {
    try {
      await this.ensureDir();
      const filePath = this.getFilePath(key);
      await writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
      console.error(`[Storage] Error writing key "${key}":`, error);
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      const filePath = this.getFilePath(key);
      if (existsSync(filePath)) {
        await rm(filePath);
      }
    } catch (error) {
      console.error(`[Storage] Error deleting key "${key}":`, error);
      throw error;
    }
  }

  async has(key: string): Promise<boolean> {
    const filePath = this.getFilePath(key);
    return existsSync(filePath);
  }

  async keys(): Promise<string[]> {
    try {
      await this.ensureDir();
      const files = await readdir(this.dirPath);
      return files
        .filter(f => f.endsWith(this.extension))
        .map(f => basename(f, this.extension));
    } catch (error) {
      console.error('[Storage] Error listing keys:', error);
      return [];
    }
  }

  async clear(): Promise<void> {
    try {
      await this.ensureDir();
      const files = await readdir(this.dirPath);
      await Promise.all(
        files
          .filter(f => f.endsWith(this.extension))
          .map(f => rm(join(this.dirPath, f)))
      );
    } catch (error) {
      console.error('[Storage] Error clearing storage:', error);
      throw error;
    }
  }
}

// ============================================================================
// STORAGE MANAGER
// ============================================================================

/** Default storage configuration */
const defaultConfig: ManagerConfig = {
  name: 'overlay-storage',
  cloneOnLoad: true,
  cloneOnSave: true,
  strict: false,
};

/** Global storage manager instance */
let storageManager: JsonObjManager | null = null;

/**
 * Initialize the storage manager with file adapter
 */
export function initializeStorage(dirPath: string = STORAGE_DIR): JsonObjManager {
  if (storageManager) {
    return storageManager;
  }

  const adapter = new FileStorageAdapter(dirPath);
  
  storageManager = createManager({
    ...defaultConfig,
    adapter,
  });

  console.log(`[Storage] Initialized at: ${dirPath}`);
  return storageManager;
}

/**
 * Get the storage manager instance
 */
export function getStorage(): JsonObjManager {
  if (!storageManager) {
    return initializeStorage();
  }
  return storageManager;
}

// ============================================================================
// PREVIEW URL GENERATOR
// ============================================================================

/**
 * Generate a unique preview ID
 */
function generatePreviewId(): string {
  return `preview-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Generate a preview URL for saved overlay data
 */
export function generatePreviewUrl(overlayId: string): string {
  const previewId = generatePreviewId();
  const url = new URL(PREVIEW_BASE_URL);
  url.searchParams.set('id', overlayId);
  url.searchParams.set('preview', previewId);
  return url.toString();
}

/**
 * Generate a preview URL with custom parameters
 */
export function generatePreviewUrlWithParams(
  overlayId: string, 
  params: Record<string, string> = {}
): string {
  const previewId = generatePreviewId();
  const url = new URL(PREVIEW_BASE_URL);
  url.searchParams.set('id', overlayId);
  url.searchParams.set('preview', previewId);
  
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  
  return url.toString();
}

// ============================================================================
// STORAGE HELPERS
// ============================================================================

/**
 * Save overlay data and return preview URL
 */
export async function saveOverlayData(
  key: string, 
  data: unknown
): Promise<{ key: string; previewUrl: string }> {
  const storage = getStorage();
  
  // Save the data
  await storage.set(key, data as any);
  
  // Generate preview URL
  const previewUrl = generatePreviewUrl(key);
  
  return { key, previewUrl };
}

/**
 * Load overlay data by key
 */
export async function loadOverlayData<T = unknown>(
  key: string, 
  fallback?: T
): Promise<T | null> {
  const storage = getStorage();
  return await storage.get(key, fallback) as T | null;
}

/**
 * Delete overlay data by key
 */
export async function deleteOverlayData(key: string): Promise<boolean> {
  const storage = getStorage();
  const existed = await storage.has(key);
  await storage.delete(key);
  return existed;
}

/**
 * List all saved overlay keys
 */
export async function listOverlayKeys(): Promise<string[]> {
  const storage = getStorage();
  return await storage.keys();
}

/**
 * Get all overlay data
 */
export async function getAllOverlayData(): Promise<Record<string, unknown>> {
  const storage = getStorage();
  return await storage.all();
}

// ============================================================================
// EXPORTS
// ============================================================================

export { FileStorageAdapter };
export type { FileStorageAdapter as FileStorage };
