import { html, css, LitElement } from 'lit';
import { Component, property } from '../litcomponents';

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
      font-size: 0.75rem;
      font-weight: 600;
      color: #d1d5db;
      margin-bottom: 0.375rem;
    }
    input {
      width: 100%;
      background-color: #0e0e10;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 0.25rem;
      padding: 0.5rem;
      font-size: 0.875rem;
      color: white;
      transition: border-color 0.2s;
    }
    input:focus {
      outline: none;
      border-color: #a970ff;
    }
  `;

  render() {
    return html`
      <div>
        <label>${this.label}</label>
        <input 
          .type="${this.type}"
          .value="${this.value}"
          placeholder="${this.placeholder}"
          @input="${(e: any) => { this.value = e.target.value; this.dispatchEvent(new CustomEvent('change', { detail: this.value })); }}"
        />
      </div>
    `;
  }
}

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
      font-size: 0.75rem;
      font-weight: 600;
      color: #d1d5db;
      margin-bottom: 0.375rem;
    }
    select {
      width: 100%;
      background-color: #0e0e10;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 0.25rem;
      padding: 0.5rem;
      font-size: 0.875rem;
      color: white;
      appearance: none;
      transition: border-color 0.2s;
    }
    select:focus {
      outline: none;
      border-color: #a970ff;
    }
  `;

  render() {
    return html`
      <div>
        ${this.label ? html`<label>${this.label}</label>` : ''}
        <select 
          .value="${this.value}"
          @change="${(e: any) => { this.value = e.target.value; this.dispatchEvent(new CustomEvent('change', { detail: this.value })); }}"
        >
          ${this.options.map(opt => html`
            <option .value="${opt.value}" ?selected="${this.value === opt.value}">${opt.label}</option>
          `)}
        </select>
      </div>
    `;
  }
}

@Component('ui-toggle')
export class UIToggle extends LitElement {
  @property({ type: String }) label = '';
  @property({ type: Boolean }) checked = false;

  static styles = css`
    :host {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 1rem;
    }
    .toggle {
      width: 2rem;
      height: 1rem;
      border-radius: 1rem;
      position: relative;
      cursor: pointer;
      transition: background-color 0.2s;
    }
    .toggle.on { background-color: #9146FF; }
    .toggle.off { background-color: #4b5563; }
    
    .knob {
      width: 0.75rem;
      height: 0.75rem;
      background-color: white;
      border-radius: 50%;
      position: absolute;
      top: 0.125rem;
      transition: transform 0.2s;
    }
    .toggle.on .knob { transform: translateX(1.125rem); }
    .toggle.off .knob { transform: translateX(0.125rem); }
    
    span {
      font-size: 0.875rem;
      font-weight: 600;
      color: #d1d5db;
    }
  `;

  render() {
    return html`
      <div 
        class="toggle ${this.checked ? 'on' : 'off'}" 
        @click="${() => { this.checked = !this.checked; this.dispatchEvent(new CustomEvent('change', { detail: this.checked })); }}"
      >
        <div class="knob"></div>
      </div>
      <span>${this.label}</span>
    `;
  }
}

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
      font-size: 0.75rem;
      font-weight: 600;
      color: #d1d5db;
      margin-bottom: 0.375rem;
    }
    .container {
      display: flex;
      gap: 0.5rem;
    }
    .preview {
      width: 2rem;
      height: 2rem;
      border-radius: 0.25rem;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
    input {
      flex: 1;
      background-color: #0e0e10;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 0.25rem;
      padding: 0 0.5rem;
      font-size: 0.875rem;
      color: white;
      text-transform: uppercase;
    }
    input:focus {
      outline: none;
      border-color: #a970ff;
    }
  `;

  render() {
    return html`
      <div>
        <label>${this.label}</label>
        <div class="container">
          <div class="preview" style="background-color: ${this.value}"></div>
          <input 
            .value="${this.value}"
            @input="${(e: any) => { this.value = e.target.value; this.dispatchEvent(new CustomEvent('change', { detail: this.value })); }}"
          />
        </div>
      </div>
    `;
  }
}

@Component('ui-range')
export class UIRange extends LitElement {
  @property({ type: String }) label = '';
  @property({ type: Number }) value = 0;
  @property({ type: Number }) min = 0;
  @property({ type: Number }) max = 100;

  static styles = css`
    :host {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 1rem;
    }
    label {
      font-size: 0.75rem;
      font-weight: 600;
      color: #d1d5db;
      width: 4rem;
    }
    input {
      flex: 1;
      height: 0.25rem;
      background: #4b5563;
      border-radius: 0.25rem;
      appearance: none;
      accent-color: #a970ff;
    }
    .value {
      font-size: 0.75rem;
      font-weight: 600;
      color: #d1d5db;
      width: 2rem;
      text-align: right;
    }
  `;

  render() {
    return html`
      <label>${this.label}</label>
      <input 
        type="range"
        .min="${this.min}"
        .max="${this.max}"
        .value="${this.value}"
        @input="${(e: any) => { this.value = Number(e.target.value); this.dispatchEvent(new CustomEvent('change', { detail: this.value })); }}"
      />
      <span class="value">${this.value}%</span>
    `;
  }
}
