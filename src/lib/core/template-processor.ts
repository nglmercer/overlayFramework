/**
 * Template Processor - Logic for variable replacement in alert messages
 */

/**
 * Replaces {variable} placeholders in a message with values from eventData.
 * Returns the message with values wrapped in highlighted spans.
 */
export function processTemplate(
  message: string,
  eventData: Record<string, any>,
  highlightColor: string = '#9146FF'
): string {
  if (!message) return '';
  
  let processedMessage = message;
  
  // 1. Replace variables from eventData
  if (eventData) {
    for (const [key, value] of Object.entries(eventData)) {
      const highlightedValue = `<span style="color: ${highlightColor}; font-weight: bold; text-shadow: 0 0 10px rgba(0,0,0,0.3);">${value}</span>`;
      // Support both {variable} and {{variable}} just in case
      processedMessage = processedMessage.replace(new RegExp(`\\{${key}\\}`, 'g'), highlightedValue);
    }
  }
  
  // 2. Highlight remaining {variable} placeholders that were NOT replaced
  // This is useful for UI previews where some data might be missing
  processedMessage = processedMessage.replace(/\{(\w+)\}/g, `<span style="color: ${highlightColor}; font-weight: bold; text-shadow: 0 0 10px rgba(0,0,0,0.3);">$1</span>`);
  
  return processedMessage;
}
