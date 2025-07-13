import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import ErrorMessage from '../../components/ErrorMessage';

describe('ErrorMessage', () => {
  afterEach(() => {
    cleanup();
  });

  describe('Basic Rendering', () => {
    it('should render error message with proper accessibility attributes', () => {
      render(<ErrorMessage message="Something went wrong" />);
      
      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveAttribute('aria-live', 'assertive');
      expect(alert).toHaveAttribute('data-testid', 'error-alert');
      
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('should render error icon', () => {
      render(<ErrorMessage message="Error occurred" />);
      
      // Check for SVG error icon
      const alert = screen.getByTestId('error-alert');
      const icon = alert.querySelector('svg');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveClass('w-5', 'h-5', 'text-red-500');
    });

    it('should render additional details when provided', () => {
      const details = "Please check your network connection and try again.";
      render(<ErrorMessage message="Network Error" details={details} />);
      
      expect(screen.getByText('Network Error')).toBeInTheDocument();
      expect(screen.getByText(details)).toBeInTheDocument();
    });

    it('should render React node details correctly', () => {
      const details = (
        <div>
          <strong>Error Code:</strong> 500
          <br />
          <em>Internal Server Error</em>
        </div>
      );
      render(<ErrorMessage message="Server Error" details={details} />);
      
      expect(screen.getByText('Server Error')).toBeInTheDocument();
      expect(screen.getByText('Error Code:')).toBeInTheDocument();
      expect(screen.getByText('500')).toBeInTheDocument();
      expect(screen.getByText('Internal Server Error')).toBeInTheDocument();
    });
  });

  describe('Action Buttons', () => {
    it('should not render action buttons when no actions provided', () => {
      render(<ErrorMessage message="Simple error" />);
      
      const buttons = screen.queryAllByRole('button');
      expect(buttons).toHaveLength(0);
    });

    it('should render single action button and handle click', () => {
      const mockAction = vi.fn();
      const actions = [
        { label: 'Retry', onClick: mockAction }
      ];
      
      render(<ErrorMessage message="Failed to load" actions={actions} />);
      
      const retryButton = screen.getByRole('button', { name: 'Retry' });
      expect(retryButton).toBeInTheDocument();
      
      fireEvent.click(retryButton);
      expect(mockAction).toHaveBeenCalledTimes(1);
    });

    it('should render multiple action buttons', () => {
      const mockRetry = vi.fn();
      const mockCancel = vi.fn();
      const actions = [
        { label: 'Retry', onClick: mockRetry },
        { label: 'Cancel', onClick: mockCancel }
      ];
      
      render(<ErrorMessage message="Operation failed" actions={actions} />);
      
      expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
      
      fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      
      expect(mockRetry).toHaveBeenCalledTimes(1);
      expect(mockCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe('Button Variants', () => {
    it('should apply default variant styling when no variant specified', () => {
      const actions = [
        { label: 'Default Button', onClick: vi.fn() }
      ];
      
      render(<ErrorMessage message="Error" actions={actions} />);
      
      const button = screen.getByRole('button', { name: 'Default Button' });
      expect(button).toHaveClass('bg-gray-300', 'text-gray-700');
    });

    it('should apply primary variant styling', () => {
      const actions = [
        { label: 'Primary Action', onClick: vi.fn(), variant: 'primary' as const }
      ];
      
      render(<ErrorMessage message="Error" actions={actions} />);
      
      const button = screen.getByRole('button', { name: 'Primary Action' });
      expect(button).toHaveClass('bg-blue-600', 'text-white');
    });

    it('should apply danger variant styling', () => {
      const actions = [
        { label: 'Delete', onClick: vi.fn(), variant: 'danger' as const }
      ];
      
      render(<ErrorMessage message="Error" actions={actions} />);
      
      const button = screen.getByRole('button', { name: 'Delete' });
      expect(button).toHaveClass('bg-red-600', 'text-white');
    });

    it('should apply secondary variant styling (same as default)', () => {
      const actions = [
        { label: 'Secondary Action', onClick: vi.fn(), variant: 'secondary' as const }
      ];
      
      render(<ErrorMessage message="Error" actions={actions} />);
      
      const button = screen.getByRole('button', { name: 'Secondary Action' });
      expect(button).toHaveClass('bg-gray-300', 'text-gray-700');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes for screen readers', () => {
      render(<ErrorMessage message="Accessibility test" />);
      
      const alert = screen.getByRole('alert');
      expect(alert).toHaveAttribute('role', 'alert');
      expect(alert).toHaveAttribute('aria-live', 'assertive');
    });

    it('should have proper focus management for action buttons', () => {
      const actions = [
        { label: 'Focus Test', onClick: vi.fn() }
      ];
      
      render(<ErrorMessage message="Focus test" actions={actions} />);
      
      const button = screen.getByRole('button', { name: 'Focus Test' });
      expect(button).toHaveClass('focus:outline-none', 'focus:ring-2', 'focus:ring-offset-2');
    });

    it('should have proper heading structure', () => {
      render(<ErrorMessage message="Error Title" details="Error details" />);
      
      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveTextContent('Error Title');
      expect(heading).toHaveClass('text-red-800', 'font-medium');
    });
  });

  describe('CSS Classes and Styling', () => {
    it('should apply correct container classes', () => {
      render(<ErrorMessage message="Style test" />);
      
      const container = screen.getByRole('alert');
      expect(container).toHaveClass(
        'bg-red-50',
        'border',
        'border-red-200', 
        'rounded-lg',
        'p-4',
        'mb-4',
        'academic-error'
      );
    });

    it('should have responsive flex layout', () => {
      const actions = [
        { label: 'Action 1', onClick: vi.fn() },
        { label: 'Action 2', onClick: vi.fn() }
      ];
      
      render(<ErrorMessage message="Layout test" actions={actions} />);
      
      const actionsContainer = screen.getByRole('button', { name: 'Action 1' }).parentElement;
      expect(actionsContainer).toHaveClass('flex', 'flex-wrap', 'gap-2');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty actions array', () => {
      render(<ErrorMessage message="No actions" actions={[]} />);
      
      const buttons = screen.queryAllByRole('button');
      expect(buttons).toHaveLength(0);
    });

    it('should handle empty message gracefully', () => {
      render(<ErrorMessage message="" />);
      
      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
      
      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading).toHaveTextContent('');
    });

    it('should handle undefined details', () => {
      render(<ErrorMessage message="Test" details={undefined} />);
      
      expect(screen.getByText('Test')).toBeInTheDocument();
      // Should not crash or render details section
    });

    it('should handle action with missing variant (defaults to secondary)', () => {
      const actions = [
        { label: 'No Variant', onClick: vi.fn() }
      ];
      
      render(<ErrorMessage message="Test" actions={actions} />);
      
      const button = screen.getByRole('button', { name: 'No Variant' });
      expect(button).toHaveClass('bg-gray-300', 'text-gray-700');
    });
  });
});