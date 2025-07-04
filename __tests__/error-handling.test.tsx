import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import WorkflowUI from '../src/app/WorkflowUI';

global.fetch = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe('Error Handling and Recovery', () => {
  it('should display user-friendly error messages for API failures', async () => {
    // Mock API error
    (global.fetch as any).mockRejectedValue(new Error('Network error'));
    
    // Set up error test flag
    (window as any).__TEST_ERROR__ = true;

    render(<WorkflowUI />);
    
    // Add prompt and trigger API call
    const promptInput = screen.getByLabelText(/assignment prompt/i);
    fireEvent.change(promptInput, { target: { value: 'Test prompt' } });
    fireEvent.click(screen.getByRole('button', { name: /go to next step/i }));
    
    // Should show error message
    await waitFor(() => {
      expect(screen.getByTestId('error-alert')).toBeInTheDocument();
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
      expect(screen.getByText(/failed to generate outline/i)).toBeInTheDocument();
    });
  });

  it('should provide retry functionality for failed operations', async () => {
    let callCount = 0;
    (global.fetch as any).mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.reject(new Error('API Error'));
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ outline: 'Success!' })
      });
    });
    
    // Set up error test flag
    (window as any).__TEST_ERROR__ = true;

    // Set up error test flag
    (window as any).__TEST_ERROR__ = true;
    
    render(<WorkflowUI />);
    
    // Trigger failure
    const promptInput = screen.getByLabelText(/assignment prompt/i);
    fireEvent.change(promptInput, { target: { value: 'Test prompt' } });
    fireEvent.click(screen.getByRole('button', { name: /go to next step/i }));
    
    // Wait for error
    await waitFor(() => {
      expect(screen.getByTestId('error-alert')).toBeInTheDocument();
    });
    
    // Click retry
    fireEvent.click(screen.getByText(/retry/i));
    
    // Should succeed on retry
    await waitFor(() => {
      expect(screen.queryByTestId('error-alert')).not.toBeInTheDocument();
      expect(screen.getByText(/success!/i)).toBeInTheDocument();
    });
    
    expect(callCount).toBe(2);
  });

  it('should offer reset workflow option after multiple failures', async () => {
    // Mock multiple failures
    (global.fetch as any).mockRejectedValue(new Error('Persistent error'));
    
    // Set up error test flag
    (window as any).__TEST_ERROR__ = true;

    // Set up error test flag
    (window as any).__TEST_ERROR__ = true;
    
    render(<WorkflowUI />);
    
    // Trigger failure
    const promptInput = screen.getByLabelText(/assignment prompt/i);
    fireEvent.change(promptInput, { target: { value: 'Test prompt' } });
    fireEvent.click(screen.getByRole('button', { name: /go to next step/i }));
    
    // Wait for error
    await waitFor(() => {
      expect(screen.getByTestId('error-alert')).toBeInTheDocument();
    });
    
    // Try retry twice
    fireEvent.click(screen.getByText(/retry/i));
    await waitFor(() => {
      expect(screen.getByTestId('error-alert')).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByText(/retry/i));
    await waitFor(() => {
      expect(screen.getByTestId('error-alert')).toBeInTheDocument();
    });
    
    // Should now show reset option
    expect(screen.getByText(/start over/i)).toBeInTheDocument();
    
    // Click reset
    fireEvent.click(screen.getByText(/start over/i));
    
    // Should reset to step 1
    expect(screen.getByText(/step 1/i)).toBeInTheDocument();
    expect(screen.queryByTestId('error-alert')).not.toBeInTheDocument();
  });

  it('should handle different error types with specific messages', async () => {
    const testCases = [
      { 
        error: new Error('Network request failed'), 
        expectedMessage: /network connection/i 
      },
      { 
        error: new Error('403 Forbidden'), 
        expectedMessage: /permission denied/i 
      },
      { 
        error: new Error('Rate limit exceeded'), 
        expectedMessage: /too many requests/i 
      },
      { 
        error: new Error('Invalid API key'), 
        expectedMessage: /authentication/i 
      }
    ];

    for (const testCase of testCases) {
      (global.fetch as any).mockRejectedValue(testCase.error);

      render(<WorkflowUI />);
      
      const promptInput = screen.getByLabelText(/assignment prompt/i);
      fireEvent.change(promptInput, { target: { value: 'Test prompt' } });
      fireEvent.click(screen.getByRole('button', { name: /go to next step/i }));
      
      await waitFor(() => {
        expect(screen.getByTestId('error-alert')).toBeInTheDocument();
        expect(screen.getByText(testCase.expectedMessage)).toBeInTheDocument();
      });
      
      cleanup();
    }
  });

  it('should provide step-specific error recovery options', async () => {
    (global.fetch as any).mockRejectedValue(new Error('Research API error'));

    render(<WorkflowUI />);
    
    // Navigate to research step
    fireEvent.click(screen.getByLabelText('Step 3'));
    
    // Trigger research error
    fireEvent.click(screen.getByRole('button', { name: /go to next step/i }));
    
    await waitFor(() => {
      expect(screen.getByTestId('error-alert')).toBeInTheDocument();
    });
    
    // Should show research-specific recovery options
    expect(screen.getByRole('button', { name: /try different keywords/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /skip research/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /manual research/i })).toBeInTheDocument();
  });

  it('should maintain user data during error recovery', async () => {
    let failFirst = true;
    (global.fetch as any).mockImplementation(() => {
      if (failFirst) {
        failFirst = false;
        return Promise.reject(new Error('API Error'));
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ outline: 'Success!' })
      });
    });

    // Set up error test flag
    (window as any).__TEST_ERROR__ = true;
    
    render(<WorkflowUI />);
    
    // Enter user data
    const promptInput = screen.getByLabelText(/assignment prompt/i);
    fireEvent.change(promptInput, { target: { value: 'Important user data' } });
    
    // Trigger error
    fireEvent.click(screen.getByRole('button', { name: /go to next step/i }));
    
    await waitFor(() => {
      expect(screen.getByTestId('error-alert')).toBeInTheDocument();
    });
    
    // User data should still be preserved
    expect(promptInput).toHaveValue('Important user data');
    
    // Retry should work with preserved data
    fireEvent.click(screen.getByText(/retry/i));
    
    await waitFor(() => {
      expect(screen.queryByTestId('error-alert')).not.toBeInTheDocument();
    });
    
    // Data should still be there
    expect(promptInput).toHaveValue('Important user data');
  });

  it('should show error boundary for component crashes', () => {
    // Mock console.error to avoid test noise
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    // Component that throws error
    const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
      if (shouldThrow) {
        throw new Error('Component crashed!');
      }
      return <div>Working component</div>;
    };

    const { rerender } = render(<ThrowError shouldThrow={false} />);
    expect(screen.getByText(/working component/i)).toBeInTheDocument();
    
    // Trigger error
    expect(() => rerender(<ThrowError shouldThrow={true} />)).toThrow();
    
    consoleSpy.mockRestore();
  });

  it('should log errors for monitoring and debugging', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    (global.fetch as any).mockRejectedValue(new Error('Test error for logging'));

    render(<WorkflowUI />);
    
    const promptInput = screen.getByLabelText(/assignment prompt/i);
    fireEvent.change(promptInput, { target: { value: 'Test prompt' } });
    fireEvent.click(screen.getByRole('button', { name: /go to next step/i }));
    
    await waitFor(() => {
      expect(screen.getByTestId('error-alert')).toBeInTheDocument();
    });
    
    // Should log error details
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('WorkflowUI Error'),
      expect.objectContaining({
        error: expect.any(Error),
        step: expect.any(Number),
        timestamp: expect.any(Number)
      })
    );
    
    consoleSpy.mockRestore();
  });
});