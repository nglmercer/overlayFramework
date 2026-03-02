/**
 * Database Module - IndexedDB Wrapper
 * 
 * Provides a clean interface for managing alert data in IndexedDB.
 * Handles persistence for alert boxes, variants, and templates.
 * 
 * @module lib/db
 * @version 2.0.0
 */

import {
  AlertVariantSchema,
  AlertVariant,
  AlertBoxSchema,
  AlertBox,
  TemplateDBSchema,
  TemplateDB,
  validateAlertVariant,
  validateAlertBox,
  validateTemplate,
} from './core';

/**
 * ============================================
 * DATABASE CONFIGURATION
 * ============================================
 */

const DB_NAME = 'AlertsDB';
const DB_VERSION = 2;

/**
 * ============================================
 * DATABASE INITIALIZATION
 * ============================================
 */

/**
 * Initializes and opens the IndexedDB database
 * 
 * Creates the following object stores:
 * - boxes: For storing alert box configurations
 * - variants: For storing alert variants (indexed by boxId and type)
 * - templates: For storing saved templates
 * 
 * @returns Promise resolving to the database instance
 * @throws Error if database initialization fails
 */
export async function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Create boxes object store
      if (!db.objectStoreNames.contains('boxes')) {
        db.createObjectStore('boxes', { keyPath: 'id' });
      }
      
      // Create variants object store with indexes
      if (!db.objectStoreNames.contains('variants')) {
        const variantStore = db.createObjectStore('variants', { keyPath: 'id' });
        variantStore.createIndex('boxId', 'boxId', { unique: false });
        variantStore.createIndex('type', 'type', { unique: false });
      }

      // Create templates object store
      if (!db.objectStoreNames.contains('templates')) {
        db.createObjectStore('templates', { keyPath: 'id' });
      }
    };
  });
}

/**
 * ============================================
 * DATABASE MANAGER
 * ============================================
 * 
 * Provides CRUD operations for all data types.
 * All operations validate data against schemas before saving.
 */

/**
 * Database manager singleton with CRUD operations
 * 
 * @example
 * ```typescript
 * // Get all variants for a box
 * const variants = await dbManager.getVariants('box-123');
 * 
 * // Save a new variant
 * await dbManager.saveVariant(variantData);
 * 
 * // Delete a template
 * await dbManager.deleteTemplate('template-456');
 * ```
 */
