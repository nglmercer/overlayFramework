import { Task, TaskStatus } from '@lit/task';

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
 * 
 * @module lib/task-controllers
 */

/**
 * Re-export Lit Task for convenience
 */
export { Task, TaskStatus };

/**
 * Example: How to use Task in a Lit component
 * 
 * ```typescript
 * import { LitElement, html } from 'lit';
 * import { Task, TaskStatus } from '@lit/task';
 * 
 * class MyElement extends LitElement {
 *   private loadVariantsTask = new Task(this, {
 *     task: async ([boxId], { signal }) => {
 *       const { dbManager } = await import('./db');
 *       return dbManager.getVariants(boxId);
 *     },
 *     args: () => [this.boxId],
 *     autoRun: true,
 *   });
 * 
 *   render() {
 *     return this.loadVariantsTask.render({
 *       initial: () => html`<p>Not loaded</p>`,
 *       pending: () => html`<p>Loading...</p>`,
 *       complete: (variants) => html`<p>${variants.length} variants</p>`,
 *       error: (error) => html`<p>Error: ${error}</p>`,
 *     });
 *   }
 * }
 * ```
 */

/**
 * Task Configuration Helpers
 * These are utility functions to create common task configurations
 */

/**
 * Creates a task config for loading variants
 */
export const createLoadVariantsConfig = (boxId: () => string) => ({
  task: async ([id]: [string], { signal }: { signal: AbortSignal }) => {
    const { dbManager } = await import('./db');
    return dbManager.getVariants(id);
  },
  args: () => [boxId()],
  autoRun: true,
});

/**
 * Creates a task config for saving a variant
 */
export const createSaveVariantConfig = (variant: () => any) => ({
  task: async ([v]: [any], { signal }: { signal: AbortSignal }) => {
    const { dbManager } = await import('./db');
    await dbManager.saveVariant(v);
  },
  args: () => [variant()],
  autoRun: false,
});

/**
 * Creates a task config for loading templates
 */
export const createLoadTemplatesConfig = () => ({
  task: async ({ signal }: { signal: AbortSignal }) => {
    const { dbManager } = await import('./db');
    return dbManager.getTemplates();
  },
  args: () => [],
  autoRun: true,
});

/**
 * Creates a task config for loading boxes
 */
export const createLoadBoxesConfig = () => ({
  task: async ({ signal }: { signal: AbortSignal }) => {
    const { dbManager } = await import('./db');
    return dbManager.getBoxes();
  },
  args: () => [],
  autoRun: true,
});

/**
 * Creates a task config for fetching media
 */
export const createFetchMediaConfig = (url: () => string) => ({
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
});

/**
 * Creates a task config for validating event data
 */
export const createValidateEventConfig = (
  eventType: () => string, 
  data: () => Record<string, unknown>
) => ({
  task: async ([type, d]: [string, Record<string, unknown>], { signal }: { signal: AbortSignal }) => {
    const { validateEvent, getEventValidationErrors } = await import('./schema-loader');
    
    const valid = validateEvent(type as any, d);
    const errors = valid ? [] : getEventValidationErrors(type as any, d);
    
    return { valid, errors };
  },
  args: () => [eventType(), data()],
  autoRun: false,
});

/**
 * Helper to check if a task is in a specific status
 */
export const isTaskStatus = (task: Task<any, any>, status: TaskStatus): boolean => {
  return task.status === status;
};

/**
 * Helper to get task status text
 */
export const getTaskStatusText = (task: Task<any, any>): string => {
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
};

/**
 * Render helpers for task states
 */
export type TaskRenderers<T> = {
  initial?: () => T;
  pending?: () => T;
  complete?: (value: any) => T;
  error?: (error: any) => T;
};

export const renderTask = <T>(task: Task<any, any>, renderers: TaskRenderers<T>): T => {
  return task.render(renderers);
};
