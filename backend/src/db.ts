/**
 * Backend Database Module (Powered by idb-manager)
 * 
 * Provides persistent storage for the backend using idb-manager with NodeAdapter.
 * Features: Events, batch operations, and multi-store support.
 * 
 * @module backend/db
 * @version 2.0.0
 */

import { IndexedDBManager, type DatabaseItem } from 'idb-manager';
import { NodeAdapter } from 'idb-manager/node';
import { join } from 'path';
import { existsSync, readFileSync } from 'fs';

// ============================================================================
// CONFIGURATION
// ============================================================================

const STORAGE_DIR = process.env.STORAGE_DIR ?? './data';
const DB_NAME = 'OverlayBackendDB';

// ============================================================================
// PROFILE TYPE
// ============================================================================

export interface BackendProfile {
  id: string;         // same as frontend instanceId
  name: string;       // human-readable label e.g. "My Gaming PC"
  createdAt: number;
  lastSeen: number;
  color?: string;     // hex color for visual differentiation
}

/**
 * Backend Database Schema with enhanced indexes
 */
const schema = {
  name: DB_NAME,
  version: 5,
  stores: [
    { 
      name: 'overlays', 
      keyPath: 'id',
      indexes: [
        { name: 'createdAt', keyPath: 'createdAt', unique: false },
        { name: 'updatedAt', keyPath: 'updatedAt', unique: false },
        { name: 'profileId', keyPath: 'profileId', unique: false }
      ]
    },
    { 
      name: 'boxes', 
      keyPath: 'id',
      indexes: [
        { name: 'createdAt', keyPath: 'createdAt', unique: false },
        { name: 'updatedAt', keyPath: 'updatedAt', unique: false },
        { name: 'profileId', keyPath: 'profileId', unique: false }
      ]
    },
    { 
      name: 'variants', 
      keyPath: 'id',
      indexes: [
        { name: 'boxId', keyPath: 'boxId', unique: false },
        { name: 'createdAt', keyPath: 'createdAt', unique: false },
        { name: 'updatedAt', keyPath: 'updatedAt', unique: false },
        { name: 'profileId', keyPath: 'profileId', unique: false }
      ]
    },
    { 
      name: 'templates', 
      keyPath: 'id',
      indexes: [
        { name: 'createdAt', keyPath: 'createdAt', unique: false },
        { name: 'updatedAt', keyPath: 'updatedAt', unique: false },
        { name: 'profileId', keyPath: 'profileId', unique: false }
      ]
    },
    {
      name: 'settings',
      keyPath: 'id'
    },
    {
      name: 'profiles',
      keyPath: 'id',
      indexes: [
        { name: 'createdAt', keyPath: 'createdAt', unique: false },
        { name: 'lastSeen', keyPath: 'lastSeen', unique: false }
      ]
    }
  ]
};

// Initialize the manager with NodeAdapter and debug mode
const db = new IndexedDBManager(schema, {
  adapter: new NodeAdapter(STORAGE_DIR),
  autoInit: true,
  debug: process.env.DEBUG_DB === 'true'
});

/**
 * Database manager for the backend - enhanced with idb-manager features
 */
