import { html, LitElement } from 'lit';

/**
 * Localization Configuration
 * Supports Spanish (es) as source and English (en) as target
 * Simple implementation without @lit/localize-tools build step
 */

const sourceLocale = 'es';
const targetLocales = ['en'] as const;

type Locale = typeof sourceLocale | typeof targetLocales[number];

// Import locale templates
import esTranslations from './es.json';
import enTranslations from './en.json';

// Store translations in a Map
const translations: Record<Locale, Record<string, string>> = {
  es: esTranslations as Record<string, string>,
  en: enTranslations as Record<string, string>,
};

// Current locale state
let currentLocale: Locale = sourceLocale;

// Localization functions
export const getLocale = (): Locale => currentLocale;

export const setLocale = (locale: Locale): void => {
  if (translations[locale]) {
    currentLocale = locale;
    // Dispatch event for components to update
    window.dispatchEvent(new CustomEvent('locale-changed', { detail: { locale } }));
  }
};

export const getLocaleTranslations = (): Record<string, string> => {
  return translations[currentLocale];
};

export const getTranslations = (locale: Locale): Record<string, string> => {
  return translations[locale] || translations.es;
};

// Translation function
export const t = (key: string, params?: Record<string, string | number>): string => {
  const localeTranslations = translations[currentLocale];
  let message = localeTranslations[key] || translations.es[key] || key;

  // Replace parameters
  if (params) {
    for (const [param, value] of Object.entries(params)) {
      message = message.replace(new RegExp(`{${param}}`, 'g'), String(value));
    }
  }

  return message;
};

// Reactive controller for Lit components
export class LocalizeController {
  private host: LitElement;
  private boundHandleChange: () => void;

  constructor(host: LitElement) {
    this.host = host;
    this.boundHandleChange = this.handleLocaleChange.bind(this);
    this.host.addController(this);
    
    // Listen for locale changes
    window.addEventListener('locale-changed', this.boundHandleChange);
  }

  hostDisconnected() {
    window.removeEventListener('locale-changed', this.boundHandleChange);
  }

  private handleLocaleChange() {
    this.host.requestUpdate();
  }

  t(key: string, params?: Record<string, string | number>): string {
    return t(key, params);
  }

  get locale(): Locale {
    return currentLocale;
  }
}

// Export locale info
export { sourceLocale, targetLocales };
export type { Locale };
