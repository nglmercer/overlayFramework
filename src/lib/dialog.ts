import { DialogOptions, DialogTheme, DialogResult } from '../components/Dialog';

let dialogElement: import('../components/Dialog').AppDialog | null = null;
let defaultTheme: DialogTheme = 'dark';

/**
 * Get or create the dialog element
 */
function getDialogElement(): import('../components/Dialog').AppDialog {
  if (!dialogElement) {
    dialogElement = document.createElement('app-dialog') as import('../components/Dialog').AppDialog;
    document.body.appendChild(dialogElement);
  }
  return dialogElement;
}

/**
 * Show an alert dialog (await-based replacement for window.alert)
 * @param message The message to display
 * @param options Optional configuration
 */
export async function alert(
  message: string,
  options?: Partial<DialogOptions>
): Promise<void> {
  const dialog = getDialogElement();
  const result = await dialog.open({
    message,
    type: 'alert',
    title: options?.title,
    theme: options?.theme || 'dark',
    confirmText: options?.confirmText || 'OK',
    showClose: options?.showClose ?? false,
    closeOnOverlayClick: options?.closeOnOverlayClick ?? false,
    closeOnEscape: options?.closeOnEscape ?? true,
    danger: options?.danger || false,
    ...options,
  });
  
  // For alert, we just wait for it to close
  return;
}

/**
 * Show a confirmation dialog (await-based replacement for window.confirm)
 * @param message The message to display
 * @param options Optional configuration
 * @returns true if confirmed, false if cancelled
 */
export async function confirm(
  message: string,
  options?: Partial<DialogOptions>
): Promise<boolean> {
  const dialog = getDialogElement();
  const result = await dialog.open({
    message,
    type: 'confirm',
    title: options?.title || 'Confirm',
    theme: options?.theme || 'dark',
    confirmText: options?.confirmText || 'Confirm',
    cancelText: options?.cancelText || 'Cancel',
    showClose: options?.showClose ?? true,
    closeOnOverlayClick: options?.closeOnOverlayClick ?? true,
    closeOnEscape: options?.closeOnEscape ?? true,
    danger: options?.danger || false,
    ...options,
  });
  
  return result === true;
}

/**
 * Show a prompt dialog (await-based replacement for window.prompt)
 * @param message The message to display
 * @param options Optional configuration
 * @returns The input value if confirmed, null if cancelled
 */
export async function prompt(
  message: string,
  options?: Partial<DialogOptions>
): Promise<string | null> {
  const dialog = getDialogElement();
  const result = await dialog.open({
    message,
    type: 'prompt',
    title: options?.title || 'Input',
    theme: options?.theme || 'dark',
    confirmText: options?.confirmText || 'Submit',
    cancelText: options?.cancelText || 'Cancel',
    placeholder: options?.placeholder || '',
    defaultValue: options?.defaultValue || '',
    showClose: options?.showClose ?? true,
    closeOnOverlayClick: options?.closeOnOverlayClick ?? true,
    closeOnEscape: options?.closeOnEscape ?? true,
    ...options,
  });
  
  return result as string | null;
}

/**
 * Show a custom modal dialog
 * @param options Configuration for the modal
 * @returns The result based on button clicked
 */
export async function modal(
  options: DialogOptions
): Promise<DialogResult> {
  const dialog = getDialogElement();
  const result = await dialog.open({
    type: 'modal',
    ...options,
  });
  
  return result;
}

/**
 * Set the default theme for all dialogs
 */
export function setDialogTheme(theme: DialogTheme): void {
  defaultTheme = theme;
}

/**
 * Get the current default theme
 */
export function getDialogTheme(): DialogTheme {
  return defaultTheme;
}

/**
 * Replace window.alert with our custom alert
 * This makes all alert() calls use the custom dialog
 */
export function patchGlobalAlert(): void {
  if (typeof window !== 'undefined') {
    (window as any).alert = alert;
  }
}

/**
 * Replace window.confirm with our custom confirm
 */
export function patchGlobalConfirm(): void {
  if (typeof window !== 'undefined') {
    (window as any).confirm = confirm;
  }
}

/**
 * Replace window.prompt with our custom prompt
 */
export function patchGlobalPrompt(): void {
  if (typeof window !== 'undefined') {
    (window as any).prompt = prompt;
  }
}

/**
 * Patch all global dialog functions
 */
export function patchAllGlobals(): void {
  patchGlobalAlert();
  patchGlobalConfirm();
  patchGlobalPrompt();
}
