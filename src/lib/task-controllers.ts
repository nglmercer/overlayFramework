/**
 * Task Controllers Module
 * 
 * Provides async task helpers for use in Lit components.
 * Built on top of @lit/task for reactive async data loading.
 * 
 * This module provides:
 * - Task configuration helpers for common operations
 * - Status checking utilities
 * - Render helpers for task states
 * - Type-safe task factories
 * 
 * @module lib/task-controllers
 * @version 2.0.0
 */

import { Task, TaskStatus } from '@lit/task';

import { 
  AlertVariant,
  validateAlertVariant,
} from './core';

/**
 * ============================================
 * TASK CONFIGURATION HELPERS
 * ============================================
 * 
 * These are utility functions to create common task configurations.
 * Each factory returns a configuration object ready for use with Lit's Task.
 */

/**
 * Task configuration for loading variants
 */
export interface LoadVariantsConfig {
  /** The task function */
  task: (params: [string], options: { signal: AbortSignal }) => Promise<AlertVariant[]>;
  /** Arguments provider */
  args: () => [string];
  /** Whether to auto-run when args change */
  autoRun: boolean;
}

/**
 * Task configuration for saving a variant
 */
export interface SaveVariantConfig {
  task: (params: [AlertVariant], options: { signal: AbortSignal }) => Promise<void>;
  args: () => [AlertVariant];
  autoRun: boolean;
}

/**
 * Task configuration for loading templates
 */
export interface LoadTemplatesConfig {
  task: (params: any, options: { signal: AbortSignal }) => Promise<any[]>;
  args: () => any[];
  autoRun: boolean;
}

/**
 * Task configuration for loading boxes
 */
export interface LoadBoxesConfig {
  task: (params: any, options: { signal: AbortSignal }) => Promise<any[]>;
  args: () => any[];
  autoRun: boolean;
}

/**
 * Task configuration for fetching media
 */
export interface FetchMediaConfig {
  task: (params: [string], options: { signal: AbortSignal }) => Promise<Blob | null>;
  args: () => [string];
  autoRun: boolean;
}

/**
 * Task configuration for validating event data
 */
export interface ValidateEventConfig {
  task: (params: [string, Record<string, unknown>], options: { signal: AbortSignal }) => Promise<{
    valid: boolean;
    errors: string[];
  }>;
  args: () => [string, Record<string, unknown>];
  autoRun: boolean;
}

/**
 * ============================================
 * FACTORY FUNCTIONS
 * ============================================
 */

/**
 * Creates a task config for loading variants
 * 
 * @param boxId - Function that returns the box ID
 * @returns Task configuration
 */
export function createLoadVariantsConfig(boxId: () => string): LoadVariantsConfig {
  return {
    task: async ([id]: [string], { signal }: { signal: AbortSignal }) => {
      const { dbManager } = await import('./db');
      return dbManager.getVariants(id);
    },
    args: () => [boxId()],
    autoRun: true,
  };
}

/**
 * Creates a task config for saving a variant
 * 
 * @param variant - Function that returns the variant to save
 * @returns Task configuration
 */
export function createSaveVariantConfig(variant: () => AlertVariant): SaveVariantConfig {
  return {
    task: async ([v]: [AlertVariant], { signal }: { signal: AbortSignal }) => {
      const { dbManager } = await import('./db');
      // Validate before saving
      const result = validateAlertVariant(v);
      if (!result.success) {
        throw new Error(`Invalid variant: ${(result as any).errors?.join(', ') || 'validation failed'}`);
      }
      await dbManager.saveVariant(v);
    },
    args: () => [variant()],
    autoRun: false,
  };
}

/**
 * Creates a task config for loading templates
 * 
 * @returns Task configuration
 */
export function createLoadTemplatesConfig(): LoadTemplatesConfig {
  return {
    task: async ({ signal }: { signal: AbortSignal }) => {
      const { dbManager } = await import('./db');
      return dbManager.getTemplates();
    },
    args: () => [],
    autoRun: true,
  };
}

/**
 * Creates a task config for loading boxes
 * 
 * @returns Task configuration
 */
