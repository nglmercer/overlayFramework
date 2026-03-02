import { Template, TemplateElement } from './schemas';
import { AlertConfig } from './alertRenderer';
import { processTemplate } from '../lib/core/template-processor';

/**
 * AlertTemplateBuilder - Logic to build structured layout templates from AlertConfig.
 * Decouples layout math and structure from the Renderer class.
 */
export class AlertTemplateBuilder {

  /**
   * Main build methods - converts flat AlertConfig into structural Template
   */
  static build(config: AlertConfig): Template {
    const {
      message,
      layout,
      bgColor,
      bgOpacity,
      padding = 16,
      spacing = 16,
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

    // 1. Process Message with variables
    const processedContent = processTemplate(
      message || '', 
      eventData || {}, 
      highlightColor || '#9146FF'
    );

    // 2. Element collections
    const elements: TemplateElement[] = [];
    const contentElements: any[] = [];
    
    // 3. Flags for layout positioning
    const isOver = layout === 'center'; // Text on top of image
    const isAbove = layout === 'text-over'; // Text strictly above image
    const isRight = layout === 'text-right'; // Media on left, text on right 

    // 4. Calculate responsive image width based on scale (%)
    const effectiveImageWidth = imageScale 
      ? (imageScale / 100) * (containerWidth - padding * 2) 
      : 200;

    // 5. Create Media Element
    if (imageUrl) {
      contentElements.push({
        id: 'alert-media',
        name: 'Alert Media',
        type: 'multimedia' as const,
        width: effectiveImageWidth,
        height: 'auto',
        position: isOver ? 'absolute' : 'relative',
        opacity: 1,
        zIndex: 2,
        visible: true,
        url: imageUrl,
        autoPlay: true,
        volume: imageVolume ?? 100,
        muted: true, // Audio usually handled via separate soundUrl field
        objectFit: 'contain' as const,
      });
    }

    // 6. Create Text Element
    const textWidth = isRight 
      ? (containerWidth - padding * 2 - effectiveImageWidth - spacing) 
      : (containerWidth - padding * 2);

    contentElements.push({
      id: 'alert-text',
      name: 'Alert Text',
      type: 'text' as const,
      width: textWidth,
      height: 'auto',
      position: isOver ? 'absolute' : 'relative',
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
      style: (layout === 'text-below' && imageUrl) ? { marginTop: `${spacing}px` } : 
             (isAbove && imageUrl) ? { marginBottom: `${spacing}px` } :
             (isRight && imageUrl) ? { marginLeft: `${spacing}px` } : {},
    });

    // 7. Order text correctly for "text-over" (meaning text atop visually)
    if (isAbove && contentElements.length === 2) {
      // Moves last element (text) to first pos for visual stacking in column flow
      contentElements.unshift(contentElements.pop());
    }

    // 8. Build Content Group Container
    const mainGroupStyle: any = {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
      height: '100%',
      padding: `${padding}px`,
      boxSizing: 'border-box',
    };

    if (layout === 'text-below' || layout === 'center' || isAbove) {
      mainGroupStyle.flexDirection = 'column';
    } else if (isRight) {
      mainGroupStyle.flexDirection = 'row';
    }

    elements.push({
      id: 'alert-content-group',
      name: 'Content Group',
      type: 'group' as const,
      x: 0,
      y: 0,
      width: '100%',
      height: '100%',
      position: 'absolute' as const,
      rotation: 0,
      opacity: 1,
      visible: true,
      zIndex: 1,
      style: mainGroupStyle,
      elements: contentElements,
    });

    // 9. Add Background Box if visible
    if (bgOpacity > 0) {
      elements.push({
        id: 'alert-background',
        name: 'Alert Background',
        type: 'box' as const,
        x: 0,
        y: 0,
        width: '100%',
        height: '100%',
        position: 'absolute' as const,
        rotation: 0,
        opacity: bgOpacity / 100,
        zIndex: 0,
        visible: true,
        backgroundColor: bgColor || '#000000',
        borderRadius: rounded ? '16px' : '0px',
        borderWidth: 0,
        borderColor: 'transparent',
        boxShadow: shadow ? '0 4px 20px rgba(0,0,0,0.3)' : undefined,
      });
    }

    return {
      id: 'alert-template',
      name: 'Generated Alert Template',
      width: '100%',
      height: '100%',
      backgroundColor: 'transparent',
      elements,
    };
  }
}
