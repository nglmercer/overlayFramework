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

import { IndexedDBManager,type StoreProxy,type DatabaseItem } from 'idb-manager';
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
import { PLATFORM_EVENTS, PlatformEventDefinition } from './core/platform-events';

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
const db = new IndexedDBManager(schema, {
  adapter: adapter,
});

/**
 * ============================================
 * DATABASE INITIALIZATION & SINGLETON GUARD
 * ============================================
 */

let dbInstance: IndexedDBManager | null = null;
let dbInitialized = false;

/**
 * Ensures the database is initialized and handles blocked connections.
 * This is critical for preventing "Blocked" version upgrades.
 */
async function ensureDBInitialized(): Promise<void> {
  if (dbInitialized && dbInstance) return;

  try {
    if (!dbInstance) {
      dbInstance = new IndexedDBManager(schema, { adapter });
    }

    // Attempt to open the database
    const rawDb = await dbInstance.openDatabase() as IDBDatabase;
    
    // NATIVE LIFECYCLE HANDLERS
    // If another tab tries to upgrade the version, we must close this connection
    rawDb.onversionchange = () => {
      console.warn('[dbManager] Database version change detected. Closing connection...');
      rawDb.close();
      dbInitialized = false;
    };

    dbInitialized = true;
    console.log('[dbManager] Database connection established (Version: ' + rawDb.version + ')');
    
    // Run normalization if needed
    setTimeout(() => normalizeStoreData(), 1000);
    
  } catch (error) {
    console.error('[dbManager] Initialization fatal error:', error);
    throw error;
  }
}

/**
 * ============================================
 * NATIVE IDB UTILS (Bypasses idb-manager bug)
 * ============================================
 */

/**
 * Perform a strictly-typed native IndexedDB operation.
 * Bypasses idb-manager's 'normalizeId' which breaks string keys like "10".
 */
async function nativeOp(storeName: string, mode: IDBTransactionMode, callback: (store: IDBObjectStore) => IDBRequest | void): Promise<any> {
  const db = await dbInstance!.openDatabase() as IDBDatabase;
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    const request = callback(store);
    
    if (request) {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    }
    
    tx.oncomplete = () => { if (!request) resolve(true); };
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(new Error('Transaction aborted'));
  });
}

/**
 * Normalizes numeric IDs to strings to prevent key mismatches.
 * Forces native IDB to avoid the library's conversion.
 */
async function normalizeStoreData() {
  if (!dbInstance) return;
  console.log('[dbManager] Starting NATIVE data normalization check...');
  
  const stores = [DB.STORES.BOXES, DB.STORES.VARIANTS, DB.STORES.TEMPLATES];
  for (const storeName of stores) {
    const items = await dbInstance.store(storeName).getAll();
    for (const item of items) {
      if (typeof item.id === 'number') {
        const stringId = String(item.id);
        console.log(`[dbManager] NATIVELY Normalizing numeric ID in ${storeName}:`, item.id, '->', stringId);
        
        // Use native ops to ensure type is preserved
        try {
          // 1. Save with string ID
          const data = { ...item, id: stringId };
          await nativeOp(storeName, 'readwrite', (s) => s.put(data));
          // 2. Delete original numeric key
          await nativeOp(storeName, 'readwrite', (s) => s.delete(item.id));
        } catch (err) {
          console.error('[dbManager] Normalization failed for', item.id, err);
        }
      }
    }
  }
}

/**
 * Validates data and throws on failure
 */
function validateOrThrow(result: ValidationResult<unknown>, entityName: string): void {
  if (!result.success) {
    const errors = (result as any).errors || ['Unknown validation error'];
    throw new Error(`Invalid ${entityName}: ${errors.join(', ')}`);
  }
}

/**
 * ============================================
 * DATABASE MANAGER
 * ============================================
 */

