/**
 * Renderer Utility Functions
 * Helper methods for formatting values and applying styles to DOM elements.
 */

/**
 * Format string or number as valid CSS unit
 * Defaults to "px" if unitless
 */
export function formatUnit(value: string | number | undefined): string {
  if (value === undefined || value === null) return 'auto';
  if (typeof value === 'number') {
    return `${value}px`;
  }
  // Matches pure numbers in strings (e.g., "100") and adds px
  if (/^-?\d+(\.\d+)?$/.test(value)) {
    return `${value}px`;
  }
  return value;
}

/**
 * Ensures opacity is a string within 0-1 range
 */
export function formatOpacity(value: number | undefined): string {
  if (value === undefined) return '1';
  return Math.max(0, Math.min(1, value)).toString();
}

/**
 * Formats color with optional opacity if missing (handles hex and basic strings)
 */
export function formatColor(color: string | undefined): string {
  return color || 'transparent';
}

/**
 * Converts degree number to rotate transform string
 */
export function toRotate(deg: number | undefined): string {
  return deg ? `rotate(${deg}deg)` : 'rotate(0deg)';
}

/**
 * Safe Object.assign for styles, filtering null/undefined
 */
export function applyStyles(el: HTMLElement, styles: Record<string, any> = {}) {
  for (const [key, value] of Object.entries(styles)) {
    if (value !== undefined && value !== null) {
      (el.style as any)[key] = value;
    }
  }
}

/**
 * Applies all base element properties to a DOM node.
 * This handles shared attributes across all element types.
 */
export function applyBaseStyles(el: HTMLElement, data: any) {
  const styles: Record<string, any> = {
    position: data.position || 'absolute',
    left: formatUnit(data.x),
    top: formatUnit(data.y),
    width: formatUnit(data.width),
    height: formatUnit(data.height),
    transform: toRotate(data.rotation),
    opacity: formatOpacity(data.opacity),
    zIndex: (data.zIndex ?? 0).toString(),
    visibility: data.visible === false ? 'hidden' : 'visible',
    display: data.visible === false ? 'none' : '',
  };

  applyStyles(el, styles);
  
  el.setAttribute('data-id', data.id || 'unknown');
  el.setAttribute('data-type', data.type || 'unknown');

  if (data.className) {
    const classes = data.className.split(' ').filter(Boolean);
    if (classes.length > 0) el.classList.add(...classes);
  }

  // Merge custom inline styles
  if (data.style) {
    applyStyles(el, data.style);
  }
}

/**
 * Creates a common flexbox container style for layouts
 */
export function createFlexContainer(direction: 'row' | 'column' | 'row-reverse' | 'column-reverse' = 'column', gaps?: number): Partial<CSSStyleDeclaration> {
  return {
    display: 'flex',
    flexDirection: direction,
    alignItems: 'center',
    justifyContent: 'center',
    gap: gaps ? `${gaps}px` : '0',
    boxSizing: 'border-box',
    width: '100%',
    height: '100%'
  };
}
