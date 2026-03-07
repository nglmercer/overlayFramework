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
      boxes: z.record(z.string(), z.any()).optional(),
      variants: z.record(z.string(), z.any()).optional(),
      templates: z.record(z.string(), z.any()).optional(),
      overlays: z.record(z.string(), z.any()).optional(),
      settings: z.record(z.string(), z.any()).optional(),
    }).optional(),
  }),
  /** If true, existing data is cleared before import (full replace). Default: false (merge) */
  // Accept any value and coerce to boolean for robustness
  replace: z.any().optional().transform((val) => val === true),
});

// Schema for incremental sync - sends only the changed item with action type
const ProfileSyncItemSchema = z.object({
  /** Action type: 'create', 'update', or 'delete' */
  action: z.enum(['create', 'update', 'delete']),
  /** Item type: 'box', 'variant', or 'template' */
  itemType: z.enum(['box', 'variant', 'template']),
  /** The item data (not required for delete) */
  item: z.any().optional(),
});

// ============================================================================
// VALIDATOR HELPERS
// ============================================================================

/**
 * Validate and transform a box entry from legacy or malformed data.
 * Ensures the box has required fields and correct types.
 */
function validateAndTransformBox(boxId: string, data: unknown): { success: true; data: Record<string, any> } | { success: false; error: string } {
  const boxData = data as Record<string, any>;
  
  // If data is missing or not an object, create a minimal valid box
  if (!boxData || typeof boxData !== 'object') {
    return {
      success: true,
      data: { id: boxId, type: 'box', name: `Box ${boxId}`, enabled: true, createdAt: Date.now(), updatedAt: Date.now() }
    };
  }
  
  // Ensure id is set (from key)
  if (!boxData.id) {
    boxData.id = boxId;
  }
  
  // Ensure type is set
  if (!boxData.type) {
    boxData.type = 'box';
  }
  
  // Ensure name exists
  if (!boxData.name) {
    boxData.name = `Box ${boxId}`;
  }
  
  // Ensure enabled is boolean
  if (typeof boxData.enabled !== 'boolean') {
    boxData.enabled = true;
  }
  
  // Ensure timestamps exist
  if (!boxData.createdAt) {
    boxData.createdAt = Date.now();
  }
  boxData.updatedAt = Date.now();
  
  return { success: true, data: boxData };
}

/**
 * Validate and transform a variant entry from legacy or malformed data.
 */
function validateAndTransformVariant(variantId: string, data: unknown): { success: true; data: Record<string, any> } | { success: false; error: string } {
  const variantData = data as Record<string, any>;
  
  if (!variantData || typeof variantData !== 'object') {
    return {
      success: true,
      data: { id: variantId, type: 'variant', name: `Variant ${variantId}`, createdAt: Date.now(), updatedAt: Date.now() }
    };
  }
  
  if (!variantData.id) variantData.id = variantId;
  if (!variantData.type) variantData.type = 'variant';
  if (!variantData.name) variantData.name = `Variant ${variantId}`;
  if (!variantData.createdAt) variantData.createdAt = Date.now();
  variantData.updatedAt = Date.now();
  
  return { success: true, data: variantData };
}

/**
 * Validate and transform a template entry from legacy or malformed data.
 */
