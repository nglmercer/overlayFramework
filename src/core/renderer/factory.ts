import { TemplateElement } from '../schemas';
import { mediaRegistry } from '../mediaRegistry';
import { applyBaseStyles, formatUnit, applyStyles } from './utils';

/**
 * ElementFactory - Modular factory for creating DOM elements from TemplateElement data.
 * Handles specialized creation logic for text, media, boxes, and groups.
 */
export class ElementFactory {
  
  /**
   * Main entry point for element creation
   */
  static create(data: TemplateElement): HTMLElement {
    const creators: Record<string, (d: any) => HTMLElement> = {
      text: this.createText.bind(this),
      image: this.createImage.bind(this),
      video: this.createVideo.bind(this),
      box: this.createBox.bind(this),
      multimedia: this.createMultimedia.bind(this),
      group: this.createGroup.bind(this),
    };

    const creator = creators[data.type];
    const el = creator ? creator(data) : document.createElement('div');

    // Shared base styles (x, y, opacity, zIndex, etc.)
    applyBaseStyles(el, data);
    
    return el;
  }

  private static createText(data: any): HTMLElement {
    const el = document.createElement('div');
    el.innerHTML = data.content || '';
    
    const textStyles = {
      fontSize: formatUnit(data.fontSize),
      fontFamily: data.fontFamily,
      fontWeight: data.fontWeight,
      color: data.color,
      textAlign: data.textAlign,
      lineHeight: data.lineHeight ? formatUnit(data.lineHeight) : undefined,
      letterSpacing: data.letterSpacing ? formatUnit(data.letterSpacing) : undefined,
      textShadow: data.textShadow,
    };

    applyStyles(el, textStyles);
    return el;
  }

  private static createImage(data: any): HTMLElement {
    const img = document.createElement('img');
    if (data.url) img.src = mediaRegistry.resolve(data.url);
    img.style.objectFit = data.objectFit || 'contain';
    return img;
  }

  private static createVideo(data: any): HTMLElement {
    const video = document.createElement('video');
    if (data.url) video.src = mediaRegistry.resolve(data.url);
    
    video.autoplay = data.autoPlay !== false;
    video.loop = data.loop || false;
    video.style.objectFit = data.objectFit || 'contain';
    
    // Autoplay usually requires muted. User can override if volume > 0.
    video.muted = data.muted !== false ? true : (data.volume === 0);
    
    if (data.volume !== undefined && !video.muted) {
      video.volume = Math.max(0, Math.min(1, data.volume / 100));
    }

    return video;
  }

  private static createBox(data: any): HTMLElement {
    const el = document.createElement('div');
    
    const boxStyles = {
      backgroundColor: data.backgroundColor,
      borderRadius: formatUnit(data.borderRadius),
      border: `${formatUnit(data.borderWidth)} solid ${data.borderColor}`,
      backdropFilter: data.backdropFilter,
      boxShadow: data.boxShadow,
    };

    applyStyles(el, boxStyles);
    return el;
  }

  private static createMultimedia(data: any): HTMLElement {
    const url = data.url || '';
    // Basic file extension detection for multimedia elements
    const isVideo = /\.(mp4|webm|ogg|mov)$/i.test(url);
    
    if (isVideo) {
      return this.createVideo(data);
    } else {
      return this.createImage(data);
    }
  }

  private static createGroup(data: any): HTMLElement {
    const container = document.createElement('div');
    container.style.overflow = 'visible'; // Groups usually don't clip children
    
    if (data.elements && Array.isArray(data.elements)) {
      // Create children recursively
      const children = data.elements
        .sort((a: any, b: any) => (a.zIndex || 0) - (b.zIndex || 0))
        .map((childData: TemplateElement) => {
          if (childData.visible !== false) {
            return this.create(childData);
          }
          return null;
        })
        .filter(Boolean) as HTMLElement[];

      children.forEach(child => container.appendChild(child));
    }
    
    return container;
  }
}