export const dbManager = {
  // ============================================
  // TEMPLATE OPERATIONS
  // ============================================
  
  /**
   * Retrieves all templates from the database
   * 
   * @returns Promise resolving to array of templates
   */
  async getTemplates(): Promise<TemplateDB[]> {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('templates', 'readonly');
      const store = transaction.objectStore('templates');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  /**
   * Saves a template to the database
   * 
   * @param template - The template to save
   * @throws Error if validation fails
   */
  async saveTemplate(template: TemplateDB): Promise<void> {
    const result = validateTemplate(template);
    if (!result.success) {
      throw new Error(`Invalid template: ${(result as { success: false; errors: string[] }).errors.join(', ')}`);
    }
    
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('templates', 'readwrite');
      const store = transaction.objectStore('templates');
      const request = store.put(template);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  /**
   * Deletes a template from the database
   * 
   * @param id - The ID of the template to delete
   */
  async deleteTemplate(id: string): Promise<void> {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('templates', 'readwrite');
      const store = transaction.objectStore('templates');
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  // ============================================
  // BOX OPERATIONS
  // ============================================

  /**
   * Retrieves all alert boxes from the database
   * 
   * @returns Promise resolving to array of alert boxes
   */
  async getBoxes(): Promise<AlertBox[]> {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('boxes', 'readonly');
      const store = transaction.objectStore('boxes');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  /**
   * Retrieves a single alert box by ID
   * 
   * @param id - The box ID
   * @returns Promise resolving to the box or undefined
   */
  async getBoxById(id: string): Promise<AlertBox | undefined> {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('boxes', 'readonly');
      const store = transaction.objectStore('boxes');
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  /**
   * Saves an alert box to the database
   * 
   * @param box - The alert box to save
   * @throws Error if validation fails
   */
  async saveBox(box: AlertBox): Promise<void> {
    const result = validateAlertBox(box);
    if (!result.success) {
      throw new Error(`Invalid box: ${(result as { success: false; errors: string[] }).errors.join(', ')}`);
    }
    
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('boxes', 'readwrite');
      const store = transaction.objectStore('boxes');
      const request = store.put(box);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  /**
   * Deletes an alert box from the database
   * 
   * @param id - The ID of the box to delete
   */
  async deleteBox(id: string): Promise<void> {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('boxes', 'readwrite');
      const store = transaction.objectStore('boxes');
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  // ============================================
  // VARIANT OPERATIONS
  // ============================================

  /**
   * Retrieves all variants for a specific box
   * 
   * @param boxId - The ID of the box
   * @returns Promise resolving to array of variants
   */
  async getVariants(boxId: string): Promise<AlertVariant[]> {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('variants', 'readonly');
      const store = transaction.objectStore('variants');
      const index = store.index('boxId');
      const request = index.getAll(boxId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  /**
   * Retrieves a single variant by ID
   * 
   * @param id - The variant ID
   * @returns Promise resolving to the variant or undefined
   */
  async getVariantById(id: string): Promise<AlertVariant | undefined> {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('variants', 'readonly');
      const store = transaction.objectStore('variants');
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  /**
   * Retrieves all variants of a specific type
   * 
   * @param type - The variant type
   * @returns Promise resolving to array of variants
   */
  async getVariantsByType(type: string): Promise<AlertVariant[]> {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('variants', 'readonly');
      const store = transaction.objectStore('variants');
      const index = store.index('type');
      const request = index.getAll(type);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  /**
   * Saves a variant to the database
   * 
   * @param variant - The variant to save
   * @throws Error if validation fails
   */
  async saveVariant(variant: AlertVariant): Promise<void> {
    const result = validateAlertVariant(variant);
    if (!result.success) {
      throw new Error(`Invalid variant: ${(result as { success: false; errors: string[] }).errors.join(', ')}`);
    }
    
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('variants', 'readwrite');
      const store = transaction.objectStore('variants');
      const request = store.put(variant);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  /**
   * Deletes a variant from the database
   * 
   * @param id - The ID of the variant to delete
   */
  async deleteVariant(id: string): Promise<void> {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('variants', 'readwrite');
      const store = transaction.objectStore('variants');
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  /**
   * Deletes all variants for a specific box
   * 
   * @param boxId - The ID of the box whose variants should be deleted
   */
  async deleteVariantsByBoxId(boxId: string): Promise<void> {
    const variants = await this.getVariants(boxId);
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('variants', 'readwrite');
      const store = transaction.objectStore('variants');
      
      for (const variant of variants) {
        store.delete(variant.id);
      }
      
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  },

  // ============================================
  // BATCH OPERATIONS
  // ============================================

  /**
   * Saves multiple variants at once
   * 
   * @param variants - Array of variants to save
   * @throws Error if any validation fails
   */
  async saveVariants(variants: AlertVariant[]): Promise<void> {
    // Validate all first
    for (const variant of variants) {
      const result = validateAlertVariant(variant);
      if (!result.success) {
        throw new Error(`Invalid variant ${variant.id}: ${(result as { success: false; errors: string[] }).errors.join(', ')}`);
      }
    }
    
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('variants', 'readwrite');
      const store = transaction.objectStore('variants');
      
      for (const variant of variants) {
        store.put(variant);
      }
      
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  },

  /**
   * Deletes multiple variants at once
   * 
   * @param ids - Array of variant IDs to delete
   */
  async deleteVariants(ids: string[]): Promise<void> {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('variants', 'readwrite');
      const store = transaction.objectStore('variants');
      
      for (const id of ids) {
        store.delete(id);
      }
      
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  },
};

/**
 * ============================================
 * RE-EXPORTS
 * ============================================
 * 
 * Re-export types and schemas for convenience.
 */

export type { AlertVariant, AlertBox, TemplateDB } from './core';
export { AlertVariantSchema, AlertBoxSchema, TemplateDBSchema } from './core';
