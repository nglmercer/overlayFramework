/**
 * AlertRenderer - Core library for rendering alerts
 * This module provides a reusable, framework-agnostic alert rendering system
 */

import { Template, TemplateSchema } from './schemas';
import { Renderer } from './renderer';
import { mediaRegistry } from './mediaRegistry';
import { formatUnit } from './renderer/utils';
import { AnimationConfig, AnimationType as NewAnimationType, Direction, Easing } from '../schemas/animation-schemas';

// Animation types supported by the system
export type AnimationType = 
  | 'fade-in' | 'fade-out'
  | 'slide-in-up' | 'slide-out-down'
  | 'slide-in-down' | 'slide-out-up'
  | 'slide-in-left' | 'slide-out-right'
  | 'slide-in-right' | 'slide-out-left'
  | 'zoom-in' | 'zoom-out'
  | 'bounce-in' | 'pulse-in';

// Layout types for alert positioning
export type AlertLayout = 'text-below' | 'text-right' | 'text-over' | 'center';

// Alert configuration interface
export interface AlertConfig {
  // Animation - Legacy (string-based)
  animationIn: AnimationType;
  animationOut: AnimationType;
  animationInDuration: number;
  animationOutDuration: number;
  
  // Animation - New Schema-based (preferred)
  entranceAnimation?: AnimationConfig;
  exitAnimation?: AnimationConfig;
  
  duration: number;
  
  // Layout
  layout: AlertLayout;
  
  // Background
  bgColor: string;
  bgOpacity: number;
  padding: number;
  spacing: number;
  rounded: boolean;
  shadow: boolean;
  
  // Text
  message: string;
  fontFamily: string;
  fontWeight: string;
  fontSize: number;
  textAlign: 'left' | 'center' | 'right' | 'justify';
  textColor: string;
  highlightColor: string;
  textShadow: boolean;
  
  // Media
  imageUrl?: string;
  imageScale: number;
  imageVolume: number;
  soundUrl?: string;
  soundVolume: number;
  
  // Event data for variable replacement
  eventData?: Record<string, string>;
  
  // Container dimensions
  containerWidth?: number;
  containerHeight?: number;
}

// Default alert configuration
export const defaultAlertConfig: AlertConfig = {
  animationIn: 'fade-in',
  animationOut: 'fade-out',
  animationInDuration: 1,
  animationOutDuration: 1,
  duration: 10,
  layout: 'text-below',
  bgColor: '#000000',
  bgOpacity: 0,
  padding: 16,
  spacing: 16,
  rounded: true,
  shadow: false,
  message: '',
  fontFamily: 'Roboto',
  fontWeight: 'Normal',
  fontSize: 24,
  textAlign: 'center',
  textColor: '#FFFFFF',
  highlightColor: '#9146FF',
  textShadow: true,
  imageScale: 50,
  imageVolume: 100,
  soundVolume: 50,
  containerWidth: 600,
  containerHeight: 600,
};

// =============================================================================
// ALERT DEFAULTS (imported from constants logic)
// =============================================================================

const ALERT_DEFAULTS = {
  ANIMATION: {
    IN: 'fade-in' as AnimationType,
    OUT: 'fade-out' as AnimationType,
  },
  ANIMATION_DURATION: 1,
  DURATION: 10,
  LAYOUT: 'text-below' as AlertLayout,
  COLORS: {
    BG: '#000000',
    TEXT: '#FFFFFF',
    HIGHLIGHT: '#9146FF',
  },
  OPACITY: {
    BG: 0,
  },
  SPACING: {
    PADDING: 16,
    ITEM: 16,
  },
  TYPOGRAPHY: {
    FONT_FAMILY: 'Roboto, sans-serif',
    FONT_WEIGHT: 'normal',
    FONT_SIZE: 24,
    TEXT_ALIGN: 'center' as const,
  },
  MEDIA: {
    IMAGE_SCALE: 50,
    IMAGE_VOLUME: 50,
    SOUND_VOLUME: 50,
  },
  BOX: {
    ROUNDED: true,
    SHADOW: false,
  },
} as const;

