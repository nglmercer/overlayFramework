/**
 * Profile Manager
 *
 * Manages local "profiles" (named instances of the overlay app).
 * Each profile corresponds to a unique instanceId that is used to:
 *   - target webhooks at a specific browser/device
 *   - sync data across multiple devices
 *
 * Profiles are stored in localStorage so they survive page reloads
 * and are available immediately, with no async DB round-trips.
 *
 * @module lib/profile-manager
 * @version 1.0.0
 */

import { getBackendEndpoint } from './config';
import { mapBackupBoxes, mapBackupVariants, mapBackupTemplates } from './backup-mapper';
import { dbManager } from './db';

// ============================================================================
// TYPES
// ============================================================================

export interface Profile {
  id: string;          // unique instanceId — matches backend profile id
  name: string;        // human-readable label e.g. "My Gaming PC"
  createdAt: number;
  color?: string;      // hex color for visual differentiation
}

export type ProfileSyncResult =
  | { ok: true; profile: Profile }
  | { ok: false; error: string };

// ============================================================================
// STORAGE KEYS
// ============================================================================

const ACTIVE_PROFILE_KEY = 'overlay-active-profile-id';
const PROFILES_LIST_KEY  = 'overlay-profiles';

// ============================================================================
// PROFILE MANAGER CLASS
// ============================================================================

class ProfileManager {

  // --------------------------------------------------------------------------
  // Read helpers
  // --------------------------------------------------------------------------

  /**
   * Returns true when no active profile has been set (first run on this device).
   */
  isFirstRun(): boolean {
    return !localStorage.getItem(ACTIVE_PROFILE_KEY);
  }

  /**
   * Returns the active profile ID, or null if none is set.
   */
  getActiveProfileId(): string | null {
    return localStorage.getItem(ACTIVE_PROFILE_KEY);
  }

  /**
   * Returns the full active Profile object, or null.
   */
  getActiveProfile(): Profile | null {
    const id = this.getActiveProfileId();
    if (!id) return null;
    return this.listProfiles().find(p => p.id === id) ?? null;
  }

  /**
   * Returns all locally known profiles, sorted newest first.
   */
  listProfiles(): Profile[] {
    try {
      const raw = localStorage.getItem(PROFILES_LIST_KEY);
      const list: Profile[] = raw ? JSON.parse(raw) : [];
      return list.sort((a, b) => b.createdAt - a.createdAt);
    } catch {
      return [];
    }
  }

  // --------------------------------------------------------------------------
  // Write helpers
  // --------------------------------------------------------------------------

