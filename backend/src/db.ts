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

// ============================================================================
// CONFIGURATION
// ============================================================================

const STORAGE_DIR = process.env.STORAGE_DIR ?? './data';
const DB_NAME = 'OverlayBackendDB';

/**
 * Backend Database Schema with enhanced indexes
 */
const schema = {
  name: DB_NAME,
  version: 2,
  stores: [
    { 
      name: 'overlays', 
      keyPath: 'id',
      indexes: [
        { name: 'createdAt', keyPath: 'createdAt', unique: false },
        { name: 'updatedAt', keyPath: 'updatedAt', unique: false }
      ]
    },
    {
      name: 'settings',
      keyPath: 'id'
    }
  ]
};

// Initialize the manager with NodeAdapter and debug mode
const db = new IndexedDBManager(schema, {
  adapter: new NodeAdapter(STORAGE_DIR),
  autoInit: false,
  debug: process.env.DEBUG_DB === 'true'
});

/**
 * Database manager for the backend - enhanced with idb-manager features
 */
export const dbManager = {
  // Store proxies
  get overlays() { return db.store('overlays'); },
  get settings() { return db.store('settings'); },

  /**
    * Initialize the database and setup event listeners
    */
  async init(): Promise<void> {
    await db.openDatabase();
    console.log(`[DB] Backend storage initialized at: ${STORAGE_DIR}`);
    
    // Setup event listeners for logging/monitoring
    this.setupEventListeners();
  },

  /**
    * Setup database event listeners
    */
  setupEventListeners(): void {
    // Listen to all events on overlays store
    db.on('overlays:add', (event: any) => {
      console.log(`[DB] Overlay added:`, event.data, event.metadata);
    });
    
    db.on('overlays:update', (event: any) => {
      console.log(`[DB] Overlay updated:`, event.data, event.metadata);
    });
    
    db.on('overlays:delete', (event: any) => {
      console.log(`[DB] Overlay deleted:`, event.data, event.metadata);
    });
    
    db.on('overlays:clear', () => {
      console.log(`[DB] Overlays cleared`);
    });
  },

  /**
    * Save overlay data (create or update)
    */
  async saveOverlay(id: string, data: any): Promise<void> {
    const existing = await this.overlays.get(id);
    const record: DatabaseItem = { 
      id, 
      ...data,
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

  /**
    * Get database statistics
    */
  async getDatabaseStats() {
    return await db.getStats();
  },

  /**
    * Export all data (for backup)
    */
  async exportData(): Promise<Record<string, any>> {
    const overlays = await this.getAllOverlays();
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
      data: {
        overlays,
        settings: settingsRecord
      }
    };
  },

  /**
    * Import data (for restore)
    */
  async importData(backup: Record<string, any>): Promise<boolean> {
    try {
      // Clear existing data
      await this.overlays.clear();
      await this.settings.clear();
      
      // Import overlays
      if (backup.data?.overlays) {
        const overlayItems = Object.entries(backup.data.overlays).map(([id, data]) => ({
          id,
          ...(data as object)
        }));
        await this.overlays.addMany(overlayItems);
      }
      
      // Import settings
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

  /**
    * Close database connection
    */
  close(): void {
    db.close();
    console.log('[DB] Connection closed');
  }
};

export default dbManager;
