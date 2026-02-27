import { html, css, LitElement } from 'lit';
import { Component, property } from '../../litcomponents';

@Component('ui-range')
export class UIRange extends LitElement {
  @property({ type: String }) label = '';
  @property({ type: Number }) value = 0;
  @property({ type: Number }) min = 0;
  @property({ type: Number }) max = 100;

  static styles = css`
    :host {
      display: block;
      margin-bottom: 1.25rem;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
    }
    label {
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--color-text-secondary, #9ca3af);
      text-transform: uppercase;
      letter-spacing: 0.025em;
    }
    .value-display {
      font-variant-numeric: tabular-nums;
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--color-primary, #a970ff);
      background: rgba(169, 112, 255, 0.1);
      padding: 0.125rem 0.375rem;
      border-radius: 0.25rem;
    }
    .slider-container {
      position: relative;
      display: flex;
      align-items: center;
    }
    input[type=range] {
      -webkit-appearance: none;
      width: 100%;
      background: transparent;
      margin: 0;
    }
    input[type=range]:focus {
      outline: none;
    }
    input[type=range]::-webkit-slider-runnable-track {
      width: 100%;
      height: 0.375rem;
      cursor: pointer;
      background: rgba(255,255,255,0.1);
      border-radius: 1rem;
    }
    input[type=range]::-webkit-slider-thumb {
      height: 1.125rem;
      width: 1.125rem;
      border-radius: 50%;
      background: var(--color-primary, #a970ff);
      cursor: pointer;
      -webkit-appearance: none;
      margin-top: -0.375rem;
      box-shadow: 0 1px 3px rgba(0,0,0,0.5);
      transition: transform 0.1s cubic-bezier(0.4, 0, 0.2, 1);
    }
    input[type=range]:focus::-webkit-slider-thumb {
      transform: scale(1.15);
      box-shadow: 0 0 0 4px rgba(169, 112, 255, 0.2);
    }
  `;

  render() {
    return html`
      <div>
        <div class="header">
          <label>${this.label}</label>
          <span class="value-display">${this.value}</span>
        </div>
        <div class="slider-container">
          <input 
            type="range"
            .min="${this.min}"
            .max="${this.max}"
            .value="${this.value}"
            @input="${(e: any) => { this.value = Number(e.target.value); this.dispatchEvent(new CustomEvent('change', { detail: this.value })); }}"
          />
        </div>
      </div>
    `;
  }
}
