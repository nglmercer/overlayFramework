import { Template, TemplateElement } from './schemas';
import { AlertConfig, AlertLayout, GridTextPosition, DEFAULT_TEXT_POSITION } from './alertRenderer';
import { processTemplate } from '../lib/core/template-processor';

/**
 * Preset mapping: Legacy AlertLayout positions to GridTextPosition
 * This provides backward compatibility while using the new grid system
 * 
 * Grid positions:
 * | 1 | 2 | 3 |  <- top
 * | 4 | 5 | 6 |  <- middle
 * | 7 | 8 | 9 |  <- bottom
 * 
 * Note: 'center' and 'text-over' use position '5' (middle-center) to overlay text on media
 */
export const LAYOUT_PRESETS: Record<AlertLayout, GridTextPosition> = {
  // Legacy layouts mapped to grid positions
  'text-below': '8',    // text below media (bottom-center)
  'text-over': '5',     // text over media (middle-center, overlaid)
  'text-left': '6',    // text left of media (middle-right)
  'text-right': '4',   // text right of media (middle-left)
  'center': '5',       // center overlay (middle-center, overlaid)
  // New grid layout - uses explicit textPosition
  'grid': '8',         // default to bottom-center
};

/**
 * AlertTemplateBuilder - Logic to build structured layout templates from AlertConfig.
 * Decouples layout math and structure from the Renderer class.
 * 
 * Uses a unified 3x3 grid system for ALL layouts:
 * | 1 | 2 | 3 |  <- top
 * | 4 | 5 | 6 |  <- middle
 * | 7 | 8 | 9 |  <- bottom
 * 
 * Media is always centered (grid area 5 - middle-center)
 * Text is positioned based on resolved textPosition from LAYOUT_PRESETS or explicit textPosition
 */
export class AlertTemplateBuilder {

  /**
   * Map grid position numbers to grid-area values
   */
  private static getTextGridArea(position: GridTextPosition): string {
    const gridAreas: Record<GridTextPosition, string> = {
      '1': 'text-top-left',
      '2': 'text-top-center',
      '3': 'text-top-right',
      '4': 'text-middle-left',
      '5': 'text-middle-center',
      '6': 'text-middle-right',
      '7': 'text-bottom-left',
      '8': 'text-bottom-center',
      '9': 'text-bottom-right',
    };
    return gridAreas[position] || 'text-bottom-center';
  }

  /**
   * Get text alignment based on grid position
   */
  private static getTextAlign(position: GridTextPosition): 'left' | 'center' | 'right' {
    const leftPositions: GridTextPosition[] = ['1', '4', '7'];
    const rightPositions: GridTextPosition[] = ['3', '6', '9'];
    
    if (leftPositions.includes(position)) return 'left';
    if (rightPositions.includes(position)) return 'right';
    return 'center';
  }

  /**
   * Get vertical alignment based on grid position
   */
  private static getVerticalAlign(position: GridTextPosition): 'start' | 'center' | 'end' {
    const topPositions: GridTextPosition[] = ['1', '2', '3'];
    const bottomPositions: GridTextPosition[] = ['7', '8', '9'];
    
    if (topPositions.includes(position)) return 'start';
    if (bottomPositions.includes(position)) return 'end';
    return 'center';
  }