/**
 * Options for creating AlertConfig
 */
export interface AlertConfigOptions {
  containerWidth?: number;
  containerHeight?: number;
}

/**
 * Create AlertConfig with defaults and optional overrides
 */
export function createAlertConfig(
  overrides: Partial<AlertConfig> = {},
  options: AlertConfigOptions = {}
): AlertConfig {
  return {
    // Animation
    animationIn: overrides.animationIn ?? defaultAlertConfig.animationIn,
    animationOut: overrides.animationOut ?? defaultAlertConfig.animationOut,
    animationInDuration: overrides.animationInDuration ?? defaultAlertConfig.animationInDuration,
    animationOutDuration: overrides.animationOutDuration ?? defaultAlertConfig.animationOutDuration,
    
    // Animation Schema (new format)
    entranceAnimation: overrides.entranceAnimation,
    exitAnimation: overrides.exitAnimation,
    
    // Duration & Layout
    duration: overrides.duration ?? defaultAlertConfig.duration,
    layout: overrides.layout ?? defaultAlertConfig.layout,
    
    // Background
    bgColor: overrides.bgColor ?? defaultAlertConfig.bgColor,
    bgOpacity: overrides.bgOpacity ?? defaultAlertConfig.bgOpacity,
    padding: overrides.padding ?? defaultAlertConfig.padding,
    spacing: overrides.spacing ?? defaultAlertConfig.spacing,
    rounded: overrides.rounded ?? defaultAlertConfig.rounded,
    shadow: overrides.shadow ?? defaultAlertConfig.shadow,
    
    // Text
    message: overrides.message ?? defaultAlertConfig.message,
    fontFamily: overrides.fontFamily ?? defaultAlertConfig.fontFamily,
    fontWeight: overrides.fontWeight ?? defaultAlertConfig.fontWeight,
    fontSize: overrides.fontSize ?? defaultAlertConfig.fontSize,
    textAlign: overrides.textAlign ?? defaultAlertConfig.textAlign,
    textColor: overrides.textColor ?? defaultAlertConfig.textColor,
    highlightColor: overrides.highlightColor ?? defaultAlertConfig.highlightColor,
    textShadow: overrides.textShadow ?? defaultAlertConfig.textShadow,
    
    // Media
    imageUrl: overrides.imageUrl,
    imageScale: overrides.imageScale ?? defaultAlertConfig.imageScale,
    imageVolume: overrides.imageVolume ?? defaultAlertConfig.imageVolume,
    soundUrl: overrides.soundUrl,
    soundVolume: overrides.soundVolume ?? defaultAlertConfig.soundVolume,
    
    // Event data
    eventData: overrides.eventData,
    
    // Container dimensions
    containerWidth: options.containerWidth ?? defaultAlertConfig.containerWidth,
    containerHeight: options.containerHeight ?? defaultAlertConfig.containerHeight,
  };
}

/**
 * AlertVariant type from database (imported from lib/db)
 * Minimal interface for mapping purposes
 */
interface AlertVariantData {
  animationIn?: string;
  animationOut?: string;
  animationInDuration?: number;
  animationOutDuration?: number;
  duration?: number;
  layout?: string;
  bgColor?: string;
  bgOpacity?: number;
  padding?: number;
  spacing?: number;
  rounded?: boolean;
  shadow?: boolean;
  message?: string;
  fontFamily?: string;
  fontWeight?: string;
  fontSize?: number;
  textAlign?: string;
  textColor?: string;
  highlightColor?: string;
  textShadow?: boolean;
  imageUrl?: string;
  imageScale?: number;
  imageVolume?: number;
  soundUrl?: string;
  soundVolume?: number;
}

/**
 * Convert AlertVariant (DB model) to AlertConfig (core config)
 * This is the canonical mapping function used by components
 */
