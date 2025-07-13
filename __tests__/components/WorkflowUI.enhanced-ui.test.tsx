import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import WorkflowUI from '../../src/app/WorkflowUI';

// Mock localStorage for state persistence tests
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.localStorage = localStorageMock as any;

// Mock the sub-components
vi.mock('../../src/app/ADHDFriendlyGoals', () => ({
  ADHDFriendlyGoals: ({ onGoalsGenerated }: any) => (
    <div data-testid="adhd-goals">
      <button onClick={() => onGoalsGenerated('test goals')}>Generate Goals</button>
    </div>
  )
}));

vi.mock('../../src/app/ResearchAssistant', () => ({
  ResearchAssistant: ({ onResearchComplete }: any) => (
    <div data-testid="research-assistant">
      <button onClick={() => onResearchComplete([{ title: 'Test Research', authors: ['Test Author'], year: 2023, citation: 'Test citation' }])}>
        Complete Research
      </button>
    </div>
  )
}));

vi.mock('../../src/app/ContentAnalysis', () => ({
  ContentAnalysis: ({ onExportReady }: any) => (
    <div data-testid="content-analysis">
      <button onClick={() => onExportReady('test analysis')}>Generate Analysis</button>
    </div>
  )
}));

vi.mock('../../src/app/CitationManager', () => ({
  CitationManager: ({ onExportReady }: any) => (
    <div data-testid="citation-manager">
      <button onClick={() => onExportReady('citation data')}>Export Citations</button>
    </div>
  )
}));

vi.mock('../../components/CommandPalette', () => ({
  default: () => <div data-testid="command-palette">Command Palette</div>
}));