function validateAndTransformTemplate(templateId: string, data: unknown): { success: true; data: Record<string, any> } | { success: false; error: string } {
  const templateData = data as Record<string, any>;
  
  if (!templateData || typeof templateData !== 'object') {
    return {
      success: true,
      data: { id: templateId, type: 'template', name: `Template ${templateId}`, createdAt: Date.now(), updatedAt: Date.now() }
    };
  }
  
  if (!templateData.id) templateData.id = templateId;
  if (!templateData.type) templateData.type = 'template';
  if (!templateData.name) templateData.name = `Template ${templateId}`;
  if (!templateData.createdAt) templateData.createdAt = Date.now();
  templateData.updatedAt = Date.now();
  
  return { success: true, data: templateData };
}

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

    // Export only the overlays belonging to this profile from the backend DB
    const backendBackup = await dbManager.exportData(id);
    
    // Convert backend overlays to frontend format (boxes, variants, templates)
    const overlays = backendBackup.data?.overlays ?? {};
    const boxes: Record<string, any> = {};
    const variants: Record<string, any> = {};
    const templates: Record<string, any> = {};
    
    for (const [key, data] of Object.entries(overlays)) {
      const overlayData = data as Record<string, any>;
      const type = overlayData.type || key.split(':')[0];
      
      if (key.startsWith('box:') || type === 'box') {
        const boxId = key.startsWith('box:') ? key.slice(4) : key;
        boxes[boxId] = overlayData;
      } else if (key.startsWith('variant:') || type === 'variant') {
        const variantId = key.startsWith('variant:') ? key.slice(8) : key;
        variants[variantId] = overlayData;
      } else if (key.startsWith('template:') || type === 'template') {
        const templateId = key.startsWith('template:') ? key.slice(9) : key;
        templates[templateId] = overlayData;
      } else {
        // Legacy format - treat as box
        boxes[key] = overlayData;
      }
    }

    // Build the backup in frontend-compatible format
    const backup = {
      version: backendBackup.version,
      timestamp: backendBackup.timestamp,
      data: {
        boxes,
        variants,
        templates,
        settings: backendBackup.data?.settings ?? {},
      }
    };

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
        // Full replace: wipe existing profile data and import fresh
        await dbManager.importData(backup as Record<string, any>, id, true);
      } else {
        // Merge: import boxes/variants/templates (frontend format) or overlays/settings (backend format)
        // Each imported item is associated with this profile
        
        // Handle frontend boxes format with validation and transformation
        const incomingBoxes = Object.entries(backup?.data?.boxes ?? {});
        let boxesImported = 0;
        for (const [boxId, data] of incomingBoxes) {
          const validated = validateAndTransformBox(boxId, data);
          if (validated.success) {
            await dbManager.saveOverlay(`box:${boxId}`, validated.data, id);
            boxesImported++;
          } else {
            console.warn(`[Import] Invalid box ${boxId}: ${validated.error}`);
          }
        }
        
        // Handle frontend variants format with validation and transformation
        const incomingVariants = Object.entries(backup?.data?.variants ?? {});
        let variantsImported = 0;
        for (const [variantId, data] of incomingVariants) {
          const validated = validateAndTransformVariant(variantId, data);
          if (validated.success) {
            await dbManager.saveOverlay(`variant:${variantId}`, validated.data, id);
            variantsImported++;
          } else {
            console.warn(`[Import] Invalid variant ${variantId}: ${validated.error}`);
          }
        }
        
        // Handle frontend templates format with validation and transformation
        const incomingTemplates = Object.entries(backup?.data?.templates ?? {});
        let templatesImported = 0;
        for (const [templateId, data] of incomingTemplates) {
          const validated = validateAndTransformTemplate(templateId, data);
          if (validated.success) {
            await dbManager.saveOverlay(`template:${templateId}`, validated.data, id);
            templatesImported++;
          } else {
            console.warn(`[Import] Invalid template ${templateId}: ${validated.error}`);
          }
        }
        
        // Handle legacy backend overlays format
        const incomingOverlays = Object.entries(backup?.data?.overlays ?? {});
        for (const [overlayId, data] of incomingOverlays) {
          await dbManager.saveOverlay(overlayId, data, id);
        }
        
        // Merge settings (global, not profile-specific)
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
        boxesImported: Object.keys(backup?.data?.boxes ?? {}).length,
        variantsImported: Object.keys(backup?.data?.variants ?? {}).length,
        templatesImported: Object.keys(backup?.data?.templates ?? {}).length,
        overlaysImported: Object.keys(backup?.data?.overlays ?? {}).length,
        settingsImported: Object.keys(backup?.data?.settings ?? {}).length,
      });
    },
    description: 'Import data backup for a profile instance',
  });

  // --------------------------------------------------------------------------
  // POST /profiles/:id/sync
  // Incremental sync - sends only a single item change (create/update/delete)
  // This is more efficient than sending all data on every change.
  // --------------------------------------------------------------------------
  router.post(ApiPath.PROFILE_SYNC, {
    schema: { body: ProfileSyncItemSchema },
    handler: async (ctx) => {
      const id = ctx.params?.id ?? extractProfileId(ctx.url, '/profiles/');
      if (!id) {
        return json({ error: 'Missing profile ID' }, HttpStatus.BAD_REQUEST);
      }

      const profile = await dbManager.getProfile(id);
      if (!profile) {
        return json({ error: 'Profile not found. Register it first via POST /profiles/:id' }, HttpStatus.NOT_FOUND);
      }

      const { action, itemType, item } = ctx.body as z.infer<typeof ProfileSyncItemSchema>;
      
      // Build the key based on item type - try both with prefix and without for backward compatibility
      const keyWithPrefix = `${itemType}:${item?.id}`;
      const keyWithoutPrefix = item?.id;
      
      try {
        switch (action) {
          case 'create':
          case 'update':
            if (!item?.id) {
              return json({ error: 'Item ID is required for create/update' }, HttpStatus.BAD_REQUEST);
            }
            // Validate and transform based on item type
            let validatedData: Record<string, any>;
            if (itemType === 'box') {
              const validated = validateAndTransformBox(item.id, item);
              if (!validated.success) {
                return json({ error: validated.error }, HttpStatus.BAD_REQUEST);
              }
              validatedData = validated.data;
            } else if (itemType === 'variant') {
              const validated = validateAndTransformVariant(item.id, item);
              if (!validated.success) {
                return json({ error: validated.error }, HttpStatus.BAD_REQUEST);
              }
              validatedData = validated.data;
            } else if (itemType === 'template') {
              const validated = validateAndTransformTemplate(item.id, item);
              if (!validated.success) {
                return json({ error: validated.error }, HttpStatus.BAD_REQUEST);
              }
              validatedData = validated.data;
            } else {
              validatedData = item;
            }
            await dbManager.saveOverlay(keyWithPrefix, validatedData, id);
            break;
            
          case 'delete':
            if (!item?.id) {
              return json({ error: 'Item ID is required for delete' }, HttpStatus.BAD_REQUEST);
            }
            // Try deleting with prefix first, then without prefix (for backward compatibility with legacy data)
            let deleted = await dbManager.deleteOverlay(keyWithPrefix);
            if (!deleted) {
              deleted = await dbManager.deleteOverlay(keyWithoutPrefix) || deleted;
            }
            break;
            
          default:
            return json({ error: 'Invalid action type' }, HttpStatus.BAD_REQUEST);
        }

        await dbManager.touchProfile(id);

        return json({
          ok: true,
          id,
          action,
          itemType,
          itemId: item?.id,
          keyDeleted: action === 'delete' ? keyWithPrefix : undefined,
        });
      } catch (err) {
        console.error('[Profile sync] Error:', err);
        return json({ error: String(err) }, HttpStatus.INTERNAL_SERVER_ERROR);
      }
    },
    description: 'Sync a single item change (create/update/delete) for a profile',
  });
}
