/**
 * Backup Data Mapper
 *
 * Provides utilities for mapping and validating backup data from backend
 * during profile sync operations. Ensures all items have required IDs
 * before persisting to IndexedDB.
 *
 * @module lib/backup-mapper
 * @version 1.0.0
 */

import type { AlertBox, AlertVariant, TemplateDB } from './core';

/**
 * Base interface for database items that require an ID
 */
export interface DatabaseItem {
  id: string;
  [key: string]: unknown;
}

/**
 * Raw backup data entry that may or may not have an ID
 */
interface RawBackupEntry {
  id?: string;
  [key: string]: unknown;
}

/**
 * Result of mapping operation with validation
 */
export interface MapResult<T> {
  items: T[];
  skipped: number;
  errors: string[];
}

/**
 * Maps raw backup entries to DatabaseItem array.
 * Filters out entries without valid IDs.
 *
 * @param entries - Raw entries from backup data (Object.entries result)
 * @param entityName - Name for error logging (e.g., 'boxes', 'variants')
 * @returns MapResult with valid items and metadata
 */
function mapEntriesToDatabaseItems(
  entries: [string, RawBackupEntry][],
  entityName: string
): MapResult<DatabaseItem> {
  const items: DatabaseItem[] = [];
  const errors: string[] = [];
  let skipped = 0;

  for (const [entryId, entryData] of entries) {
    // Create a typed object - id is required for DatabaseItem
    const item: DatabaseItem = {
      id: entryData.id ?? entryId,
      ...entryData,
    } as DatabaseItem;

    // Validate that the item has a valid ID (not empty)
    if (!item.id || typeof item.id !== 'string' || item.id.trim() === '') {
      skipped++;
      errors.push(`[BackupMapper] Skipped ${entityName} entry with missing/invalid ID (key: ${entryId})`);
      continue;
    }

    items.push(item);
  }

  if (errors.length > 0) {
    console.warn(`[BackupMapper] ${entityName} mapping completed with ${errors.length} warnings:`, errors);
  }

  return { items, skipped, errors };
}

/**
 * Maps backup boxes data to AlertBox array.
 * Filters out entries without valid IDs.
 *
 * @param boxesData - Raw boxes data from backup (Object)
 * @returns MapResult with valid AlertBox items
 */
export function mapBackupBoxes(boxesData: Record<string, unknown>): MapResult<AlertBox> {
  const entries = Object.entries(boxesData) as [string, RawBackupEntry][];
  const result = mapEntriesToDatabaseItems(entries, 'boxes');

  return {
    items: result.items as AlertBox[],
    skipped: result.skipped,
    errors: result.errors,
  };
}

/**
 * Maps backup variants data to AlertVariant array.
 * Filters out entries without valid IDs.
 *
 * @param variantsData - Raw variants data from backup (Object)
 * @returns MapResult with valid AlertVariant items
 */
export function mapBackupVariants(variantsData: Record<string, unknown>): MapResult<AlertVariant> {
  const entries = Object.entries(variantsData) as [string, RawBackupEntry][];
  const result = mapEntriesToDatabaseItems(entries, 'variants');

  return {
    items: result.items as AlertVariant[],
    skipped: result.skipped,
    errors: result.errors,
  };
}

/**
 * Maps backup templates data to TemplateDB array.
 * Filters out entries without valid IDs.
 *
 * @param templatesData - Raw templates data from backup (Object)
 * @returns MapResult with valid TemplateDB items
 */
export function mapBackupTemplates(templatesData: Record<string, unknown>): MapResult<TemplateDB> {
  const entries = Object.entries(templatesData) as [string, RawBackupEntry][];
  const result = mapEntriesToDatabaseItems(entries, 'templates');

  return {
    items: result.items as TemplateDB[],
    skipped: result.skipped,
    errors: result.errors,
  };
}

/**
 * Validates that an array of items all have valid IDs.
 * Returns the valid array or throws if any item is invalid.
 *
 * @param items - Array of items to validate
 * @param entityName - Name for error message
 * @throws Error if any item is missing a valid ID
 */
export function validateDatabaseItems<T extends DatabaseItem>(
  items: T[],
  entityName: string
): void {
  const invalidItems = items.filter(item => !item.id || typeof item.id !== 'string');

  if (invalidItems.length > 0) {
    throw new Error(
      `[BackupMapper] Invalid ${entityName}: ${invalidItems.length} item(s) missing required 'id' field`
    );
  }
}
