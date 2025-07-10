import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import WorkflowUI from '../src/app/WorkflowUI';
import CommandPalette from '../components/CommandPalette';

// Mock fetch for API calls
global.fetch = vi.fn();

describe('Command Palette', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    cleanup(); // Ensure DOM is cleaned up after each test
  });

  describe('Basic Functionality', () => {
    it('should open command palette when Ctrl+K is pressed', async () => {
      render(<WorkflowUI />);

      // Initially command palette should not be visible
      expect(screen.queryByTestId('command-palette')).not.toBeInTheDocument();

      // Press Ctrl+K
      fireEvent.keyDown(document, { key: 'k', ctrlKey: true });

      // Command palette modal should appear
      await waitFor(() => {
        expect(screen.getByTestId('command-palette')).toBeInTheDocument();
      });
    });

    it('should close command palette when Escape is pressed', async () => {
      render(<WorkflowUI />);

      // Open command palette
      fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
      await waitFor(() => {
        expect(screen.getByTestId('command-palette')).toBeInTheDocument();
      });

      // Press Escape to close
      fireEvent.keyDown(document, { key: 'Escape' });
      await waitFor(() => {
        expect(screen.queryByTestId('command-palette')).not.toBeInTheDocument();
      });
    });

    it('should display navigation commands', async () => {
      render(<WorkflowUI />);

      fireEvent.keyDown(document, { key: 'k', ctrlKey: true });

      await waitFor(() => {
        expect(screen.getByTestId('command-palette')).toBeInTheDocument();
        // Should show basic navigation commands
        const options = screen.getAllByRole('option');
        // At step 1, only 'Next Step' is present, not 'Previous Step'
        expect(options.some(opt => /next step/i.test(opt.textContent || ''))).toBe(true);
        // expect(options.some(opt => /previous step/i.test(opt.textContent || ''))).toBe(true);
      });
    });

    it('should filter commands based on search input', async () => {
      render(<WorkflowUI />);

      fireEvent.keyDown(document, { key: 'k', ctrlKey: true });

      // There are multiple textboxes (assignment prompt and command palette search)
      // Find the search input inside the command palette
      const searchInputs = await screen.findAllByRole('textbox');
      // The command palette search input has placeholder 'Search commands...'
      const searchInput = searchInputs.find(input => input.getAttribute('placeholder') === 'Search commands...');
      expect(searchInput).toBeDefined();
      // Type "export" to filter
      fireEvent.change(searchInput!, { target: { value: 'export' } });

      await waitFor(() => {
        // Should show export commands in the command palette
        const exportOptions = screen.getAllByText(/export/i);
        expect(exportOptions.length).toBeGreaterThan(0);
      });
    });

    it('should execute commands when clicked', async () => {
      render(<WorkflowUI />);

      fireEvent.keyDown(document, { key: 'k', ctrlKey: true });

      await waitFor(() => {
        expect(screen.getByTestId('command-palette')).toBeInTheDocument();
      });

      // Click on a navigation command
      const nextStepCommand = screen.getByText(/next step/i);
      fireEvent.click(nextStepCommand);

      await waitFor(() => {
        // Command palette should close after execution
        expect(screen.queryByTestId('command-palette')).not.toBeInTheDocument();
      });
    });
  });

  it('should display a Recent section with most recently used commands', async () => {
    // Simulate command usage
    const CommandHistory = await import('../lib/command-history');
    CommandHistory.clearHistory();
    CommandHistory.addCommandUsage('export-pdf');
    CommandHistory.addCommandUsage('next-step');
    CommandHistory.addCommandUsage('reset-workflow');

    render(<WorkflowUI />);
    fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
    await waitFor(() => {
      expect(screen.getByTestId('command-palette')).toBeInTheDocument();
    });
    // Should show a Recent section
    expect(screen.getByText(/recent/i)).toBeInTheDocument();
    // Should show the most recent commands in order
    const items = screen.getAllByTestId('recent-command-item');
    expect(items[0].textContent).toMatch(/reset-workflow/i);
    expect(items[1].textContent).toMatch(/next-step/i);
    expect(items[2].textContent).toMatch(/export-pdf/i);
  });

  it('should display a Suggested section with context-aware recommendations', async () => {
    // Simulate being on step 3 (RESEARCH)
    render(<WorkflowUI />);
    // Move to step 3 (RESEARCH)
    fireEvent.keyDown(document, { key: '3', ctrlKey: true });
    // Simulate using 'start-research' command
    const CommandHistory = await import('../lib/command-history');
    CommandHistory.clearHistory();
    CommandHistory.addCommandUsage('start-research');
    // Open command palette
    fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
    await waitFor(() => {
      expect(screen.getByTestId('command-palette')).toBeInTheDocument();
    });
    // Should show a Suggested section
    expect(screen.getByText(/suggested/i)).toBeInTheDocument();
    // Should suggest 'Generate Content' as the next logical command
    expect(screen.getByTestId('suggested-command-item').textContent).toMatch(/generate content/i);
  });
});

