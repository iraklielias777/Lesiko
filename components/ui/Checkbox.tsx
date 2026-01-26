import React from 'react';
import { Check } from 'lucide-react';

interface CheckboxProps {
  label?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export const Checkbox: React.FC<CheckboxProps> = ({ label, checked, onChange, disabled }) => {
  return (
    <label className={`flex items-start gap-3 cursor-pointer group ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
      <div 
        className={`w-5 h-5 rounded border flex items-center justify-center transition-colors flex-shrink-0 mt-0.5
          ${checked 
            ? 'bg-brand-green border-brand-green' 
            : 'border-gray-300 bg-white group-hover:border-brand-green'
          }`}
      >
        {checked && <Check className="w-3.5 h-3.5 text-white" />}
        {/* Hidden input for accessibility */}
        <input 
          type="checkbox" 
          className="sr-only"
          checked={checked}
          onChange={(e) => !disabled && onChange(e.target.checked)}
          disabled={disabled}
        />
      </div>
      {label && (
        <span className={`text-sm select-none ${checked ? 'text-gray-900 font-medium' : 'text-gray-600 group-hover:text-gray-900'}`}>
          {label}
        </span>
      )}
    </label>
  );
};