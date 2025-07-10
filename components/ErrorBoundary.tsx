import React from 'react';

interface ErrorBoundaryProps {
  fallback?: React.ReactNode;
  onReset?: () => void;
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error if needed
    if (process.env.NODE_ENV !== 'test') {
      // eslint-disable-next-line no-console
      console.error('ErrorBoundary caught:', error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div role="alert" className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <h3 className="text-red-800 font-medium mb-2">Something went wrong</h3>
          <p className="text-red-700 mb-4">{this.state.error?.message || 'An unexpected error occurred.'}</p>
          <button onClick={this.handleReset} className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500">Reset</button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary; 