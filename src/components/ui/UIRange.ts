import { html, css, LitElement } from 'lit';
import { Component, property, query } from '../../litcomponents';

@Component('ui-range')
export class UIRange extends LitElement {
  @property({ type: String }) label = '';
  @property({ type: Number }) value = 0;
  @property({ type: Number }) min = 0;
  @property({ type: Number }) max = 100;
  @property({ type: String }) unit = '';
  @property({ type: Number }) step = 1;
  
  @query('.value-display') private _valueDisplay?: HTMLSpanElement;
  @query('input') private _input!: HTMLInputElement;

  // Use plain property instead of @state() to avoid re-renders on drag
  private _dragging = false;

  static styles = css`
    :host {
      display: block;
      margin-bottom: 1.5rem;
      --track-height: 0.3rem;
      --thumb-size: 1.1rem;
      --primary: var(--color-primary, #a970ff);
      --primary-glow: rgba(169, 112, 255, 0.25);
      --track-bg: rgba(255, 255, 255, 0.08);
      --track-fill: var(--primary);
    }

    .wrapper {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
    }

    label {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--color-text-secondary, #9ca3af);
      text-transform: uppercase;
      letter-spacing: 0.06em;
      user-select: none;
    }

    .value-display {
      font-variant-numeric: tabular-nums;
      font-size: 0.8125rem;
      font-weight: 700;
      color: var(--primary);
      background: var(--primary-glow);
      padding: 0.125rem 0.5rem;
      border-radius: 0.3rem;
      border: 1px solid rgba(169, 112, 255, 0.2);
      min-width: 2.5rem;
      text-align: center;
      transition: background 0.15s, box-shadow 0.15s;
    }

    :host([dragging]) .value-display,
    .value-display.active {
      background: rgba(169, 112, 255, 0.2);
      box-shadow: 0 0 0 2px rgba(169, 112, 255, 0.15);
    }

    .slider-container {
      position: relative;
      display: flex;
      align-items: center;
      height: calc(var(--thumb-size) + 0.5rem);
    }

    input[type="range"] {
      -webkit-appearance: none;
      appearance: none;
      width: 100%;
      height: var(--track-height);
      border-radius: 9999px;
      background: var(--track-bg);
      cursor: pointer;
      margin: 0;
      /* Fill via background gradient, updated dynamically */
      background-image: linear-gradient(
        to right,
        var(--track-fill) 0%,
        var(--track-fill) var(--fill-pct, 0%),
        var(--track-bg) var(--fill-pct, 0%),
        var(--track-bg) 100%
      );
      outline: none;
      transition: background-image 0s; /* instant fill update */
    }

    /* Webkit thumb */
    input[type="range"]::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: var(--thumb-size);
      height: var(--thumb-size);
      border-radius: 50%;
      background: #fff;
      border: 2.5px solid var(--primary);
      cursor: grab;
      box-shadow:
        0 1px 4px rgba(0, 0, 0, 0.4),
        0 0 0 0px var(--primary-glow);
      transition:
        transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1),
        box-shadow 0.15s ease;
    }

    input[type="range"]:hover::-webkit-slider-thumb {
      transform: scale(1.12);
      box-shadow:
        0 2px 6px rgba(0, 0, 0, 0.5),
        0 0 0 5px var(--primary-glow);
    }

    input[type="range"]:active::-webkit-slider-thumb {
      cursor: grabbing;
      transform: scale(1.2);
      box-shadow:
        0 3px 10px rgba(0, 0, 0, 0.5),
        0 0 0 7px var(--primary-glow);
    }

    input[type="range"]:focus-visible::-webkit-slider-thumb {
      box-shadow:
        0 2px 6px rgba(0, 0, 0, 0.5),
        0 0 0 6px var(--primary-glow);
    }

    /* Firefox thumb */
    input[type="range"]::-moz-range-thumb {
      width: var(--thumb-size);
      height: var(--thumb-size);
      border-radius: 50%;
      background: #fff;
      border: 2.5px solid var(--primary);
      cursor: grab;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.4);
      transition: transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.15s;
    }

    input[type="range"]:hover::-moz-range-thumb {
      transform: scale(1.12);
      box-shadow: 0 0 0 5px var(--primary-glow);
    }

    input[type="range"]:active::-moz-range-thumb {
      cursor: grabbing;
      transform: scale(1.2);
    }

    /* Firefox track */
    input[type="range"]::-moz-range-track {
      height: var(--track-height);
      background: var(--track-bg);
      border-radius: 9999px;
    }

    input[type="range"]::-moz-range-progress {
      height: var(--track-height);
      background: var(--track-fill);
      border-radius: 9999px;
    }

    /* Min/max labels */
    .ticks {
      display: flex;
      justify-content: space-between;
      padding: 0 calc(var(--thumb-size) / 2);
    }

    .tick-label {
      font-size: 0.625rem;
      color: var(--color-text-secondary, #6b7280);
      opacity: 0.6;
      font-variant-numeric: tabular-nums;
    }
  `;

