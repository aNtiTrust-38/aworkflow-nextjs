import React, { useState } from 'react';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

export interface FormFieldProps {
  id: string;
  label: string;
  type?: 'text' | 'password' | 'number' | 'url' | 'email';
  value: string | number;
  onChange: (value: string | number) => void;
  onBlur?: () => void;
  placeholder?: string;
  helpText?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  autoComplete?: string;
  className?: string;
  showTogglePassword?: boolean;
}

export function FormField({
  id,
  label,
  type = 'text',
  value,
  onChange,
  onBlur,
  placeholder,
  helpText,
  error,
  required = false,
  disabled = false,
  autoComplete,
  className = '',
  showTogglePassword = true
}: FormFieldProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const inputType = type === 'password' && showPassword ? 'text' : type;
  const isPasswordField = type === 'password';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value;
    onChange(newValue);
  };

  const fieldClasses = `
    block w-full px-3 py-2 border rounded-md shadow-sm text-sm
    placeholder-gray-400
    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
    disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
    ${error 
      ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
      : 'border-gray-300'
    }
    ${isPasswordField ? 'pr-10' : ''}
    ${className}
  `.trim();

  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      
      <div className="relative">
        <input
          id={id}
          name={id}
          type={inputType}
          value={value}
          onChange={handleChange}
          onBlur={() => {
            setIsFocused(false);
            onBlur?.();
          }}
          onFocus={() => setIsFocused(true)}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          autoComplete={autoComplete}
          className={fieldClasses}
          aria-describedby={
            error ? `${id}-error` : helpText ? `${id}-help` : undefined
          }
          aria-invalid={!!error}
        />
        
        {isPasswordField && showTogglePassword && (
          <button
            type="button"
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
            onClick={() => setShowPassword(!showPassword)}
            tabIndex={-1}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? (
              <EyeSlashIcon className="h-4 w-4" />
            ) : (
              <EyeIcon className="h-4 w-4" />
            )}
          </button>
        )}
      </div>

      {helpText && !error && (
        <p id={`${id}-help`} className="text-xs text-gray-500">
          {helpText}
        </p>
      )}

      {error && (
        <p id={`${id}-error`} className="text-xs text-red-600" role="alert">
          {error}
        </p>
      )}

      {/* Focus indicator for accessibility */}
      {isFocused && (
        <div className="sr-only" aria-live="polite">
          {`Editing ${label}`}
        </div>
      )}
    </div>
  );
}