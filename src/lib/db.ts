/**
 * Database Module - IndexedDB Wrapper (Powered by idb-manager)
 * 
 * Provides a clean interface for managing alert data in IndexedDB.
 * Handles persistence for alert boxes, variants, and templates.
 * 
 * Features:
 * - Type-safe CRUD operations with Zod validation
 * - Automatic data validation before persistence
 * - Powered by idb-manager for robust performance
 * - Cascade delete support
 * 
 * @module lib/db
 * @version 3.0.0
 */

import { IndexedDBManager } from 'idb-manager';
import { BrowserAdapter } from 'idb-manager/browser';
import { 
  AlertVariant, 
  AlertBox, 
  TemplateDB,
  validateAlertVariant,
  validateAlertBox,
  validateTemplate,
  createAlertVariant,
  createAlertBox,
  createTemplate,
  ValidationResult,
} from './core';

// Re-export types for convenience
export type { AlertVariant, AlertBox, TemplateDB };

// Import constants and utils
import { DB } from './constants';
import { normalizeAlertData } from './config';

/**
 * ============================================
 * DATABASE CONFIGURATION
 * ============================================
 */

const schema = {
  name: DB.NAME,
  version: DB.VERSION,
  stores: [
    { 
      name: DB.STORES.BOXES, 
      keyPath: 'id' 
    },
    { 
      name: DB.STORES.VARIANTS, 
      keyPath: 'id',
      indexes: [
        { name: DB.VARIANT_INDEXES.BOX_ID, keyPath: DB.VARIANT_INDEXES.BOX_ID, unique: false },
        { name: DB.VARIANT_INDEXES.TYPE, keyPath: DB.VARIANT_INDEXES.TYPE, unique: false }
      ]
    },
    { 
      name: DB.STORES.TEMPLATES, 
      keyPath: 'id' 
    }
  ]
};
const adapter = new BrowserAdapter();
// Initialize the manager
const db = new IndexedDBManager(schema,{
  adapter: adapter,
});

/**
 * ============================================
 * DATABASE INITIALIZATION
 * ============================================
 */

/**
 * Initializes and opens the IndexedDB database
 * Legacy support for direct IDBDatabase access if needed.
 * 
 * @returns Promise resolving to the database instance
 */
export async function initDB(): Promise<IDBDatabase> {
  return db.openDatabase() as Promise<IDBDatabase>;
}

/**
 * ============================================
 * VALIDATION HELPERS
 * ============================================
 */

type ValidationError = { success: false; errors: string[] };

/**
 * Validates data and throws on failure
 */
function validateOrThrow(result: ValidationResult<unknown>, entityName: string): void {
  if (!result.success) {
    throw new Error(`Invalid ${entityName}: ${(result as ValidationError).errors.join(', ')}`);
  }
}

/**
 * ============================================
 * DATABASE MANAGER
 * ============================================
 */

/**
 * Database manager singleton with CRUD operations
 * Re-implemented using idb-manager.
 */
