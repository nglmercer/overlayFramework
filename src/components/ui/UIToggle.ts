import { html, css, LitElement } from 'lit';
import { Component, property } from '../../litcomponents';

@Component('ui-toggle')
export class UIToggle extends LitElement {
  @property({ type: String }) label = '';
  @property({ type: Boolean }) checked = false;

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
    }
    .toggle {
      width: 2.5rem;
      height: 1.375rem;
      border-radius: 1.375rem;
      position: relative;
      cursor: pointer;
      transition: background-color 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      flex-shrink: 0;
    }
    .toggle.on { background-color: var(--color-primary, #a970ff); }
    .toggle.off { background-color: #4b5563; }
    
    .knob {
      width: 1.125rem;
      height: 1.125rem;
      background-color: white;
      border-radius: 50%;
      position: absolute;
      top: 0.125rem;
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 1px 3px rgba(0,0,0,0.3);
    }
    .toggle.on .knob { transform: translateX(1.25rem); }
    .toggle.off .knob { transform: translateX(0.125rem); }
    
    span {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--color-text-primary, #f3f4f6);
      user-select: none;
    }
  `;

  render() {
    return html`
      <span>${this.label}</span>
      <div 
        class="toggle ${this.checked ? 'on' : 'off'}" 
        @click="${() => { this.checked = !this.checked; this.dispatchEvent(new CustomEvent('change', { detail: this.checked })); }}"
      >
        <div class="knob"></div>
      </div>
    `;
  }
}
