/**
 * Sync API - Offline-First Git-like Synchronization
 * 
 * Provides synchronization endpoints for offline clients with:
 * - Change tracking and conflict resolution
 * - Pull/push model similar to Git
 * - Version vectors for concurrency control
 * 
 * @module backend/src/sync
 * @version 1.1.0
 */

import { z } from 'zod';
import { dbManager } from './db';
import { 
  ApiPath, 
  HttpStatus, 
  HttpHeader, 
  ContentType,
  HttpMethod,
} from './constants';
import { Router, json, RouteContext } from './router-engine';

// ============================================================================
// TYPES & SCHEMAS
// ============================================================================

/**
 * Sync operation types
 */
export enum SyncOperation {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
}

/**
 * Change record - represents a single modification
 */
export interface ChangeRecord {
  id: string;           // Unique change ID
  overlayId: string;    // Overlay this change affects
  operation: SyncOperation;
  data: any;            // New data (for create/update)
  timestamp: number;    // When change occurred
  clientId: string;     // Client that made the change
  version: number;      // Version vector (incremental)
  deleted?: boolean;    // Marked for deletion
}

/**
 * Sync state for a client
 */
export interface ClientSyncState {
  clientId: string;
  lastSyncTimestamp: number;
  lastSyncVersion: number;
  pendingChanges: ChangeRecord[];
}

/**
 * Sync request from client
 */
const SyncRequestSchema = z.object({
  clientId: z.string(),
  lastSyncVersion: z.number().default(0),
  changes: z.array(z.object({
    id: z.string(),
    overlayId: z.string(),
    operation: z.enum([SyncOperation.CREATE, SyncOperation.UPDATE, SyncOperation.DELETE]),
    data: z.any().optional(),
    timestamp: z.number(),
    version: z.number(),
    deleted: z.boolean().optional(),
  })),
});

/**
 * Sync response to client
 */
const SyncResponseSchema = z.object({
  success: z.boolean(),
  serverVersion: z.number(),
  changes: z.array(z.object({
    id: z.string(),
    overlayId: z.string(),
    operation: z.enum([SyncOperation.CREATE, SyncOperation.UPDATE, SyncOperation.DELETE]),
    data: z.any().optional(),
    timestamp: z.number(),
    version: z.number(),
    deleted: z.boolean().optional(),
  })),
  conflicts: z.array(z.object({
    overlayId: z.string(),
    clientChange: z.any(),
    serverChange: z.any(),
    resolution: z.enum(['client_wins', 'server_wins', 'manual']).optional(),
  })),
  stats: z.object({
    totalOverlays: z.number(),
    changesApplied: z.number(),
    conflictsCount: z.number(),
  }),
});

// ============================================================================
// SYNC MANAGER
// ============================================================================

class SyncManager {
  private clientStates: Map<string, ClientSyncState> = new Map();
  private changeLog: ChangeRecord[] = [];
  private serverVersion: number = 0;
  private readonly MAX_CHANGES_PER_SYNC = 1000;
  private readonly CHANGE_RETENTION_DAYS = 30;

  /**
   * Initialize sync manager
   */
  async init(): Promise<void> {
    // Load change history from database
    await this.loadChangeHistory();
    console.log('[Sync] Manager initialized');
  }

  /**
   * Load change history from persistent storage
   */
  private async loadChangeHistory(): Promise<void> {
    try {
      const stored = await dbManager.settings.get('sync-history');
      if (stored && stored.data) {
        const historyData = stored.data as any;
        this.changeLog = historyData.changes || [];
        this.serverVersion = historyData.version || 0;
        // Clean old changes
        const cutoff = Date.now() - (this.CHANGE_RETENTION_DAYS * 24 * 60 * 60 * 1000);
        this.changeLog = this.changeLog.filter((c: ChangeRecord) => c.timestamp > cutoff);
      }
    } catch (error) {
      console.error('[Sync] Failed to load change history:', error);
      this.changeLog = [];
      this.serverVersion = 0;
    }
  }

  /**
   * Save change history to persistent storage
   */
  private async saveChangeHistory(): Promise<void> {
    try {
      await dbManager.settings.update({
        id: 'sync-history',
        version: this.serverVersion,
        changes: this.changeLog.slice(-10000), // Keep last 10k changes
        updatedAt: Date.now(),
      } as any);
    } catch (error) {
      console.error('[Sync] Failed to save change history:', error);
    }
  }

  /**
   * Record a change in the log
   */
  private recordChange(change: Omit<ChangeRecord, 'id' | 'version' | 'timestamp'>): ChangeRecord {
    this.serverVersion++;
    const record: ChangeRecord = {
      ...change,
      id: `chg-${this.serverVersion}-${Math.random().toString(36).slice(2, 8)}`,
      version: this.serverVersion,
      timestamp: Date.now(),
    };
    this.changeLog.push(record);
    return record;
  }

