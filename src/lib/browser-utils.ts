/**
 * Browser Utilities
 * 
 * Provides helpers for interacting with browser APIs.
 */

/**
 * Copies text to the clipboard using the modern Clipboard API.
 * Falls back to execCommand for older browsers.
 * 
 * @param text - The text to copy
 * @returns Promise that resolves to true if copy was successful
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (!text) return false;
  
  try {
    // Check if Clipboard API is available and we are in a secure context
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback for older browsers or non-secure contexts
      const textArea = document.createElement('textarea');
      textArea.value = text;
      
      // Ensure the textarea is not visible
      textArea.style.position = 'fixed';
      textArea.style.left = '-9999px';
      textArea.style.top = '-9999px';
      textArea.style.opacity = '0';
      
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      let successful = false;
      try {
        successful = document.execCommand('copy');
      } catch (err) {
        console.error('execCommand Copy failed:', err);
      }
      
      document.body.removeChild(textArea);
      return successful;
    }
  } catch (err) {
    console.error('Failed to copy to clipboard:', err);
    return false;
  }
}