describe('Command Palette Performance', () => {
  it('should track search performance metrics', () => {
    // Mount the CommandPalette
    const onClose = vi.fn();
    const onNavigate = vi.fn();
    const onAction = vi.fn();
    render(
      <CommandPalette
        isOpen={true}
        onClose={onClose}
        currentStep={1}
        onNavigate={onNavigate}
        onAction={onAction}
      />
    );
    // Simulate search
    const input = document.querySelector('input[aria-label="Search commands"]') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'export' } });
    // Expect some performance metric to be tracked (stub)
    // e.g., window.__COMMAND_PALETTE_METRICS__ or similar
    expect((window as any).__COMMAND_PALETTE_METRICS__).toBeDefined();
    expect((window as any).__COMMAND_PALETTE_METRICS__.lastSearchTimeMs).toBeGreaterThanOrEqual(0);
  });

  it('should cache frequently used commands', () => {
    // Simulate repeated command searches
    // Expect a cache to be populated (stub)
    expect((window as any).__COMMAND_PALETTE_CACHE__).toBeDefined();
    expect(Array.isArray((window as any).__COMMAND_PALETTE_CACHE__.commands)).toBe(true);
  });

  it('should lazy-load command definitions', () => {
    // Simulate opening the palette and searching
    // Expect command definitions to be loaded on demand (stub)
    expect((window as any).__COMMAND_PALETTE_LAZY_LOADED__).toBe(true);
  });
});

describe('Command Palette Fuzzy Search Optimization', () => {
  it('should perform under 100ms with 1000+ commands (virtualized)', () => {
    // Simulate a large command set
    const onClose = vi.fn();
    const onNavigate = vi.fn();
    const onAction = vi.fn();
    const manyCommands = Array.from({ length: 1000 }, (_, i) => ({
      id: `cmd-${i}`,
      label: `Command ${i}`,
      category: 'action',
      action: () => {},
      priority: 1,
    }));
    // Inject into window for test
    (window as any).__COMMAND_PALETTE_COMMANDS__ = manyCommands;
    const start = performance.now();
    render(
      <CommandPalette
        isOpen={true}
        onClose={onClose}
        currentStep={1}
        onNavigate={onNavigate}
        onAction={onAction}
      />
    );
    const input = document.querySelector('input[aria-label="Search commands"]') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Command 999' } });
    const end = performance.now();
    expect(end - start).toBeLessThan(100);
  });

  it('should use optimized Fuse.js config for accuracy and speed', () => {
    // Expect Fuse.js config to be present and tuned
    expect((window as any).__COMMAND_PALETTE_FUSE_CONFIG__).toBeDefined();
    expect((window as any).__COMMAND_PALETTE_FUSE_CONFIG__.threshold).toBeLessThanOrEqual(0.3);
  });

  it('should debounce search input for responsiveness', async () => {
    // Simulate rapid input
    const onClose = vi.fn();
    const onNavigate = vi.fn();
    const onAction = vi.fn();
    render(
      <CommandPalette
        isOpen={true}
        onClose={onClose}
        currentStep={1}
        onNavigate={onNavigate}
        onAction={onAction}
      />
    );
    const input = document.querySelector('input[aria-label="Search commands"]') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'a' } });
    fireEvent.change(input, { target: { value: 'ab' } });
    fireEvent.change(input, { target: { value: 'abc' } });
    // Wait for debounce (stub: 50ms)
    await new Promise(res => setTimeout(res, 60));
    expect((window as any).__COMMAND_PALETTE_DEBOUNCED__).toBe(true);
  });
});

