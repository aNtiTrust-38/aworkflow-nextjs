import React from 'react';

interface LoadingSpinnerProps {
  message?: string;
  estimatedTime?: number;
  progress?: number; // 0-100
  fallbackProgress?: number; // fallback if progress is 0 or undefined
  cancellable?: boolean;
  onCancel?: () => void;
  visible?: boolean;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = 'Loading...',
  estimatedTime,
  progress,
  fallbackProgress,
  cancellable = false,
  onCancel,
  visible = true,
}) => {
  // Respect prefers-reduced-motion
  let prefersReducedMotion = false;
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    try {
      prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch {}
  }

  // Use fallbackProgress if progress is 0 or undefined
  const displayProgress = (typeof progress === 'number' && progress > 0)
    ? progress
    : (typeof fallbackProgress === 'number' ? fallbackProgress : 0);

  return (
    <div data-testid="loading-indicator" className={`academic-spinner motion-reduce:animate-none${visible === false ? ' hidden' : ''}`} role="status" aria-live="polite">
      <span className="sr-only">Loading...</span>
      <div className="text-center">
        <div className="mb-2">{message}</div>
        {typeof estimatedTime === 'number' && (
          <div data-testid="estimated-time" className="text-sm text-gray-500 mb-3">
            Estimated time: {estimatedTime} seconds
          </div>
        )}
        {displayProgress > 0 && (
          <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${displayProgress}%`, transition: prefersReducedMotion ? 'none' : undefined }}
              data-testid="loading-progress-percentage"
            />
          </div>
        )}
        <svg
          className={`h-6 w-6 text-academic-primary mx-auto${prefersReducedMotion ? '' : ' animate-spin'}`}
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
        </svg>
        {cancellable && (
          <button
            type="button"
            className="mt-4 px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
            onClick={onCancel}
            aria-label="Cancel loading"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
};

export default LoadingSpinner; 