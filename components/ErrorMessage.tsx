import React from 'react';

interface ErrorAction {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
}

interface ErrorMessageProps {
  message: string;
  details?: React.ReactNode;
  actions?: ErrorAction[];
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({ message, details, actions }) => (
  <div role="alert" className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 academic-error" data-testid="error-alert" aria-live="assertive">
    <div className="flex items-start">
      <svg className="w-5 h-5 text-red-500 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
      </svg>
      <div className="flex-1">
        <h3 className="text-red-800 font-medium mb-2">{message}</h3>
        {details && <p className="text-red-700 mb-4">{details}</p>}
        {actions && actions.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {actions.map((action, idx) => (
              <button
                key={idx}
                onClick={action.onClick}
                className={`px-4 py-2 rounded focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  action.variant === 'danger'
                    ? 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500'
                    : action.variant === 'primary'
                    ? 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500'
                    : 'bg-gray-300 text-gray-700 hover:bg-gray-400 focus:ring-gray-500'
                }`}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  </div>
);

export default ErrorMessage; 