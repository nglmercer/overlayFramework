import { LitElement, html, css, PropertyValues } from 'lit';
import { customElement, property, state, query, queryAll } from 'lit/decorators.js';

/**
 * Shorthand for @customElement
 */
export function Component(tagName: string) {
  return customElement(tagName);
}

/**
 * Re-exporting Lit's core decorators and classes for easier access
 */
export {
  LitElement,
  html,
  css,
  property,
  state,
  query,
  queryAll,
  type PropertyValues
};

/**
 * Base Component with common utilities if needed
 */
export class BaseComponent extends LitElement {
  // Add common methods or styles here
}
