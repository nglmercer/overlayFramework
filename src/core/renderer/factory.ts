import { TemplateElement } from '../schemas';
import { mediaRegistry } from '../mediaRegistry';
import { applyBaseStyles, formatUnit } from './utils';

export class ElementFactory {
  static create(data: TemplateElement): HTMLElement {
    let el: HTMLElement;
    console.log("[data]",data);
    switch (data.type) {
      case 'text':
        el = this.createText(data);
        break;
      case 'image':
        el = this.createImage(data);
        break;
      case 'video':
        el = this.createVideo(data);
        break;
      case 'box':
        el = this.createBox(data);
        break;
      case 'multimedia':
        el = this.createMultimedia(data);
        break;
      case 'group':
        el = this.createGroup(data);
        break;
      default:
        el = document.createElement('div');
    }

    applyBaseStyles(el, data);
    return el;
  }

  private static createText(data: any): HTMLElement {
    const el = document.createElement('div');
    el.innerText = data.content;
    el.style.fontSize = formatUnit(data.fontSize);
    el.style.fontFamily = data.fontFamily;
    el.style.fontWeight = data.fontWeight;
    el.style.color = data.color;
    el.style.textAlign = data.textAlign;
    if (data.lineHeight) el.style.lineHeight = formatUnit(data.lineHeight);
    if (data.letterSpacing) el.style.letterSpacing = formatUnit(data.letterSpacing);
    if (data.textShadow) el.style.textShadow = data.textShadow;
    return el;
  }
  private static _validate(data:any){
    if (!data || !data.url) {
      console.error('[ElementFactory] createImage: Missing url', data);
      return false;
    }
    return true;
  }
  private static createImage(data: any): HTMLElement {
    if (!this._validate(data)) return document.createElement('div');
    const img = document.createElement('img');
    img.src = mediaRegistry.resolve(data.url);
    img.style.objectFit = data.objectFit || 'contain';
    return img;
  }

  private static createVideo(data: any): HTMLElement {
    if (!this._validate(data)) return document.createElement('div');
    const video = document.createElement('video');
    video.src = mediaRegistry.resolve(data.url);
    video.autoplay = true;
    // Muted by default for autoplay support (browsers require muted for autoplay)
    // Only unmute if explicitly set to false AND volume > 0
    video.muted = data.muted !== false ? true : (data.volume === 0);
    video.loop = data.loop || false;
    video.style.objectFit = data.objectFit || 'contain';
    // Set volume if specified and not muted
    if (data.volume !== undefined && video.muted === false) {
      video.volume = data.volume / 100;
    }
    return video;
  }

  private static createBox(data: any): HTMLElement {
    const el = document.createElement('div');
    el.style.backgroundColor = data.backgroundColor;
    el.style.borderRadius = formatUnit(data.borderRadius);
    el.style.border = `${formatUnit(data.borderWidth)} solid ${data.borderColor}`;
    if (data.backdropFilter) el.style.backdropFilter = data.backdropFilter;
    if (data.boxShadow) el.style.boxShadow = data.boxShadow;
    return el;
  }

  private static createMultimedia(data: any): HTMLElement {
    const resolved = mediaRegistry.resolve(data.url);
    if (resolved.match(/\.(mp4|webm|ogg)$/i)) {
      return this.createVideo({ ...data, url: resolved });
    } else {
      return this.createImage({ ...data, url: resolved });
    }
  }

  private static createGroup(data: any): HTMLElement {
    const el = document.createElement('div');
    el.style.overflow = 'visible';
    
    // Recursive render of children
    if (data.elements && Array.isArray(data.elements)) {
      const sorted = [...data.elements].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
      for (const child of sorted) {
        if (child.visible !== false) {
          el.appendChild(this.create(child));
        }
      }
    }
    
    return el;
  }
}