export const dbManager = {
  // Direct store access
  get _boxes() { return dbInstance!.store(DB.STORES.BOXES); },
  get _variants() { return dbInstance!.store(DB.STORES.VARIANTS); },
  get _templates() { return dbInstance!.store(DB.STORES.TEMPLATES); },

  // Backward compatibility
  get boxes() { return this._boxes; },
  get variants() { return this._variants; },
  get templates() { return this._templates; },

  // ============================================
  // TEMPLATE OPERATIONS
  // ============================================

  async getTemplates(): Promise<TemplateDB[]> {
    await ensureDBInitialized();
    return await this._templates.getAll() as TemplateDB[];
  },

  async getTemplateById(id: string | number): Promise<TemplateDB | undefined> {
    await ensureDBInitialized();
    let item = await this._templates.get(id) as TemplateDB | undefined;
    if (!item && typeof id === 'string' && !isNaN(Number(id))) {
      item = await this._templates.get(Number(id)) as TemplateDB | undefined;
    }
    return item || undefined;
  },

  async saveTemplate(template: TemplateDB): Promise<void> {
    await ensureDBInitialized();
    const normalized = { ...template, data: normalizeAlertData(template.data) };
    const result = validateTemplate(normalized);
    validateOrThrow(result, 'template');
    
    // NATIVE SAVE to preserve string ID
    await nativeOp(DB.STORES.TEMPLATES, 'readwrite', (s) => s.put(normalized));
  },

  async deleteTemplate(id: string | number): Promise<void> {
    await ensureDBInitialized();
    // NATIVE DELETE - try exact, then numeric fallback if string
    await nativeOp(DB.STORES.TEMPLATES, 'readwrite', (s) => s.delete(id));
    if (typeof id === 'string' && !isNaN(Number(id))) {
      await nativeOp(DB.STORES.TEMPLATES, 'readwrite', (s) => s.delete(Number(id)));
    }
  },

  // ============================================
  // BOX OPERATIONS
  // ============================================

  async getBoxes(): Promise<AlertBox[]> {
    await ensureDBInitialized();
    return await this._boxes.getAll() as AlertBox[];
  },

  async getBoxById(id: string | number): Promise<AlertBox | undefined> {
    await ensureDBInitialized();
    let box = await this._boxes.get(id) as AlertBox | undefined;
    if (!box && typeof id === 'string' && !isNaN(Number(id))) {
      box = await this._boxes.get(Number(id)) as AlertBox | undefined;
    }
    return box || undefined;
  },

  async saveBox(box: AlertBox): Promise<void> {
    await ensureDBInitialized();
    const result = validateAlertBox(box);
    validateOrThrow(result, 'box');
    
    // NATIVE SAVE
    await nativeOp(DB.STORES.BOXES, 'readwrite', (s) => s.put(box));
  },

  async createBox(data: Omit<AlertBox, 'id'>): Promise<AlertBox> {
    const box = createAlertBox({ data: { ...data }, throwOnError: true });
    await this.saveBox(box);
    return box;
  },

  async deleteBox(id: string | number): Promise<void> {
    await ensureDBInitialized();
    const stringId = String(id);
    const numericId = !isNaN(Number(id)) ? Number(id) : null;
    
    console.log('[dbManager] NATIVE-AGGRESSIVE deletion of box:', id);
    
    try {
      // 1. Cascade variants
      await this.deleteVariantsByBoxId(id);
      
      // 2. Multimodal deletion using NATIVE IDs (bypass normalizeId)
      // Try exact key
      await nativeOp(DB.STORES.BOXES, 'readwrite', (s) => s.delete(id));
      // Try numeric key if it was a number
      if (numericId !== null) {
        await nativeOp(DB.STORES.BOXES, 'readwrite', (s) => s.delete(numericId));
      }
      // Try explicit string key
      await nativeOp(DB.STORES.BOXES, 'readwrite', (s) => s.delete(stringId));
      
      // Verification
      const check = await this.getBoxById(id);
      if (check) {
        console.error('[dbManager] NATIVE DELETE FAILED - Still exists as', typeof check.id);
      } else {
        console.log('[dbManager] NATIVE DELETE SUCCESS');
      }
    } catch (error) {
      console.error('[dbManager] Error in deleteBox:', error);
      throw error;
    }
  },

  // ============================================
  // VARIANT OPERATIONS
  // ============================================

  async getVariants(boxId: string | number): Promise<AlertVariant[]> {
    await ensureDBInitialized();
    const stringId = String(boxId);
    const numericId = !isNaN(Number(boxId)) ? Number(boxId) : null;

    // Use idb-manager's getAll then manual filter because filter() is broken for mixed types
    const all = await this._variants.getAll() as AlertVariant[];
    let data = all.filter(v => String(v.boxId) === stringId);
    
    // Heal types
    return data.map(v => {
      if (v.type === 'variant' || v.type === 'default' || !v.type) {
        const events = Object.values(PLATFORM_EVENTS) as PlatformEventDefinition[];
        const match = events.find(e => 
          (v.name?.includes(e.label)) || 
          (v.condition?.includes(e.conditionLabel)) ||
          (v.name?.toLowerCase().includes(e.id.replace('_', ' ')))
        );
        if (match) {
          v.type = match.id;
          this.saveVariant(v).catch(() => {});
        }
      }
      return v;
    });
  },

  async getVariantById(id: string | number): Promise<AlertVariant | undefined> {
    await ensureDBInitialized();
    let variant = await this._variants.get(id) as AlertVariant | undefined;
    if (!variant && typeof id === 'string' && !isNaN(Number(id))) {
      variant = await this._variants.get(Number(id)) as AlertVariant | undefined;
    } else if (!variant && typeof id === 'number') {
      variant = await this._variants.get(String(id)) as AlertVariant | undefined;
    }
    return variant || undefined;
  },

  async saveVariant(variant: AlertVariant): Promise<void> {
    await ensureDBInitialized();
    const normalized = normalizeAlertData(variant);
    const result = validateAlertVariant(normalized);
    validateOrThrow(result, 'variant');
    
    // NATIVE SAVE
    await nativeOp(DB.STORES.VARIANTS, 'readwrite', (s) => s.put(normalized));
  },

  async deleteVariant(id: string | number): Promise<void> {
    await ensureDBInitialized();
    await nativeOp(DB.STORES.VARIANTS, 'readwrite', (s) => s.delete(id));
    if (typeof id === 'string' && !isNaN(Number(id))) {
      await nativeOp(DB.STORES.VARIANTS, 'readwrite', (s) => s.delete(Number(id)));
    } else if (typeof id === 'number') {
      await nativeOp(DB.STORES.VARIANTS, 'readwrite', (s) => s.delete(String(id)));
    }
  },

  async deleteVariantsByBoxId(boxId: string | number): Promise<void> {
    await ensureDBInitialized();
    const variants = await this.getVariants(boxId);
    for (const v of variants) {
      await this.deleteVariant(v.id);
    }
  },

  // ============================================
  // UTILITY METHODS
  // ============================================

  async resetDatabase(): Promise<void> {
    console.log('[dbManager] RESETTING DATABASE...');
    try {
      const request = indexedDB.deleteDatabase(DB.NAME);
      return new Promise((resolve, reject) => {
        request.onsuccess = () => { resolve(); };
        request.onerror = (e) => reject(e);
        request.onblocked = () => {
          alert('Blocked: Close other tabs to finish reset.');
          resolve();
        };
      });
    } catch (err) {
      console.error('[dbManager] Reset failed:', err);
    }
  },

  async clearAll(): Promise<void> {
    await ensureDBInitialized();
    await this._boxes.clear();
    await this._variants.clear();
    await this._templates.clear();
  },
};

// Global helper for user-initiated nuke
if (typeof window !== 'undefined') {
  (window as any).dbManager = dbManager;
  (window as any).nukeDB = () => dbManager.resetDatabase();
}

export default dbManager;