describe('Citation Commands', () => {
  it('should add citation style switching commands', () => {
    // Mount the CommandPalette
    const onClose = vi.fn();
    const onNavigate = vi.fn();
    const onAction = vi.fn();
    render(
      <CommandPalette
        isOpen={true}
        onClose={onClose}
        currentStep={6}
        onNavigate={onNavigate}
        onAction={onAction}
      />
    );
    // Simulate style switch command
    fireEvent.change(document.querySelector('select')!, { target: { value: 'MLA' } });
    // Expect citation style to be updated (stub)
    expect((window as any).__CITATION_STYLE__).toBe('MLA');
  });

  it('should support quick citation insertion', () => {
    (window as any).__CITATION_INSERTED__ = false;
    const onClose = vi.fn();
    const onNavigate = vi.fn();
    const onAction = vi.fn();
    render(
      <CommandPalette
        isOpen={true}
        onClose={onClose}
        currentStep={4}
        onNavigate={onNavigate}
        onAction={onAction}
      />
    );
    // Simulate user clicking the 'Insert Citation' command
    const insertBtn = screen.getAllByText(/Insert Citation/i)[0];
    fireEvent.click(insertBtn);
    expect((window as any).__CITATION_INSERTED__).toBe(true);
  });

  it('should handle citation format validation', () => {
    (window as any).__CITATION_VALID__ = false;
    const onClose = vi.fn();
    const onNavigate = vi.fn();
    const onAction = vi.fn();
    render(
      <CommandPalette
        isOpen={true}
        onClose={onClose}
        currentStep={6}
        onNavigate={onNavigate}
        onAction={onAction}
      />
    );
    // Simulate user clicking the 'Validate Citation' command
    const validateBtn = screen.getAllByText(/Validate Citation/i)[0];
    fireEvent.click(validateBtn);
    expect((window as any).__CITATION_VALID__).toBe(true);
  });
});

describe('Export Format Commands', () => {
  it('should trigger PDF, Word, and Zotero export commands', () => {
    (window as any).__EXPORT_PDF__ = false;
    (window as any).__EXPORT_WORD__ = false;
    (window as any).__EXPORT_ZOTERO__ = false;
    const onClose = vi.fn();
    const onNavigate = vi.fn();
    const onAction = vi.fn();
    render(
      <CommandPalette
        isOpen={true}
        onClose={onClose}
        currentStep={6}
        onNavigate={onNavigate}
        onAction={onAction}
      />
    );
    // PDF
    const pdfBtn = screen.getAllByText(/Export PDF/i)[0];
    fireEvent.click(pdfBtn);
    expect((window as any).__EXPORT_PDF__).toBe(true);
    // Word
    const wordBtn = screen.getAllByText(/Export Word/i)[0];
    fireEvent.click(wordBtn);
    expect((window as any).__EXPORT_WORD__).toBe(true);
    // Zotero
    const zoteroBtn = screen.getAllByText(/Export to Zotero/i)[0];
    fireEvent.click(zoteroBtn);
    expect((window as any).__EXPORT_ZOTERO__).toBe(true);
  });

  it('should track export progress', () => {
    (window as any).__EXPORT_PROGRESS__ = 0;
    const onClose = vi.fn();
    const onNavigate = vi.fn();
    const onAction = vi.fn();
    render(
      <CommandPalette
        isOpen={true}
        onClose={onClose}
        currentStep={6}
        onNavigate={onNavigate}
        onAction={onAction}
      />
    );
    // Simulate user clicking the 'Export Progress' command
    const progressBtn = screen.getAllByText(/Export Progress/i)[0];
    fireEvent.click(progressBtn);
    expect((window as any).__EXPORT_PROGRESS__).toBeGreaterThan(0);
  });
});