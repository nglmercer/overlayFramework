import { LitElement } from 'lit';
import { configureLocalization } from '@lit/localize';
import { sourceLocale, targetLocales } from '../generated/locale-codes';

// Import JSON fallbacks for the custom .t() adapter
import esTranslations from './es.json';
import enTranslations from './en.json';

const translations: Record<string, Record<string, string>> = {
  es: esTranslations as Record<string, string>,
  en: enTranslations as Record<string, string>,
};

// Configure Lit Localize Runtime Mode
export const { getLocale, setLocale: setLitLocale } = configureLocalization({
  sourceLocale,
  targetLocales,
  // Using .ts extension for Vite Dev Server 
  loadLocale: (locale) => import(`../generated/locales/${locale}.ts`),
});

export const setLocale = async (locale: any): Promise<void> => {
  // 1) Trigger native Lit localize
  await setLitLocale(locale);
  
  // 2) Trigger legacy components that rely on the custom event
  window.dispatchEvent(new CustomEvent('locale-changed', { detail: { locale } }));
};

export const getLocaleTranslations = (): Record<string, string> => {
  return translations[getLocale()] || translations.es;
};

export const getTranslations = (locale: string): Record<string, string> => {
  return translations[locale] || translations.es;
};

// Adapter for legacy .t() JSON mapping
export const t = (key: string, params?: Record<string, string | number>): string => {
  const currentLocale = getLocale();
  const localeTranslations = translations[currentLocale] || translations.es;
  let message = localeTranslations[key] || translations.es[key] || key;

  // Replace parameters
  if (params) {
    for (const [param, value] of Object.entries(params)) {
      message = message.replace(new RegExp(`\\{${param}\\}`, 'g'), String(value));
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

  get locale(): string {
    return getLocale();
  }
}

// Re-export Lit Localize tools automatically for convenience
export { sourceLocale, targetLocales };
export * from '@lit/localize';