export function variantToAlertConfig(
  variant: AlertVariantData,
  eventData: Record<string, string> = {},
  options: AlertConfigOptions = {}
): AlertConfig {
  return createAlertConfig(
    {
      // Animation - cast to proper types
      animationIn: (variant.animationIn as AnimationType) ?? ALERT_DEFAULTS.ANIMATION.IN,
      animationOut: (variant.animationOut as AnimationType) ?? ALERT_DEFAULTS.ANIMATION.OUT,
      animationInDuration: variant.animationInDuration ?? ALERT_DEFAULTS.ANIMATION_DURATION,
      animationOutDuration: variant.animationOutDuration ?? ALERT_DEFAULTS.ANIMATION_DURATION,
      
      // Duration & Layout
      duration: variant.duration ?? ALERT_DEFAULTS.DURATION,
      layout: (variant.layout as AlertLayout) ?? ALERT_DEFAULTS.LAYOUT,
      
      // Background
      bgColor: variant.bgColor ?? ALERT_DEFAULTS.COLORS.BG,
      bgOpacity: variant.bgOpacity ?? ALERT_DEFAULTS.OPACITY.BG,
      padding: variant.padding ?? ALERT_DEFAULTS.SPACING.PADDING,
      spacing: variant.spacing ?? ALERT_DEFAULTS.SPACING.ITEM,
      rounded: variant.rounded ?? ALERT_DEFAULTS.BOX.ROUNDED,
      shadow: variant.shadow ?? ALERT_DEFAULTS.BOX.SHADOW,
      
      // Text
      message: variant.message ?? '',
      fontFamily: variant.fontFamily ?? ALERT_DEFAULTS.TYPOGRAPHY.FONT_FAMILY,
      fontWeight: variant.fontWeight ?? ALERT_DEFAULTS.TYPOGRAPHY.FONT_WEIGHT,
      fontSize: variant.fontSize ?? ALERT_DEFAULTS.TYPOGRAPHY.FONT_SIZE,
      textAlign: (variant.textAlign as AlertConfig['textAlign']) ?? ALERT_DEFAULTS.TYPOGRAPHY.TEXT_ALIGN,
      textColor: variant.textColor ?? ALERT_DEFAULTS.COLORS.TEXT,
      highlightColor: variant.highlightColor ?? ALERT_DEFAULTS.COLORS.HIGHLIGHT,
      textShadow: variant.textShadow ?? true,
      
      // Media
      imageUrl: variant.imageUrl,
      imageScale: variant.imageScale ?? ALERT_DEFAULTS.MEDIA.IMAGE_SCALE,
      imageVolume: variant.imageVolume ?? ALERT_DEFAULTS.MEDIA.IMAGE_VOLUME,
      soundUrl: variant.soundUrl,
      soundVolume: variant.soundVolume ?? ALERT_DEFAULTS.MEDIA.SOUND_VOLUME,
      
      // Event data for variable replacement
      eventData,
    },
    options
  );
}

/**
 * AlertRenderer class - Core alert rendering logic
 * Can be used with any DOM element or framework
 */
export class AlertRenderer {
  private container: HTMLElement;
  private renderer: Renderer;
  private audioElement?: HTMLAudioElement;
  private animationTimeoutId?: number;
  private outAnimationTimeoutId?: number;
  private currentConfig?: AlertConfig;
  private animationPhase: 'in' | 'out' | 'none' = 'none';

  constructor(container: HTMLElement) {
    this.container = container;
    this.renderer = new Renderer(container);
  }

