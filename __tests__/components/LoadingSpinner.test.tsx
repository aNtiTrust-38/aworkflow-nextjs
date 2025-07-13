import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import LoadingSpinner from '../../components/LoadingSpinner';

// Mock window.matchMedia for prefers-reduced-motion tests
const mockMatchMedia = vi.fn();

describe('LoadingSpinner', () => {
  beforeEach(() => {
    // Reset matchMedia mock - check if window exists first
    if (typeof window !== 'undefined') {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: mockMatchMedia,
      });
    } else {
      // Define window for tests that need it
      Object.defineProperty(global, 'window', {
        writable: true,
        value: {
          matchMedia: mockMatchMedia
        }
      });
    }
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render with default props and accessibility attributes', () => {
      mockMatchMedia.mockReturnValue({ matches: false });
      
      render(<LoadingSpinner />);
      
      const spinner = screen.getByTestId('loading-indicator');
      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveAttribute('role', 'status');
      expect(spinner).toHaveAttribute('aria-live', 'polite');
      
      // Should have screen reader text
      expect(screen.getByText('Loading...', { selector: '.sr-only' })).toBeInTheDocument();
      
      // Should display default message (not the screen reader text)
      expect(screen.getByText('Loading...', { selector: '.mb-2' })).toBeInTheDocument();
    });

    it('should render custom message', () => {
      mockMatchMedia.mockReturnValue({ matches: false });
      
      render(<LoadingSpinner message="Processing your request..." />);
      
      expect(screen.getByText('Processing your request...')).toBeInTheDocument();
    });

    it('should render spinning SVG icon with proper attributes', () => {
      mockMatchMedia.mockReturnValue({ matches: false });
      
      render(<LoadingSpinner />);
      
      const svg = screen.getByTestId('loading-indicator').querySelector('svg');
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveAttribute('aria-hidden', 'true');
      expect(svg).toHaveClass('h-6', 'w-6', 'animate-spin');
    });
  });

  describe('Visibility Control', () => {
    it('should be visible by default', () => {
      mockMatchMedia.mockReturnValue({ matches: false });
      
      render(<LoadingSpinner />);
      
      const spinner = screen.getByTestId('loading-indicator');
      expect(spinner).not.toHaveClass('hidden');
    });

    it('should be hidden when visible=false', () => {
      mockMatchMedia.mockReturnValue({ matches: false });
      
      render(<LoadingSpinner visible={false} />);
      
      const spinner = screen.getByTestId('loading-indicator');
      expect(spinner).toHaveClass('hidden');
    });
  });

  describe('Progress Bar', () => {
    it('should not show progress bar when progress is not provided', () => {
      mockMatchMedia.mockReturnValue({ matches: false });
      
      render(<LoadingSpinner />);
      
      expect(screen.queryByTestId('loading-progress-percentage')).not.toBeInTheDocument();
    });

    it('should not show progress bar when progress is 0', () => {
      mockMatchMedia.mockReturnValue({ matches: false });
      
      render(<LoadingSpinner progress={0} />);
      
      expect(screen.queryByTestId('loading-progress-percentage')).not.toBeInTheDocument();
    });

    it('should show progress bar with correct percentage when progress > 0', () => {
      mockMatchMedia.mockReturnValue({ matches: false });
      
      render(<LoadingSpinner progress={45} />);
      
      const progressBar = screen.getByTestId('loading-progress-percentage');
      expect(progressBar).toBeInTheDocument();
      expect(progressBar).toHaveStyle({ width: '45%' });
    });

    it('should use fallbackProgress when progress is 0 or undefined', () => {
      mockMatchMedia.mockReturnValue({ matches: false });
      
      render(<LoadingSpinner progress={0} fallbackProgress={30} />);
      
      const progressBar = screen.getByTestId('loading-progress-percentage');
      expect(progressBar).toBeInTheDocument();
      expect(progressBar).toHaveStyle({ width: '30%' });
    });

    it('should prefer actual progress over fallbackProgress when progress > 0', () => {
      mockMatchMedia.mockReturnValue({ matches: false });
      
      render(<LoadingSpinner progress={60} fallbackProgress={30} />);
      
      const progressBar = screen.getByTestId('loading-progress-percentage');
      expect(progressBar).toHaveStyle({ width: '60%' });
    });

    it('should not show progress bar when neither progress nor fallbackProgress are provided', () => {
      mockMatchMedia.mockReturnValue({ matches: false });
      
      render(<LoadingSpinner />);
      
      expect(screen.queryByTestId('loading-progress-percentage')).not.toBeInTheDocument();
    });
  });

  describe('Estimated Time', () => {
    it('should not show estimated time when not provided', () => {
      mockMatchMedia.mockReturnValue({ matches: false });
      
      render(<LoadingSpinner />);
      
      expect(screen.queryByTestId('estimated-time')).not.toBeInTheDocument();
    });

    it('should show estimated time when provided', () => {
      mockMatchMedia.mockReturnValue({ matches: false });
      
      render(<LoadingSpinner estimatedTime={30} />);
      
      const timeDisplay = screen.getByTestId('estimated-time');
      expect(timeDisplay).toBeInTheDocument();
      expect(timeDisplay).toHaveTextContent('Estimated time: 30 seconds');
    });

    it('should handle 0 estimated time', () => {
      mockMatchMedia.mockReturnValue({ matches: false });
      
      render(<LoadingSpinner estimatedTime={0} />);
      
      expect(screen.getByTestId('estimated-time')).toHaveTextContent('Estimated time: 0 seconds');
    });
  });

  describe('Cancellation', () => {
    it('should not show cancel button by default', () => {
      mockMatchMedia.mockReturnValue({ matches: false });
      
      render(<LoadingSpinner />);
      
      expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument();
    });

    it('should not show cancel button when cancellable=false', () => {
      mockMatchMedia.mockReturnValue({ matches: false });
      
      render(<LoadingSpinner cancellable={false} />);
      
      expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument();
    });

    it('should show cancel button when cancellable=true', () => {
      mockMatchMedia.mockReturnValue({ matches: false });
      
      render(<LoadingSpinner cancellable={true} onCancel={vi.fn()} />);
      
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      expect(cancelButton).toBeInTheDocument();
      expect(cancelButton).toHaveAttribute('aria-label', 'Cancel loading');
    });

    it('should call onCancel when cancel button is clicked', () => {
      mockMatchMedia.mockReturnValue({ matches: false });
      const mockOnCancel = vi.fn();
      
      render(<LoadingSpinner cancellable={true} onCancel={mockOnCancel} />);
      
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);
      
      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });

    it('should have proper focus styles on cancel button', () => {
      mockMatchMedia.mockReturnValue({ matches: false });
      
      render(<LoadingSpinner cancellable={true} onCancel={vi.fn()} />);
      
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      expect(cancelButton).toHaveClass('focus:outline-none', 'focus:ring-2', 'focus:ring-gray-500');
    });
  });

  describe('Reduced Motion Accessibility', () => {
    it('should apply animation classes when prefers-reduced-motion is false', () => {
      mockMatchMedia.mockReturnValue({ matches: false });
      
      render(<LoadingSpinner />);
      
      const spinner = screen.getByTestId('loading-indicator');
      const svg = spinner.querySelector('svg');
      
      expect(spinner).toHaveClass('motion-reduce:animate-none');
      expect(svg).toHaveClass('animate-spin');
    });

    it('should disable animations when prefers-reduced-motion is true', () => {
      mockMatchMedia.mockReturnValue({ matches: true });
      
      render(<LoadingSpinner progress={50} />);
      
      const spinner = screen.getByTestId('loading-indicator');
      const svg = spinner.querySelector('svg');
      const progressBar = screen.getByTestId('loading-progress-percentage');
      
      expect(spinner).toHaveClass('motion-reduce:animate-none');
      expect(svg).not.toHaveClass('animate-spin');
      expect(progressBar).toHaveStyle({ transition: 'none' });
    });

    it('should handle matchMedia errors gracefully', () => {
      mockMatchMedia.mockImplementation(() => {
        throw new Error('matchMedia not supported');
      });
      
      expect(() => {
        render(<LoadingSpinner />);
      }).not.toThrow();
      
      // Should fall back to animation enabled
      const svg = screen.getByTestId('loading-indicator').querySelector('svg');
      expect(svg).toHaveClass('animate-spin');
    });

    it('should handle window API gracefully in environments where it might not exist', () => {
      // Test that component renders without errors when window exists but APIs might fail
      mockMatchMedia.mockReturnValue({ matches: false });
      
      expect(() => {
        render(<LoadingSpinner />);
      }).not.toThrow();
      
      const spinner = screen.getByTestId('loading-indicator');
      expect(spinner).toBeInTheDocument();
      
      // Should still render with default animation behavior when window APIs are problematic
      const svg = spinner.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });

  describe('CSS Classes and Styling', () => {
    it('should apply correct base classes', () => {
      mockMatchMedia.mockReturnValue({ matches: false });
      
      render(<LoadingSpinner />);
      
      const spinner = screen.getByTestId('loading-indicator');
      expect(spinner).toHaveClass('academic-spinner', 'motion-reduce:animate-none');
    });

    it('should have proper text styling classes', () => {
      mockMatchMedia.mockReturnValue({ matches: false });
      
      render(<LoadingSpinner estimatedTime={10} />);
      
      const timeDisplay = screen.getByTestId('estimated-time');
      expect(timeDisplay).toHaveClass('text-sm', 'text-gray-500', 'mb-3');
    });

    it('should have proper progress bar styling', () => {
      mockMatchMedia.mockReturnValue({ matches: false });
      
      render(<LoadingSpinner progress={75} />);
      
      const progressContainer = screen.getByTestId('loading-progress-percentage').parentElement;
      const progressBar = screen.getByTestId('loading-progress-percentage');
      
      expect(progressContainer).toHaveClass('w-full', 'bg-gray-200', 'rounded-full', 'h-2', 'mb-3');
      expect(progressBar).toHaveClass('bg-blue-600', 'h-2', 'rounded-full', 'transition-all', 'duration-300');
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined onCancel with cancellable=true', () => {
      mockMatchMedia.mockReturnValue({ matches: false });
      
      render(<LoadingSpinner cancellable={true} />);
      
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      expect(() => {
        fireEvent.click(cancelButton);
      }).not.toThrow();
    });

    it('should handle negative progress values', () => {
      mockMatchMedia.mockReturnValue({ matches: false });
      
      render(<LoadingSpinner progress={-10} fallbackProgress={20} />);
      
      // Should use fallbackProgress when progress is negative
      const progressBar = screen.getByTestId('loading-progress-percentage');
      expect(progressBar).toHaveStyle({ width: '20%' });
    });

    it('should handle progress values over 100', () => {
      mockMatchMedia.mockReturnValue({ matches: false });
      
      render(<LoadingSpinner progress={150} />);
      
      const progressBar = screen.getByTestId('loading-progress-percentage');
      expect(progressBar).toHaveStyle({ width: '150%' });
    });

    it('should handle empty message string', () => {
      mockMatchMedia.mockReturnValue({ matches: false });
      
      render(<LoadingSpinner message="" />);
      
      const messageElement = screen.getByTestId('loading-indicator').querySelector('.text-center > .mb-2');
      expect(messageElement).toHaveTextContent('');
    });

    it('should handle missing matchMedia function', () => {
      // Setup window if it doesn't exist
      if (typeof window === 'undefined') {
        Object.defineProperty(global, 'window', {
          writable: true,
          value: {}
        });
      }
      
      // @ts-ignore
      delete window.matchMedia;
      
      expect(() => {
        render(<LoadingSpinner />);
      }).not.toThrow();
    });
  });
});