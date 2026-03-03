/**
 * AlertRenderer - Core library for rendering alerts
 * This module provides a reusable, framework-agnostic alert rendering system
 */

import { Template } from './schemas';
import { Renderer } from './renderer';
import { mediaRegistry } from './mediaRegistry';
import { AnimationConfig, AnimationType as NewAnimationType, Direction, Easing } from '../schemas/animation-schemas';
import { processTemplate } from '../lib/core/template-processor';
import { ALERT_DEFAULTS } from '../lib/constants';
import { AlertTemplateBuilder } from './builder';

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
export type AlertLayout = 'text-below' | 'text-right' | 'text-over' | 'text-left' | 'center';

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
    ...defaultAlertConfig,
    ...overrides,
    containerWidth: options.containerWidth ?? defaultAlertConfig.containerWidth,
    containerHeight: options.containerHeight ?? defaultAlertConfig.containerHeight,
  };
}

/**
 * AlertVariant type from database (imported from lib/db)
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
  entranceAnimation?: AnimationConfig;
  exitAnimation?: AnimationConfig;
}

/**
 * Convert AlertVariant (DB model) to AlertConfig (core config)
 */
export function variantToAlertConfig(
  variant: AlertVariantData,
  eventData: Record<string, string> = {},
  options: AlertConfigOptions = {}
): AlertConfig {
  return createAlertConfig(
    {
      animationIn: (variant.animationIn as AnimationType) ?? ALERT_DEFAULTS.ANIMATION.IN,
      animationOut: (variant.animationOut as AnimationType) ?? ALERT_DEFAULTS.ANIMATION.OUT,
      animationInDuration: variant.animationInDuration ?? ALERT_DEFAULTS.ANIMATION_DURATION,
      animationOutDuration: variant.animationOutDuration ?? ALERT_DEFAULTS.ANIMATION_DURATION,
      entranceAnimation: variant.entranceAnimation,
      exitAnimation: variant.exitAnimation,
      duration: variant.duration ?? ALERT_DEFAULTS.DURATION,
      layout: (variant.layout as AlertLayout) ?? ALERT_DEFAULTS.LAYOUT,
      bgColor: variant.bgColor ?? ALERT_DEFAULTS.COLORS.BG,
      bgOpacity: variant.bgOpacity ?? ALERT_DEFAULTS.OPACITY.BG,
      padding: variant.padding ?? ALERT_DEFAULTS.SPACING.PADDING,
      spacing: variant.spacing ?? ALERT_DEFAULTS.SPACING.ITEM,
      rounded: variant.rounded ?? ALERT_DEFAULTS.BOX.ROUNDED,
      shadow: variant.shadow ?? ALERT_DEFAULTS.BOX.SHADOW,
      message: variant.message ?? '',
      fontFamily: variant.fontFamily ?? ALERT_DEFAULTS.TYPOGRAPHY.FONT_FAMILY,
      fontWeight: variant.fontWeight ?? ALERT_DEFAULTS.TYPOGRAPHY.FONT_WEIGHT,
      fontSize: variant.fontSize ?? ALERT_DEFAULTS.TYPOGRAPHY.FONT_SIZE,
      textAlign: (variant.textAlign as AlertConfig['textAlign']) ?? ALERT_DEFAULTS.TYPOGRAPHY.TEXT_ALIGN,
      textColor: variant.textColor ?? ALERT_DEFAULTS.COLORS.TEXT,
      highlightColor: variant.highlightColor ?? ALERT_DEFAULTS.COLORS.HIGHLIGHT,
      textShadow: variant.textShadow ?? true,
      imageUrl: variant.imageUrl,
      imageScale: variant.imageScale ?? ALERT_DEFAULTS.MEDIA.IMAGE_SCALE,
      imageVolume: variant.imageVolume ?? ALERT_DEFAULTS.MEDIA.IMAGE_VOLUME,
      soundUrl: variant.soundUrl,
      soundVolume: variant.soundVolume ?? ALERT_DEFAULTS.MEDIA.SOUND_VOLUME,
      eventData,
    },
    options
  );
}