  /**
   * Main build methods - converts flat AlertConfig into structural Template
   * Uses unified grid system for all layouts
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
      textAlign: configTextAlign,
      textColor,
      highlightColor,
      textShadow,
      imageUrl,
      imageScale,
      imageVolume,
      eventData,
      containerWidth = 600,
      containerHeight = 600,
      textPosition = DEFAULT_TEXT_POSITION,
    } = config;

    // 1. Process Message with variables
    const processedContent = processTemplate(
      message || '', 
      eventData || {}, 
      highlightColor || '#9146FF'
    );

    // 2. Resolve text position using presets
    // If layout is 'grid', use explicit textPosition; otherwise use preset mapping
    const isGridLayout = layout === 'grid';
    const resolvedTextPosition: GridTextPosition = isGridLayout 
      ? (textPosition || DEFAULT_TEXT_POSITION)
      : (LAYOUT_PRESETS[layout] || DEFAULT_TEXT_POSITION);
    
    // 3. Calculate responsive image width based on scale (%)
    const effectiveImageWidth = imageScale 
      ? (imageScale / 100) * (containerWidth - padding * 2) 
      : 200;

    // 4. Get positioning info from resolved text position
    const textAlign = this.getTextAlign(resolvedTextPosition);
    const verticalAlign = this.getVerticalAlign(resolvedTextPosition);
    const textGridArea = this.getTextGridArea(resolvedTextPosition);

    // 5. Build card style using unified grid system
    // Check if this is an overlay layout (text in same position as media)
    const isOverlayLayout = resolvedTextPosition === '5';
    
    const cardStyle: any = {
      display: 'grid',
      gridTemplateColumns: '1fr 2fr 1fr',
      gridTemplateRows: '1fr 1fr 1fr',
      gridTemplateAreas: `
        "text-top-left text-top-center text-top-right"
        "text-middle-left text-middle-center text-middle-right"
        "text-bottom-left text-bottom-center text-bottom-right"
      `,
      alignItems: 'center',
      justifyItems: 'center',
      padding: `${padding}px`,
      gap: `${spacing}px`,
      backgroundColor: bgOpacity > 0 ? `${bgColor}${Math.round((bgOpacity / 100) * 255).toString(16).padStart(2, '0')}` : 'transparent',
      borderRadius: rounded ? '24px' : '0px',
      boxShadow: shadow ? '0 10px 30px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.1)' : 'none',
      backdropFilter: (bgOpacity > 0 && bgOpacity < 100) ? 'blur(12px)' : 'none',
      width: 'fit-content',
      minWidth: '300px',
      maxWidth: '95%',
      height: 'auto',
      minHeight: '200px',
      margin: '0 auto',
      transition: 'all 0.3s ease',
      position: 'relative',
      boxSizing: 'border-box',
    };

    // 6. Build card elements
    const cardElements: any[] = [];

    // Media element - always centered (grid area 5 - middle-center)
    if (imageUrl) {
      const mediaElement: any = {
        id: 'alert-media',
        name: 'Alert Media',
        type: 'multimedia' as const,
        x: 0,
        y: 0,
        width: effectiveImageWidth,
        height: 'auto',
        position: 'relative' as const,
        rotation: 0,
        opacity: 1,
        zIndex: 2,
        visible: true,
        url: imageUrl,
        autoPlay: true,
        volume: imageVolume ?? 100,
        muted: true,
        objectFit: 'contain' as const,
        style: {
          gridArea: 'text-middle-center',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: `${effectiveImageWidth}px`,
          maxWidth: '100%',
        },
      };
      cardElements.push(mediaElement);
    }

    // Text element - positioned based on resolvedTextPosition
    // For overlay layouts (position 5), text sits on top of media
    const textElement: any = {
      id: 'alert-text',
      name: 'Alert Text',
      type: 'text' as const,
      x: 0,
      y: 0,
      width: '100%',
      height: 'auto',
      position: 'relative' as const,
      rotation: 0,
      opacity: 1,
      zIndex: isOverlayLayout ? 10 : 3,
      visible: true,
      content: processedContent,
      fontSize: fontSize || 24,
      fontFamily: fontFamily || 'Roboto',
      fontWeight: fontWeight || 'Normal',
      color: textColor || '#FFFFFF',
      textAlign: configTextAlign || textAlign,
      textShadow: textShadow ? '2px 2px 8px rgba(0,0,0,0.8)' : undefined,
      style: {
        gridArea: textGridArea,
        wordBreak: 'break-word',
        lineHeight: '1.2',
        maxWidth: '100%',
        boxSizing: 'border-box',
        padding: '8px',
        alignSelf: verticalAlign === 'center' ? 'center' : verticalAlign === 'start' ? 'start' : 'end',
        justifySelf: 'center',
        textAlign: textAlign,
        // Add absolute positioning for overlay layouts
        ...(isOverlayLayout && {
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '80%',
        }),
      },
    };
    cardElements.push(textElement);

    // 7. Assemble the components
    const elements: TemplateElement[] = [];
    elements.push({
      id: 'alert-card-wrapper',
      name: 'Card Wrapper',
      type: 'group' as const,
      x: 0,
      y: 0,
      width: '100%',
      height: '100%',
      position: 'relative' as const,
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
