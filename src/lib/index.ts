/**
 * Overlay Framework - Library Exports
 * Main entry point for all framework features
 */

// Context exports
export * from '../context/index';
export * from '../context/schemaContext';

// Localization exports
export * from '../locales/localization';

// Schema exports
export * from './schema-loader';
export * from './alertEvents';

// Animation schemas export
export * from '../schemas/animation-schemas';

// Task exports
export * from './task-controllers';

// Database exports
export * from './db';

// Config exports
export * from './config';

// Alert events exports
export * from './alertEvents';

// Dialog exports
export * from './dialog';

// Media registry exports
export * from '../core/mediaRegistry';

// Renderer exports
export * from '../core/renderer';

// Schemas exports (excluding conflicting types)
export { 
  UnitSchema, 
  ElementTypeSchema,
  BaseElementSchema,
  TextElementSchema,
  MediaElementSchema,
  BoxElementSchema,
  MultimediaElementSchema,
  GroupElementSchema,
  TemplateElementSchema,
  TemplateSchema
} from '../core/schemas';
export type { 
  UnitValue,
  GroupElement, 
  TemplateElement,
  Template
} from '../core/schemas';

// Types exports (specific types only)
export type { 
  ElementType, 
  BaseElement, 
  TextElement, 
  MediaElement, 
  BoxElement, 
  MultimediaElement,
  MediaHandler 
} from '../core/types';

/**
 * Framework version
 */
export const VERSION = '1.0.0';

/**
 * Framework configuration
 */
export interface FrameworkConfig {
  defaultLocale: string;
  supportedLocales: string[];
  enableLocalization: boolean;
  enableContext: boolean;
  enableTasks: boolean;
}

export const defaultConfig: FrameworkConfig = {
  defaultLocale: 'es',
  supportedLocales: ['es', 'en'],
  enableLocalization: true,
  enableContext: true,
  enableTasks: true,
};

/**
 * Initialize the framework
 */
export async function initializeFramework(config: Partial<FrameworkConfig> = {}): Promise<void> {
  const finalConfig = { ...defaultConfig, ...config };
  
  // Initialize schemas if enabled
  if (finalConfig.enableContext) {
    const { loadSchemas } = await import('./schema-loader');
    await loadSchemas();
  }
  
  console.log('Overlay Framework initialized');
}

/**
 * Cleanup the framework
 */
export async function cleanupFramework(): Promise<void> {
  const { unloadSchemas } = await import('./schema-loader');
  await unloadSchemas();
  console.log('Overlay Framework cleaned up');
}
