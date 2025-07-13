import React from 'react';

interface LoadingSpinnerProps {
  message?: string;
  estimatedTime?: number;
  progress?: number; // 0-100
  fallbackProgress?: number; // fallback if progress is 0 or undefined
  cancellable?: boolean;
  onCancel?: () => void;
  visible?: boolean;
  stepIcon?: string;
  stepTitle?: string;
  substeps?: string[];
  currentSubstep?: number;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = 'Loading...',
  estimatedTime,
  progress,
  fallbackProgress,
  cancellable = false,
  onCancel,
  visible = true,
  stepIcon,
  stepTitle,
  substeps = [],
  currentSubstep = 0,
}) => {
  // Respect prefers-reduced-motion
  let prefersReducedMotion = false;
  try {
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
  } catch {
    // Gracefully handle any window/matchMedia errors
  }

  // Use fallbackProgress if progress is 0 or undefined
  const displayProgress = (typeof progress === 'number' && progress > 0)
    ? progress
    : (typeof fallbackProgress === 'number' ? fallbackProgress : 0);

  return (
    <div 
      data-testid="loading-indicator" 
      className={`bg-white rounded-lg shadow-sm border p-6 motion-reduce:animate-none${visible === false ? ' hidden' : ''}`} 
      role="status" 
      aria-live="polite"
    >
      <span className="sr-only">Loading...</span>
      
      {/* Enhanced Loading Header */}
      <div className="flex items-center justify-center mb-4">
        {stepIcon && (
          <span className="text-3xl mr-3">{stepIcon}</span>
        )}
        <div className="text-center">
          {stepTitle && (
            <h3 className="text-lg font-semibold text-gray-900 mb-1">{stepTitle}</h3>
          )}
          <p className="text-gray-600">{message}</p>
        </div>
      </div>

      {/* Progress Indicators */}
      {displayProgress > 0 && (
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600">Progress</span>
            <span className="text-sm font-medium text-gray-900">{Math.round(displayProgress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${displayProgress}%`, transition: prefersReducedMotion ? 'none' : undefined }}
              data-testid="loading-progress-percentage"
            />
          </div>
        </div>
      )}

      {/* Substeps */}
      {substeps.length > 0 && (
        <div className="mb-4">
          <div className="space-y-2">
            {substeps.map((substep, index) => (
              <div 
                key={index} 
                className={`flex items-center space-x-2 text-sm ${
                  index < currentSubstep 
                    ? 'text-green-600' 
                    : index === currentSubstep 
                      ? 'text-blue-600 font-medium' 
                      : 'text-gray-400'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${
                  index < currentSubstep 
                    ? 'bg-green-500' 
                    : index === currentSubstep 
                      ? 'bg-blue-500 animate-pulse' 
                      : 'bg-gray-300'
                }`} />
                <span>{substep}</span>
                {index < currentSubstep && <span className="text-green-500">✓</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Time Estimate */}
      {typeof estimatedTime === 'number' && (
        <div data-testid="estimated-time" className="text-center text-sm text-gray-500 mb-4">
          <span className="inline-flex items-center space-x-1">
            <span>⏱️</span>
            <span>Estimated time: {estimatedTime} seconds</span>
          </span>
        </div>
      )}

      {/* Spinner */}
      <div className="flex justify-center mb-4">
        <svg
          className={`h-8 w-8 text-blue-600${prefersReducedMotion ? '' : ' animate-spin'}`}
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
        </svg>
      </div>

      {/* Cancel Button */}
      {cancellable && (
        <div className="text-center">
          <button
            type="button"
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
            onClick={onCancel}
            aria-label="Cancel loading"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
};

export default LoadingSpinner; 