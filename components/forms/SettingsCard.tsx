import React from 'react';
import { CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface SettingsCardProps {
  title: string;
  description?: string;
  configured: boolean;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function SettingsCard({
  title,
  description,
  configured,
  required = false,
  children,
  className = ''
}: SettingsCardProps) {
  const getStatusIcon = () => {
    if (configured) {
      return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
    } else if (required) {
      return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />;
    }
    return null;
  };

  const getStatusText = () => {
    if (configured) return 'Configured';
    if (required) return 'Required';
    return 'Optional';
  };

  const getStatusClasses = () => {
    if (configured) return 'text-green-700 bg-green-50';
    if (required) return 'text-yellow-700 bg-yellow-50';
    return 'text-gray-700 bg-gray-50';
  };

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">
              {title}
              {required && <span className="text-red-500 ml-1">*</span>}
            </h3>
            {description && (
              <p className="mt-1 text-sm text-gray-600">{description}</p>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <span className={`
              inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
              ${getStatusClasses()}
            `}>
              {getStatusText()}
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-4">
        {children}
      </div>

      {/* Footer for required but not configured */}
      {required && !configured && (
        <div className="px-6 py-3 bg-yellow-50 border-t border-yellow-200 rounded-b-lg">
          <div className="flex items-center gap-2 text-sm text-yellow-800">
            <ExclamationTriangleIcon className="h-4 w-4" />
            This configuration is required for the application to function properly.
          </div>
        </div>
      )}
    </div>
  );
}