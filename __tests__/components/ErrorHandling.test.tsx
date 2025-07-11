import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import ErrorBoundary from '../../components/ErrorBoundary';
import ErrorMessage from '../../components/ErrorMessage';

// Mock console.error to prevent noise in tests
const originalConsoleError = console.error;
beforeEach(() => {
  console.error = vi.fn();
});

afterEach(() => {
  console.error = originalConsoleError;
  cleanup();
});

// Component that throws an error for testing
const ThrowError: React.FC<{ shouldThrow: boolean; message?: string }> = ({ shouldThrow, message = 'Test error' }) => {
  if (shouldThrow) {
    throw new Error(message);
  }
  return <div>No error</div>;
};

describe('ErrorBoundary', () => {
  beforeEach(() => {
    cleanup();
  });

  afterEach(() => {
    cleanup();
  });

  describe('Error Catching', () => {
    it('should catch and display errors', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} message="Test error message" />
        </ErrorBoundary>
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByText('Test error message')).toBeInTheDocument();
    });

    it('should render children when no error occurs', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(screen.getByText('No error')).toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('should display default error message when error has no message', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} message="" />
        </ErrorBoundary>
      );

      expect(screen.getByText('An unexpected error occurred.')).toBeInTheDocument();
    });
  });

  describe('Error Recovery', () => {
    it('should reset error state when reset button is clicked', () => {
      const { rerender } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} message="Test error" />
        </ErrorBoundary>
      );

      // Error should be displayed
      expect(screen.getByRole('alert')).toBeInTheDocument();

      // Click reset button
      fireEvent.click(screen.getByText('Reset'));

      // Re-render with no error
      rerender(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      // Should show normal content
      expect(screen.getByText('No error')).toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('should call onReset callback when reset button is clicked', () => {
      const onReset = vi.fn();

      render(
        <ErrorBoundary onReset={onReset}>
          <ThrowError shouldThrow={true} message="Test error" />
        </ErrorBoundary>
      );

      fireEvent.click(screen.getByText('Reset'));

      expect(onReset).toHaveBeenCalledTimes(1);
    });
  });

  describe('Custom Fallback', () => {
    it('should render custom fallback when provided', () => {
      const customFallback = <div>Custom error fallback</div>;

      render(
        <ErrorBoundary fallback={customFallback}>
          <ThrowError shouldThrow={true} message="Test error" />
        </ErrorBoundary>
      );

      expect(screen.getByText('Custom error fallback')).toBeInTheDocument();
      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
    });
  });

  describe('Error Logging', () => {
    it('should log errors to console in non-test environment', () => {
      const originalNodeEnv = process.env.NODE_ENV;
      // Use Object.defineProperty to override readonly property
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'development',
        writable: true,
        configurable: true
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} message="Test error" />
        </ErrorBoundary>
      );

      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
      // Restore original value
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: originalNodeEnv,
        writable: true,
        configurable: true
      });
    });

    it('should not log errors in test environment', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} message="Test error" />
        </ErrorBoundary>
      );

      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });
});

