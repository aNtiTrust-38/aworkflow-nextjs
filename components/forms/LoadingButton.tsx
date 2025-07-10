import React from 'react';
import { CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface LoadingButtonProps {
  children: React.ReactNode;
  loading?: boolean;
  success?: boolean;
  error?: boolean;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onClick?: () => void;
  loadingText?: string;
  successText?: string;
  errorText?: string;
}

export function LoadingButton({
  children,
  loading = false,
  success = false,
  error = false,
  disabled = false,
  type = 'button',
  variant = 'primary',
  size = 'md',
  className = '',
  onClick,
  loadingText = 'Loading...',
  successText = 'Success!',
  errorText = 'Error'
}: LoadingButtonProps) {
  const getVariantClasses = () => {
    switch (variant) {
      case 'primary':
        return `
          bg-blue-600 text-white border-blue-600
          hover:bg-blue-700 hover:border-blue-700
          focus:ring-blue-500
          disabled:bg-blue-300 disabled:border-blue-300
        `;
      case 'secondary':
        return `
          bg-white text-gray-700 border-gray-300
          hover:bg-gray-50 hover:border-gray-400
          focus:ring-blue-500
          disabled:bg-gray-100 disabled:text-gray-400
        `;
      case 'danger':
        return `
          bg-red-600 text-white border-red-600
          hover:bg-red-700 hover:border-red-700
          focus:ring-red-500
          disabled:bg-red-300 disabled:border-red-300
        `;
      default:
        return getVariantClasses(); // Default to primary
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'px-3 py-1.5 text-sm';
      case 'md':
        return 'px-4 py-2 text-sm';
      case 'lg':
        return 'px-6 py-3 text-base';
      default:
        return getSizeClasses(); // Default to md
    }
  };

  const getStateClasses = () => {
    if (success) {
      return 'bg-green-600 text-white border-green-600 hover:bg-green-700';
    }
    if (error) {
      return 'bg-red-600 text-white border-red-600 hover:bg-red-700';
    }
    return '';
  };

  const getContent = () => {
    if (loading) {
      return (
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          {loadingText}
        </div>
      );
    }
    
    if (success) {
      return (
        <div className="flex items-center gap-2">
          <CheckIcon className="h-4 w-4" />
          {successText}
        </div>
      );
    }
    
    if (error) {
      return (
        <div className="flex items-center gap-2">
          <XMarkIcon className="h-4 w-4" />
          {errorText}
        </div>
      );
    }
    
    return children;
  };

  const buttonClasses = `
    inline-flex items-center justify-center font-medium rounded-md border
    focus:outline-none focus:ring-2 focus:ring-offset-2
    disabled:cursor-not-allowed disabled:opacity-60
    transition-all duration-200
    ${getSizeClasses()}
    ${getStateClasses() || getVariantClasses()}
    ${className}
  `.trim();

  return (
    <button
      type={type}
      className={buttonClasses}
      disabled={disabled || loading}
      onClick={onClick}
      aria-label={
        loading 
          ? loadingText 
          : success 
            ? successText 
            : error 
              ? errorText 
              : undefined
      }
    >
      {getContent()}
    </button>
  );
}