/**
 * Schema Loader - Simplificado
 * 
 * Ya no hay schemas - todo es dinámico.
 * Mantenemos la interfaz por compatibilidad.
 * 
 * @module lib/schema-loader
 */

export interface LifecycleHooks {
  onLoad?: (schemas: SchemaMap) => void | Promise<void>;
  onRestart?: (oldSchemas: SchemaMap, newSchemas: SchemaMap) => void | Promise<void>;
  onUnload?: (schemas: SchemaMap) => void | Promise<void>;
}

/**
 * Simple map - ya no hay tipos específicos
 */
export type SchemaMap = Map<string, Record<string, unknown>>;

/**
 * Minimal loader that just tracks state
 */
class SchemaLoader {
  private isLoaded: boolean = false;

  async init(_customSchemas?: SchemaMap, hooks?: LifecycleHooks): Promise<void> {
    if (hooks?.onLoad) {
      await hooks.onLoad(new Map());
    }
    this.isLoaded = true;
  }

  async restart(_newSchemas?: SchemaMap): Promise<void> {
    this.isLoaded = true;
  }

  async unload(): Promise<void> {
    this.isLoaded = false;
  }

  isReady(): boolean {
    return this.isLoaded;
  }

  // Legacy methods for compatibility
  getSchema(_eventType: string): undefined {
    return undefined;
  }

  getAllSchemas(): SchemaMap {
    return new Map();
  }

  validate(_eventType: string, _data: Record<string, unknown>): boolean {
    return true;
  }

  getValidationErrors(_eventType: string, _data: Record<string, unknown>): string[] {
    return [];
  }

  createEventData(_eventType: string, baseData: Record<string, unknown>): Record<string, unknown> {
    return baseData;
  }
}

// Export singleton instance
export const schemaLoader = new SchemaLoader();

// Export convenience functions
export const loadSchemas = (customSchemas?: SchemaMap, hooks?: LifecycleHooks) =>
  schemaLoader.init(customSchemas, hooks);

export const restartSchemas = (newSchemas?: SchemaMap) =>
  schemaLoader.restart(newSchemas);

export const unloadSchemas = () =>
  schemaLoader.unload();

export const isSchemasReady = () =>
  schemaLoader.isReady();

/**
 * ============================================
 * LEGACY COMPATIBILITY
 * ============================================
 */

export function getSchema(_eventType: string): undefined {
  console.warn('getSchema is deprecated - now using dynamic platform variables');
  return undefined;
}

export function getAllSchemas(): SchemaMap {
  console.warn('getAllSchemas is deprecated');
  return new Map();
}

export function validateEvent(_eventType: string, _data: Record<string, unknown>): boolean {
  console.warn('validateEvent is deprecated - no validation needed');
  return true;
}

export function getEventValidationErrors(_eventType: string, _data: Record<string, unknown>): string[] {
  console.warn('getEventValidationErrors is deprecated');
  return [];
}

export function createEventData(_eventType: string, baseData: Record<string, unknown>): Record<string, unknown> {
  return baseData;
}