  /**
   * Build template data from alert configuration
   */
  buildTemplateData(config: AlertConfig): Template {
    const {
      message,
      layout,
      bgColor,
      bgOpacity,
      padding,
      spacing,
      rounded,
      shadow,
      fontFamily,
      fontWeight,
      fontSize,
      textAlign,
      textColor,
      highlightColor,
      textShadow,
      imageUrl,
      imageScale,
      imageVolume,
      eventData,
      containerWidth = 600,
      containerHeight = 600,
    } = config;

    // Replace variables in message
    let processedMessage = message;
    if (eventData) {
      for (const [key, value] of Object.entries(eventData)) {
        processedMessage = processedMessage.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
      }
    }

    const elements: any[] = [];
    
    // Calculate dimensions
    const effectivePadding = padding || 16;
    const effectiveSpacing = spacing || 16;
    
    // Calculate image dimensions based on scale (scale is 0-100)
    const effectiveImageWidth = imageScale ? (imageScale / 100) * (containerWidth - effectivePadding * 2) : 200;
    const imageHeight = 'auto';
    
    // Determine layout positions
    let imageX = effectivePadding;
    let imageY = effectivePadding;
    let textX = effectivePadding;
    let textY = effectivePadding;
    
    // Container inner dimensions
    const innerWidth = containerWidth - effectivePadding * 2;
    const innerHeight = containerHeight - effectivePadding * 2;
    
    if (layout === 'text-right') {
      // Image on left, text on right
      imageX = effectivePadding;
      imageY = effectivePadding + (innerHeight - effectiveImageWidth) / 2;
      textX = effectivePadding + effectiveImageWidth + effectiveSpacing;
      textY = effectivePadding + (innerHeight - (fontSize || 24) * 1.5) / 2;
    } else if (layout === 'text-over') {
      // Text over the image (centered)
      imageX = effectivePadding + (innerWidth - effectiveImageWidth) / 2;
      imageY = effectivePadding + (innerHeight - effectiveImageWidth) / 3;
      textX = effectivePadding + (innerWidth - (containerWidth - effectivePadding * 2)) / 2;
      textY = effectivePadding + (innerHeight - effectiveImageWidth) / 3 - (fontSize || 24) * 1.5;
    } else if (layout === 'center') {
      // Both image and text centered in the middle
      // First, calculate total content height
      const totalContentHeight = effectiveImageWidth + effectiveSpacing + (fontSize || 24) * 1.5;
      const startY = effectivePadding + (innerHeight - totalContentHeight) / 2;
      
      imageX = effectivePadding + (innerWidth - effectiveImageWidth) / 2;
      imageY = startY;
      textX = effectivePadding;
      textY = startY + effectiveImageWidth + effectiveSpacing;
    } else {
      // text-below (default) - image on top, text below centered
      imageX = effectivePadding + (innerWidth - effectiveImageWidth) / 2;
      imageY = effectivePadding;
      textX = effectivePadding;
      textY = effectivePadding + effectiveImageWidth + effectiveSpacing;
    }
    
    // Add media element if imageUrl exists
    // Note: Image field always mutes audio - for video with audio, use separate sound field
    if (imageUrl) {
      elements.push({
        id: 'alert-media',
        name: 'Alert Media',
        type: 'multimedia' as const,
        x: imageX,
        y: imageY,
        width: effectiveImageWidth,
        height: imageHeight,
        position: 'absolute' as const,
        rotation: 0,
        opacity: 1,
        zIndex: 2,
        visible: true,
        url: imageUrl,
        autoPlay: true,
        volume: imageVolume ?? 100,
        loop: false,
        muted: true, // Always mute - frames only, audio handled by sound field
        objectFit: 'contain' as const,
      });
    }
    
    // Process message with highlight color
    const processedContent = this.processMessageWithHighlight(processedMessage, highlightColor || '#9146FF');
    
    // Add text element
    elements.push({
      id: 'alert-text',
      name: 'Alert Text',
      type: 'text' as const,
      x: textX,
      y: textY,
      width: containerWidth - effectivePadding * 2,
      height: 'auto',
      position: 'absolute' as const,
      rotation: 0,
      opacity: 1,
      zIndex: 3,
      visible: true,
      content: processedContent,
      fontSize: fontSize || 24,
      fontFamily: fontFamily || 'Roboto',
      fontWeight: fontWeight || 'Normal',
      color: textColor || '#FFFFFF',
      textAlign: textAlign || 'center',
      textShadow: textShadow ? '2px 2px 4px rgba(0,0,0,0.5)' : undefined,
    });

    // Build background box style
    const bgStyles = {
      id: 'alert-background',
      name: 'Alert Background',
      type: 'box' as const,
      x: 0,
      y: 0,
      width: '100%',
      height: '100%',
      position: 'absolute' as const,
      rotation: 0,
      opacity: (bgOpacity ?? 0) / 100,
      zIndex: 0,
      visible: bgOpacity > 0,
      backgroundColor: bgColor || '#000000',
      borderRadius: rounded ? '16px' : '0px',
      borderWidth: 0,
      borderColor: 'transparent',
      boxShadow: shadow ? '0 4px 20px rgba(0,0,0,0.3)' : undefined,
    };
    
    // Add background if there's opacity
    if (bgOpacity > 0) {
      elements.push(bgStyles);
    }

    return {
      id: 'alert-template',
      name: 'Alert Template',
      width: '100%',
      height: '100%',
      backgroundColor: 'transparent',
      elements,
    };
  }

