/**
 * Profile Route Handlers
 *
 * Manages /profiles/* endpoints for multi-device instance/profile synchronization.
 * Allows clients to:
 *   - Register themselves as a known profile
 *   - Export a full data snapshot so another device can import it
 *   - Import/merge incoming data from a new device
 *   - List all known profiles (for autocomplete on the setup screen)
 *
 * @module backend/routes/profiles
 * @version 1.0.0
 */

import { z } from 'zod';
import { Router, json } from '../router-engine';
import { ApiPath, HttpStatus } from '../constants';
import { dbManager, type BackendProfile } from '../db';

// ============================================================================
// SCHEMAS
// ============================================================================

const ProfileUpsertSchema = z.object({
  name: z.string().min(1).max(120),
  color: z.string().optional(),
});

const ProfileImportSchema = z.object({
  /** The full backup payload produced by dbManager.exportData() on the client */
  backup: z.object({
    data: z.object({
      overlays: z.record(z.string(), z.any()).optional(),
      settings: z.record(z.string(), z.any()).optional(),
    }).optional(),
  }),
  /** If true, existing data is cleared before import (full replace). Default: false (merge) */
  replace: z.boolean().optional().default(false),
});

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Extract the :id param from a URL whose pattern was /profiles/:id[/...]
 */
function extractProfileId(url: URL, prefix = '/profiles/'): string | null {
  const path = url.pathname;
  if (!path.startsWith(prefix)) return null;
  const after = path.slice(prefix.length);
  // Take the first segment (everything before the next slash)
  return after.split('/')[0] || null;
}

// ============================================================================
// ROUTE REGISTRATION
// ============================================================================

export function registerProfileRoutes(router: Router): void {

  // --------------------------------------------------------------------------
  // GET /profiles
  // List all registered profiles (for setup autocomplete)
  // --------------------------------------------------------------------------
  router.get(ApiPath.PROFILES, async () => {
    const profiles = await dbManager.listProfiles();
    return json({
      ok: true,
      profiles,
      total: profiles.length,
    });
  });

  // --------------------------------------------------------------------------
  // GET /profiles/:id
  // Check whether a profile/instance is known to the backend.
  // Returns 200 with profile info, 404 if unknown.
  // --------------------------------------------------------------------------
  router.get(ApiPath.PROFILE_BY_ID, async (ctx) => {
    const id = ctx.params?.id ?? extractProfileId(ctx.url);
    if (!id) {
      return json({ error: 'Missing profile ID' }, HttpStatus.BAD_REQUEST);
    }

    const profile = await dbManager.getProfile(id);
    if (!profile) {
      return json({ error: 'Profile not found', id }, HttpStatus.NOT_FOUND);
    }

    // Touch lastSeen
    await dbManager.touchProfile(id);

    return json({ ok: true, profile });
  });

  // --------------------------------------------------------------------------
  // POST /profiles/:id        (upsert profile metadata)
  // Called when a device creates or re-registers its profile.
  // --------------------------------------------------------------------------
  router.post(ApiPath.PROFILE_BY_ID, {
    schema: { body: ProfileUpsertSchema },
    handler: async (ctx) => {
      const id = ctx.params?.id ?? extractProfileId(ctx.url);
      if (!id) {
        return json({ error: 'Missing profile ID' }, HttpStatus.BAD_REQUEST);
      }

      const { name, color } = ctx.body as z.infer<typeof ProfileUpsertSchema>;

      const existing = await dbManager.getProfile(id);
      const profile: BackendProfile = {
        id,
        name,
        color,
        createdAt: existing?.createdAt ?? Date.now(),
        lastSeen: Date.now(),
      };

      await dbManager.saveProfile(profile);

      return json({
        ok: true,
        profile,
        created: !existing,
      }, existing ? HttpStatus.OK : HttpStatus.CREATED);
    },
    description: 'Register or update a profile',
  });

  // --------------------------------------------------------------------------
  // GET /profiles/:id/export
  // Returns a full data snapshot for the given instance so another device
  // can import it and replicate the exact configuration.
  // --------------------------------------------------------------------------
  router.get(ApiPath.PROFILE_EXPORT, async (ctx) => {
    const id = ctx.params?.id ?? extractProfileId(ctx.url, '/profiles/');
    if (!id) {
      return json({ error: 'Missing profile ID' }, HttpStatus.BAD_REQUEST);
    }

    const profile = await dbManager.getProfile(id);
    if (!profile) {
      return json({ error: 'Profile not found', id }, HttpStatus.NOT_FOUND);
    }

    // Export full overlay + settings snapshot from the backend DB
    const backup = await dbManager.exportData();

    // Touch lastSeen
    await dbManager.touchProfile(id);

    return json({
      ok: true,
      profile,
      backup,
      exportedAt: Date.now(),
    });
  });

  // --------------------------------------------------------------------------
  // POST /profiles/:id/import
  // Accept a data backup from a client and merge / replace it in the backend DB.
  // This is called when a new device wants to push its local data to the server,
  // or when two instances need to be merged.
  // --------------------------------------------------------------------------
  router.post(ApiPath.PROFILE_IMPORT, {
    schema: { body: ProfileImportSchema },
    handler: async (ctx) => {
      const id = ctx.params?.id ?? extractProfileId(ctx.url, '/profiles/');
      if (!id) {
        return json({ error: 'Missing profile ID' }, HttpStatus.BAD_REQUEST);
      }

      const profile = await dbManager.getProfile(id);
      if (!profile) {
        return json({ error: 'Profile not found. Register it first via POST /profiles/:id' }, HttpStatus.NOT_FOUND);
      }

      const { backup, replace } = ctx.body as z.infer<typeof ProfileImportSchema>;

      if (replace) {
        // Full replace: wipe existing data and import fresh
        await dbManager.importData(backup as Record<string, any>);
      } else {
        // Merge: import overlays individually, keeping existing ones that aren't in the payload
        const incomingOverlays = Object.entries(backup?.data?.overlays ?? {});
        for (const [overlayId, data] of incomingOverlays) {
          await dbManager.saveOverlay(overlayId, data);
        }
        // Merge settings
        const incomingSettings = Object.entries(backup?.data?.settings ?? {});
        for (const [settingId, data] of incomingSettings) {
          const existing = await dbManager.settings.get(settingId);
          if (!existing) {
            await dbManager.settings.add({ id: settingId, ...(data as object) });
          }
        }
      }

      await dbManager.touchProfile(id);

      return json({
        ok: true,
        id,
        replace,
        overlaysImported: Object.keys(backup?.data?.overlays ?? {}).length,
        settingsImported: Object.keys(backup?.data?.settings ?? {}).length,
      });
    },
    description: 'Import data backup for a profile instance',
  });
}