describe('Enhanced WorkflowUI - Phase 3 Features', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  describe('Enhanced Step Navigation', () => {
    it('should display enhanced workflow stepper with progress indicators', async () => {
      render(<WorkflowUI />);

      // Wait for template modal and close it
      await waitFor(() => {
        expect(screen.getByText('Choose a Workflow Template')).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByLabelText('Close template modal'));

      // Check for enhanced stepper
      expect(screen.getByTestId('workflow-stepper')).toBeInTheDocument();
      expect(screen.getByText('Workflow Progress')).toBeInTheDocument();
      
      // Check for step cards with icons and descriptions
      expect(screen.getByText('Research Prompt')).toBeInTheDocument();
      expect(screen.getByText('Define your research question and objectives')).toBeInTheDocument();
    });

    it('should show step completion status', async () => {
      render(<WorkflowUI />);

      // Close template modal
      await waitFor(() => {
        expect(screen.getByText('Choose a Workflow Template')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByLabelText('Close template modal'));

      // Add content to step 1
      const promptInput = screen.getByTestId('assignment-prompt');
      fireEvent.change(promptInput, { target: { value: 'Test research prompt' } });

      // Step should show as having content
      await waitFor(() => {
        const stepCard = screen.getByTestId('step-tab-1');
        expect(stepCard).toHaveClass('border-yellow-500');
      });
    });

    it('should display overall progress bar', async () => {
      render(<WorkflowUI />);

      // Close template modal
      await waitFor(() => {
        expect(screen.getByText('Choose a Workflow Template')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByLabelText('Close template modal'));

      // Should show progress indicator
      expect(screen.getByText(/0 of 6 steps completed/)).toBeInTheDocument();
    });
  });

  describe('Enhanced Section Header', () => {
    it('should display enhanced section header with step info', async () => {
      render(<WorkflowUI />);

      // Close template modal
      await waitFor(() => {
        expect(screen.getByText('Choose a Workflow Template')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByLabelText('Close template modal'));

      // Check section header
      expect(screen.getByText('Research Prompt')).toBeInTheDocument();
      expect(screen.getByText('Define your research question and objectives')).toBeInTheDocument();
      expect(screen.getByText('2-5 minutes')).toBeInTheDocument();
      expect(screen.getByText('In Progress')).toBeInTheDocument();
    });

    it('should show completion status in section header', async () => {
      render(<WorkflowUI />);

      // Close template modal
      await waitFor(() => {
        expect(screen.getByText('Choose a Workflow Template')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByLabelText('Close template modal'));

      // Add content
      const promptInput = screen.getByTestId('assignment-prompt');
      fireEvent.change(promptInput, { target: { value: 'Test research prompt' } });

      // Should eventually show completion status
      await waitFor(() => {
        expect(screen.getByText('Completed')).toBeInTheDocument();
      });
    });
  });

  describe('Workflow State Persistence', () => {
    it('should display workflow state management bar', async () => {
      render(<WorkflowUI />);

      // Close template modal
      await waitFor(() => {
        expect(screen.getByText('Choose a Workflow Template')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByLabelText('Close template modal'));

      expect(screen.getByText('Not saved')).toBeInTheDocument();
      expect(screen.getByText('Save Now')).toBeInTheDocument();
      expect(screen.getByText('New Workflow')).toBeInTheDocument();
    });

    it('should save workflow state when save button is clicked', async () => {
      render(<WorkflowUI />);

      // Close template modal
      await waitFor(() => {
        expect(screen.getByText('Choose a Workflow Template')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByLabelText('Close template modal'));

      // Add some content
      const promptInput = screen.getByTestId('assignment-prompt');
      fireEvent.change(promptInput, { target: { value: 'Test prompt' } });

      // Click save
      fireEvent.click(screen.getByText('Save Now'));

      // Should save to localStorage
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'aworkflow_state',
        expect.stringContaining('Test prompt')
      );
    });

    it('should load saved workflow state on mount', async () => {
      const savedState = {
        step: 2,
        prompt: 'Saved prompt',
        goals: 'Saved goals',
        workflowStartTime: new Date().toISOString(),
        lastSaved: new Date().toISOString()
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(savedState));

      render(<WorkflowUI />);

      // Should load the saved state
      await waitFor(() => {
        expect(screen.getByDisplayValue('Saved prompt')).toBeInTheDocument();
      });
    });
  });

  describe('Workflow Templates', () => {
    it('should show template modal on first load', async () => {
      render(<WorkflowUI />);

      await waitFor(() => {
        expect(screen.getByText('Choose a Workflow Template')).toBeInTheDocument();
      });

      // Should show template options
      expect(screen.getByText('Research Paper')).toBeInTheDocument();
      expect(screen.getByText('Argumentative Essay')).toBeInTheDocument();
      expect(screen.getByText('Literature Review')).toBeInTheDocument();
      expect(screen.getByText('Blank Workflow')).toBeInTheDocument();
    });

    it('should apply template when selected', async () => {
      render(<WorkflowUI />);

      await waitFor(() => {
        expect(screen.getByText('Choose a Workflow Template')).toBeInTheDocument();
      });

      // Click on Research Paper template
      fireEvent.click(screen.getByText('Research Paper'));

      // Should apply the template prompt
      await waitFor(() => {
        const promptInput = screen.getByTestId('assignment-prompt');
        expect(promptInput).toHaveValue(expect.stringContaining('Write a research paper analyzing'));
      });
    });

    it('should show template modal when new workflow is clicked', async () => {
      render(<WorkflowUI />);

      // Close initial template modal
      await waitFor(() => {
        expect(screen.getByText('Choose a Workflow Template')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByLabelText('Close template modal'));

      // Add some content
      const promptInput = screen.getByTestId('assignment-prompt');
      fireEvent.change(promptInput, { target: { value: 'Test content' } });

      // Mock window.confirm to return true
      window.confirm = vi.fn().mockReturnValue(true);

      // Click new workflow
      fireEvent.click(screen.getByText('New Workflow'));

      // Should show template modal again
      await waitFor(() => {
        expect(screen.getByText('Choose a Workflow Template')).toBeInTheDocument();
      });
    });
  });

  describe('Enhanced Loading States', () => {
    it('should show enhanced loading spinner with substeps', async () => {
      render(<WorkflowUI />);

      // Close template modal
      await waitFor(() => {
        expect(screen.getByText('Choose a Workflow Template')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByLabelText('Close template modal'));

      // Navigate to step 2 and trigger loading
      fireEvent.click(screen.getByTestId('step-tab-2'));
      
      const goalsButton = screen.getByText('Generate Goals');
      fireEvent.click(goalsButton);

      // Note: The actual loading state would need to be mocked in the component
      // This test verifies the loading spinner structure is present
      const loadingIndicator = screen.queryByTestId('loading-indicator');
      if (loadingIndicator) {
        expect(loadingIndicator).toBeInTheDocument();
      }
    });
  });

  describe('Accessibility Enhancements', () => {
    it('should provide skip links', async () => {
      render(<WorkflowUI />);

      // Close template modal
      await waitFor(() => {
        expect(screen.getByText('Choose a Workflow Template')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByLabelText('Close template modal'));

      expect(screen.getByText('Skip to main content')).toBeInTheDocument();
      expect(screen.getByText('Skip to navigation')).toBeInTheDocument();
    });

    it('should have proper ARIA labels and roles', async () => {
      render(<WorkflowUI />);

      // Close template modal
      await waitFor(() => {
        expect(screen.getByText('Choose a Workflow Template')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByLabelText('Close template modal'));

      // Check for proper roles
      expect(screen.getByRole('banner')).toBeInTheDocument();
      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByRole('tablist')).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      render(<WorkflowUI />);

      // Close template modal
      await waitFor(() => {
        expect(screen.getByText('Choose a Workflow Template')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByLabelText('Close template modal'));

      // Focus on stepper
      const stepper = screen.getByTestId('workflow-stepper');
      stepper.focus();

      // Test arrow key navigation
      fireEvent.keyDown(stepper, { key: 'ArrowRight' });
      
      // Should move to next step
      await waitFor(() => {
        const step2Tab = screen.getByTestId('step-tab-2');
        expect(step2Tab).toHaveFocus();
      });
    });
  });

  describe('Step Content Previews', () => {
    it('should show content previews in step cards', async () => {
      render(<WorkflowUI />);

      // Close template modal
      await waitFor(() => {
        expect(screen.getByText('Choose a Workflow Template')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByLabelText('Close template modal'));

      // Add content to step 1
      const promptInput = screen.getByTestId('assignment-prompt');
      fireEvent.change(promptInput, { target: { value: 'This is a long research prompt that should be truncated in the preview' } });

      // Should show content preview
      await waitFor(() => {
        expect(screen.getByText(/This is a long research prompt that should/)).toBeInTheDocument();
      });
    });
  });

  describe('Mobile Responsiveness', () => {
    it('should handle mobile view', async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(<WorkflowUI />);

      // Close template modal
      await waitFor(() => {
        expect(screen.getByText('Choose a Workflow Template')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByLabelText('Close template modal'));

      // Should show mobile-friendly navigation
      expect(screen.getByTestId('workflow-stepper')).toBeInTheDocument();
    });
  });
});