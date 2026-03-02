/**
 * Components Module - Lit Re-exports
 * 
 * Re-exports Lit functionality for components.
 * Provides decorators, base classes, and template helpers.
 * 
 * @module components/litcomponents
 */

// Re-export Lit core functionality
export { LitElement, html, css, nothing, render } from 'lit';
import { customElement, property, state, query, queryAll } from 'lit/decorators.js';
export { customElement, property, state, query, queryAll };
export { styleMap } from 'lit/directives/style-map.js';

// Re-export DB types and manager

export { dbManager, type AlertBox, type AlertVariant } from '../lib/db';
