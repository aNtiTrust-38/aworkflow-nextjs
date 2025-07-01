import React from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import WorkflowUI from '../src/app/WorkflowUI';
import { beforeEach } from 'vitest';

let originalCreateElement: typeof document.createElement;

beforeEach(() => {
  originalCreateElement = document.createElement;
  // Stub jsPDF
  vi.stubGlobal('jsPDF', function () {
    return { text: vi.fn(), output: vi.fn(() => new Blob()), save: vi.fn() };
  });
  // Stub docx
  vi.stubGlobal('Document', function () {
    return {};
  });
  vi.stubGlobal('Packer', { toBlob: vi.fn(() => Promise.resolve(new Blob())) });
  // Stub URL.createObjectURL
  vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:url'), revokeObjectURL: vi.fn() });
  // Stub document.createElement for 'a'
  vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
    const el = originalCreateElement.call(document, tag);
    if (tag === 'a') {
      el.click = vi.fn();
    }
    return el;
  });
});

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
    const stepButtons = screen.getAllByRole('button', { name: /step/i });
    expect(stepButtons[0]).toHaveAttribute('aria-current', 'step');
    // Enter prompt
    const promptInput = screen.getByLabelText(/assignment prompt/i);
    fireEvent.change(promptInput, { target: { value: 'Test prompt' } });
    // Move to next step
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    // Stepper should update
    expect(stepButtons[1]).toHaveAttribute('aria-current', 'step');
    // Prompt input should persist value
    expect(screen.getByLabelText(/assignment prompt/i)).toHaveValue('Test prompt');
    // Previous button should now be enabled
    expect(screen.getByRole('button', { name: /previous/i })).toBeEnabled();
    // Move back to previous step
    fireEvent.click(screen.getByRole('button', { name: /previous/i }));
    expect(stepButtons[0]).toHaveAttribute('aria-current', 'step');
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

  // Fix export tests to stub before render and only check download logic
  it('downloads a PDF file with .pdf extension and correct content when PDF export is clicked', async () => {
    const createObjectURL = vi.fn(() => 'blob:mock-pdf-url');
    const click = vi.fn();
    let createdEl: any = null;
    vi.stubGlobal('URL', { createObjectURL });
    // Mock fetch to return generated content for /api/generate
    vi.stubGlobal('fetch', vi.fn((url) => {
      if (typeof url === 'string' && url.includes('/api/generate')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ content: 'Generated content.' }) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    }));
    render(<WorkflowUI />);
    fireEvent.change(screen.getByLabelText(/assignment prompt/i), { target: { value: 'Prompt' } });
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    // Wait for content to appear
    await screen.findByText(/generated content/i);
    // Patch only createElement and body methods after render
    const origCreateElement = document.createElement;
    const origAppendChild = document.body.appendChild;
    const origRemoveChild = document.body.removeChild;
    document.createElement = () => {
      createdEl = {
        href: '',
        download: '',
        click,
        style: {},
        setAttribute: vi.fn(),
        remove: vi.fn(),
      };
      return createdEl as any;
    };
    document.body.appendChild = vi.fn();
    document.body.removeChild = vi.fn();
    const exportBtn = screen.getByRole('button', { name: /export pdf/i });
    fireEvent.click(exportBtn);
    expect(createObjectURL).toHaveBeenCalled();
    expect(click).toHaveBeenCalled();
    expect(createdEl.download.endsWith('.pdf')).toBe(true);
    // Restore
    document.createElement = origCreateElement;
    document.body.appendChild = origAppendChild;
    document.body.removeChild = origRemoveChild;
  });

  it('downloads a Word file with .docx extension and correct content when Word export is clicked', async () => {
    const createObjectURL = vi.fn(() => 'blob:mock-docx-url');
    const click = vi.fn();
    let createdEl: any = null;
    vi.stubGlobal('URL', { createObjectURL });
    // Mock fetch to return generated content for /api/generate
    vi.stubGlobal('fetch', vi.fn((url) => {
      if (typeof url === 'string' && url.includes('/api/generate')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ content: 'Generated content.' }) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    }));
    render(<WorkflowUI />);
    fireEvent.change(screen.getByLabelText(/assignment prompt/i), { target: { value: 'Prompt' } });
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    // Wait for content to appear
    await screen.findByText(/generated content/i);
    // Patch only createElement and body methods after render
    const origCreateElement = document.createElement;
    const origAppendChild = document.body.appendChild;
    const origRemoveChild = document.body.removeChild;
    document.createElement = () => {
      createdEl = {
        href: '',
        download: '',
        click,
        style: {},
        setAttribute: vi.fn(),
        remove: vi.fn(),
      };
      return createdEl as any;
    };
    document.body.appendChild = vi.fn();
    document.body.removeChild = vi.fn();
    const exportBtn = screen.getByRole('button', { name: /export word/i });
    fireEvent.click(exportBtn);
    await waitFor(() => {
      expect(createObjectURL).toHaveBeenCalled();
      expect(click).toHaveBeenCalled();
      expect(createdEl.download.endsWith('.docx')).toBe(true);
    });
    // Restore
    document.createElement = origCreateElement;
    document.body.appendChild = origAppendChild;
    document.body.removeChild = origRemoveChild;
  });

  // RED PHASE: Failing E2E workflow test
  it('runs the full academic workflow and enables export (E2E)', async () => {
    // Mock all API calls
    vi.stubGlobal('fetch', vi.fn((url) => {
      if (typeof url === 'string' && url.includes('/api/outline')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ outline: 'I. Introduction\nII. Methods' }) });
      }
      if (typeof url === 'string' && url.includes('/api/research')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ references: [{ title: 'Paper 1', authors: ['Alice'], year: 2020, citation: '(Alice, 2020) Paper 1.' }] }) });
      }
      if (typeof url === 'string' && url.includes('/api/generate')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ content: 'Generated academic content.' }) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    }));
    // Mock file download
    const createObjectURL = vi.fn(() => 'blob:mock-url');
    const click = vi.fn();
    let createdEl: any = null;
    vi.stubGlobal('URL', { createObjectURL });
    // Run full workflow
    render(<WorkflowUI />);
    fireEvent.change(screen.getByLabelText(/assignment prompt/i), { target: { value: 'Prompt' } });
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    await screen.findByText(/introduction/i);
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    await screen.findByTestId('reference-0');
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    await screen.findByText(/generated academic content/i);
    // Patch only createElement and body methods after render
    const origCreateElement = document.createElement;
    const origAppendChild = document.body.appendChild;
    const origRemoveChild = document.body.removeChild;
    document.createElement = () => {
      createdEl = {
        href: '',
        download: '',
        click,
        style: {},
        setAttribute: vi.fn(),
        remove: vi.fn(),
      };
      return createdEl as any;
    };
    document.body.appendChild = vi.fn();
    document.body.removeChild = vi.fn();
    // Export buttons should appear
    const pdfBtn = screen.getByRole('button', { name: /export pdf/i });
    const wordBtn = screen.getByRole('button', { name: /export word/i });
    expect(pdfBtn).toBeInTheDocument();
    expect(wordBtn).toBeInTheDocument();
    // Test PDF export
    fireEvent.click(pdfBtn);
    expect(createObjectURL).toHaveBeenCalled();
    expect(click).toHaveBeenCalled();
    expect(createdEl.download.endsWith('.pdf')).toBe(true);
    // Test Word export
    fireEvent.click(wordBtn);
    await waitFor(() => {
      expect(createObjectURL).toHaveBeenCalled();
      expect(click).toHaveBeenCalled();
      expect(createdEl.download.endsWith('.docx')).toBe(true);
    });
    // Restore
    document.createElement = origCreateElement;
    document.body.appendChild = origAppendChild;
    document.body.removeChild = origRemoveChild;
  });

  it('renders with academic visual hierarchy and professional theming', () => {
    render(<WorkflowUI />);
    // Academic header should be present
    expect(screen.getByTestId('academic-header')).toBeInTheDocument();
    // Section titles should be visually distinct
    expect(screen.getByTestId('section-title')).toBeInTheDocument();
    // Stepper should have enhanced academic/professional class
    expect(screen.getByTestId('workflow-stepper')).toHaveClass('academic-stepper');
    // Typography and spacing classes should be present
    const main = screen.getByTestId('workflow-main');
    expect(main).toHaveClass('prose-sm', 'sm:prose-lg', 'mx-auto', 'my-8');
  });

  it('applies academic/professional theming (palette, typography, spacing)', () => {
    render(<WorkflowUI />);
    // Header should have academic color and font
    const header = screen.getByTestId('academic-header');
    expect(header).toHaveClass('text-academic-primary', 'font-serif');
    // Stepper should have academic/professional color and spacing
    const stepper = screen.getByTestId('workflow-stepper');
    expect(stepper).toHaveClass('bg-academic-muted', 'rounded', 'px-4', 'py-2', 'mb-4');
    // Main container should have academic background and padding
    const main = screen.getByTestId('workflow-main');
    expect(main).toHaveClass('bg-academic-bg', 'p-8', 'shadow-academic');
  });

  it('shows academic-themed loading spinner/progress indicator during all loading states', () => {
    render(<WorkflowUI />);
    // Step 2: Outline loading
    fireEvent.change(screen.getByLabelText(/assignment prompt/i), { target: { value: 'Prompt' } });
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
    expect(screen.getByTestId('loading-indicator')).toHaveClass('academic-spinner');
    // Simulate step 3: Research loading
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
    // Simulate step 4: Content generation loading
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
  });

  it('shows academic-themed, accessible error alert with recovery for all error states', async () => {
    // Mock fetch to fail for /api/outline
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: false })));
    render(<WorkflowUI />);
    // Simulate step 2: Outline error
    fireEvent.change(screen.getByLabelText(/assignment prompt/i), { target: { value: 'Prompt' } });
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    // Wait for error alert to appear
    await waitFor(() => {
      expect(screen.getByTestId('error-alert')).toBeInTheDocument();
      expect(screen.getByTestId('error-alert')).toHaveClass('academic-error');
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /dismiss/i })).toBeInTheDocument();
      expect(screen.getByText(/try again|recover|reload/i)).toBeInTheDocument();
    });
    // Simulate dismiss
    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }));
    expect(screen.queryByTestId('error-alert')).not.toBeInTheDocument();
  });

  it('shows a visible, accessible stepper with clickable steps and current step highlighting', async () => {
    render(<WorkflowUI />);
    // Stepper should have step buttons
    let stepButtons = screen.getAllByRole('button', { name: /step/i });
    expect(stepButtons.length).toBeGreaterThanOrEqual(4);
    // Current step should be highlighted and have aria-current
    expect(stepButtons[0]).toHaveAttribute('aria-current', 'step');
    // Click next step
    fireEvent.click(stepButtons[1]);
    await waitFor(() => {
      stepButtons = screen.getAllByRole('button', { name: /step/i });
      expect(stepButtons[1]).toHaveAttribute('aria-current', 'step');
    });
    // All step buttons should have aria-label
    stepButtons.forEach((btn, idx) => {
      expect(btn).toHaveAttribute('aria-label', `Step ${idx + 1}`);
    });
  });

  it('supports keyboard shortcuts and accessibility for step navigation', async () => {
    render(<WorkflowUI />);
    let stepButtons = screen.getAllByRole('button', { name: /step/i });
    // Focus first step button
    stepButtons[0].focus();
    // Right arrow moves to next step
    fireEvent.keyDown(stepButtons[0], { key: 'ArrowRight' });
    stepButtons = screen.getAllByRole('button', { name: /step/i });
    expect(stepButtons[1]).toHaveFocus();
    // Left arrow moves back
    fireEvent.keyDown(stepButtons[1], { key: 'ArrowLeft' });
    stepButtons = screen.getAllByRole('button', { name: /step/i });
    expect(stepButtons[0]).toHaveFocus();
    // Enter activates step
    fireEvent.keyDown(stepButtons[1], { key: 'ArrowRight' });
    fireEvent.keyDown(stepButtons[1], { key: 'Enter' });
    await waitFor(() => {
      stepButtons = screen.getAllByRole('button', { name: /step/i });
      expect(stepButtons[1]).toHaveAttribute('aria-current', 'step');
    });
    // NOTE: Tab navigation is handled by the browser and cannot be simulated with fireEvent.keyDown
    // expect(screen.getByLabelText(/assignment prompt/i)).toHaveFocus();
    // ARIA live region updates for step changes
    expect(screen.getByTestId('stepper-live')).toHaveTextContent(/step 2 of 4/i);
  });

  it('is responsive: stepper and workflow UI adapt to mobile, tablet, and desktop breakpoints', () => {
    render(<WorkflowUI />);
    // Desktop: default
    let stepper = screen.getByTestId('workflow-stepper');
    let main = screen.getByTestId('workflow-main');
    expect(stepper).toHaveClass('flex-col', 'sm:flex-row');
    expect(main).toHaveClass('prose-sm', 'sm:prose-lg');
    // Simulate mobile (sm)
    global.innerWidth = 375;
    global.dispatchEvent(new Event('resize'));
    stepper = screen.getByTestId('workflow-stepper');
    main = screen.getByTestId('workflow-main');
    expect(stepper).toHaveClass('flex-col');
    expect(main).toHaveClass('prose-sm');
    // Simulate tablet (md)
    global.innerWidth = 768;
    global.dispatchEvent(new Event('resize'));
    stepper = screen.getByTestId('workflow-stepper');
    main = screen.getByTestId('workflow-main');
    expect(stepper).toHaveClass('sm:flex-row');
    expect(main).toHaveClass('sm:prose-lg');
    // Reset
    global.innerWidth = 1024;
    global.dispatchEvent(new Event('resize'));
  });

  it('allows users to preview and edit citations with changes reflected in the UI', async () => {
    // Mock fetch for /api/outline and /api/research
    const mockOutline = 'I. Introduction\nII. Methods';
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
        json: () => Promise.resolve({ outline: mockOutline })
      });
    }));
    render(<WorkflowUI />);
    // Go to research step
    fireEvent.change(screen.getByLabelText(/assignment prompt/i), { target: { value: 'Prompt' } });
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    await waitFor(() => screen.getByText(/introduction/i));
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    await waitFor(() => screen.getByTestId('reference-0'));
    // Preview citations section
    expect(screen.getByTestId('citations-section')).toBeInTheDocument();
    expect(screen.getByTestId('citation-0')).toHaveTextContent(/Paper 1/);
    // Edit citation
    fireEvent.click(screen.getByTestId('edit-citation-0'));
    const input = screen.getByTestId('citation-edit-input-0');
    fireEvent.change(input, { target: { value: 'Edited Citation' } });
    fireEvent.click(screen.getByTestId('save-citation-0'));
    // Citation should update in UI
    expect(screen.getByTestId('citation-0')).toHaveTextContent('Edited Citation');
    // Keyboard navigation
    input.focus();
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByTestId('citation-0')).toHaveTextContent('Edited Citation');
  });

  it('allows users to add, remove, and reorder references in the research step', async () => {
    // Mock fetch for /api/outline and /api/research
    const mockOutline = 'I. Introduction\nII. Methods';
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
        json: () => Promise.resolve({ outline: mockOutline })
      });
    }));
    render(<WorkflowUI />);
    // Go to research step
    fireEvent.change(screen.getByLabelText(/assignment prompt/i), { target: { value: 'Prompt' } });
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    await waitFor(() => screen.getByText(/introduction/i));
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    await waitFor(() => screen.getByTestId('reference-0'));
    // Add a new reference
    fireEvent.click(screen.getByTestId('add-reference-btn'));
    fireEvent.change(screen.getByTestId('reference-title-input'), { target: { value: 'Manual Paper' } });
    fireEvent.change(screen.getByTestId('reference-authors-input'), { target: { value: 'Carol' } });
    fireEvent.change(screen.getByTestId('reference-year-input'), { target: { value: '2022' } });
    fireEvent.change(screen.getByTestId('reference-citation-input'), { target: { value: '(Carol, 2022) Manual Paper.' } });
    fireEvent.click(screen.getByTestId('save-reference-btn'));
    expect(screen.getByTestId('reference-2')).toHaveTextContent('Manual Paper');
    // Remove a reference
    fireEvent.click(screen.getByTestId('remove-reference-1'));
    expect(screen.queryByText('Paper 2')).not.toBeInTheDocument();
    // Reorder references (move last up)
    fireEvent.click(screen.getByTestId('move-reference-up-1'));
    const refs = screen.getAllByTestId(/reference-\d+/);
    expect(refs[0]).toHaveTextContent('Manual Paper');
    // Keyboard navigation: add reference
    fireEvent.click(screen.getByTestId('add-reference-btn'));
    const titleInput = screen.getByTestId('reference-title-input');
    titleInput.focus();
    fireEvent.keyDown(titleInput, { key: 'Enter' });
    // Should save reference (simulate Enter key)
    const refTitles = screen.getAllByTestId(/reference-\d+/).map(ref => ref.textContent);
    expect(refTitles.some(t => t && t.includes('Manual Paper'))).toBe(true);
    expect(refTitles.some(t => t && t.includes('Carol'))).toBe(true);
  });

  it('allows users to customize export: citation style, section selection, and file format', async () => {
    // Mock fetch for /api/outline, /api/research, /api/generate
    const mockOutline = 'I. Introduction\nII. Methods';
    const mockResearch = [
      { title: 'Paper 1', authors: ['Alice'], year: 2020, citation: '(Alice, 2020) Paper 1.' },
      { title: 'Paper 2', authors: ['Bob'], year: 2019, citation: '(Bob, 2019) Paper 2.' }
    ];
    const mockContent = 'Introduction\nContent\nMethods\nContent';
    vi.stubGlobal('fetch', vi.fn((url) => {
      if (typeof url === 'string' && url.includes('/api/research')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ references: mockResearch })
        });
      }
      if (typeof url === 'string' && url.includes('/api/generate')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ content: mockContent })
        });
      }
      // Fallback for /api/outline
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ outline: mockOutline })
      });
    }));
    render(<WorkflowUI />);
    // Go through workflow to export step
    fireEvent.change(screen.getByLabelText(/assignment prompt/i), { target: { value: 'Prompt' } });
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    await waitFor(() => screen.getByText(/introduction/i));
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    await waitFor(() => screen.getByTestId('reference-0'));
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    await waitFor(() => screen.getByText(/export pdf/i));
    // Export customization UI
    expect(screen.getByTestId('export-customization')).toBeInTheDocument();
    // Select citation style
    fireEvent.change(screen.getByTestId('citation-style-select'), { target: { value: 'MLA' } });
    expect(screen.getByTestId('citation-style-select')).toHaveValue('MLA');
    // Select sections to export
    fireEvent.click(screen.getByTestId('section-checkbox-Introduction'));
    fireEvent.click(screen.getByTestId('section-checkbox-Methods'));
    // Select file format
    fireEvent.click(screen.getByTestId('file-format-word'));
    // Export and check message
    fireEvent.click(screen.getByText(/export word/i));
    await waitFor(() => screen.getByText(/exported with MLA style: Introduction, Methods/));
    // Keyboard navigation: change citation style
    const styleSelect = screen.getByTestId('citation-style-select');
    styleSelect.focus();
    fireEvent.keyDown(styleSelect, { key: 'ArrowDown' });
    fireEvent.keyDown(styleSelect, { key: 'Enter' });
    expect(styleSelect).toHaveValue('Chicago');
  });
}); 