export const dbManager = {
  // Helpers to get store proxies
  get boxes() { return db.store(DB.STORES.BOXES); },
  get variants() { return db.store(DB.STORES.VARIANTS); },
  get templates() { return db.store(DB.STORES.TEMPLATES); },

  // ============================================
  // TEMPLATE OPERATIONS
  // ============================================
  
  async getTemplates(): Promise<TemplateDB[]> {
    return this.templates.getAll() as Promise<TemplateDB[]>;
  },

  async getTemplateById(id: string): Promise<TemplateDB | undefined> {
    return this.templates.get(id) as Promise<TemplateDB | undefined>;
  },

  async saveTemplate(template: TemplateDB): Promise<void> {
    const normalized = {
      ...template,
      data: normalizeAlertData(template.data)
    };
    const result = validateTemplate(normalized);
    validateOrThrow(result, 'template');
    
    // Check if exists to use correct method
    const exists = await this.templates.idExists(template.id);
    if (exists) {
      await this.templates.update(normalized);
    } else {
      await this.templates.add(normalized);
    }
  },

  async createTemplate(data: Omit<TemplateDB, 'id' | 'updatedAt'>): Promise<TemplateDB> {
    const template = createTemplate({ 
      data: { ...data },
      throwOnError: true,
    });
    await this.saveTemplate(template);
    return template;
  },

  async deleteTemplate(id: string): Promise<void> {
    await this.templates.delete(id);
  },

  // ============================================
  // BOX OPERATIONS
  // ============================================

  async getBoxes(): Promise<AlertBox[]> {
    return this.boxes.getAll() as Promise<AlertBox[]>;
  },

  async getBoxById(id: string): Promise<AlertBox | undefined> {
    return this.boxes.get(id) as Promise<AlertBox | undefined>;
  },

  async saveBox(box: AlertBox): Promise<void> {
    const result = validateAlertBox(box);
    validateOrThrow(result, 'box');
    
    const exists = await this.boxes.idExists(box.id);
    if (exists) {
      await this.boxes.update(box);
    } else {
      await this.boxes.add(box);
    }
  },

  async createBox(data: Omit<AlertBox, 'id'>): Promise<AlertBox> {
    const box = createAlertBox({
      data: { ...data },
      throwOnError: true,
    });
    await this.saveBox(box);
    return box;
  },

  async deleteBox(id: string): Promise<void> {
    // Cascade delete variants
    await this.deleteVariantsByBoxId(id);
    await this.boxes.delete(id);
  },

  // ============================================
  // VARIANT OPERATIONS
  // ============================================

  async getVariants(boxId: string): Promise<AlertVariant[]> {
    // idb-manager's filter method is perfect for this
    return this.variants.filter({ boxId }) as Promise<AlertVariant[]>;
  },

  async getVariantById(id: string): Promise<AlertVariant | undefined> {
    return this.variants.get(id) as Promise<AlertVariant | undefined>;
  },

  async getVariantsByType(type: string): Promise<AlertVariant[]> {
    return this.variants.filter({ type }) as Promise<AlertVariant[]>;
  },

  async saveVariant(variant: AlertVariant): Promise<void> {
    const normalized = normalizeAlertData(variant);
    const result = validateAlertVariant(normalized);
    validateOrThrow(result, 'variant');
    
    const exists = await this.variants.idExists(normalized.id);
    if (exists) {
      await this.variants.update(normalized);
    } else {
      await this.variants.add(normalized);
    }
  },

  async createVariant(data: Partial<AlertVariant> & { boxId: string }): Promise<AlertVariant> {
    const variant = createAlertVariant({
      boxId: data.boxId,
      data,
      throwOnError: true,
    });
    await this.saveVariant(variant);
    return variant;
  },

  async deleteVariant(id: string): Promise<void> {
    await this.variants.delete(id);
  },

  async deleteVariantsByBoxId(boxId: string): Promise<void> {
    const variants = await this.getVariants(boxId);
    if (variants.length > 0) {
      const ids = variants.map(v => v.id);
      await this.variants.deleteMany(ids);
    }
  },

  // ============================================
  // BATCH OPERATIONS
  // ============================================

  async saveVariants(variants: AlertVariant[]): Promise<void> {
    // Validate all first
    const normalizedVariants: AlertVariant[] = [];
    for (const variant of variants) {
      const normalized = normalizeAlertData(variant);
      const result = validateAlertVariant(normalized);
      if (!result.success) {
        throw new Error(`Invalid variant ${variant.id}: ${(result as ValidationError).errors.join(', ')}`);
      }
      normalizedVariants.push(normalized);
    }
    
    // We don't have a batch upsert in idb-manager directly that handles both add/update easily, 
    // so we'll do them one by one or split them.
    // For simplicity and to maintain current behavior:
    for (const variant of normalizedVariants) {
      const exists = await this.variants.idExists(variant.id);
      if (exists) {
        await this.variants.update(variant);
      } else {
        await this.variants.add(variant);
      }
    }
  },

  async deleteVariants(ids: string[]): Promise<void> {
    await this.variants.deleteMany(ids);
  },

  // ============================================
  // UTILITY METHODS
  // ============================================

  async autofixMediaUrls(): Promise<{ variantsFixed: number, templatesFixed: number }> {
    let variantsFixed = 0;
    let templatesFixed = 0;
    
    try {
      // 1. Fix all variants
      const allVariants = await this.variants.getAll() as AlertVariant[];
      for (const variant of allVariants) {
        const normalized = normalizeAlertData(variant);
        if (JSON.stringify(normalized) !== JSON.stringify(variant)) {
          await this.variants.update(normalized);
          variantsFixed++;
        }
      }
      
      // 2. Fix all templates
      const allTemplates = await this.templates.getAll() as TemplateDB[];
      for (const template of allTemplates) {
        const normalizedData = normalizeAlertData(template.data);
        if (JSON.stringify(normalizedData) !== JSON.stringify(template.data)) {
          await this.templates.update({ ...template, data: normalizedData });
          templatesFixed++;
        }
      }
      
      if (variantsFixed > 0 || templatesFixed > 0) {
        console.log(`[MediaFixer] Successfully normalized ${variantsFixed} variants and ${templatesFixed} templates.`);
      }
    } catch (err) {
      console.error('[MediaFixer] Failed to run autofix:', err);
    }
    
    return { variantsFixed, templatesFixed };
  },

  async clearAll(): Promise<void> {
    await this.boxes.clear();
    await this.variants.clear();
    await this.templates.clear();
  },
};

export default dbManager;
