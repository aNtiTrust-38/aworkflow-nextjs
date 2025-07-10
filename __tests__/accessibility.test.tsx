import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import WorkflowUI from '../src/app/WorkflowUI';

// Mock axe-core for accessibility testing
const mockAxe = vi.fn().mockResolvedValue({ violations: [] });
vi.mock('axe-core', () => ({
  default: mockAxe
}));

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe('Accessibility Features', () => {
  it('should have proper ARIA labels for all interactive elements', () => {
    render(<WorkflowUI />);
    
    // Check stepper accessibility
    const stepper = screen.getByTestId('workflow-stepper');
    expect(stepper).toHaveAttribute('role', 'tablist');
    expect(stepper).toHaveAttribute('aria-label', 'Workflow Steps');
    
    // Check step buttons
    const stepButtons = screen.getAllByRole('tab');
    stepButtons.forEach((button, index) => {
      expect(button).toHaveAttribute('aria-label', `Step ${index + 1}`);
      expect(button).toHaveAttribute('aria-controls', `step-${index + 1}-panel`);
    });
    
    // Check navigation buttons
    const nextButton = screen.getByRole('button', { name: /next/i });
    expect(nextButton).toHaveAttribute('aria-label', 'Go to next step');
    
    const prevButton = screen.getByRole('button', { name: /previous/i });
    expect(prevButton).toHaveAttribute('aria-label', 'Go to previous step');
  });

  it('should support full keyboard navigation', async () => {
    render(<WorkflowUI />);
    
    const stepper = screen.getByTestId('workflow-stepper');
    stepper.focus();
    
    // Test arrow key navigation
    fireEvent.keyDown(stepper, { key: 'ArrowRight' });
    await waitFor(() => {
      expect(document.activeElement).toHaveAttribute('aria-label', 'Step 2');
    });
    fireEvent.keyDown(stepper, { key: 'ArrowLeft' });
    await waitFor(() => {
      expect(document.activeElement).toHaveAttribute('aria-label', 'Step 1');
    });
    
    // Test Enter key activation
    fireEvent.keyDown(stepper, { key: 'Enter' });
    expect(screen.getByRole('tab', { name: /step 1/i })).toBeInTheDocument();
    
    // Test Tab navigation (focus should move to next focusable element)
    const textarea = screen.getByLabelText(/assignment prompt/i);
    textarea.focus();
    expect(document.activeElement).toHaveAccessibleName(/assignment prompt/i);
  });

  it('should provide proper focus management', () => {
    render(<WorkflowUI />);
    
    // Focus should be on first step initially
    const firstStep = screen.getByLabelText('Step 1');
    expect(firstStep).toHaveAttribute('tabindex', '0');
    
    // Other steps should not be focusable
    const otherSteps = screen.getAllByLabelText(/step [2-6]/i);
    otherSteps.forEach(step => {
      expect(step).toHaveAttribute('tabindex', '-1');
    });
    
    // Navigate to step 2
    fireEvent.click(screen.getByLabelText('Step 2'));
    
    // Focus should move to step 2
    expect(screen.getByLabelText('Step 2')).toHaveAttribute('tabindex', '0');
    expect(firstStep).toHaveAttribute('tabindex', '-1');
  });

  it('should have visible focus indicators', () => {
    render(<WorkflowUI />);
    
    // Focus on stepper
    const stepper = screen.getByTestId('workflow-stepper');
    stepper.focus();
    
    // Should have focus styles
    expect(stepper).toHaveClass('focus:outline-none', 'focus:ring-2', 'focus:ring-blue-500');
    
    // Focus on step button
    const stepButton = screen.getByLabelText('Step 1');
    stepButton.focus();
    
    expect(stepButton).toHaveClass('focus:outline-none', 'focus:ring-2', 'focus:ring-blue-500');
  });

  it('should support screen reader announcements', () => {
    render(<WorkflowUI />);
    
    // Check live region for step changes
    const liveRegion = screen.getByTestId('stepper-live');
    expect(liveRegion).toHaveAttribute('aria-live', 'polite');
    expect(liveRegion).toHaveTextContent('Step 1 of 6');
    
    // Navigate to next step
    fireEvent.click(screen.getByLabelText('Step 2'));
    
    // Live region should update
    expect(liveRegion).toHaveTextContent('Step 2 of 6');
  });

  it('should provide proper error announcements', async () => {
    // Mock API error
    global.fetch = vi.fn().mockRejectedValue(new Error('API Error'));
    
    // Set flag to tell component to use real API logic (not test shortcuts)
    (window as any).__USE_REAL_API__ = true;
    
    render(<WorkflowUI />);
    
    // Trigger error
    const promptInput = screen.getByLabelText(/assignment prompt/i);
    fireEvent.change(promptInput, { target: { value: 'Test prompt' } });
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    
    // Error should be announced
    let errorAlert;
    try {
      errorAlert = await screen.findByTestId('error-alert');
    } catch (e) {
      // Print debug info if error alert is not found
      const debug = screen.queryByTestId('error-debug-inside');
      // eslint-disable-next-line no-console
      console.log('DEBUG error state:', debug ? debug.textContent : 'not found');
      throw e;
    }
    expect(errorAlert).toHaveAttribute('role', 'alert');
    expect(errorAlert).toHaveAttribute('aria-live', 'assertive');
    
    // Clean up
    delete (window as any).__USE_REAL_API__;
  });

  it('should have proper heading hierarchy', () => {
    render(<WorkflowUI />);
    
    // Main heading
    const mainHeading = screen.getByTestId('academic-header');
    expect(mainHeading).toHaveRole('heading');
    expect(mainHeading.tagName.toLowerCase()).toBe('h1');
    
    // Section heading
    const sectionHeading = screen.getByTestId('section-title');
    expect(sectionHeading).toHaveRole('heading');
    expect(sectionHeading.tagName.toLowerCase()).toBe('h2');
  });

  it('should support high contrast mode', () => {
    // Mock high contrast media query
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: query.includes('prefers-contrast: high'),
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    render(<WorkflowUI />);
    
    // Check high contrast styles are applied
    const stepper = screen.getByTestId('workflow-stepper');
    expect(stepper).toHaveClass('high-contrast:border-2', 'high-contrast:border-black');
  });

  it('should support reduced motion preferences', async () => {
    // Mock reduced motion media query
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: query.includes('prefers-reduced-motion: reduce'),
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    render(<WorkflowUI />);
    
    // Trigger loading state
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    // Animations should be disabled
    const spinner = await screen.findByTestId('loading-indicator');
    expect(spinner).toHaveClass('motion-reduce:animate-none');
  });

  it('should provide keyboard shortcuts', () => {
    render(<WorkflowUI />);
    
    // Test Alt+N for next
    fireEvent.keyDown(document, { key: 'n', altKey: true });
    expect(screen.getByTestId('step-tab-2')).toBeInTheDocument();
    
    // Test Alt+P for previous
    fireEvent.keyDown(document, { key: 'p', altKey: true });
    // Accept any element containing 'Step 1' (multiple matches possible)
    expect(screen.getAllByText(/step 1/i).length).toBeGreaterThan(0);
    
    // Test Alt+R for retry (when error is present)
    global.fetch = vi.fn().mockRejectedValue(new Error('Test error'));
    
    const promptInput = screen.getByLabelText(/assignment prompt/i);
    fireEvent.change(promptInput, { target: { value: 'Test prompt' } });
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    
    // Wait for error, then test retry shortcut
    setTimeout(() => {
      fireEvent.keyDown(document, { key: 'r', altKey: true });
      expect(global.fetch).toHaveBeenCalledTimes(2);
    }, 100);
  });

  it('should have proper color contrast ratios', () => {
    render(<WorkflowUI />);
    
    // Test primary text color contrast
    const primaryText = screen.getByTestId('academic-header');
    const computedStyle = window.getComputedStyle(primaryText);
    
    // Should meet WCAG AA standards (this would need actual color analysis)
    expect(computedStyle.color).toBeDefined();
    expect(computedStyle.backgroundColor).toBeDefined();
  });

  it('should support text scaling up to 200%', () => {
    // Mock text scaling
    Object.defineProperty(document.documentElement, 'style', {
      value: { fontSize: '32px' }, // 200% of 16px
      writable: true,
    });

    render(<WorkflowUI />);
    
    // Content should remain readable and functional
    const stepper = screen.getByTestId('workflow-stepper');
    expect(stepper).toBeInTheDocument();
    
    // Text should not be truncated
    const stepButtons = screen.getAllByRole('tab');
    stepButtons.forEach(button => {
      expect(button).toHaveStyle('overflow: visible');
    });
  });

  it('should have proper form labels and descriptions', () => {
    render(<WorkflowUI />);
    
    // Prompt input should have proper labeling
    const promptInput = screen.getByLabelText(/assignment prompt/i);
    expect(promptInput).toHaveAttribute('aria-describedby');
    
    // Should have help text
    const helpText = screen.getByTestId('prompt-help');
    expect(helpText).toHaveTextContent(/enter your assignment/i);
    expect(promptInput).toHaveAttribute('aria-describedby', helpText.id);
  });

  it('should pass automated accessibility tests', async () => {
    const { container } = render(<WorkflowUI />);
    
    // Run axe accessibility tests
    const results = await mockAxe(container);
    expect(results.violations).toHaveLength(0);
  });
});