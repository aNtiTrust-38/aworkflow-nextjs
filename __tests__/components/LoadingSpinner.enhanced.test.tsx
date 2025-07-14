import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import LoadingSpinner from '../../components/LoadingSpinner';

describe('Enhanced LoadingSpinner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Functionality', () => {
    it('should render with basic props', () => {
      render(<LoadingSpinner message="Loading..." visible={true} />);
      
      expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
      expect(screen.getByText('Loading...', { selector: '.text-gray-600' })).toBeInTheDocument();
    });

    it('should be hidden when visible is false', () => {
      render(<LoadingSpinner message="Loading..." visible={false} />);
      
      const indicator = screen.getByTestId('loading-indicator');
      expect(indicator).toHaveClass('hidden');
    });
  });

  describe('Enhanced Features', () => {
    it('should display step icon and title', () => {
      render(
        <LoadingSpinner
          message="Processing research..."
          stepIcon="🔍"
          stepTitle="Research Assistant"
          visible={true}
        />
      );

      expect(screen.getByText('🔍')).toBeInTheDocument();
      expect(screen.getByText('Research Assistant')).toBeInTheDocument();
      expect(screen.getByText('Processing research...')).toBeInTheDocument();
    });

    it('should show progress bar with percentage', () => {
      render(
        <LoadingSpinner
          message="Loading..."
          progress={75}
          visible={true}
        />
      );

      expect(screen.getByText('Progress')).toBeInTheDocument();
      expect(screen.getByText('75%')).toBeInTheDocument();
      expect(screen.getByTestId('loading-progress-percentage')).toHaveAttribute('style', 'width: 75%;');
    });

    it('should display substeps with current progress', () => {
      const substeps = [
        'Connecting to database',
        'Searching sources',
        'Filtering results',
        'Compiling data'
      ];

      render(
        <LoadingSpinner
          message="Processing..."
          substeps={substeps}
          currentSubstep={2}
          visible={true}
        />
      );

      // Should show all substeps
      substeps.forEach(substep => {
        expect(screen.getByText(substep)).toBeInTheDocument();
      });

      // Should show checkmarks for completed steps
      const completedSteps = screen.getAllByText('✓');
      expect(completedSteps).toHaveLength(2); // Steps 0 and 1 are completed
    });

    it('should show estimated time', () => {
      render(
        <LoadingSpinner
          message="Loading..."
          estimatedTime={30}
          visible={true}
        />
      );

      expect(screen.getByText('⏱️')).toBeInTheDocument();
      expect(screen.getByText('Estimated time: 30 seconds')).toBeInTheDocument();
    });

    it('should handle cancellation', () => {
      const onCancel = vi.fn();

      render(
        <LoadingSpinner
          message="Loading..."
          cancellable={true}
          onCancel={onCancel}
          visible={true}
        />
      );

      const cancelButton = screen.getByText('Cancel');
      expect(cancelButton).toBeInTheDocument();

      fireEvent.click(cancelButton);
      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('should use fallback progress when main progress is 0', () => {
      render(
        <LoadingSpinner
          message="Loading..."
          progress={0}
          fallbackProgress={50}
          visible={true}
        />
      );

      expect(screen.getByText('50%')).toBeInTheDocument();
      expect(screen.getByTestId('loading-progress-percentage')).toHaveAttribute('style', 'width: 50%;');
    });
  });

  describe('Substep States', () => {
    it('should show correct states for each substep', () => {
      const substeps = ['Step 1', 'Step 2', 'Step 3', 'Step 4'];

      render(
        <LoadingSpinner
          message="Processing..."
          substeps={substeps}
          currentSubstep={2}
          visible={true}
        />
      );

      // Check completed steps (green)
      const step1 = screen.getByText('Step 1').parentElement;
      expect(step1).toHaveClass('text-green-600');

      const step2 = screen.getByText('Step 2').parentElement;
      expect(step2).toHaveClass('text-green-600');

      // Check current step (blue)
      const step3 = screen.getByText('Step 3').parentElement;
      expect(step3).toHaveClass('text-blue-600');

      // Check pending step (gray)
      const step4 = screen.getByText('Step 4').parentElement;
      expect(step4).toHaveClass('text-gray-400');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(
        <LoadingSpinner
          message="Loading..."
          stepTitle="Research Process"
          visible={true}
        />
      );

      const indicator = screen.getByTestId('loading-indicator');
      expect(indicator).toHaveAttribute('role', 'status');
      expect(indicator).toHaveAttribute('aria-live', 'polite');

      expect(screen.getByText('Loading...', { selector: '.text-gray-600' })).toBeInTheDocument();
    });

    it('should have screen reader text', () => {
      render(<LoadingSpinner message="Loading..." visible={true} />);
      
      expect(screen.getByText('Loading...', { selector: '.sr-only' })).toBeInTheDocument();
    });

    it('should handle reduced motion preferences', () => {
      // Mock matchMedia for reduced motion
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
          matches: query.includes('prefers-reduced-motion: reduce'),
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
        })),
      });

      render(<LoadingSpinner message="Loading..." visible={true} />);

      // Should not have animate-spin class when reduced motion is preferred
      const spinner = screen.getByTestId('loading-indicator').querySelector('svg');
      expect(spinner).not.toHaveClass('animate-spin');
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle all enhanced features together', () => {
      const substeps = ['Initialize', 'Process', 'Finalize'];
      const onCancel = vi.fn();

      render(
        <LoadingSpinner
          message="Complex processing task"
          stepIcon="⚙️"
          stepTitle="Advanced Processing"
          progress={66}
          estimatedTime={45}
          substeps={substeps}
          currentSubstep={1}
          cancellable={true}
          onCancel={onCancel}
          visible={true}
        />
      );

      // Should show all components
      expect(screen.getByText('⚙️')).toBeInTheDocument();
      expect(screen.getByText('Advanced Processing')).toBeInTheDocument();
      expect(screen.getByText('Complex processing task')).toBeInTheDocument();
      expect(screen.getByText('66%')).toBeInTheDocument();
      expect(screen.getByText('Estimated time: 45 seconds')).toBeInTheDocument();
      expect(screen.getByText('Initialize')).toBeInTheDocument();
      expect(screen.getByText('Process')).toBeInTheDocument();
      expect(screen.getByText('Finalize')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();

      // Check substep states
      expect(screen.getByText('✓')).toBeInTheDocument(); // Completed step
    });
  });

  describe('Error Handling', () => {
    it('should handle missing optional props gracefully', () => {
      render(<LoadingSpinner visible={true} />);

      // Should use default message
      expect(screen.getByText('Loading...', { selector: '.text-gray-600' })).toBeInTheDocument();
      expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
    });

    it('should handle empty substeps array', () => {
      render(
        <LoadingSpinner
          message="Loading..."
          substeps={[]}
          visible={true}
        />
      );

      // Should not show substeps section
      expect(screen.queryByText('✓')).not.toBeInTheDocument();
    });
  });
});