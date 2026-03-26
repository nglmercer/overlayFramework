/**
 * Framework Constants
 * 
 * Centralized constants for the overlay framework.
 * Contains all magic numbers, default values, and configuration constants
 * to eliminate hardcoded values throughout the codebase.
 * 
 * @module lib/constants
 * @version 1.0.0
 */

/**
 * ============================================
 * DATABASE CONSTANTS
 * ============================================
 */

export const DB = {
  /** IndexedDB database name */
  NAME: 'AlertsDB',
  /** Database version number */
  VERSION: 3,
  /** Object store names */
  STORES: {
    BOXES: 'boxes',
    TEMPLATES: 'templates',
  },
} as const;

/**
 * ============================================
 * ALERT DEFAULTS
 * ============================================
 * 
 * Default values for alerts.
 */

export const ALERT_DEFAULTS = {
  /** Default duration in seconds */
  DURATION: 10,
  
  /** Default animation duration in seconds */
  ANIMATION_DURATION: 1,
  
  /** Default timing in milliseconds */
  TIMING: {
    DURATION: 5000,
    ANIMATION_IN: 300,
    ANIMATION_OUT: 300,
  },
  
  /** Default layout */
  LAYOUT: 'text-below' as const,
  
  /** Default colors */
  COLORS: {
    BG: '#000000',
    TEXT: '#FFFFFF',
    HIGHLIGHT: '#9146FF',
  },
  
  /** Default opacity values */
  OPACITY: {
    BG: 80,
  },
  
  /** Default spacing values (px) */
  SPACING: {
    PADDING: 16,
    ITEM: 8,
  },
  
  /** Default typography */
  TYPOGRAPHY: {
    FONT_FAMILY: 'Roboto, sans-serif',
    FONT_WEIGHT: 'normal',
    FONT_SIZE: 24,
    TEXT_ALIGN: 'center' as const,
  },
  
  /** Default media settings (percentage) */
  MEDIA: {
    IMAGE_SCALE: 50,
    IMAGE_VOLUME: 50,
    SOUND_VOLUME: 50,
  },
  
  /** Animation presets */
  ANIMATION: {
    IN: 'fade-in',
    OUT: 'fade-out',
  },
  
  /** Box element defaults */
  BOX: {
    ROUNDED: true,
    SHADOW: false,
  },
} as const;

/**
 * ============================================
 * EVENT TYPE DEFAULTS
 * ============================================
 * 
 * Default values by event type.
 */

// Removed redundant EVENT_DEFAULTS, using centralized PLATFORM_EVENTS

/**
 * ============================================
 * PLATFORM EVENTS
 * ============================================
 * 
 * Built-in platform event definitions.
 */

// Removed redundant PLATFORM_EVENTS, using centralized PLATFORM_EVENTS

/**
 * ============================================
 * CONFIGURATION CONSTANTS
 * ============================================
 */

export const CONFIG = {
  /** Maximum number of alert boxes allowed */
  MAX_BOXES: 10,
  
  /** Default preview dimensions (px) */
  PREVIEW: {
    DEFAULT_SIZE: 600,
    MIN_SIZE: 100,
    MAX_SIZE: 1200,
  },
  
  /** Responsive breakpoints (px) */
  BREAKPOINTS: {
    MOBILE: 768,
    TABLET: 1024,
  },
  
  /** Animation timing constraints (ms) */
  ANIMATION: {
    MIN_DURATION: 100,
    MAX_DURATION: 10000,
    DEFAULT_DURATION: 300,
  },
  
  /** Pagination */
  PAGINATION: {
    DEFAULT_PAGE_SIZE: 10,
    MEDIA_LIBRARY_PAGE_SIZE: 6,
  },
} as const;

/**
 * ============================================
 * ENVIRONMENT DEFAULTS
 * ============================================
 */

export const ENVIRONMENT = {
  /** Default environment */
  DEFAULT: 'development' as const,
  
  /** Supported environments */
  SUPPORTED: ['development', 'production', 'test'] as const,
  
  /** Default locale */
  DEFAULT_LOCALE: 'es',
  
  /** Supported locales */
  SUPPORTED_LOCALES: ['es', 'en'] as const,
  
  /** Default media URLs - use relative path in production */
  MEDIA_URL: {
    DEFAULT: '/uploads',  // Relative URL for production (same origin)
    CDN: 'https://cdn.example.com',
  },
} as const;

/**
 * ============================================
 * DIALOG DEFAULTS
 * ============================================
 */

