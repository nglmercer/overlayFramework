/**
 * AlertRenderer - Core library for rendering alerts
 * This module provides a reusable, framework-agnostic alert rendering system
 */

import { Template, TemplateSchema } from './schemas';
import { Renderer } from './renderer';
import { mediaRegistry } from './mediaRegistry';
import { formatUnit } from './renderer/utils';

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
export type AlertLayout = 'text-below' | 'text-right' | 'text-over';

// Alert configuration interface
export interface AlertConfig {
  // Animation
  animationIn: AnimationType;
  animationOut: AnimationType;
  animationInDuration: number;
  animationOutDuration: number;
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
    
    if (layout === 'text-right') {
      imageX = effectivePadding;
      imageY = effectivePadding + (containerHeight - effectivePadding * 2 - effectiveImageWidth) / 2;
      textX = effectivePadding + effectiveImageWidth + effectiveSpacing;
      textY = effectivePadding + (containerHeight - effectivePadding * 2) / 2;
    } else if (layout === 'text-over') {
      imageX = effectivePadding + (containerWidth - effectivePadding * 2 - effectiveImageWidth) / 2;
      imageY = effectivePadding + (containerHeight - effectivePadding * 2 - effectiveImageWidth) / 3;
      textX = effectivePadding;
      textY = effectivePadding;
    } else {
      // text-below (default)
      imageX = effectivePadding + (containerWidth - effectivePadding * 2 - effectiveImageWidth) / 2;
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
        zIndex: 0,
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
      zIndex: 1,
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
      zIndex: -1,
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
    
    if (phase === 'in') {
      animStyle = `animation: ${this.currentConfig.animationIn || 'fade-in'} ${this.currentConfig.animationInDuration || 1}s ease-out forwards;`;
    } else if (phase === 'out') {
      animStyle = `animation: ${this.currentConfig.animationOut || 'fade-out'} ${this.currentConfig.animationOutDuration || 1}s ease-in forwards;`;
    }
    
    this.container.className = visibilityClass;
    this.container.style.cssText += animStyle;
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

/**
 * Get CSS animation keyframes as a string
 * Can be injected into a style tag for global use
 */
export function getAnimationKeyframes(): string {
  return `
    @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
    @keyframes fade-out { from { opacity: 1; } to { opacity: 0; } }
    
    @keyframes slide-in-up { from { transform: translateY(100px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    @keyframes slide-out-down { from { transform: translateY(0); opacity: 1; } to { transform: translateY(100px); opacity: 0; } }
    
    @keyframes slide-in-down { from { transform: translateY(-100px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    @keyframes slide-out-up { from { transform: translateY(0); opacity: 1; } to { transform: translateY(-100px); opacity: 0; } }
    
    @keyframes slide-in-left { from { transform: translateX(-100px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
    @keyframes slide-out-right { from { transform: translateX(0); opacity: 1; } to { transform: translateX(100px); opacity: 0; } }
    
    @keyframes slide-in-right { from { transform: translateX(100px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
    @keyframes slide-out-left { from { transform: translateX(0); opacity: 1; } to { transform: translateX(-100px); opacity: 0; } }
    
    @keyframes zoom-in { from { transform: scale(0.5); opacity: 0; } to { transform: scale(1); opacity: 1; } }
    @keyframes zoom-out { from { transform: scale(1); opacity: 1; } to { transform: scale(0.5); opacity: 0; } }
    
    @keyframes bounce-in { 
      0% { transform: scale(0.3); opacity: 0; }
      50% { transform: scale(1.05); opacity: 1; }
      70% { transform: scale(0.9); }
      100% { transform: scale(1); }
    }
    
    @keyframes pulse-in { 
      0% { transform: scale(0.8); opacity: 0; }
      50% { transform: scale(1.1); opacity: 1; }
      100% { transform: scale(1); opacity: 1; }
    }
  `;
}

/**
 * Inject animation keyframes into document
 */
export function injectAnimationStyles(): void {
  if (document.getElementById('alert-renderer-animations')) return;
  
  const style = document.createElement('style');
  style.id = 'alert-renderer-animations';
  style.textContent = getAnimationKeyframes();
  document.head.appendChild(style);
}
