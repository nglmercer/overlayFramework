import React from 'react';

type InputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'className'> & {
  label: string;
  className?: string;
};

export function Input({ label, className = '', ...props }: InputProps) {
  return (
    <div className={className}>
      <label className="block text-xs font-semibold text-gray-300 mb-1.5">{label}</label>
      <input 
        className="w-full bg-[#0e0e10] border border-white/10 rounded p-2 text-sm focus:outline-none focus:border-[#a970ff] transition-colors" 
        {...props} 
      />
    </div>
  );
}

type SelectProps = Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'className'> & {
  label?: string;
  options: { value: string; label: string }[];
  className?: string;
};

export function Select({ label, options, className = '', ...props }: SelectProps) {
  return (
    <div className={className}>
      {label && <label className="block text-xs font-semibold text-gray-300 mb-1.5">{label}</label>}
      <select 
        className="w-full bg-[#0e0e10] border border-white/10 rounded p-2 text-sm focus:outline-none focus:border-[#a970ff] transition-colors appearance-none"
        {...props}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}

interface ToggleProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
}

export function Toggle({ label, checked, onChange, className = '' }: ToggleProps) {
  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      <div 
        onClick={() => onChange(!checked)}
        className={`w-8 h-4 rounded-full relative cursor-pointer transition-colors ${checked ? 'bg-[#9146FF]' : 'bg-gray-600'}`}
      >
        <div className={`w-3 h-3 bg-white rounded-full absolute top-0.5 transition-transform ${checked ? 'right-0.5' : 'left-0.5'}`}></div>
      </div>
      <span className="text-sm font-semibold text-gray-300">{label}</span>
    </div>
  );
}

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function ColorPicker({ label, value, onChange, className = '' }: ColorPickerProps) {
  return (
    <div className={className}>
      <label className="block text-xs font-semibold text-gray-300 mb-1.5">{label}</label>
      <div className="flex space-x-2">
        <div 
          className="w-8 h-8 rounded border border-white/10" 
          style={{ backgroundColor: value || 'transparent' }}
        ></div>
        <input 
          type="text" 
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 bg-[#0e0e10] border border-white/10 rounded px-2 text-sm focus:outline-none focus:border-[#a970ff] transition-colors uppercase" 
        />
      </div>
    </div>
  );
}

interface RangeProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  className?: string;
}

export function Range({ label, value, onChange, min = 0, max = 100, className = '' }: RangeProps) {
  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      <span className="text-xs font-semibold text-gray-300 w-16">{label}</span>
      <input 
        type="range" 
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 accent-[#a970ff]" 
      />
      <span className="text-xs font-semibold text-gray-300 w-8 text-right">{value}%</span>
    </div>
  );
}
