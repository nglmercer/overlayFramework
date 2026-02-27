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
      this.container.appendChild(el);
    }
  }

  /**
   * Helper to update a single element by its ID without full re-render
   */
  updateElement(id: string, partialData: any) {
    const el = this.container.querySelector(`[data-id="${id}"]`) as HTMLElement;
    if (el) {
      // Logic for partial update could be complex, for now we might want to re-render the specific element
      // This is a placeholder for a more reactive approach
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