/**
 * AlertRenderer class - Core alert rendering logic
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

  processMessageWithHighlight(message: string, highlightColor: string): string {
    return processTemplate(message, {}, highlightColor);
  }

  render(config: AlertConfig): void {
    this.currentConfig = config;
    const templateData = AlertTemplateBuilder.build(config);
    this.renderer.render(templateData);
  }

  async playPreview(config: AlertConfig): Promise<void> {
    this.stop();
    this.render(config);
    this.currentConfig = config;
    
    if (config.soundUrl && config.soundVolume && config.soundVolume > 0) {
      this.playSound(config.soundUrl, config.soundVolume / 100);
    }

    this.animationPhase = 'none';
    this.applyAnimationStyles('none');
    await new Promise(r => setTimeout(r, 50));
    
    this.animationPhase = 'in';
    this.applyAnimationStyles('in');

    const duration = (config.duration || 10) * 1000;
    
    this.animationTimeoutId = window.setTimeout(() => {
      if (this.animationPhase === 'in') {
        this.animationPhase = 'out';
        this.applyAnimationStyles('out');
        
        const outDuration = (config.animationOutDuration || 1) * 1000;
        this.outAnimationTimeoutId = window.setTimeout(() => {
          if (this.animationPhase === 'out') {
            this.animationPhase = 'none';
            this.applyAnimationStyles('none');
            this.stopSound();
          }
        }, outDuration + 100);
      }
    }, duration);
  }

  private applyAnimationStyles(phase: 'in' | 'out' | 'none'): void {
    if (!this.currentConfig) return;
    
    let animStyle = '';
    const visibilityClass = phase === 'none' ? 'hidden' : '';
    
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

  private _generateAnimationCSS(config: AnimationConfig): string {
    const duration = (config.duration > 10 ? config.duration / 1000 : config.duration) || 0.3;
    const easing = this._convertEasing(config.easing);
    const animName = this._buildAnimationName(config.type, config.direction, config);
    return `animation: ${animName} ${duration}s ${easing} forwards; opacity: ${config.opacity};`;
  }

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

  private _buildAnimationName(type: NewAnimationType, direction: Direction, config: AnimationConfig): string {
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

  playSound(url: string, volume: number): void {
    try {
      this.audioElement = new Audio();
      this.audioElement.src = mediaRegistry.resolve(url);
      this.audioElement.volume = Math.max(0, Math.min(1, volume));
      this.audioElement.onended = () => this.stopSound();
      this.audioElement.play().catch(err => console.warn('[AlertRenderer] playSound failed:', err));
    } catch (err) {
      console.error('[AlertRenderer] Audio init failed:', err);
    }
  }

  stopSound(): void {
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.src = '';
      this.audioElement = undefined;
    }
  }

  stop(): void {
    if (this.animationTimeoutId) {
      clearTimeout(this.animationTimeoutId);
      this.animationTimeoutId = undefined;
    }
    if (this.outAnimationTimeoutId) {
      clearTimeout(this.outAnimationTimeoutId);
      this.outAnimationTimeoutId = undefined;
    }
    this.stopSound();
    
    this.container.querySelectorAll('video').forEach(video => {
      video.pause();
      video.src = '';
      video.load();
    });
    
    this.animationPhase = 'none';
    this.applyAnimationStyles('none');
  }

  getAnimationPhase(): 'in' | 'out' | 'none' {
    return this.animationPhase;
  }

  updateElement(id: string, partialData: any): void {
    this.renderer.updateElement(id, partialData);
  }

  destroy(): void {
    this.stop();
    this.container.innerHTML = '';
  }
}

export function createAlertRenderer(container: HTMLElement): AlertRenderer {
  return new AlertRenderer(container);
}
