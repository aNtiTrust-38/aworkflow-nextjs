import React from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import WorkflowUI from '../src/app/WorkflowUI';

// Ensure test isolation
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

// RED PHASE: Failing test for multi-step workflow UI

describe('Academic Workflow UI', () => {
  it('renders stepper, prompt input, and navigation buttons for each step', () => {
    render(<WorkflowUI />);
    // Stepper should be present
    expect(screen.getByTestId('workflow-stepper')).toBeInTheDocument();
    // Prompt input for assignment
    expect(screen.getByLabelText(/assignment prompt/i)).toBeInTheDocument();
    // Next button should be present and enabled
    expect(screen.getByRole('button', { name: /next/i })).toBeEnabled();
    // Previous button should be present and disabled on first step
    expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled();
  });

  it('tracks current step and persists prompt input across steps', () => {
    render(<WorkflowUI />);
    // Initial state: Step 1
    expect(screen.getByTestId('workflow-stepper')).toHaveTextContent(/step 1 of 3/i);
    // Enter prompt
    const promptInput = screen.getByLabelText(/assignment prompt/i);
    fireEvent.change(promptInput, { target: { value: 'Test prompt' } });
    // Move to next step
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    // Stepper should update
    expect(screen.getByTestId('workflow-stepper')).toHaveTextContent(/step 2 of 3/i);
    // Prompt input should persist value
    expect(screen.getByLabelText(/assignment prompt/i)).toHaveValue('Test prompt');
    // Previous button should now be enabled
    expect(screen.getByRole('button', { name: /previous/i })).toBeEnabled();
    // Move back to previous step
    fireEvent.click(screen.getByRole('button', { name: /previous/i }));
    expect(screen.getByTestId('workflow-stepper')).toHaveTextContent(/step 1 of 3/i);
    // Prompt input should still have value
    expect(screen.getByLabelText(/assignment prompt/i)).toHaveValue('Test prompt');
  });

  it('calls /api/outline with prompt and displays outline result', async () => {
    const mockOutline = 'I. Introduction\nII. Main Point 1\nIII. Main Point 2\nIV. Conclusion';
    vi.stubGlobal('fetch', vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ outline: mockOutline })
      })
    ));
    render(<WorkflowUI />);
    // Enter prompt
    fireEvent.change(screen.getByLabelText(/assignment prompt/i), { target: { value: 'Test prompt' } });
    // Click Next to trigger API call
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    // Loading indicator should appear
    expect(screen.getByText(/loading outline/i)).toBeInTheDocument();
    // Wait for outline to appear
    await waitFor(() => {
      expect(screen.getByText(/introduction/i)).toBeInTheDocument();
      expect(screen.getByText(/main point 1/i)).toBeInTheDocument();
      expect(screen.getByText(/conclusion/i)).toBeInTheDocument();
    });
  });

  it('calls /api/research with prompt and displays research results', async () => {
    const mockResearch = [
      { title: 'Paper 1', authors: ['Alice'], year: 2020, citation: '(Alice, 2020) Paper 1.' },
      { title: 'Paper 2', authors: ['Bob'], year: 2019, citation: '(Bob, 2019) Paper 2.' }
    ];
    vi.stubGlobal('fetch', vi.fn((url) => {
      if (typeof url === 'string' && url.includes('/api/research')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ references: mockResearch })
        });
      }
      // Fallback for /api/outline
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ outline: 'I. Introduction\nII. Main Point' })
      });
    }));
    render(<WorkflowUI />);
    // Enter prompt and go to step 2
    fireEvent.change(screen.getByLabelText(/assignment prompt/i), { target: { value: 'Test prompt' } });
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    // Wait for outline to load
    await waitFor(() => {
      expect(screen.getByText(/introduction/i)).toBeInTheDocument();
    });
    // Click Next to trigger research API call
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    // Loading indicator should appear
    expect(screen.getByText(/loading research/i)).toBeInTheDocument();
    // Wait for research results to appear and check by testid
    await waitFor(() => {
      const ref0 = screen.getByTestId('reference-0');
      expect(ref0).toHaveTextContent('Paper 1');
      expect(ref0).toHaveTextContent('Alice');
      expect(ref0).toHaveTextContent('2020');
      expect(ref0).toHaveTextContent('(Alice, 2020) Paper 1.');
      const ref1 = screen.getByTestId('reference-1');
      expect(ref1).toHaveTextContent('Paper 2');
      expect(ref1).toHaveTextContent('Bob');
      expect(ref1).toHaveTextContent('2019');
      expect(ref1).toHaveTextContent('(Bob, 2019) Paper 2.');
    });
  });
}); 