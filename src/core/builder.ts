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
    const isOver = layout === 'center';
    const isAbove = layout === 'text-over'; 
    const isRight = layout === 'text-right';
    const isLeft = layout === 'text-left';
    const isBelow = layout === 'text-below';

    // 4. Calculate responsive image width based on scale (%)
    const effectiveImageWidth = imageScale 
      ? (imageScale / 100) * (containerWidth - padding * 2) 
      : 200;

    // 5. Build Content Elements
    const cardElements: any[] = [];
    
    // Media Element
    if (imageUrl) {
      const mediaElement: any = {
        id: 'alert-media',
        name: 'Alert Media',
        type: 'multimedia' as const,
        x: 0,
        y: 0,
        width: effectiveImageWidth,
        height: 'auto',
        position: isOver ? 'absolute' : 'relative',
        rotation: 0,
        opacity: 1,
        zIndex: 2,
        visible: true,
        url: imageUrl,
        autoPlay: true,
        volume: imageVolume ?? 100,
        muted: true,
        objectFit: 'contain' as const,
      };

      if (isOver) {
        mediaElement.style = { 
          top: '50%', 
          left: '50%', 
          transform: 'translate(-50%, -50%)',
          width: `${effectiveImageWidth}px`,
          maxWidth: '100%',
          position: 'absolute'
        };
      } else {
        mediaElement.style = { 
          gridArea: 'media',
          display: 'block',
          margin: '0 auto' 
        };
      }

      cardElements.push(mediaElement);
    }

    // Text Element
    const textWidth = (isRight || isLeft) 
      ? (containerWidth - padding * 2 - effectiveImageWidth - (imageUrl ? spacing : 0)) 
      : (containerWidth - padding * 4);

    const textElement: any = {
      id: 'alert-text',
      name: 'Alert Text',
      type: 'text' as const,
      x: 0,
      y: 0,
      width: isOver ? (containerWidth - padding * 4) : textWidth,
      height: 'auto',
      position: isOver ? 'absolute' : 'relative',
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
      textShadow: textShadow ? '2px 2px 8px rgba(0,0,0,0.8)' : undefined,
      style: {
        wordBreak: 'break-word',
        lineHeight: '1.2',
        maxWidth: '100%',
        boxSizing: 'border-box'
      }
    };

    if (isOver) {
      textElement.style = { 
        ...textElement.style, 
        top: '50%', 
        left: '50%', 
        transform: 'translate(-50%, -50%)',
        position: 'absolute',
        width: '100%',
        padding: `0 ${padding}px`,
        zIndex: 10
      };
    } else {
      textElement.style = { 
        ...textElement.style, 
        gridArea: 'text',
        alignSelf: 'center',
        justifySelf: 'center'
      };
    }

    cardElements.push(textElement);

    // 6. Build the Alert Card (The bubble/container)
    const cardStyle: any = {
      display: isOver ? 'block' : 'grid',
      alignItems: 'center',
      justifyContent: 'center',
      justifyItems: 'center', // Added for grid alignment
      padding: `${padding}px`,
      gap: isOver ? '0' : `${spacing}px`,
      backgroundColor: bgOpacity > 0 ? `${bgColor}${Math.round((bgOpacity / 100) * 255).toString(16).padStart(2, '0')}` : 'transparent',
      borderRadius: rounded ? '24px' : '0px',
      boxShadow: shadow ? '0 10px 30px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.1)' : 'none',
      backdropFilter: (bgOpacity > 0 && bgOpacity < 100) ? 'blur(12px)' : 'none',
      maxWidth: '95%',
      width: isOver ? `${Math.max(effectiveImageWidth + padding * 2, 300)}px` : 'fit-content',
      height: isOver ? `${Math.max(effectiveImageWidth * 0.8 + padding * 2, 200)}px` : 'auto',
      margin: '0 auto',
      transition: 'all 0.3s ease',
      position: 'relative',
      boxSizing: 'border-box',
    };

    if (!isOver) {
      if (isBelow) {
        cardStyle.gridTemplateAreas = '"media" "text"';
        cardStyle.gridTemplateColumns = '1fr';
      } else if (isAbove) {
        cardStyle.gridTemplateAreas = '"text" "media"';
        cardStyle.gridTemplateColumns = '1fr';
      } else if (isRight) {
        cardStyle.gridTemplateAreas = '"media text"';
        cardStyle.gridTemplateColumns = 'auto 1fr';
      } else if (isLeft) {
        cardStyle.gridTemplateAreas = '"text media"';
        cardStyle.gridTemplateColumns = '1fr auto';
      }
    }

    // 7. Assemble the components
    elements.push({
      id: 'alert-card-wrapper',
      name: 'Card Wrapper',
      type: 'group' as const,
      x: 0,
      y: 0,
      width: '100%',
      height: '100%',
      position: 'absolute' as const,
      rotation: 0,
      opacity: 1,
      zIndex: 1,
      visible: true,
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
      },
      elements: [
        {
          id: 'alert-card',
          name: 'Alert Card',
          type: 'group' as const,
          x: 0,
          y: 0,
          width: 'auto',
          height: 'auto',
          position: 'relative' as const,
          rotation: 0,
          opacity: 1,
          zIndex: 1,
          visible: true,
          style: cardStyle,
          elements: cardElements,
        }
      ],
    });

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