describe('ErrorMessage', () => {
  beforeEach(() => {
    cleanup();
  });

  afterEach(() => {
    cleanup();
  });

  describe('Basic Rendering', () => {
    it('should render error message', () => {
      render(<ErrorMessage message="Test error message" />);

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Test error message')).toBeInTheDocument();
    });

    it('should render error details when provided', () => {
      render(
        <ErrorMessage 
          message="Test error message" 
          details="Detailed error information"
        />
      );

      expect(screen.getByText('Test error message')).toBeInTheDocument();
      expect(screen.getByText('Detailed error information')).toBeInTheDocument();
    });

    it('should render JSX details when provided', () => {
      const details = <span>JSX <strong>details</strong></span>;
      
      render(
        <ErrorMessage 
          message="Test error message" 
          details={details}
        />
      );

      expect(screen.getByText('Test error message')).toBeInTheDocument();
      expect(screen.getByText('JSX')).toBeInTheDocument();
      expect(screen.getByText('details')).toBeInTheDocument();
    });
  });

  describe('Actions', () => {
    it('should render action buttons when provided', () => {
      const actions = [
        { label: 'Retry', onClick: vi.fn(), variant: 'primary' as const },
        { label: 'Cancel', onClick: vi.fn(), variant: 'secondary' as const }
      ];

      render(
        <ErrorMessage 
          message="Test error message"
          actions={actions}
        />
      );

      expect(screen.getByText('Retry')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('should call action onClick handlers', () => {
      const retryHandler = vi.fn();
      const cancelHandler = vi.fn();

      const actions = [
        { label: 'Retry', onClick: retryHandler, variant: 'primary' as const },
        { label: 'Cancel', onClick: cancelHandler, variant: 'secondary' as const }
      ];

      render(
        <ErrorMessage 
          message="Test error message"
          actions={actions}
        />
      );

      fireEvent.click(screen.getByText('Retry'));
      fireEvent.click(screen.getByText('Cancel'));

      expect(retryHandler).toHaveBeenCalledTimes(1);
      expect(cancelHandler).toHaveBeenCalledTimes(1);
    });

    it('should apply correct CSS classes for different action variants', () => {
      const actions = [
        { label: 'Danger', onClick: vi.fn(), variant: 'danger' as const },
        { label: 'Primary', onClick: vi.fn(), variant: 'primary' as const },
        { label: 'Secondary', onClick: vi.fn(), variant: 'secondary' as const }
      ];

      render(
        <ErrorMessage 
          message="Test error message"
          actions={actions}
        />
      );

      const dangerButton = screen.getByText('Danger');
      const primaryButton = screen.getByText('Primary');
      const secondaryButton = screen.getByText('Secondary');

      expect(dangerButton).toHaveClass('bg-red-600');
      expect(primaryButton).toHaveClass('bg-blue-600');
      expect(secondaryButton).toHaveClass('bg-gray-300');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<ErrorMessage message="Test error message" />);

      const alert = screen.getByRole('alert');
      expect(alert).toHaveAttribute('aria-live', 'assertive');
      expect(alert).toHaveAttribute('data-testid', 'error-alert');
    });

    it('should have proper focus management for action buttons', () => {
      const actions = [
        { label: 'Retry', onClick: vi.fn(), variant: 'primary' as const }
      ];

      render(
        <ErrorMessage 
          message="Test error message"
          actions={actions}
        />
      );

      const button = screen.getByText('Retry');
      expect(button).toHaveClass('focus:outline-none', 'focus:ring-2');
    });
  });
});

describe('Error Handling Integration', () => {
  beforeEach(() => {
    cleanup();
  });

  afterEach(() => {
    cleanup();
  });

  describe('API Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      // Mock fetch to simulate network error
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      // Component that makes API call
      const ApiComponent: React.FC = () => {
        const [error, setError] = React.useState<string | null>(null);

        React.useEffect(() => {
          fetch('/api/test')
            .then(res => res.json())
            .catch(err => setError(err.message));
        }, []);

        if (error) {
          return <ErrorMessage message="API Error" details={error} />;
        }

        return <div>Loading...</div>;
      };

      render(<ApiComponent />);

      await waitFor(() => {
        expect(screen.getByText('API Error')).toBeInTheDocument();
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });

    it('should handle HTTP error responses', async () => {
      // Mock fetch to simulate HTTP error
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Internal server error' })
      });

      // Component that makes API call
      const ApiComponent: React.FC = () => {
        const [error, setError] = React.useState<string | null>(null);

        React.useEffect(() => {
          fetch('/api/test')
            .then(res => {
              if (!res.ok) {
                return res.json().then(data => {
                  throw new Error(data.error || 'HTTP error');
                });
              }
              return res.json();
            })
            .catch(err => setError(err.message));
        }, []);

        if (error) {
          return <ErrorMessage message="HTTP Error" details={error} />;
        }

        return <div>Loading...</div>;
      };

      render(<ApiComponent />);

      await waitFor(() => {
        expect(screen.getByText('HTTP Error')).toBeInTheDocument();
        expect(screen.getByText('Internal server error')).toBeInTheDocument();
      });
    });
  });

  describe('Component Error Recovery', () => {
    it('should allow error recovery with retry functionality', async () => {
      let shouldError = true;
      const mockFetch = vi.fn();

      // Mock fetch to fail first, then succeed
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: 'success' })
        });

      global.fetch = mockFetch;

      const RetryComponent: React.FC = () => {
        const [error, setError] = React.useState<string | null>(null);
        const [data, setData] = React.useState<string | null>(null);

        const fetchData = async () => {
          try {
            setError(null);
            const res = await fetch('/api/test');
            const result = await res.json();
            setData(result.data);
          } catch (err: any) {
            setError(err.message);
          }
        };

        React.useEffect(() => {
          fetchData();
        }, []);

        if (error) {
          return (
            <ErrorMessage 
              message="Failed to load data" 
              details={error}
              actions={[
                { label: 'Retry', onClick: fetchData, variant: 'primary' }
              ]}
            />
          );
        }

        if (data) {
          return <div>Data loaded: {data}</div>;
        }

        return <div>Loading...</div>;
      };

      render(<RetryComponent />);

      // Should show error first
      await waitFor(() => {
        expect(screen.getByText('Failed to load data')).toBeInTheDocument();
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });

      // Click retry
      fireEvent.click(screen.getByText('Retry'));

      // Should show success after retry
      await waitFor(() => {
        expect(screen.getByText('Data loaded: success')).toBeInTheDocument();
      });

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error Boundary with ErrorMessage Integration', () => {
    it('should work together for comprehensive error handling', () => {
      const ErrorProneComponent: React.FC = () => {
        const [shouldThrow, setShouldThrow] = React.useState(false);

        if (shouldThrow) {
          throw new Error('Component error');
        }

        return (
          <div>
            <button onClick={() => setShouldThrow(true)}>
              Trigger Error
            </button>
            <ErrorMessage 
              message="Warning message" 
              details="This is a warning, not an error"
            />
          </div>
        );
      };

      const onReset = vi.fn();

      render(
        <ErrorBoundary onReset={onReset}>
          <ErrorProneComponent />
        </ErrorBoundary>
      );

      // Should show normal content initially
      expect(screen.getByText('Trigger Error')).toBeInTheDocument();
      expect(screen.getByText('Warning message')).toBeInTheDocument();

      // Trigger error
      fireEvent.click(screen.getByText('Trigger Error'));

      // Should show error boundary
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByText('Component error')).toBeInTheDocument();

      // Reset should work
      fireEvent.click(screen.getByText('Reset'));
      expect(onReset).toHaveBeenCalledTimes(1);
    });
  });
}); 