export const dbManager = {
  // Store proxies
  get overlays() { return db.store('overlays'); },
  get boxes() { return db.store('boxes'); },
  get variants() { return db.store('variants'); },
  get templates() { return db.store('templates'); },
  get settings() { return db.store('settings'); },
  get profiles() { return db.store('profiles'); },

  /**
    * Initialize the database and setup event listeners
    */
  async init(): Promise<void> {
    await db.openDatabase();
    console.log(`[DB] Backend storage initialized at: ${STORAGE_DIR}`);
    
    // Migrate old storage.json data if it exists
    //await this._migrateLegacyData();
    
    // Setup event listeners for logging/monitoring
    this.setupEventListeners();
  },

  /**
    * Migrate data from old storage.json format to new idb-manager format
    */
  async _migrateLegacyData(): Promise<void> {
    const legacyPath = join(STORAGE_DIR, 'storage.json');
    if (!existsSync(legacyPath)) {
      return;
    }
    
    try {
      const legacyData = JSON.parse(readFileSync(legacyPath, 'utf-8'));
      let migrated = 0;
      
      // Old format: { "boxId": { variants: [...], variant: {...}, ... } }
      for (const [boxId, boxData] of Object.entries(legacyData)) {
        const data = boxData as Record<string, any>;
        
        // Save box if not already saved
        if (data.variants || data.variant) {
          // This is a box with variants - save the box first
          const boxRecord = {
            id: boxId,
            type: 'box',
            name: data.variant?.name?.replace('Variant', '')?.trim() || data.name || `Box ${boxId}`,
            enabled: true,
            createdAt: data.createdAt || Date.now(),
            updatedAt: Date.now()
          };
          await this.overlays.add(boxRecord);
          
          // Save variants
          const variants = data.variants || (data.variant ? [data.variant] : []);
          for (const variant of variants) {
            if (variant && variant.id) {
              const variantRecord = {
                ...variant,
                id: variant.id,
                type: 'variant',
                boxId: boxId,
                createdAt: variant.createdAt || Date.now(),
                updatedAt: Date.now()
              };
              await this.overlays.add(variantRecord);
              migrated++;
            }
          }
        }
      }
      
      if (migrated > 0) {
        console.log(`[DB] Migrated ${migrated} variants from legacy storage`);
      }
    } catch (error) {
      console.warn('[DB] Legacy migration failed:', error);
    }
  },

  /**
    * Setup database event listeners
    */
  setupEventListeners(): void {
    // Listen to all events on overlays store
    db.on('add', (event: any) => {
      console.log(`[DB] Overlay added:`, event.data, event.metadata);
    });
    
    db.on('update', (event: any) => {
      console.log(`[DB] Overlay updated:`, event.data, event.metadata);
    });
    
    db.on('delete', (event: any) => {
      console.log(`[DB] Overlay deleted:`, event.data, event.metadata);
    });
    
    db.on('clear', () => {
      console.log(`[DB] Overlays cleared`);
    });
  },

  /**
    * Save overlay data (create or update)
    * @param id - The overlay ID
    * @param data - The overlay data
    * @param profileId - Optional profile ID to associate with this overlay
    */
  async saveOverlay(id: string, data: any, profileId?: string): Promise<void> {
    const existing = await this.overlays.get(id);
    const record: DatabaseItem = { 
      id, 
      ...data,
      profileId: profileId ?? existing?.profileId,
      createdAt: existing?.createdAt ?? Date.now(),
      updatedAt: Date.now()
    };
    
    if (existing) {
      await this.overlays.update(record);
    } else {
      await this.overlays.add(record);
    }
  },

  /**
    * Load overlay data by ID
    */
  async loadOverlay(id: string): Promise<any | null> {
    return await this.overlays.get(id);
  },

  /**
    * Delete overlay data
    */
  async deleteOverlay(id: string): Promise<boolean> {
    return await this.overlays.delete(id);
  },

  /**
    * List all overlay IDs
    */
  async listOverlays(): Promise<string[]> {
    const all = await this.overlays.getAll() as DatabaseItem[];
    return all.map(item => String(item.id));
  },

  /**
    * Get all overlay data as a record
    */
  async getAllOverlays(): Promise<Record<string, any>> {
    const all = await this.overlays.getAll() as DatabaseItem[];
    const result: Record<string, any> = {};
    for (const item of all) {
      const { id, ...data } = item;
      result[id as string] = data;
    }
    return result;
  },

  /**
    * Get all overlays for a specific profile
    * @param profileId - The profile ID to filter by
    */
  async getOverlaysByProfile(profileId: string): Promise<Record<string, any>> {
    // Use getAll then manually filter since filter by index may not work correctly
    const all = await this.overlays.getAll() as DatabaseItem[];
    const filtered = all.filter(item => item.profileId === profileId);
    const result: Record<string, any> = {};
    for (const item of filtered) {
      const { id, ...data } = item;
      result[id as string] = data;
    }
    return result;
  },

  /**
    * Delete all overlays for a specific profile
    * @param profileId - The profile ID whose overlays to delete
    */
  async deleteOverlaysByProfile(profileId: string): Promise<number> {
    // Use getAll then manually filter since filter by index may not work correctly
    const all = await this.overlays.getAll() as DatabaseItem[];
    const overlays = all.filter(item => item.profileId === profileId);
    const ids = overlays.map(o => o.id as string);
    if (ids.length > 0) {
      await this.overlays.deleteMany(ids);
    }
    return ids.length;
  },

  /**
    * Filter overlays by exact criteria
    */
  async filterOverlays(criteria: Record<string, any>): Promise<any[]> {
    return await this.overlays.filter(criteria);
  },

  /**
    * Get overlay statistics
    */
  async getOverlayStats() {
    return await this.overlays.getStats();
  },

  /**
    * Batch save multiple overlays
    */
  async saveManyOverlays(items: Array<{ id: string; [key: string]: any }>): Promise<boolean> {
    const itemsWithTimestamps = items.map(item => ({
      ...item,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }));
    return await this.overlays.addMany(itemsWithTimestamps);
  },

  /**
    * Batch delete multiple overlays
    */
  async deleteManyOverlays(ids: string[]): Promise<boolean> {
    return await this.overlays.deleteMany(ids);
  },

  // ============================================================================
  // BOX OPERATIONS (separate store)
  // ============================================================================

  /**
    * Save box data (create or update)
    */
  async saveBox(id: string, data: any, profileId?: string): Promise<void> {
    const existing = await this.boxes.get(id);
    const record: DatabaseItem = { 
      id, 
      ...data,
      profileId: profileId ?? existing?.profileId,
      createdAt: existing?.createdAt ?? Date.now(),
      updatedAt: Date.now()
    };
    
    if (existing) {
      await this.boxes.update(record);
    } else {
      await this.boxes.add(record);
    }
  },

  /**
    * Get box by ID
    */
  async getBox(id: string): Promise<any | null> {
    return await this.boxes.get(id);
  },

  /**
    * Delete box by ID
    */
  async deleteBox(id: string): Promise<boolean> {
    return await this.boxes.delete(id);
  },

  /**
    * Get all boxes for a specific profile
    */
  async getBoxesByProfile(profileId: string): Promise<Record<string, any>> {
    const all = await this.boxes.getAll() as DatabaseItem[];
    const filtered = all.filter(item => item.profileId === profileId);
    const result: Record<string, any> = {};
    for (const item of filtered) {
      const { id, ...data } = item;
      result[id as string] = data;
    }
    return result;
  },

  /**
    * Get all boxes
    */
  async getAllBoxes(): Promise<Record<string, any>> {
    const all = await this.boxes.getAll() as DatabaseItem[];
    const result: Record<string, any> = {};
    for (const item of all) {
      const { id, ...data } = item;
      result[id as string] = data;
    }
    return result;
  },

  // ============================================================================
  // VARIANT OPERATIONS (separate store)
  // ============================================================================

  /**
    * Save variant data (create or update)
    */
  async saveVariant(id: string, data: any, profileId?: string): Promise<void> {
    const existing = await this.variants.get(id);
    const record: DatabaseItem = { 
      id, 
      ...data,
      profileId: profileId ?? existing?.profileId,
      createdAt: existing?.createdAt ?? Date.now(),
      updatedAt: Date.now()
    };
    
    if (existing) {
      await this.variants.update(record);
    } else {
      await this.variants.add(record);
    }
  },

  /**
    * Get variant by ID
    */
  async getVariant(id: string): Promise<any | null> {
    return await this.variants.get(id);
  },

  /**
    * Delete variant by ID
    */
  async deleteVariant(id: string): Promise<boolean> {
    return await this.variants.delete(id);
  },

  /**
    * Get all variants for a specific profile
    */
  async getVariantsByProfile(profileId: string): Promise<Record<string, any>> {
    const all = await this.variants.getAll() as DatabaseItem[];
    const filtered = all.filter(item => item.profileId === profileId);
    const result: Record<string, any> = {};
    for (const item of filtered) {
      const { id, ...data } = item;
      result[id as string] = data;
    }
    return result;
  },

  /**
    * Get all variants for a specific box
    */
  async getVariantsByBox(boxId: string): Promise<Record<string, any>> {
    const all = await this.variants.getAll() as DatabaseItem[];
    const filtered = all.filter(item => item.boxId === boxId);
    const result: Record<string, any> = {};
    for (const item of filtered) {
      const { id, ...data } = item;
      result[id as string] = data;
    }
    return result;
  },

  /**
    * Get all variants
    */
  async getAllVariants(): Promise<Record<string, any>> {
    const all = await this.variants.getAll() as DatabaseItem[];
    const result: Record<string, any> = {};
    for (const item of all) {
      const { id, ...data } = item;
      result[id as string] = data;
    }
    return result;
  },

  // ============================================================================
  // TEMPLATE OPERATIONS (separate store)
  // ============================================================================

  /**
    * Save template data (create or update)
    */
  async saveTemplate(id: string, data: any, profileId?: string): Promise<void> {
    const existing = await this.templates.get(id);
    const record: DatabaseItem = { 
      id, 
      ...data,
      profileId: profileId ?? existing?.profileId,
      createdAt: existing?.createdAt ?? Date.now(),
      updatedAt: Date.now()
    };
    
    if (existing) {
      await this.templates.update(record);
    } else {
      await this.templates.add(record);
    }
  },

  /**
    * Get template by ID
    */
  async getTemplate(id: string): Promise<any | null> {
    return await this.templates.get(id);
  },

  /**
    * Delete template by ID
    */
  async deleteTemplate(id: string): Promise<boolean> {
    return await this.templates.delete(id);
  },

  /**
    * Get all templates for a specific profile
    */
  async getTemplatesByProfile(profileId: string): Promise<Record<string, any>> {
    const all = await this.templates.getAll() as DatabaseItem[];
    const filtered = all.filter(item => item.profileId === profileId);
    const result: Record<string, any> = {};
    for (const item of filtered) {
      const { id, ...data } = item;
      result[id as string] = data;
    }
    return result;
  },

  /**
    * Get all templates
    */
  async getAllTemplates(): Promise<Record<string, any>> {
    const all = await this.templates.getAll() as DatabaseItem[];
    const result: Record<string, any> = {};
    for (const item of all) {
      const { id, ...data } = item;
      result[id as string] = data;
    }
    return result;
  },

  /**
    * Get database statistics
    */
  async getDatabaseStats() {
    return await db.getStats();
  },

  /**
    * Export all data (for backup)
    * @param profileId - Optional profile ID to export only that profile's data
    */
  async exportData(profileId?: string): Promise<Record<string, any>> {
    const boxes = profileId 
      ? await this.getBoxesByProfile(profileId)
      : await this.getAllBoxes();
    const variants = profileId 
      ? await this.getVariantsByProfile(profileId)
      : await this.getAllVariants();
    const templates = profileId 
      ? await this.getTemplatesByProfile(profileId)
      : await this.getAllTemplates();
    const settings = await this.settings.getAll() as DatabaseItem[];
    const settingsRecord: Record<string, any> = {};
    for (const item of settings) {
      const { id, ...data } = item;
      settingsRecord[id as string] = data;
    }
    
    return {
      version: db.version,
      database: db.currentDatabase,
      timestamp: new Date().toISOString(),
      profileId,
      data: {
        boxes,
        variants,
        templates,
        settings: settingsRecord
      }
    };
  },

  /**
    * Import data (for restore)
    * @param backup - The backup data to import
    * @param profileId - Optional profile ID to assign to imported items (for profile-specific imports)
    * @param clearExisting - If true, clears all existing data before import (for full replace)
    */
  async importData(backup: Record<string, any>, profileId?: string, clearExisting: boolean = false): Promise<boolean> {
    try {
      // Clear existing data if requested
      if (clearExisting) {
        if (profileId) {
          // Clear only this profile's data from each store
          const boxesToDelete = Object.keys(await this.getBoxesByProfile(profileId));
          const variantsToDelete = Object.keys(await this.getVariantsByProfile(profileId));
          const templatesToDelete = Object.keys(await this.getTemplatesByProfile(profileId));
          if (boxesToDelete.length) await this.boxes.deleteMany(boxesToDelete);
          if (variantsToDelete.length) await this.variants.deleteMany(variantsToDelete);
          if (templatesToDelete.length) await this.templates.deleteMany(templatesToDelete);
        } else {
          // Clear all data
          await this.boxes.clear();
          await this.variants.clear();
          await this.templates.clear();
          await this.settings.clear();
        }
      }
      
      // Import boxes
      if (backup.data?.boxes) {
        const boxItems = Object.entries(backup.data.boxes).map(([id, data]) => ({
          id,
          profileId,
          ...(data as object)
        }));
        await this.boxes.addMany(boxItems);
      }
      
      // Import variants
      if (backup.data?.variants) {
        const variantItems = Object.entries(backup.data.variants).map(([id, data]) => ({
          id,
          profileId,
          ...(data as object)
        }));
        await this.variants.addMany(variantItems);
      }
      
      // Import templates
      if (backup.data?.templates) {
        const templateItems = Object.entries(backup.data.templates).map(([id, data]) => ({
          id,
          profileId,
          ...(data as object)
        }));
        await this.templates.addMany(templateItems);
      }
      
      // Import settings (global, not profile-specific)
      if (backup.data?.settings) {
        const settingItems = Object.entries(backup.data.settings).map(([id, data]) => ({
          id,
          ...(data as object)
        }));
        await this.settings.addMany(settingItems);
      }
      
      return true;
    } catch (error) {
      console.error('[DB] Import failed:', error);
      return false;
    }
  },

  // ============================================================================
  // PROFILE OPERATIONS
  // ============================================================================

  /**
   * Save or update a profile record
   */
  async saveProfile(profile: BackendProfile): Promise<void> {
    const existing = await this.profiles.get(profile.id);
    const record = { ...profile, lastSeen: Date.now() };
    if (existing) {
      await this.profiles.update(record);
    } else {
      await this.profiles.add(record);
    }
  },

  /**
   * Get a single profile by ID
   */
  async getProfile(id: string): Promise<BackendProfile | null> {
    const result = await this.profiles.get(id);
    return (result as unknown as BackendProfile) ?? null;
  },

  /**
   * List all known profiles
   */
  async listProfiles(): Promise<BackendProfile[]> {
    return (await this.profiles.getAll()) as unknown as BackendProfile[];
  },

  /**
   * Update lastSeen timestamp for a profile
   */
  async touchProfile(id: string): Promise<void> {
    const existing = await this.profiles.get(id) as unknown as BackendProfile | undefined;
    if (existing) {
      await this.profiles.update({ ...existing, lastSeen: Date.now() });
    }
  },

  /**
   * Delete a profile record
   */
  async deleteProfile(id: string): Promise<boolean> {
    return await this.profiles.delete(id);
  },

  /**
    * Close database connection
    */
  close(): void {
    db.close();
    console.log('[DB] Connection closed');
  }
};

export default dbManager;
