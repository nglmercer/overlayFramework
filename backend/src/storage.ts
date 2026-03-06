/**
 * Storage Module - idb-manager Integration
 * 
 * Provides persistent storage using idb-manager with NodeAdapter.
 * Supports saving overlay data, generating preview URLs, and advanced operations.
 * 
 * @module backend/storage
 * @version 3.0.0
 */

import { dbManager } from './db';
import { existsSync } from 'fs';
import { mkdir } from 'fs/promises';
import { dirname } from 'path';

// ============================================================================
// CONFIGURATION
// ============================================================================

const STORAGE_DIR = process.env.STORAGE_DIR ?? './data';
const STORAGE_FILE = process.env.STORAGE_FILE ?? './data/storage.json';
const PREVIEW_BASE_URL = process.env.PREVIEW_BASE_URL ?? 'http://localhost:3001/preview.html';

// ============================================================================
// STORAGE MANAGER (Legacy Support)
// ============================================================================

/**
 * Initialize the storage manager
 * Re-implemented with idb-manager.
 */
export async function initializeStorage(): Promise<void> {
  await dbManager.init();
}

/**
 * Initialize storage with per-key file storage
 * Legacy support for API compatibility.
 */
export async function initializeKeyFileStorage(dirPath: string = STORAGE_DIR): Promise<void> {
  await dbManager.init();
}

/**
 * Get the storage manager instance
 * DEPRECATED: Use dbManager directly or storage helper functions.
 */
export function getStorage(): any {
  return dbManager;
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
  // Save the data using dbManager
  await dbManager.saveOverlay(key, data);
  
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
  const data = await dbManager.loadOverlay(key);
  // Important: dbManager returns {id, ...data}, but loadOverlayData callers expect just data
  if (!data) return (fallback as T) || null;
  const { id, ...rest } = data;
  return rest as T;
}

/**
 * Delete overlay data by key
 */
export async function deleteOverlayData(key: string): Promise<boolean> {
  return await dbManager.deleteOverlay(key);
}

/**
 * List all saved overlay keys
 */
export async function listOverlayKeys(): Promise<string[]> {
  return await dbManager.listOverlays();
}

/**
 * Get all overlay data
 */
export async function getAllOverlayData(): Promise<Record<string, unknown>> {
  return await dbManager.getAllOverlays();
}

/**
 * Get overlay statistics
 */
export async function getOverlayStats() {
  return await dbManager.getOverlayStats();
}

/**
 * Batch save multiple overlays
 */
export async function saveManyOverlays(items: Array<{ key: string; data: unknown }>): Promise<{ keys: string[]; success: boolean }> {
  const overlayItems = items.map(item => ({
    id: item.key,
    ...(item.data as object)
  }));
  const success = await dbManager.saveManyOverlays(overlayItems);
  return {
    keys: items.map(item => item.key),
    success
  };
}

/**
 * Batch delete multiple overlays
 */
export async function deleteManyOverlays(keys: string[]): Promise<{ deleted: string[]; failed: string[] }> {
  const success = await dbManager.deleteManyOverlays(keys);
  // If success is true, all were deleted; if false, some failed
  // For more granular info, we'd need to check individually
  return {
    deleted: success ? keys : [],
    failed: success ? [] : keys
  };
}

/**
 * Get database statistics
 */
export async function getDatabaseStats() {
  return await dbManager.getDatabaseStats();
}

/**
 * Export all data to backup format
 */
export async function exportData(): Promise<Record<string, any>> {
  return await dbManager.exportData();
}

/**
 * Import data from backup format
 */
export async function importData(backup: Record<string, any>): Promise<boolean> {
  return await dbManager.importData(backup);
}

// ============================================================================
// EXPORTS
// ============================================================================

// Legacy exports for compatibility
export { dbManager as storageManager };