  /**
   * Create a brand-new profile with a freshly generated instance ID.
   * Saves it locally and registers it with the backend.
   */
  async createProfile(name: string, color?: string): Promise<Profile> {
    const id = `overlay-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const profile: Profile = { id, name, color, createdAt: Date.now() };

    this._saveProfileLocally(profile);
    this._setActiveId(id);

    // Fire-and-forget backend registration (non-critical)
    this._registerWithBackend(profile).catch(err =>
      console.warn('[ProfileManager] Backend registration failed:', err)
    );

    return profile;
  }

  /**
   * Link this device to an existing instance by its ID.
   * Optionally pulls data from the backend so this device is in sync.
   *
   * @param id   - The existing instanceId to link to
   * @param name - Display name for this profile locally
   * @param syncData - If true, import data snapshot from the backend
   * @param replace - If true, replaces ALL local data. If false, merges (default)
   */
  async setActiveProfile(
    id: string,
    name: string,
    syncData = true,
    replace = false
  ): Promise<ProfileSyncResult> {
    // 1. Verify the profile exists on the backend
    const checkUrl = getBackendEndpoint(`/profiles/${encodeURIComponent(id)}`);
    let backendProfile: Profile | null = null;

    try {
      const res = await fetch(checkUrl);
      if (!res.ok) {
        return { ok: false, error: `Instance not found on server (${res.status})` };
      }
      const data = await res.json();
      backendProfile = data.profile ?? null;
    } catch (err) {
      return { ok: false, error: `Cannot reach backend: ${err}` };
    }

    const resolvedName = backendProfile?.name ?? name;
    const profile: Profile = {
      id,
      name: resolvedName,
      color: backendProfile?.color,
      createdAt: backendProfile?.createdAt ?? Date.now(),
    };

    this._saveProfileLocally(profile);
    this._setActiveId(id);

    // 2. Optionally pull data
    if (syncData) {
      const syncResult = await this.syncFromInstance(id, replace);
      if (!syncResult.ok) {
        // Non-fatal — profile is linked, data just wasn't synced
        console.warn('[ProfileManager] Data sync failed after linking:', (syncResult as { ok: false; error: string }).error);
      }
    }

    return { ok: true, profile };
  }

  /**
   * Switch the active profile to a different locally-known profile.
   * Does NOT automatically reload the page — caller decides.
   */
  switchProfile(id: string): boolean {
    const profile = this.listProfiles().find(p => p.id === id);
    if (!profile) return false;
    this._setActiveId(id);
    return true;
  }

  /**
   * Switch to a different profile and optionally sync data from the backend.
   * This is the main method to use when user wants to switch profiles with data sync.
   * 
   * @param id - The profile ID to switch to
   * @param syncData - Whether to sync data from backend (default: true)
   * @param replace - If true, replaces ALL local data. If false, merges (default: false)
   */
  async switchProfileAndSync(
    id: string,
    syncData = true,
    replace = false
  ): Promise<{ ok: true } | { ok: false; error: string }> {
    const profile = this.listProfiles().find(p => p.id === id);
    if (!profile) {
      return { ok: false, error: 'Profile not found locally' };
    }
    
    this._setActiveId(id);
    
    if (syncData) {
      await dbManager._boxes.clear();
      await dbManager._templates.clear();
      await dbManager._templates.clear();
      const syncResult = await this.syncFromInstance(id, replace);
      if (!syncResult.ok) {
        return syncResult;
      }
    }
    
    return { ok: true };
  }
  /**
   * Remove a profile from the local list.
   * If it was the active profile, clears the active ID.
   */
  deleteLocalProfile(id: string): void {
    const remaining = this.listProfiles().filter(p => p.id !== id);
    localStorage.setItem(PROFILES_LIST_KEY, JSON.stringify(remaining));
    if (this.getActiveProfileId() === id) {
      if (remaining.length > 0) {
        this._setActiveId(remaining[0].id);
      } else {
        localStorage.removeItem(ACTIVE_PROFILE_KEY);
      }
    }
  }

  /**
   * Reset all profile data - clears active profile, all stored profiles,
   * and resets the local database. This effectively resets the app to 
   * first-run state with a fresh database.
   */
  async resetAllProfiles(): Promise<void> {
    localStorage.removeItem(ACTIVE_PROFILE_KEY);
    localStorage.removeItem(PROFILES_LIST_KEY);
    await dbManager.resetDatabase();
  }

  /**
   * Update a local profile's metadata.
   */
  updateLocalProfile(id: string, updates: Partial<Pick<Profile, 'name' | 'color'>>): Profile | null {
    const profiles = this.listProfiles();
    const idx = profiles.findIndex(p => p.id === id);
    if (idx === -1) return null;
    profiles[idx] = { ...profiles[idx], ...updates };
    localStorage.setItem(PROFILES_LIST_KEY, JSON.stringify(profiles));
    return profiles[idx];
  }

  // --------------------------------------------------------------------------
  // Sync helpers
  // --------------------------------------------------------------------------

  /**
   * Pull a full data snapshot from the backend for the given instance ID
   * and import it into the local IndexedDB.
   *
   * @param instanceId - The profile ID to sync from
   * @param replace - If true, replaces ALL local data. If false, keeps local-only data (default)
   */
  async syncFromInstance(instanceId: string, replace = false): Promise<{ ok: true } | { ok: false; error: string }> {
    try {
      const url = getBackendEndpoint(`/profiles/${encodeURIComponent(instanceId)}/export`);
      const res = await fetch(url);
      if (!res.ok) {
        return { ok: false, error: `Export failed: ${res.status} ${res.statusText}` };
      }
      const { backup } = await res.json();
      if (!backup) {
        return { ok: false, error: 'No backup data in response' };
      }

      // Import into local IndexedDB via dynamic import to avoid circular deps
      
      
      // Only clear if replace is true
      if (replace) {
        await dbManager.clearAll();
      }
      console.log('backup', backup);
      // Re-import boxes, variants, templates if present
      // Use the backup-mapper module for type-safe mapping with validation
      if (backup?.data?.boxes) {
        const mapBoxesResult = mapBackupBoxes(backup.data.boxes);
        console.log('mapBoxes', mapBoxesResult.items);
        console.log('skipped boxes (missing ID):', mapBoxesResult.skipped);
        if (mapBoxesResult.items.length > 0) {
          await dbManager._boxes.updateMany(mapBoxesResult.items);
        }
      }
      if (backup?.data?.variants) {
        const mapVariantsResult = mapBackupVariants(backup.data.variants);
        console.log('mapVariants', mapVariantsResult.items);
        console.log('skipped variants (missing ID):', mapVariantsResult.skipped);
        if (mapVariantsResult.items.length > 0) {
          await dbManager.variants.updateMany(mapVariantsResult.items);
        }
      }
      if (backup?.data?.templates) {
        const mapTemplatesResult = mapBackupTemplates(backup.data.templates);
        console.log('mapTemplates', mapTemplatesResult.items);
        console.log('skipped templates (missing ID):', mapTemplatesResult.skipped);
        if (mapTemplatesResult.items.length > 0) {
          await dbManager.templates.updateMany(mapTemplatesResult.items);
        }
      }

      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err?.message ?? String(err) };
    }
  }

  /**
   * Export local data to the backend under the active profile ID.
   * Useful to keep the backend in sync after local changes.
   * 
   * @param replace - If true, replaces all data on backend. If false, merges (default)
   */
  async pushToBackend(replace = false): Promise<{ ok: true } | { ok: false; error: string }> {
    const id = this.getActiveProfileId();
    if (!id) return { ok: false, error: 'No active profile' };

    try {
      const boxes = await dbManager.getBoxes();
      const variants: any[] = [];
      for (const box of boxes) {
        const v = await dbManager.getVariants(box.id);
        variants.push(...v);
      }
      const templates = await dbManager.getTemplates();

      const backup = {
        data: {
          boxes: Object.fromEntries(boxes.map(b => [b.id, b])),
          variants: Object.fromEntries(variants.map(v => [v.id, v])),
          templates: Object.fromEntries(templates.map(t => [t.id, t])),
        }
      };

      const url = getBackendEndpoint(`/profiles/${encodeURIComponent(id)}/import`);
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backup, replace }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        return { ok: false, error: `Import failed: ${res.status} - ${errorData.error || res.statusText}` };
      }
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err?.message ?? String(err) };
    }
  }

  // --------------------------------------------------------------------------
  // Private helpers
  // --------------------------------------------------------------------------

  private _setActiveId(id: string): void {
    localStorage.setItem(ACTIVE_PROFILE_KEY, id);
  }

  private _saveProfileLocally(profile: Profile): void {
    const existing = this.listProfiles().filter(p => p.id !== profile.id);
    localStorage.setItem(PROFILES_LIST_KEY, JSON.stringify([...existing, profile]));
  }

  private async _registerWithBackend(profile: Profile): Promise<void> {
    const url = getBackendEndpoint(`/profiles/${encodeURIComponent(profile.id)}`);
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: profile.name, color: profile.color }),
    });
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const profileManager = new ProfileManager();
export default profileManager;
