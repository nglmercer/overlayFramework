import { html, css, LitElement } from 'lit';
import { Component, property } from '../../litcomponents';

@Component('ui-input')
export class UIInput extends LitElement {
  @property({ type: String }) label = '';
  @property({ type: String }) value = '';
  @property({ type: String }) placeholder = '';
  @property({ type: String }) type = 'text';

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
    .input-wrapper {
      position: relative;
    }
    input {
      width: 100%;
      background-color: var(--color-bg-input, rgba(255, 255, 255, 0.03));
      border: 1px solid var(--color-border, rgba(255, 255, 255, 0.1));
      border-radius: 0.5rem;
      padding: 0.625rem 0.75rem;
      font-size: 0.875rem;
      color: var(--color-text-primary, white);
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      box-sizing: border-box;
    }
    input:focus {
      outline: none;
      border-color: var(--color-primary, #a970ff);
      background-color: var(--color-bg-input-focus, rgba(255, 255, 255, 0.05));
      box-shadow: 0 0 0 3px rgba(169, 112, 255, 0.15);
    }
    input::placeholder {
      color: rgba(255, 255, 255, 0.2);
    }
  `;

  render() {
    return html`
      <div>
        ${this.label ? html`<label>${this.label}</label>` : ''}
        <div class="input-wrapper">
          <input 
            .type="${this.type}"
            .value="${this.value}"
            placeholder="${this.placeholder}"
            @input="${(e: any) => { this.value = e.target.value; this.dispatchEvent(new CustomEvent('change', { detail: this.value })); }}"
          />
        </div>
      </div>
    `;
  }
}