  /**
   * Calculate fill percentage - used for initial render only
   */
  private get _fillPct(): number {
    return ((this.value - this.min) / (this.max - this.min)) * 100;
  }

  /**
   * Handle input changes - update display directly without re-rendering
   */
  private _handleInput(e: Event) {
    const input = e.target as HTMLInputElement;
    const newValue = Number(input.value);
    
    // Update fill percentage via CSS variable directly (no re-render)
    this._updateFill(input);
    
    // Update value display directly via DOM (no re-render)
    this._updateDisplay(newValue);
    
    // Update ARIA value
    input.setAttribute('aria-valuenow', String(newValue));
    
    // Dispatch change event for parent components
    this.dispatchEvent(
      new CustomEvent('change', {
        detail: newValue,
        bubbles: true,
        composed: true,
      })
    );
  }

  /**
   * Update fill percentage CSS variable directly
   */
  private _updateFill(input: HTMLInputElement) {
    const pct = ((Number(input.value) - this.min) / (this.max - this.min)) * 100;
    input.style.setProperty('--fill-pct', `${pct}%`);
  }

  /**
   * Update value display text directly without re-rendering component
   */
  private _updateDisplay(value: number) {
    if (this._valueDisplay) {
      this._valueDisplay.textContent = this.unit ? `${value}${this.unit}` : `${value}`;
    }
  }

  private _handleMousedown() {
    this._dragging = true;
    this.setAttribute('dragging', '');
    // Direct DOM manipulation - no re-render
    if (this._valueDisplay) {
      this._valueDisplay.classList.add('active');
    }
  }

  private _handleMouseup() {
    this._dragging = false;
    this.removeAttribute('dragging');
    // Direct DOM manipulation - no re-render
    if (this._valueDisplay) {
      this._valueDisplay.classList.remove('active');
    }
  }

  protected firstUpdated() {
    if (this._input) {
      // Initialize fill percentage
      this._updateFill(this._input);
      // Initialize display value
      this._updateDisplay(this.value);
    }
  }

  render() {
    return html`
      <div class="wrapper">
        <div class="header">
          <label for="range-input">${this.label}</label>
          <span class="value-display"></span>
        </div>
        <div class="slider-container">
          <input
            id="range-input"
            type="range"
            min="${this.min}"
            max="${this.max}"
            step="${this.step}"
            .value="${String(this.value)}"
            style="--fill-pct: ${this._fillPct}%"
            @input="${this._handleInput}"
            @mousedown="${this._handleMousedown}"
            @mouseup="${this._handleMouseup}"
            @touchstart="${this._handleMousedown}"
            @touchend="${this._handleMouseup}"
            aria-label="${this.label}"
            aria-valuemin="${this.min}"
            aria-valuemax="${this.max}"
            aria-valuenow="${this.value}"
          />
        </div>
        <div class="ticks">
          <span class="tick-label">${this.min}${this.unit}</span>
          <span class="tick-label">${this.max}${this.unit}</span>
        </div>
      </div>
    `;
  }
}