  /**
   * Process message to highlight {variables}
   */
  processMessageWithHighlight(message: string, highlightColor: string): string {
    if (!message) return '';
    // Replace {variable} with highlighted span
    return message.replace(/\{(\w+)\}/g, `<span style="color: ${highlightColor}; font-weight: bold;">{$1}</span>`);
  }

  /**
   * Render the alert with given configuration
   */
  render(config: AlertConfig): void {
    this.currentConfig = config;
    const templateData = this.buildTemplateData(config);
    this.renderer.render(templateData);
  }

  /**
   * Play the alert preview with animation and sound
   */
  async playPreview(config: AlertConfig): Promise<void> {
    // Stop any existing playback
    this.stop();
    
    this.currentConfig = config;
    
    // Play sound if soundUrl exists and volume is > 0
    if (config.soundUrl && config.soundVolume !== undefined && config.soundVolume > 0) {
      this.playSound(config.soundUrl, config.soundVolume / 100);
    }

    // Reset and trigger In
    this.animationPhase = 'none';
    this.applyAnimationStyles('none');
    await new Promise(r => setTimeout(r, 50));
    
    this.animationPhase = 'in';
    this.applyAnimationStyles('in');

    // Trigger Out after duration
    const inDuration = (config.animationInDuration || 1) * 1000;
    const duration = (config.duration || 10) * 1000;
    
    this.animationTimeoutId = window.setTimeout(() => {
      if (this.animationPhase === 'in') {
        this.animationPhase = 'out';
        this.applyAnimationStyles('out');
        
        // Hide after out animation completes
        const outDuration = (config.animationOutDuration || 1) * 1000;
        this.outAnimationTimeoutId = window.setTimeout(() => {
          if (this.animationPhase === 'out') {
            this.animationPhase = 'none';
            this.applyAnimationStyles('none');
            // Stop sound when animation ends
            this.stopSound();
          }
        }, outDuration + 100);
      }
    }, duration);
  }

  /**
   * Apply animation styles to the container
   */
  private applyAnimationStyles(phase: 'in' | 'out' | 'none'): void {
    if (!this.currentConfig) return;
    
    let animStyle = '';
    const visibilityClass = phase === 'none' ? 'hidden' : '';
    
    // Use new schema-based animation if available, otherwise fall back to legacy
    if (phase === 'in' && this.currentConfig.entranceAnimation) {
      animStyle = this._generateAnimationCSS(this.currentConfig.entranceAnimation);
    } else if (phase === 'out' && this.currentConfig.exitAnimation) {
      animStyle = this._generateAnimationCSS(this.currentConfig.exitAnimation);
    } else if (phase === 'in') {
      animStyle = `animation: ${this.currentConfig.animationIn || 'fade-in'} ${this.currentConfig.animationInDuration || 1}s ease-out forwards;`;
    } else if (phase === 'out') {
      animStyle = `animation: ${this.currentConfig.animationOut || 'fade-out'} ${this.currentConfig.animationOutDuration || 1}s ease-in forwards;`;
    }
    
    this.container.className = visibilityClass;
    this.container.style.cssText += animStyle;
  }

