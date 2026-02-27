import { createContext } from '@lit/context';
import type { PlatformEventDefinition } from '../lib/alertEvents';

/**
 * Context to share the platform event schema down the component tree.
 * This decouples the editor from hardcoded events ('seguimientos', etc.).
 */
export const platformSchemaContext = createContext<PlatformEventDefinition[]>('platform-schema-context');
