/**
 * Schema Loader Module
 * 
 * Manages loading, reloading, and unloading of variant schemas.
 * Supports dynamic schema registration with lifecycle callbacks.
 * 
 * Provides:
 * - Default schema definitions for built-in event types
 * - Schema validation with required/optional fields
 * - Lifecycle hooks for schema changes
 * - Event data creation with defaults
 * 
 * @module lib/schema-loader
 */

import {
  EventType,
  SchemaDefinition,
  SchemaDefinitionSchema,
  defaultSchemas,
} from './core';

export interface LifecycleHooks {
  onLoad?: (schemas: SchemaMap) => void | Promise<void>;
  onRestart?: (oldSchemas: SchemaMap, newSchemas: SchemaMap) => void | Promise<void>;
  onUnload?: (schemas: SchemaMap) => void | Promise<void>;
}

export type SchemaMap = Map<EventType, SchemaDefinition>;

/**
 * Default schema definitions extracted from core
 * Uses the built-in schemas from lib/core/utils.ts
 */
// Removed redundant defaultSchemas, using core/utils.ts exports

class SchemaLoader {
  private schemas: SchemaMap = new Map();
  private hooks: LifecycleHooks = {};
  private isLoaded: boolean = false;

  /**
   * Initialize the schema loader with optional custom schemas and hooks
   */
  async init(customSchemas?: SchemaMap, hooks?: LifecycleHooks): Promise<void> {
    // Load default schemas first
    this.schemas = new Map(defaultSchemas);

    // Apply custom schemas if provided
    if (customSchemas) {
      for (const [key, value] of customSchemas) {
        this.schemas.set(key, value);
      }
    }

    // Set lifecycle hooks
    if (hooks) {
      this.hooks = hooks;
    }

    // Trigger onLoad hook
    if (this.hooks.onLoad) {
      await this.hooks.onLoad(this.schemas);
    }

    this.isLoaded = true;
  }

  /**
   * Restart the schema loader with new schemas
   * Triggers onRestart hook with old and new schemas
   */
  async restart(newSchemas?: SchemaMap): Promise<void> {
    const oldSchemas = new Map(this.schemas);

    if (newSchemas) {
      this.schemas = new Map(newSchemas);
    }

    // Trigger onRestart hook
    if (this.hooks.onRestart) {
      await this.hooks.onRestart(oldSchemas, this.schemas);
    }
  }

  /**
   * Unload all schemas and trigger cleanup
   * Triggers onUnload hook
   */
  async unload(): Promise<void> {
    // Trigger onUnload hook
    if (this.hooks.onUnload) {
      await this.hooks.onUnload(this.schemas);
    }

    this.schemas.clear();
    this.isLoaded = false;
  }

  /**
   * Get schema by event type
   */
  getSchema(eventType: EventType): SchemaDefinition | undefined {
    return this.schemas.get(eventType);
  }

  /**
   * Get all schemas
   */
  getAllSchemas(): SchemaMap {
    return new Map(this.schemas);
  }

  /**
   * Check if schemas are loaded
   */
  isReady(): boolean {
    return this.isLoaded;
  }

  /**
   * Validate event data against a schema
   */
  validate(eventType: EventType, data: Record<string, unknown>): boolean {
    const schema = this.schemas.get(eventType);
    if (!schema) return false;

    // Check required fields
    for (const field of schema.requiredFields) {
      if (!(field in data)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get validation errors for event data
   */
  getValidationErrors(eventType: EventType, data: Record<string, unknown>): string[] {
    const schema = this.schemas.get(eventType);
    if (!schema) return ['Unknown event type'];

    const errors: string[] = [];

    // Check required fields
    for (const field of schema.requiredFields) {
      if (!(field in data)) {
        errors.push(`Missing required field: ${field}`);
      }
    }

    // Type validations
    if (data.months !== undefined && typeof data.months !== 'number') {
      errors.push('Field "months" must be a number');
    }

    if (data.amount !== undefined && typeof data.amount !== 'number') {
      errors.push('Field "amount" must be a number');
    }

    return errors;
  }

  /**
   * Create event data with defaults for a specific event type
   */
  createEventData(eventType: EventType, baseData: Record<string, unknown>): Record<string, unknown> {
    const schema = this.schemas.get(eventType);
    if (!schema) return baseData;

    return {
      ...baseData,
      timestamp: baseData.timestamp ?? Date.now(),
    };
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

export const getSchema = (eventType: EventType) =>
  schemaLoader.getSchema(eventType);

export const getAllSchemas = () =>
  schemaLoader.getAllSchemas();

export const isSchemasReady = () =>
  schemaLoader.isReady();

export const validateEvent = (eventType: EventType, data: Record<string, unknown>) =>
  schemaLoader.validate(eventType, data);

export const getEventValidationErrors = (eventType: EventType, data: Record<string, unknown>) =>
  schemaLoader.getValidationErrors(eventType, data);

export const createEventData = (eventType: EventType, baseData: Record<string, unknown>) =>
  schemaLoader.createEventData(eventType, baseData);