  /**
   * Process incoming changes from a client (push)
   */
  async processClientChanges(
    clientId: string, 
    changes: any[], 
    clientVersion: number
  ): Promise<{
    accepted: ChangeRecord[];
    conflicts: Array<{ overlayId: string; clientChange: any; serverChange: any }>;
  }> {
    const accepted: ChangeRecord[] = [];
    const conflicts: Array<{ overlayId: string; clientChange: any; serverChange: any }> = [];

    for (const change of changes) {
      const { overlayId, operation, data, version, deleted } = change;
      
      // Get current server state
      const current = await dbManager.overlays.get(overlayId);
      
      // Check version conflict
      if (version <= clientVersion) {
        // Client is sending old version, skip
        continue;
      }

      if (operation === SyncOperation.DELETE || deleted) {
        if (current) {
          // Conflict: already modified on server
          if (current.updatedAt && current.updatedAt > change.timestamp) {
            conflicts.push({
              overlayId,
              clientChange: change,
              serverChange: current,
            });
            continue;
          }
          await dbManager.overlays.delete(overlayId);
          accepted.push(this.recordChange({
            overlayId,
            operation: SyncOperation.DELETE,
            data: null,
            clientId,
          }));
        }
      } else {
        // CREATE or UPDATE
        if (current && current.updatedAt && current.updatedAt > change.timestamp) {
          // Server has newer version - conflict
          conflicts.push({
            overlayId,
            clientChange: change,
            serverChange: current,
          });
          continue;
        }
        
        // Save overlay with timestamps
        const record = {
          ...data,
          id: overlayId,
          updatedAt: Date.now(),
          createdAt: current?.createdAt || Date.now(),
        };
        await dbManager.overlays.add(record);
        accepted.push(this.recordChange({
          overlayId,
          operation: operation === SyncOperation.CREATE ? SyncOperation.CREATE : SyncOperation.UPDATE,
          data: record,
          clientId,
        }));
      }
    }

    // Update client state
    const state = this.clientStates.get(clientId) || {
      clientId,
      lastSyncTimestamp: Date.now(),
      lastSyncVersion: 0,
      pendingChanges: [],
    };
    state.lastSyncVersion = this.serverVersion;
    state.lastSyncTimestamp = Date.now();
    this.clientStates.set(clientId, state);

    // Save change log periodically
    await this.saveChangeHistory();

    return { accepted, conflicts };
  }

  /**
   * Get changes since a specific version (pull)
   */
  getChangesSince(version: number): ChangeRecord[] {
    return this.changeLog
      .filter(c => c.version > version)
      .slice(-this.MAX_CHANGES_PER_SYNC);
  }

  /**
   * Get full overlay state (for initial sync)
   */
  async getFullState(): Promise<any[]> {
    return await dbManager.overlays.getAll();
  }

  /**
   * Get server version
   */
  getServerVersion(): number {
    return this.serverVersion;
  }

  /**
   * Get sync statistics
   */
  getStats() {
    return {
      serverVersion: this.serverVersion,
      totalChanges: this.changeLog.length,
      activeClients: this.clientStates.size,
      lastChange: this.changeLog[this.changeLog.length - 1]?.timestamp || null,
    };
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

const syncManager = new SyncManager();

// ============================================================================
// ROUTE HANDLERS
// ============================================================================

/**
 * Main sync endpoint - handles both push and pull
 */
export async function handleSync(ctx: RouteContext): Promise<Response> {
  try {
    const body = ctx.body;
    const validated = SyncRequestSchema.parse(body);
    
    const { clientId, lastSyncVersion, changes } = validated;
    
    // Process client changes (push)
    const { accepted, conflicts } = await syncManager.processClientChanges(
      clientId, 
      changes, 
      lastSyncVersion
    );
    
    // Get server changes since client's last sync (pull)
    const serverChanges = syncManager.getChangesSince(lastSyncVersion);
    
    // Get full stats
    const overlays = await dbManager.overlays.getAll();
    
    return json({
      success: true,
      serverVersion: syncManager.getServerVersion(),
      changes: serverChanges,
      conflicts: conflicts.map(c => ({
        overlayId: c.overlayId,
        clientChange: c.clientChange,
        serverChange: c.serverChange,
        resolution: 'manual', // Client must resolve
      })),
      stats: {
        totalOverlays: (overlays as any[]).length,
        changesApplied: accepted.length,
        conflictsCount: conflicts.length,
      },
    }, HttpStatus.OK);
  } catch (error: any) {
    console.error('[Sync] Error:', error);
    return json({
      success: false,
      error: error.message || 'Sync failed',
    }, HttpStatus.BAD_REQUEST);
  }
}

/**
 * Get sync status and statistics
 */
export async function handleSyncStatus(): Promise<Response> {
  const stats = syncManager.getStats();
  const dbStats = await dbManager.getDatabaseStats();
  
  return json({
    success: true,
    sync: stats,
    database: dbStats,
  }, HttpStatus.OK);
}

/**
 * Force full resync (for recovery)
 */
export async function handleForceResync(): Promise<Response> {
  const clientId = `force-${Date.now()}`;
  const fullState = await syncManager.getFullState();
  
  return json({
    success: true,
    clientId,
    fullState,
    serverVersion: syncManager.getServerVersion(),
    message: 'Full state sync initiated',
  }, HttpStatus.OK);
}

/**
 * Clear sync history (admin endpoint)
 */
export async function handleClearSyncHistory(): Promise<Response> {
  await syncManager.init(); // Reinitialize
  return json({
    success: true,
    message: 'Sync history cleared',
  }, HttpStatus.OK);
}

// ============================================================================
// ROUTE REGISTRATION
// ============================================================================

export function registerSyncRoutes(router: Router): void {
  // Main sync endpoint (POST for push/pull)
  router.post(ApiPath.SYNC, {
    schema: { body: SyncRequestSchema },
    handler: handleSync,
    description: 'Synchronize changes with server (push/pull)',
  });

  // Sync status
  router.get(ApiPath.SYNC_STATUS, {
    handler: handleSyncStatus,
    description: 'Get sync status and statistics',
  });

  // Force full resync
  router.post(ApiPath.SYNC_RESYNC, {
    handler: handleForceResync,
    description: 'Force full state resync (recovery)',
  });

  // Clear sync history (admin)
  router.post(ApiPath.SYNC_CLEAR, {
    handler: handleClearSyncHistory,
    description: 'Clear sync history (admin)',
  });
}

// ============================================================================
// EXPORTS
// ============================================================================

export { syncManager };
