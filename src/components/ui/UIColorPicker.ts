import { html, css, LitElement } from 'lit';
import { Component, property } from '../../litcomponents';

@Component('ui-color-picker')
export class UIColorPicker extends LitElement {
  @property({ type: String }) label = '';
  @property({ type: String }) value = '#ffffff';

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
    .container {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: var(--color-bg-input, rgba(255,255,255,0.03));
      padding: 0.375rem;
      border-radius: 0.5rem;
      border: 1px solid var(--color-border, rgba(255,255,255,0.1));
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .container:focus-within {
      border-color: var(--color-primary, #a970ff);
      box-shadow: 0 0 0 3px rgba(169, 112, 255, 0.15);
    }
    .preview {
      width: 2rem;
      height: 2rem;
      border-radius: 0.375rem;
      border: 1px solid rgba(255, 255, 255, 0.15);
      position: relative;
      overflow: hidden;
      cursor: pointer;
    }
    .preview input[type="color"] {
      position: absolute;
      top: -10px;
      left: -10px;
      width: 200%;
      height: 200%;
      cursor: pointer;
      opacity: 0;
    }
    input[type="text"] {
      flex: 1;
      background-color: transparent;
      border: none;
      padding: 0 0.25rem;
      font-size: 0.875rem;
      color: var(--color-text-primary, white);
      text-transform: uppercase;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
    }
    input[type="text"]:focus {
      outline: none;
    }
  `;

  render() {
    return html`
      <div>
        ${this.label ? html`<label>${this.label}</label>` : ''}
        <div class="container">
          <div class="preview" style="background-color: ${this.value}">
            <input type="color" .value="${this.value}" @input="${(e: any) => { this.value = e.target.value; this.dispatchEvent(new CustomEvent('change', { detail: this.value })); }}" />
          </div>
          <input 
            type="text"
            .value="${this.value}"
            @input="${(e: any) => { this.value = e.target.value; this.dispatchEvent(new CustomEvent('change', { detail: this.value })); }}"
          />
        </div>
      </div>
    `;
  }
}
