import { html, css, LitElement } from 'lit';
import { Component, property } from '../../litcomponents';

@Component('ui-select')
export class UISelect extends LitElement {
  @property({ type: String }) label = '';
  @property({ type: Array }) options: { value: string, label: string }[] = [];
  @property({ type: String }) value = '';

  static styles = css`
    :host {
      display: block;
      margin-bottom: 1rem;
    }
    label {
      display: block;
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--color-text-secondary, #9ca3af);
      margin-bottom: 0.375rem;
      text-transform: uppercase;
      letter-spacing: 0.025em;
    }
    .select-wrapper {
      position: relative;
    }
    select {
      width: 100%;
      background-color: var(--color-bg-input, rgba(255, 255, 255, 0.03));
      border: 1px solid var(--color-border, rgba(255, 255, 255, 0.1));
      border-radius: 0.5rem;
      padding: 0.625rem 2rem 0.625rem 0.75rem;
      font-size: 0.875rem;
      color: var(--color-text-primary, white);
      appearance: none;
      transition: all 0.2s ease;
      box-sizing: border-box;
      cursor: pointer;
    }
    select:focus {
      outline: none;
      border-color: var(--color-primary, #a970ff);
      background-color: var(--color-bg-input-focus, rgba(255, 255, 255, 0.05));
      box-shadow: 0 0 0 3px rgba(169, 112, 255, 0.15);
    }
    .icon {
      position: absolute;
      right: 0.75rem;
      top: 50%;
      transform: translateY(-50%);
      pointer-events: none;
      color: #9ca3af;
    }
  `;

  render() {
    return html`
      <div>
        ${this.label ? html`<label>${this.label}</label>` : ''}
        <div class="select-wrapper">
          <select 
            .value="${this.value}"
            @change="${(e: any) => { this.value = e.target.value; this.dispatchEvent(new CustomEvent('change', { detail: this.value })); }}"
          >
            ${this.options.map(opt => html`
              <option .value="${opt.value}" ?selected="${this.value === opt.value}">${opt.label}</option>
            `)}
          </select>
          <svg class="icon" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    `;
  }
}
