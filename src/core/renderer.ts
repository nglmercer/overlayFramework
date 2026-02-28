import { Template, TemplateSchema } from './schemas';
import { ElementFactory } from './renderer/factory';
import { formatUnit } from './renderer/utils';

export class Renderer {
  private container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
    this.setupContainer();
  }

  private setupContainer() {
    this.container.style.position = 'relative';
    this.container.style.overflow = 'hidden';
    // Ensure container can hold absolute elements properly
    if (getComputedStyle(this.container).position === 'static') {
      this.container.style.position = 'relative';
    }
  }

  /**
   * Renders a template into the container.
   * Validates the input data using Zod.
   */
  render(data: any) {
    // Validate data
    const result = TemplateSchema.safeParse(data);
    
    if (!result.success) {
      console.error('Invalid template data:', result.error.format());
      throw new Error('Invalid template data');
    }

    const template = result.data;
    
    // Clear and setup
    this.container.innerHTML = '';
    this.container.style.width = formatUnit(template.width);
    this.container.style.height = formatUnit(template.height);
    this.container.style.backgroundColor = template.backgroundColor;
    
    if (template.perspective) {
      this.container.style.perspective = template.perspective;
    }

    // Sort by zIndex (though factory handles it for groups, we handle top level here)
    const sortedElements = [...template.elements].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));

    for (const element of sortedElements) {
      if (element.visible === false) continue;
      
      const el = ElementFactory.create(element);
      
      // Apply positioning and base styles directly to element
      this.applyElementStyles(el, element);
      
      this.container.appendChild(el);
    }
  }

  /**
   * Apply element-specific positioning and styling
   */
  private applyElementStyles(el: HTMLElement, element: any) {
    // Set position
    el.style.position = element.position || 'absolute';
    
    // Set coordinates
    if (element.x !== undefined && element.x !== 0) {
      el.style.left = formatUnit(element.x);
    }
    if (element.y !== undefined && element.y !== 0) {
      el.style.top = formatUnit(element.y);
    }
    
    // Set dimensions
    if (element.width !== undefined) {
      el.style.width = formatUnit(element.width);
    }
    if (element.height !== undefined) {
      el.style.height = formatUnit(element.height);
    }
    
    // Set rotation
    if (element.rotation !== undefined && element.rotation !== 0) {
      el.style.transform = `rotate(${element.rotation}deg)`;
    }
    
    // Set opacity
    if (element.opacity !== undefined && element.opacity !== 1) {
      el.style.opacity = String(element.opacity);
    }
    
    // Set z-index
    if (element.zIndex !== undefined) {
      el.style.zIndex = String(element.zIndex);
    }
    
    // Set data-id for querying
    el.setAttribute('data-id', element.id);
  }

  /**
   * Helper to update a single element by its ID without full re-render
   */
  updateElement(id: string, partialData: any) {
    const el = this.container.querySelector(`[data-id="${id}"]`) as HTMLElement;
    if (el) {
      // Apply partial update styles
      this.applyElementStyles(el, partialData);
    }
  }
}

/**
 * Utility to mount the renderer into an iframe
 */
export function createIframeRenderer(iframe: HTMLIFrameElement): Renderer {
  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!doc) throw new Error('Iframe not ready');
  
  // Basic reset for iframe
  doc.body.style.margin = '0';
  doc.body.style.padding = '0';
  doc.body.style.overflow = 'hidden';
  doc.body.style.width = '100%';
  doc.body.style.height = '100%';
  
  return new Renderer(doc.body);
}
