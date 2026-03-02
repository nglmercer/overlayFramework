import { TemplateSchema } from './schemas';
import { ElementFactory } from './renderer/factory';
import { formatUnit, applyStyles } from './renderer/utils';

/**
 * Renderer - Orchestrator for turning Template data into a living DOM tree.
 * Handles validation, container management, and element lifecycle updates.
 */
export class Renderer {
  private container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
    this.setupContainer();
  }

  /**
   * Basic CSS setup for the mount point
   */
  private setupContainer() {
    applyStyles(this.container, {
      position: 'relative',
      overflow: 'hidden',
      display: 'block'
    });
    
    // Ensure relative positioning for child absolute coordinates
    if (getComputedStyle(this.container).position === 'static') {
      this.container.style.position = 'relative';
    }
  }

  /**
   * Renders a full template into the container.
   * Validates input data with Zod schema before processing.
   */
  render(data: any) {
    const result = TemplateSchema.safeParse(data);
    
    if (!result.success) {
      console.error('[Renderer] Invalid template data:', result.error.format());
      throw new Error('Invalid template data');
    }

    const template = result.data;
    
    // 1. Clear previous content
    this.container.innerHTML = '';
    
    // 2. Apply template-wide styles
    applyStyles(this.container, {
      width: formatUnit(template.width),
      height: formatUnit(template.height),
      backgroundColor: template.backgroundColor,
      perspective: template.perspective
    });
    
    // 3. Create and append elements
    // Elements are already sorted by z-index in the builder, but we ensure it here too
    const elements = [...template.elements].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));

    for (const data of elements) {
      if (data.visible === false) continue;
      
      const el = ElementFactory.create(data);
      this.container.appendChild(el);
    }
  }

  /**
   * Helper to update specific element properties without a full re-render
   */
  updateElement(id: string, partialData: any) {
    const el = this.container.querySelector(`[data-id="${id}"]`) as HTMLElement;
    if (el) {
      // Direct property update on the DOM node using same logic as factory
      const { type } = partialData;
      // In a more complex system, we'd recalibrate the element here.
      // For now, simple attribute/style updates suffice for simple edits.
      if (partialData.style) applyStyles(el, partialData.style);
    }
  }
}

/**
 * Utility to mount the renderer into an iframe specifically for sandboxing
 */
export function createIframeRenderer(iframe: HTMLIFrameElement): Renderer {
  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!doc) throw new Error('Iframe source document not available');
  
  // Reset iframe body for clean viewport
  applyStyles(doc.body, {
    margin: '0',
    padding: '0',
    overflow: 'hidden',
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent'
  });
  
  return new Renderer(doc.body);
}
