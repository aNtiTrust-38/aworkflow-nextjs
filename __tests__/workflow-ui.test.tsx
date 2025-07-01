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
    expect(screen.getByTestId('workflow-stepper')).toHaveTextContent(/step 1 of 4/i);
    // Enter prompt
    const promptInput = screen.getByLabelText(/assignment prompt/i);
    fireEvent.change(promptInput, { target: { value: 'Test prompt' } });
    // Move to next step
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    // Stepper should update
    expect(screen.getByTestId('workflow-stepper')).toHaveTextContent(/step 2 of 4/i);
    // Prompt input should persist value
    expect(screen.getByLabelText(/assignment prompt/i)).toHaveValue('Test prompt');
    // Previous button should now be enabled
    expect(screen.getByRole('button', { name: /previous/i })).toBeEnabled();
    // Move back to previous step
    fireEvent.click(screen.getByRole('button', { name: /previous/i }));
    expect(screen.getByTestId('workflow-stepper')).toHaveTextContent(/step 1 of 4/i);
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

  it('calls /api/generate with prompt, outline, references and displays generated content', async () => {
    const mockResearch = [
      { title: 'Paper 1', authors: ['Alice'], year: 2020, citation: '(Alice, 2020) Paper 1.' },
      { title: 'Paper 2', authors: ['Bob'], year: 2019, citation: '(Bob, 2019) Paper 2.' }
    ];
    const mockOutline = 'I. Introduction\nII. Main Point 1\nIII. Main Point 2\nIV. Conclusion';
    const mockContent = 'This is the generated academic paper content.';
    vi.stubGlobal('fetch', vi.fn((url) => {
      if (typeof url === 'string' && url.includes('/api/research')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ references: mockResearch })
        });
      }
      if (typeof url === 'string' && url.includes('/api/outline')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ outline: mockOutline })
        });
      }
      if (typeof url === 'string' && url.includes('/api/generate')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ content: mockContent })
        });
      }
      return Promise.reject(new Error('Unknown endpoint'));
    }));
    render(<WorkflowUI />);
    // Enter prompt and go to step 2
    fireEvent.change(screen.getByLabelText(/assignment prompt/i), { target: { value: 'Test prompt' } });
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    // Wait for outline to load
    await waitFor(() => {
      expect(screen.getByText(/introduction/i)).toBeInTheDocument();
    });
    // Go to step 3 (research)
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    await waitFor(() => {
      expect(screen.getByTestId('reference-0')).toBeInTheDocument();
    });
    // Click Next to trigger generate API call
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    // Loading indicator should appear
    expect(screen.getByText(/generating content/i)).toBeInTheDocument();
    // Wait for generated content to appear
    await waitFor(() => {
      expect(screen.getByText(/generated academic paper content/i)).toBeInTheDocument();
    });
  });

  // RED PHASE: Failing tests for robust API integration and state management
  it('shows loading indicator and handles error for /api/outline call', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: false })));
    render(<WorkflowUI />);
    fireEvent.change(screen.getByLabelText(/assignment prompt/i), { target: { value: 'Prompt' } });
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(screen.getByText(/loading outline/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(/error loading outline/i)).toBeInTheDocument();
    });
  });

  it('shows loading indicator and handles error for /api/research call', async () => {
    vi.stubGlobal('fetch', vi.fn((url) => {
      if (typeof url === 'string' && url.includes('/api/outline')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ outline: 'I. Introduction' }) });
      }
      return Promise.resolve({ ok: false });
    }));
    render(<WorkflowUI />);
    fireEvent.change(screen.getByLabelText(/assignment prompt/i), { target: { value: 'Prompt' } });
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    await waitFor(() => {
      expect(screen.getByText(/introduction/i)).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(screen.getByText(/loading research/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(/error loading research/i)).toBeInTheDocument();
    });
  });

  it('shows loading indicator and handles error for /api/generate call', async () => {
    vi.stubGlobal('fetch', vi.fn((url) => {
      if (typeof url === 'string' && url.includes('/api/outline')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ outline: 'I. Introduction' }) });
      }
      if (typeof url === 'string' && url.includes('/api/research')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ references: [{ title: 'Paper', authors: ['A'], year: 2020, citation: '(A, 2020) Paper.' }] }) });
      }
      return Promise.resolve({ ok: false });
    }));
    render(<WorkflowUI />);
    fireEvent.change(screen.getByLabelText(/assignment prompt/i), { target: { value: 'Prompt' } });
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    await waitFor(() => {
      expect(screen.getByText(/introduction/i)).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    await waitFor(() => {
      expect(screen.getByTestId('reference-0')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(screen.getByText(/generating content/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(/error generating content/i)).toBeInTheDocument();
    });
  });

  it('persists prompt and outline state across navigation steps', async () => {
    vi.stubGlobal('fetch', vi.fn((url) => {
      if (typeof url === 'string' && url.includes('/api/outline')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ outline: 'I. Introduction' }) });
      }
      if (typeof url === 'string' && url.includes('/api/research')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ references: [{ title: 'Paper', authors: ['A'], year: 2020, citation: '(A, 2020) Paper.' }] }) });
      }
      if (typeof url === 'string' && url.includes('/api/generate')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ content: 'Generated content.' }) });
      }
      return Promise.reject(new Error('Unknown endpoint'));
    }));
    render(<WorkflowUI />);
    fireEvent.change(screen.getByLabelText(/assignment prompt/i), { target: { value: 'Prompt' } });
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    await waitFor(() => {
      expect(screen.getByText(/introduction/i)).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    await waitFor(() => {
      expect(screen.getByTestId('reference-0')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /previous/i }));
    expect(screen.getByText(/introduction/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/assignment prompt/i)).toHaveValue('Prompt');
  });

  // RED PHASE: Failing tests for PDF and Word export
  it('shows a PDF export button when content is generated', async () => {
    const mockReferences = [
      { title: 'Paper 1', authors: ['Alice'], year: 2020, citation: '(Alice, 2020) Paper 1.' }
    ];
    vi.stubGlobal('fetch', vi.fn((url) => {
      if (typeof url === 'string' && url.includes('/api/outline')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ outline: 'I. Introduction' }) });
      }
      if (typeof url === 'string' && url.includes('/api/research')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ references: mockReferences }) });
      }
      if (typeof url === 'string' && url.includes('/api/generate')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ content: 'Generated content.' }) });
      }
      return Promise.reject(new Error('Unknown endpoint'));
    }));
    render(<WorkflowUI />);
    fireEvent.change(screen.getByLabelText(/assignment prompt/i), { target: { value: 'Prompt' } });
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    await waitFor(() => {
      expect(screen.getByText(/introduction/i)).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    await waitFor(() => {
      expect(screen.getByTestId('reference-0')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    await waitFor(() => {
      expect(screen.getByText(/generated content/i)).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /export pdf/i })).toBeInTheDocument();
  });

  it('shows a Word export button when content is generated', async () => {
    const mockReferences = [
      { title: 'Paper 1', authors: ['Alice'], year: 2020, citation: '(Alice, 2020) Paper 1.' }
    ];
    vi.stubGlobal('fetch', vi.fn((url) => {
      if (typeof url === 'string' && url.includes('/api/outline')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ outline: 'I. Introduction' }) });
      }
      if (typeof url === 'string' && url.includes('/api/research')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ references: mockReferences }) });
      }
      if (typeof url === 'string' && url.includes('/api/generate')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ content: 'Generated content.' }) });
      }
      return Promise.reject(new Error('Unknown endpoint'));
    }));
    render(<WorkflowUI />);
    fireEvent.change(screen.getByLabelText(/assignment prompt/i), { target: { value: 'Prompt' } });
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    await waitFor(() => {
      expect(screen.getByText(/introduction/i)).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    await waitFor(() => {
      expect(screen.getByTestId('reference-0')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    await waitFor(() => {
      expect(screen.getByText(/generated content/i)).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /export word/i })).toBeInTheDocument();
  });

  it('clicking PDF export triggers PDF download/output', async () => {
    const mockReferences = [
      { title: 'Paper 1', authors: ['Alice'], year: 2020, citation: '(Alice, 2020) Paper 1.' }
    ];
    vi.stubGlobal('fetch', vi.fn((url) => {
      if (typeof url === 'string' && url.includes('/api/outline')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ outline: 'I. Introduction' }) });
      }
      if (typeof url === 'string' && url.includes('/api/research')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ references: mockReferences }) });
      }
      if (typeof url === 'string' && url.includes('/api/generate')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ content: 'Generated content.' }) });
      }
      return Promise.reject(new Error('Unknown endpoint'));
    }));
    render(<WorkflowUI />);
    fireEvent.change(screen.getByLabelText(/assignment prompt/i), { target: { value: 'Prompt' } });
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    await waitFor(() => {
      expect(screen.getByText(/introduction/i)).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    await waitFor(() => {
      expect(screen.getByTestId('reference-0')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    await waitFor(() => {
      expect(screen.getByText(/generated content/i)).toBeInTheDocument();
    });
    const exportBtn = screen.getByRole('button', { name: /export pdf/i });
    fireEvent.click(exportBtn);
    // For now, just check that PDF output appears in the DOM (could be modal, link, etc.)
    await waitFor(() => {
      expect(screen.getByText(/pdf export not implemented/i)).toBeInTheDocument();
    });
  });

  it('clicking Word export triggers Word download/output', async () => {
    const mockReferences = [
      { title: 'Paper 1', authors: ['Alice'], year: 2020, citation: '(Alice, 2020) Paper 1.' }
    ];
    vi.stubGlobal('fetch', vi.fn((url) => {
      if (typeof url === 'string' && url.includes('/api/outline')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ outline: 'I. Introduction' }) });
      }
      if (typeof url === 'string' && url.includes('/api/research')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ references: mockReferences }) });
      }
      if (typeof url === 'string' && url.includes('/api/generate')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ content: 'Generated content.' }) });
      }
      return Promise.reject(new Error('Unknown endpoint'));
    }));
    render(<WorkflowUI />);
    fireEvent.change(screen.getByLabelText(/assignment prompt/i), { target: { value: 'Prompt' } });
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    await waitFor(() => {
      expect(screen.getByText(/introduction/i)).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    await waitFor(() => {
      expect(screen.getByTestId('reference-0')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    await waitFor(() => {
      expect(screen.getByText(/generated content/i)).toBeInTheDocument();
    });
    const exportBtn = screen.getByRole('button', { name: /export word/i });
    fireEvent.click(exportBtn);
    // For now, just check that Word output appears in the DOM (could be modal, link, etc.)
    await waitFor(() => {
      expect(screen.getByText(/word export not implemented/i)).toBeInTheDocument();
    });
  });
}); 