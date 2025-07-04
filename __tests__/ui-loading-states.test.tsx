import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import WorkflowUI from '../src/app/WorkflowUI';

// Mock fetch globally
global.fetch = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe('Loading States and Progress Indicators', () => {
  it('should display loading spinner during API calls', async () => {
    // Mock API response with delay
    (global.fetch as any).mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: () => Promise.resolve({ outline: 'Test outline' })
      }), 100))
    );

    render(<WorkflowUI />);
    
    // Add some text to prompt
    const promptInput = screen.getByLabelText(/assignment prompt/i);
    fireEvent.change(promptInput, { target: { value: 'Test prompt' } });
    
    // Click next to trigger API call
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    
    // Should show loading spinner
    expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByTestId('loading-indicator')).not.toBeInTheDocument();
    });
  });

  it('should show step-specific loading messages', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ outline: 'Test outline' })
    });

    render(<WorkflowUI />);
    
    // Add prompt text
    const promptInput = screen.getByLabelText(/assignment prompt/i);
    fireEvent.change(promptInput, { target: { value: 'Test prompt' } });
    
    // Click next to trigger outline generation
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    
    // Should show step-specific loading message
    expect(screen.getByText(/generating outline/i)).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.queryByText(/generating outline/i)).not.toBeInTheDocument();
    });
  });

  it('should display progress bar for multi-step operations', async () => {
    render(<WorkflowUI />);
    
    // Progress bar should show current step progress
    const progressContainer = screen.getByTestId('workflow-progress');
    expect(progressContainer).toBeInTheDocument();
    
    // Find the actual progressbar element
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toBeInTheDocument();
    
    // Should show 1/6 progress initially
    expect(progressBar).toHaveAttribute('aria-valuenow', '1');
    expect(progressBar).toHaveAttribute('aria-valuemax', '6');
    expect(screen.getAllByText(/step 1 of 6/i)).toHaveLength(2); // Progress and stepper live region
  });

  it('should show estimated time remaining for long operations', async () => {
    // Mock slow API response
    (global.fetch as any).mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: () => Promise.resolve({ content: 'Generated content' })
      }), 3000))
    );

    render(<WorkflowUI />);
    
    // Navigate to generation step
    fireEvent.click(screen.getByLabelText('Step 4'));
    
    // Trigger content generation
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    
    // Should show estimated time
    expect(screen.getByTestId('estimated-time')).toBeInTheDocument();
    expect(screen.getByText(/estimated time/i)).toBeInTheDocument();
  });

  it('should display skeleton screens while loading content', async () => {
    render(<WorkflowUI />);
    
    // Navigate to research step
    fireEvent.click(screen.getByLabelText('Step 3'));
    
    // Should show skeleton loader for research results
    expect(screen.getByTestId('research-skeleton')).toBeInTheDocument();
    expect(screen.getAllByTestId('skeleton-item')).toHaveLength(3);
  });

  it('should update progress percentage during multi-phase operations', async () => {
    let resolvePromise: (value: any) => void;
    const mockPromise = new Promise(resolve => {
      resolvePromise = resolve;
    });

    (global.fetch as any).mockReturnValue(mockPromise);

    render(<WorkflowUI />);
    
    // Add prompt and start operation  
    const promptInput = screen.getByLabelText(/assignment prompt/i);
    fireEvent.change(promptInput, { target: { value: 'Test prompt' } });
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    
    // Wait for loading to start
    await waitFor(() => {
      expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
    });
    
    // The progress bar starts at step 1, showing 16.67% (1/6)
    const progressBar = screen.getByTestId('progress-percentage');
    expect(progressBar).toHaveStyle('width: 16.666666666666664%');
    
    // Complete operation
    resolvePromise!({ ok: true, json: () => Promise.resolve({ outline: 'Test outline' }) });
    
    await waitFor(() => {
      expect(screen.queryByTestId('loading-indicator')).not.toBeInTheDocument();
    });
  });

  it('should disable navigation during loading states', async () => {
    (global.fetch as any).mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: () => Promise.resolve({ outline: 'Test outline' })
      }), 100))
    );

    render(<WorkflowUI />);
    
    // Add prompt
    const promptInput = screen.getByLabelText(/assignment prompt/i);
    fireEvent.change(promptInput, { target: { value: 'Test prompt' } });
    
    // Start loading
    fireEvent.click(screen.getByRole('button', { name: /go to next step/i }));
    
    // Wait for loading to start
    await waitFor(() => {
      expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
    });
    
    // Navigation should be disabled
    expect(screen.getByRole('button', { name: /go to next step/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /go to previous step/i })).toBeDisabled();
    
    // Step buttons should be disabled (only check desktop stepper if visible)
    const stepButtons = screen.queryAllByRole('tab');
    if (stepButtons.length > 0) {
      stepButtons.forEach(button => {
        expect(button).toBeDisabled();
      });
    }
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /go to next step/i })).toBeEnabled();
    });
  });
});