export const DIALOG = {
  /** Default dialog theme */
  DEFAULT_THEME: 'dark' as const,
  
  /** Default button texts */
  BUTTONS: {
    CONFIRM: 'OK',
    CANCEL: 'Cancel',
  },
  
  /** Animation durations (ms) */
  ANIMATION: {
    TRANSITION: 200,
  },
  
  /** Dimensions */
  DIMENSIONS: {
    MAX_WIDTH: '420px',
    WIDTH: '90%',
  },
  
  /** Border radius */
  BORDER_RADIUS: 16,
} as const;

/**
 * ============================================
 * COLOR PRESETS
 * ============================================
 */

export const COLORS = {
  /** Brand colors */
  BRAND: {
    PRIMARY: '#9146FF',
    PRIMARY_HOVER: '#772ce8',
  },
  
  /** Background colors */
  BACKGROUND: {
    DARK: '#0e0e10',
    DARK_LIGHT: '#18181b',
    DARK_LIGHTER: '#1f1f23',
    GRAY: '#3a3a3d',
    GRAY_LIGHT: '#4b5563',
  },
  
  /** Text colors */
  TEXT: {
    WHITE: '#ffffff',
    GRAY: '#9ca3af',
    GRAY_LIGHT: '#a1a1aa',
  },
  
  /** Semantic colors */
  SEMANTIC: {
    SUCCESS: '#4ade80',
    WARNING: '#fbbf24',
    ERROR: '#f87171',
    DANGER: '#ef4444',
  },
  
  /** Common preview backgrounds */
  PREVIEW_BG: [
    'transparent',
    '#000000',
    '#ffffff',
    '#ff0000',
  ] as const,
} as const;

/**
 * ============================================
 * FILE TYPE MAPPINGS
 * ============================================
 */

export const FILE_TYPES = {
  /** Supported image types */
  IMAGE: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  
  /** Supported video types */
  VIDEO: ['video/mp4', 'video/webm', 'video/ogg'],
  
  /** Supported audio types */
  AUDIO: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm'],
  
  /** All supported media types */
  MEDIA: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'video/ogg', 'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm'],
} as const;

/**
 * ============================================
 * EVENT CONSTANTS
 * ============================================
 */

export const EVENTS = {
  /** Component Custom Events */
  COMPONENT: {
    SECTION_CHANGE: 'section-change',
    PANEL_CHANGE: 'panel-change',
    PROPERTY_CHANGE: 'property-change',
    ANIMATION_CONFIG_CHANGE: 'animation-config-change',
    OPEN_MEDIA_LIBRARY: 'open-media-library',
    MEDIA_SELECT: 'media-select',
    MEDIA_CLOSE: 'media-close',
    WIDTH_CHANGE: 'width-change',
    HEIGHT_CHANGE: 'height-change',
    BG_CHANGE: 'bg-change',
    PLAY_PREVIEW: 'play-preview',
    SEND_TEST: 'send-test',
    WS_ALERT: 'ws-alert',
    ALERT: 'alert',
    CONNECTION_INFO: 'connection-info',
    WS_CONNECTION_CHANGE: 'ws-connection-change',
    WS_CONNECTION_ERROR: 'ws-connection-error',
    PREVIEW_ALERT: 'preview-alert',
    LOCALE_CHANGED: 'locale-changed',
  },
  
  /** UI Component Events */
  UI: {
    CHANGE: 'change',
    MENU_CLICK: 'menu-click',
    CONFIG_CHANGE: 'config-change',
  },

  /** Dialog Events */
  DIALOG: {
    CLOSE: 'dialog-close',
  },

  /** Media Library Events */
  MEDIA_LIBRARY: {
    SELECT: 'ml-select',
    DELETE: 'ml-delete',
    PLAY_START: 'ml-play-start',
    PLAY_STOP: 'ml-play-stop',
  },
  
  /** Window PostMessage Events */
  WINDOW: {
    PLAY_PREVIEW: 'play-preview',
    CONNECT_WS: 'connect-ws',
    DISCONNECT_WS: 'disconnect-ws',
    SEND_TEST_ALERT: 'send-test-alert',
    EMIT_ALERT: 'emit-alert',
    GET_CONNECTION_INFO: 'get-connection-info',
    PREVIEW_READY: 'PREVIEW_READY',
  },
} as const;

/**
 * ============================================
 * SERVICE NAMES
 * ============================================
 */

export const ServiceName = {
  MEDIA_UPLOAD_API: 'media-upload-api',
  OVERLAY_SERVICE: 'overlay-service',
} as const;

/**
 * ============================================
 * EXPORTS
 * ============================================
 */

export default {
  DB,
  ALERT_DEFAULTS,
  CONFIG,
  ENVIRONMENT,
  DIALOG,
  COLORS,
  FILE_TYPES,
};
