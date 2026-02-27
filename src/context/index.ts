import { createContext } from '@lit/context';
import { platformSchemaContext } from './schemaContext';

/**
 * @lit/context Implementation
 * Provides context providers for passing data through the component tree
 */

/**
 * Platform Schema Context
 * Shares the platform event schema definition down the component tree
 */
export { platformSchemaContext };

/**
 * Alert Variant Context
 * Provides access to the currently selected variant data
 */
export interface AlertVariantContextValue {
  variant: any | null;
  eventData: Record<string, string>;
}

export const alertVariantContext = createContext<AlertVariantContextValue>('alert-variant-context');

/**
 * Localization Context
 * Provides access to the current locale and translation function
 */
export interface LocalizationContextValue {
  locale: string;
  translations: Record<string, string>;
}

export const localizationContext = createContext<LocalizationContextValue>('localization-context');

/**
 * Theme Context
 * Provides access to theme settings
 */
export interface ThemeContextValue {
  mode: 'light' | 'dark';
  accentColor: string;
}

export const themeContext = createContext<ThemeContextValue>('theme-context');

/**
 * User Preferences Context
 * Provides access to user preferences
 */
export interface UserPreferencesContextValue {
  language: string;
  notifications: boolean;
  autoSave: boolean;
}

export const userPreferencesContext = createContext<UserPreferencesContextValue>('user-preferences-context');

/**
 * Editor State Context
 * Provides access to editor state (selected element, tool, etc.)
 */
export interface EditorStateContextValue {
  selectedElementId: string | null;
  activeTool: string | null;
  zoom: number;
  isDragging: boolean;
}

export const editorStateContext = createContext<EditorStateContextValue>('editor-state-context');

/**
 * Media Library Context
 * Provides access to media library state
 */
export interface MediaLibraryContextValue {
  isOpen: boolean;
  mediaType: 'image' | 'sound' | null;
  selectedItems: string[];
}

export const mediaLibraryContext = createContext<MediaLibraryContextValue>('media-library-context');

/**
 * Validation Context
 * Provides access to validation errors
 */
export interface ValidationContextValue {
  errors: Record<string, string[]>;
  warnings: Record<string, string[]>;
}

export const validationContext = createContext<ValidationContextValue>('validation-context');

/**
 * Export all contexts
 */
export const contexts = {
  platformSchema: platformSchemaContext,
  alertVariant: alertVariantContext,
  localization: localizationContext,
  theme: themeContext,
  userPreferences: userPreferencesContext,
  editorState: editorStateContext,
  mediaLibrary: mediaLibraryContext,
  validation: validationContext,
};
