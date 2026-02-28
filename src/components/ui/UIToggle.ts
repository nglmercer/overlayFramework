import { html, css, LitElement } from 'lit';
import { Component, property, query } from '../../litcomponents';

@Component('ui-toggle')
export class UIToggle extends LitElement {
  @property({ type: String }) label = '';
  @property({ type: Boolean }) checked = false;
  @property({ type: Boolean, attribute: 'disabled' }) disabled = false;
  
  @query('input') private _checkbox!: HTMLInputElement;

  static styles = css`
    :host {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      margin-bottom: 1rem;
      background: var(--color-bg-panel, rgba(255,255,255,0.02));
      padding: 0.75rem 0.875rem;
      border-radius: 0.5rem;
      border: 1px solid rgba(255,255,255,0.05);
      cursor: pointer;
      user-select: none;
    }
    
    :host([disabled]) {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    :host([disabled]) .toggle,
    :host([disabled]) span {
      pointer-events: none;
    }
    
    /* Hide native checkbox visually but keep accessible */
    input[type="checkbox"] {
      position: absolute;
      opacity: 0;
      width: 0;
      height: 0;
      pointer-events: none;
    }
    
    .toggle {
      width: 2.5rem;
      height: 1.375rem;
      border-radius: 1.375rem;
      position: relative;
      cursor: pointer;
      transition: background-color 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      flex-shrink: 0;
      background-color: #4b5563;
    }
    
    /* Use CSS :checked for visual state - no JS re-render needed */
    input:checked + .toggle {
      background-color: var(--color-primary, #a970ff);
    }
    
    .knob {
      width: 1.125rem;
      height: 1.125rem;
      background-color: white;
      border-radius: 50%;
      position: absolute;
      top: 0.125rem;
      left: 0.125rem;
      transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 1px 3px rgba(0,0,0,0.3);
    }
    
    input:checked + .toggle .knob {
      transform: translateX(1.25rem);
    }
    
    /* Focus styles for accessibility */
    input:focus + .toggle {
      outline: 2px solid var(--color-primary, #a970ff);
      outline-offset: 2px;
    }
    
    span {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--color-text-primary, #f3f4f6);
      user-select: none;
      flex: 1;
    }
  `;

  /**
   * Handle checkbox state change - only dispatch event, no property update
   * The visual state is handled entirely by CSS :checked pseudo-class
   * Parent component controls the checked state and will update via property binding
   */
  private _handleChange() {
    const newChecked = this._checkbox.checked;
    
    // Dispatch event for parent components - parent controls state via property
    // No need to update this.checked as it would trigger unnecessary re-render
    this.dispatchEvent(new CustomEvent('change', {
      detail: newChecked,
      bubbles: true,
      composed: true
    }));
  }

  /**
   * Handle keyboard activation (Enter/Space on the toggle container)
   */
  private _handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this._checkbox.click();
    }
  }

  render() {
    return html`
      <span>${this.label}</span>
      <input
        type="checkbox"
        .checked="${this.checked}"
        ?disabled="${this.disabled}"
        @change="${this._handleChange}"
        tabindex="-1"
        aria-label="${this.label}"
      />
      <div
        class="toggle"
        role="switch"
        aria-checked="${this.checked}"
        aria-label="${this.label}"
        @keydown="${this._handleKeyDown}"
        @click="${() => !this.disabled && this._checkbox.click()}"
      >
        <div class="knob"></div>
      </div>
    `;
  }
}
