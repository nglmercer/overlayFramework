import { html, css, LitElement } from 'lit';
import { Component, property, state } from '../../litcomponents';

@Component('ui-input')
export class UIInput extends LitElement {
  @property({ type: String }) label = '';
  @property({ type: String }) value = '';
  @property({ type: String }) placeholder = '';
  @property({ type: String }) type = 'text';
  @property({ type: String }) hint = '';
  @property({ type: String }) error = '';
  @property({ type: Boolean }) disabled = false;
  @property({ type: Boolean }) readonly = false;
  @property({ type: Number }) min?: number;
  @property({ type: Number }) max?: number;
  @property({ type: Number }) step?: number;

  @state() public _focused = false;

  static styles = css`
    :host {
      display: block;
      margin-bottom: 1.25rem;
    }

    .field {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
    }

    .label-row {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
    }

    label {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--color-text-secondary, #9ca3af);
      text-transform: uppercase;
      letter-spacing: 0.06em;
      user-select: none;
      transition: color 0.15s;
    }

    :host([error]) label,
    .field.has-error label {
      color: #f87171;
    }

    .hint {
      font-size: 0.6875rem;
      color: var(--color-text-secondary, #6b7280);
      opacity: 0.7;
    }

    .input-wrapper {
      position: relative;
      display: flex;
      align-items: center;
    }

    input {
      width: 100%;
      background-color: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 0.5rem;
      padding: 0.5625rem 0.75rem;
      font-size: 0.875rem;
      font-family: inherit;
      color: var(--color-text-primary, #f3f4f6);
      transition:
        border-color 0.15s ease,
        background-color 0.15s ease,
        box-shadow 0.15s ease;
      box-sizing: border-box;
      -moz-appearance: textfield;
    }

    /* Remove number spinners */
    input[type="number"]::-webkit-inner-spin-button,
    input[type="number"]::-webkit-outer-spin-button {
      -webkit-appearance: none;
      margin: 0;
    }

    input::placeholder {
      color: rgba(255, 255, 255, 0.18);
    }

    input:hover:not(:disabled):not(:read-only) {
      border-color: rgba(255, 255, 255, 0.2);
      background-color: rgba(255, 255, 255, 0.06);
    }

    input:focus {
      outline: none;
      border-color: var(--color-primary, #a970ff);
      background-color: rgba(169, 112, 255, 0.05);
      box-shadow: 0 0 0 3px rgba(169, 112, 255, 0.15);
    }

    input:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    input:read-only {
      opacity: 0.6;
      cursor: default;
      border-style: dashed;
    }

    /* Error state */
    .field.has-error input {
      border-color: rgba(248, 113, 113, 0.5);
      background-color: rgba(248, 113, 113, 0.05);
    }

    .field.has-error input:focus {
      border-color: #f87171;
      box-shadow: 0 0 0 3px rgba(248, 113, 113, 0.15);
    }

    .error-msg {
      font-size: 0.6875rem;
      color: #f87171;
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }

    .error-msg::before {
      content: '⚠';
      font-size: 0.625rem;
    }

    /* Number type: custom stepper buttons */
    .stepper {
      position: absolute;
      right: 0.375rem;
      display: flex;
      flex-direction: column;
      gap: 1px;
    }

    .step-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 1.125rem;
      height: 0.875rem;
      background: rgba(255, 255, 255, 0.06);
      border: none;
      border-radius: 0.2rem;
      color: #9ca3af;
      cursor: pointer;
      font-size: 0.5rem;
      line-height: 1;
      padding: 0;
      transition: background 0.1s, color 0.1s;
    }

    .step-btn:hover {
      background: rgba(169, 112, 255, 0.2);
      color: #a970ff;
    }

    .step-btn:active {
      background: rgba(169, 112, 255, 0.35);
    }

    input[type="number"] {
      padding-right: 2rem;
    }
  `;

  private _handleInput(e: Event) {
    const input = e.target as HTMLInputElement;
    this.value = input.value;
    this.dispatchEvent(new CustomEvent('change', { detail: this.value }));
  }

  public _handleFocus() { this._focused = true; }
  public _handleBlur() { this._focused = false; }

  private _step(dir: 1 | -1) {
    const step = this.step ?? 1;
    const current = parseFloat(this.value) || 0;
    let next = current + dir * step;
    if (this.min !== undefined) next = Math.max(this.min, next);
    if (this.max !== undefined) next = Math.min(this.max, next);
    this.value = String(next);
    this.dispatchEvent(new CustomEvent('change', { detail: this.value }));
  }

  render() {
    const hasError = !!this.error;
    const isNumber = this.type === 'number';

    return html`
      <div class="field ${hasError ? 'has-error' : ''}">
        ${this.label ? html`
          <div class="label-row">
            <label>${this.label}</label>
            ${this.hint ? html`<span class="hint">${this.hint}</span>` : ''}
          </div>
        ` : ''}

        <div class="input-wrapper">
          <input
            type="${this.type}"
            .value="${this.value}"
            placeholder="${this.placeholder}"
            ?disabled="${this.disabled}"
            ?readonly="${this.readonly}"
            min="${this.min ?? ''}"
            max="${this.max ?? ''}"
            step="${this.step ?? ''}"
            aria-label="${this.label || this.placeholder}"
            aria-invalid="${hasError}"
            @input="${this._handleInput}"
            @focus="${this._handleFocus}"
            @blur="${this._handleBlur}"
          />

          ${isNumber ? html`
            <div class="stepper">
              <button class="step-btn" tabindex="-1" @click="${() => this._step(1)}" aria-label="Increment">▲</button>
              <button class="step-btn" tabindex="-1" @click="${() => this._step(-1)}" aria-label="Decrement">▼</button>
            </div>
          ` : ''}
        </div>

        ${hasError ? html`<span class="error-msg">${this.error}</span>` : ''}
      </div>
    `;
  }
}