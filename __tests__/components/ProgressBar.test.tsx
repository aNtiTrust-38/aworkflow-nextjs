import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import ProgressBar from '../../components/ProgressBar';

describe('ProgressBar', () => {
  beforeEach(() => {
    cleanup();
  });

  afterEach(() => {
    cleanup();
  });

  describe('Basic Rendering', () => {
    it('should render with default props', () => {
      render(<ProgressBar value={50} />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toBeInTheDocument();
      expect(progressBar).toHaveAttribute('aria-valuenow', '50');
      expect(progressBar).toHaveAttribute('aria-valuemin', '1');
      expect(progressBar).toHaveAttribute('aria-valuemax', '100');
      expect(progressBar).toHaveAttribute('aria-label', 'Progress');
    });

    it('should render with custom props', () => {
      render(
        <ProgressBar 
          value={75} 
          min={0} 
          max={200} 
          label="Custom Progress" 
          testId="custom-progress"
        />
      );

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '75');
      expect(progressBar).toHaveAttribute('aria-valuemin', '0');
      expect(progressBar).toHaveAttribute('aria-valuemax', '200');
      expect(progressBar).toHaveAttribute('aria-label', 'Custom Progress');
      expect(progressBar).toHaveAttribute('data-testid', 'progress-bar');
      
      const progressFill = screen.getByTestId('custom-progress');
      expect(progressFill).toBeInTheDocument();
    });
  });

  describe('Progress Calculation', () => {
    it('should calculate percentage correctly with default range', () => {
      render(<ProgressBar value={25} />);

      const progressFill = screen.getByTestId('progress-percentage');
      expect(progressFill).toHaveStyle({ width: '24.24%' }); // (25-1)/(100-1) * 100 = 24.24%
    });

    it('should calculate percentage correctly with custom range', () => {
      render(<ProgressBar value={150} min={100} max={200} />);

      const progressFill = screen.getByTestId('progress-percentage');
      expect(progressFill).toHaveStyle({ width: '50%' }); // (150-100)/(200-100) * 100 = 50%
    });

    it('should handle zero-based range correctly', () => {
      render(<ProgressBar value={25} min={0} max={100} />);

      const progressFill = screen.getByTestId('progress-percentage');
      expect(progressFill).toHaveStyle({ width: '25%' }); // (25-0)/(100-0) * 100 = 25%
    });
  });

  describe('Edge Cases', () => {
    it('should clamp value below minimum to 0%', () => {
      render(<ProgressBar value={-10} min={0} max={100} />);

      const progressFill = screen.getByTestId('progress-percentage');
      expect(progressFill).toHaveStyle({ width: '0%' });
    });

    it('should clamp value above maximum to 100%', () => {
      render(<ProgressBar value={150} min={0} max={100} />);

      const progressFill = screen.getByTestId('progress-percentage');
      expect(progressFill).toHaveStyle({ width: '100%' });
    });

    it('should handle value equal to minimum', () => {
      render(<ProgressBar value={10} min={10} max={20} />);

      const progressFill = screen.getByTestId('progress-percentage');
      expect(progressFill).toHaveStyle({ width: '0%' });
    });

    it('should handle value equal to maximum', () => {
      render(<ProgressBar value={20} min={10} max={20} />);

      const progressFill = screen.getByTestId('progress-percentage');
      expect(progressFill).toHaveStyle({ width: '100%' });
    });

    it('should handle min equal to max', () => {
      render(<ProgressBar value={50} min={50} max={50} />);

      const progressFill = screen.getByTestId('progress-percentage');
      expect(progressFill).toHaveStyle({ width: '100%' });
    });

    it('should handle negative ranges', () => {
      render(<ProgressBar value={-5} min={-10} max={0} />);

      const progressFill = screen.getByTestId('progress-percentage');
      expect(progressFill).toHaveStyle({ width: '50%' }); // (-5-(-10))/(0-(-10)) * 100 = 50%
    });

    it('should handle decimal values', () => {
      render(<ProgressBar value={12.5} min={10} max={20} />);

      const progressFill = screen.getByTestId('progress-percentage');
      expect(progressFill).toHaveStyle({ width: '25%' }); // (12.5-10)/(20-10) * 100 = 25%
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<ProgressBar value={60} min={0} max={100} label="Loading Progress" />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('role', 'progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '60');
      expect(progressBar).toHaveAttribute('aria-valuemin', '0');
      expect(progressBar).toHaveAttribute('aria-valuemax', '100');
      expect(progressBar).toHaveAttribute('aria-label', 'Loading Progress');
    });

    it('should update ARIA attributes when value changes', () => {
      const { rerender } = render(<ProgressBar value={30} />);

      let progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '30');

      rerender(<ProgressBar value={70} />);
      
      progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '70');
    });

    it('should be keyboard accessible', () => {
      render(<ProgressBar value={50} />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).not.toHaveAttribute('tabindex'); // Progress bars are not focusable
    });
  });

  describe('Visual Styling', () => {
    it('should have correct CSS classes', () => {
      render(<ProgressBar value={50} />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveClass('w-full', 'bg-gray-200', 'rounded-full', 'h-2');

      const progressFill = screen.getByTestId('progress-percentage');
      expect(progressFill).toHaveClass('bg-blue-600', 'h-2', 'rounded-full', 'transition-all', 'duration-300');
    });

    it('should have smooth transition animation', () => {
      render(<ProgressBar value={50} />);

      const progressFill = screen.getByTestId('progress-percentage');
      expect(progressFill).toHaveClass('transition-all', 'duration-300');
    });
  });

  describe('Data Test IDs', () => {
    it('should have correct default test IDs', () => {
      render(<ProgressBar value={50} />);

      expect(screen.getByTestId('progress-bar')).toBeInTheDocument();
      expect(screen.getByTestId('progress-percentage')).toBeInTheDocument();
    });

    it('should use custom test ID when provided', () => {
      render(<ProgressBar value={50} testId="custom-test-id" />);

      expect(screen.getByTestId('progress-bar')).toBeInTheDocument();
      expect(screen.getByTestId('custom-test-id')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should not re-render unnecessarily', () => {
      const { rerender } = render(<ProgressBar value={50} />);

      const progressBar = screen.getByRole('progressbar');
      const progressFill = screen.getByTestId('progress-percentage');

      // Re-render with same props
      rerender(<ProgressBar value={50} />);

      // Elements should still be the same
      expect(screen.getByRole('progressbar')).toBe(progressBar);
      expect(screen.getByTestId('progress-percentage')).toBe(progressFill);
    });
  });

  describe('Integration with Different Use Cases', () => {
    it('should work for file upload progress', () => {
      render(
        <ProgressBar 
          value={1024} 
          min={0} 
          max={2048} 
          label="File Upload Progress"
          testId="upload-progress"
        />
      );

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-label', 'File Upload Progress');
      
      const progressFill = screen.getByTestId('upload-progress');
      expect(progressFill).toHaveStyle({ width: '50%' });
    });

    it('should work for API usage indicators', () => {
      render(
        <ProgressBar 
          value={75} 
          min={0} 
          max={100} 
          label="API Usage"
          testId="api-usage"
        />
      );

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-label', 'API Usage');
      
      const progressFill = screen.getByTestId('api-usage');
      expect(progressFill).toHaveStyle({ width: '75%' });
    });

    it('should work for step progress indicators', () => {
      render(
        <ProgressBar 
          value={3} 
          min={1} 
          max={6} 
          label="Step Progress"
          testId="step-progress"
        />
      );

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-label', 'Step Progress');
      
      const progressFill = screen.getByTestId('step-progress');
      expect(progressFill).toHaveStyle({ width: '40%' }); // (3-1)/(6-1) * 100 = 40%
    });
  });
}); 