export function createLoadBoxesConfig(): LoadBoxesConfig {
  return {
    task: async ({ signal }: { signal: AbortSignal }) => {
      const { dbManager } = await import('./db');
      return dbManager.getBoxes();
    },
    args: () => [],
    autoRun: true,
  };
}

/**
 * Creates a task config for fetching media
 * 
 * @param url - Function that returns the URL to fetch
 * @returns Task configuration
 */
export function createFetchMediaConfig(url: () => string): FetchMediaConfig {
  return {
    task: async ([u]: [string], { signal }: { signal: AbortSignal }) => {
      try {
        const response = await fetch(u, { signal });
        if (!response.ok) return null;
        return await response.blob();
      } catch {
        return null;
      }
    },
    args: () => [url()],
    autoRun: false,
  };
}

/**
 * Creates a task config for validating event data
 * 
 * @param eventType - Function that returns the event type
 * @param data - Function that returns the data to validate
 * @returns Task configuration
 */
export function createValidateEventConfig(
  eventType: () => string, 
  data: () => Record<string, unknown>
): ValidateEventConfig {
  return {
    task: async ([type, d]: [string, Record<string, unknown>], { signal }: { signal: AbortSignal }) => {
      const { validateEvent, getEventValidationErrors } = await import('./schema-loader');
      
      const valid = validateEvent(type as any, d);
      const errors = valid ? [] : getEventValidationErrors(type as any, d);
      
      return { valid, errors };
    },
    args: () => [eventType(), data()],
    autoRun: false,
  };
}

/**
 * ============================================
 * STATUS HELPERS
 * ============================================
 */

/**
 * Helper to check if a task is in a specific status
 * 
 * @param task - The task to check
 * @param status - The status to check for
 * @returns True if task is in the specified status
 */
export function isTaskStatus(task: Task<any, any>, status: TaskStatus): boolean {
  return task.status === status;
}

/**
 * Helper to get task status text
 * 
 * @param task - The task to get status text for
 * @returns Human-readable status text
 */
export function getTaskStatusText(task: Task<any, any>): string {
  const status = task.status;
  switch (status) {
    case TaskStatus.INITIAL:
      return 'Initial';
    case TaskStatus.PENDING:
      return 'Pending';
    case TaskStatus.COMPLETE:
      return 'Complete';
    case TaskStatus.ERROR:
      return 'Error';
    default:
      return 'Unknown';
  }
}

/**
 * Check if task has completed successfully
 * 
 * @param task - The task to check
 * @returns True if task is complete
 */
export function isTaskComplete(task: Task<any, any>): boolean {
  return task.status === TaskStatus.COMPLETE;
}

/**
 * Check if task has an error
 * 
 * @param task - The task to check
 * @returns True if task has errored
 */
export function isTaskError(task: Task<any, any>): boolean {
  return task.status === TaskStatus.ERROR;
}

/**
 * Check if task is pending (loading)
 * 
 * @param task - The task to check
 * @returns True if task is pending
 */
export function isTaskPending(task: Task<any, any>): boolean {
  return task.status === TaskStatus.PENDING;
}

/**
 * ============================================
 * RENDER HELPERS
 * ============================================
 */

/**
 * Renderers type for task states
 */
export type TaskRenderers<T> = {
  initial?: () => T;
  pending?: () => T;
  complete?: (value: unknown) => T;
  error?: (error: unknown) => T;
};

/**
 * Render task based on current status
 * 
 * @param task - The task to render
 * @param renderers - Object with render functions for each state
 * @returns Rendered content
 */
export const renderTask = <T>(task: Task<any, any>, renderers: TaskRenderers<T>): T => {
  return task.render(renderers);
};

/**
 * ============================================
 * RE-EXPORTS
 * ============================================
 */

// Re-export Lit Task for convenience
export { Task, TaskStatus };

/**
 * ============================================
 * DEFAULT EXPORTS
 * ============================================
 */

export default {
  Task,
  TaskStatus,
  createLoadVariantsConfig,
  createSaveVariantConfig,
  createLoadTemplatesConfig,
  createLoadBoxesConfig,
  createFetchMediaConfig,
  createValidateEventConfig,
  isTaskStatus,
  getTaskStatusText,
  renderTask,
};