  /**
   * Generate CSS animation string from AnimationConfig
   */
  private _generateAnimationCSS(config: AnimationConfig): string {
    const duration = (config.duration || 0.3);
    const easing = this._convertEasing(config.easing);
    
    // Build the animation name based on type, direction, and effect
    const animName = this._buildAnimationName(config.type, config.direction, config);
    
    return `animation: ${animName} ${duration}s ${easing} forwards; opacity: ${config.opacity};`;
  }

  /**
   * Convert our Easing type to CSS easing function
   */
  private _convertEasing(easing: Easing): string {
    const easingMap: Record<Easing, string> = {
      linear: 'linear',
      easeIn: 'ease-in',
      easeOut: 'ease-out',
      easeInOut: 'ease-in-out',
      backIn: 'cubic-bezier(0.36, 0, 0.66, -0.56)',
      backOut: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      anticipate: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      custom: 'ease-out',
    };
    return easingMap[easing] || 'ease-out';
  }

  /**
   * Build CSS animation name based on type, direction, and config
   */
  private _buildAnimationName(type: NewAnimationType, direction: Direction, config: AnimationConfig): string {
    // Map our animation types to CSS animation keyframes
    const animationMap: Record<NewAnimationType, string> = {
      fade: 'anim-fade',
      slide: 'anim-slide',
      scale: 'anim-scale',
      rotate: 'anim-rotate',
      blur: 'anim-blur',
      flip: 'anim-flip',
      bounce: 'anim-bounce',
      zoom: 'anim-zoom',
      custom: 'anim-custom',
    };
    
    const baseAnim = animationMap[type] || 'anim-fade';
    const dir = direction !== 'center' ? `-${direction}` : '';
    
    return `${baseAnim}${dir}`;
  }

  /**
   * Play sound using HTMLAudioElement
   */
  playSound(url: string, volume: number): void {
    try {
      this.audioElement = new Audio();
      this.audioElement.src = mediaRegistry.resolve(url);
      this.audioElement.volume = Math.max(0, Math.min(1, volume));
      this.audioElement.loop = false;
      
      this.audioElement.play().catch(err => {
        console.warn('[AlertRenderer] Failed to play sound:', err);
      });
      
      // Stop sound when it ends
      this.audioElement.onended = () => {
        this.stopSound();
      };
    } catch (err) {
      console.error('[AlertRenderer] Error creating audio element:', err);
    }
  }

  /**
   * Stop currently playing sound
   */
  stopSound(): void {
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.src = '';
      this.audioElement = undefined;
    }
  }

  /**
   * Stop all animations and sound
   */
  stop(): void {
    // Clear timeouts
    if (this.animationTimeoutId) {
      clearTimeout(this.animationTimeoutId);
      this.animationTimeoutId = undefined;
    }
    if (this.outAnimationTimeoutId) {
      clearTimeout(this.outAnimationTimeoutId);
      this.outAnimationTimeoutId = undefined;
    }
    
    // Stop sound
    this.stopSound();
    
    // Clean up video elements
    const videos = this.container.querySelectorAll('video');
    videos.forEach(video => {
      video.pause();
      video.src = '';
      video.load();
    });
    
    // Reset animation phase
    this.animationPhase = 'none';
    this.applyAnimationStyles('none');
  }

  /**
   * Get current animation phase
   */
  getAnimationPhase(): 'in' | 'out' | 'none' {
    return this.animationPhase;
  }

  /**
   * Update a single element by ID
   */
  updateElement(id: string, partialData: any): void {
    this.renderer.updateElement(id, partialData);
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.stop();
    this.container.innerHTML = '';
  }
}

/**
 * Helper to create an AlertRenderer from an element
 */
export function createAlertRenderer(container: HTMLElement): AlertRenderer {
  return new AlertRenderer(container);
}

// getAnimationKeyframes and injectAnimationStyles were removed. Use css classes instead.
