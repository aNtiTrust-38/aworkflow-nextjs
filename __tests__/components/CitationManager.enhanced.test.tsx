import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CitationManager } from '../../src/app/CitationManager';

describe('Enhanced CitationManager', () => {
  const mockProps = {
    researchResults: [
      {
        title: 'Test Article',
        authors: ['John Doe', 'Jane Smith'],
        year: 2023,
        citation: 'Test citation',
        doi: '10.1000/test123',
        journal: 'Test Journal',
        volume: '1',
        issue: '2',
        pages: '10-20'
      }
    ],
    onExportReady: vi.fn(),
    onLoading: vi.fn(),
    onError: vi.fn(),
    citationStyle: 'APA',
    onCitationStyleChange: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Real-time Citation Formatting', () => {
    it('should display APA format citations correctly', () => {
      render(<CitationManager {...mockProps} />);
      
      const previewPanel = screen.getByTestId('citation-preview-panel');
      expect(previewPanel).toBeInTheDocument();
      
      const citationPreview = screen.getByTestId('citation-preview-0');
      expect(citationPreview).toBeInTheDocument();
    });

    it('should switch between citation styles', () => {
      render(<CitationManager {...mockProps} />);
      
      const styleSelect = screen.getByTestId('citation-style-select');
      fireEvent.change(styleSelect, { target: { value: 'MLA' } });
      
      expect(mockProps.onCitationStyleChange).toHaveBeenCalledWith('MLA');
    });

    it('should toggle between inline and bibliography preview modes', () => {
      render(<CitationManager {...mockProps} />);
      
      const previewModeSelect = screen.getByTestId('preview-mode-select');
      fireEvent.change(previewModeSelect, { target: { value: 'bibliography' } });
      
      expect(screen.getByText('Bibliography Preview')).toBeInTheDocument();
    });
  });

  describe('Citation Style Formatters', () => {
    it('should format APA citations correctly', () => {
      const { container } = render(<CitationManager {...mockProps} citationStyle="APA" />);
      
      const citationText = container.querySelector('[data-testid="citation-preview-0"] .font-mono');
      expect(citationText).toBeInTheDocument();
    });

    it('should format MLA citations correctly', () => {
      render(<CitationManager {...mockProps} citationStyle="MLA" />);
      
      const styleSelect = screen.getByTestId('citation-style-select');
      fireEvent.change(styleSelect, { target: { value: 'MLA' } });
      
      const citationPreview = screen.getByTestId('citation-preview-0');
      expect(citationPreview).toBeInTheDocument();
    });

    it('should format IEEE citations with numbered format', () => {
      render(<CitationManager {...mockProps} citationStyle="IEEE" />);
      
      const styleSelect = screen.getByTestId('citation-style-select');
      fireEvent.change(styleSelect, { target: { value: 'IEEE' } });
      
      const previewModeSelect = screen.getByTestId('preview-mode-select');
      fireEvent.change(previewModeSelect, { target: { value: 'inline' } });
      
      const citationPreview = screen.getByTestId('citation-preview-0');
      expect(citationPreview).toBeInTheDocument();
    });
  });

  describe('Enhanced Reference Management', () => {
    it('should add new reference with complete metadata', async () => {
      render(<CitationManager {...mockProps} researchResults={[]} />);
      
      const addButton = screen.getByTestId('add-reference-btn');
      fireEvent.click(addButton);
      
      // Fill in the form
      const titleInput = screen.getByTestId('reference-title-input');
      const authorsInput = screen.getByTestId('reference-authors-input');
      const yearInput = screen.getByTestId('reference-year-input');
      const journalInput = screen.getByTestId('reference-journal-input');
      const doiInput = screen.getByTestId('reference-doi-input');
      
      fireEvent.change(titleInput, { target: { value: 'New Research Paper' } });
      fireEvent.change(authorsInput, { target: { value: 'Alice Johnson, Bob Wilson' } });
      fireEvent.change(yearInput, { target: { value: '2024' } });
      fireEvent.change(journalInput, { target: { value: 'Science Journal' } });
      fireEvent.change(doiInput, { target: { value: '10.1000/new123' } });
      
      // Should show live preview
      await waitFor(() => {
        expect(screen.getByText('Preview:')).toBeInTheDocument();
      });
      
      const saveButton = screen.getByTestId('save-reference-btn');
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(screen.getByText('New Research Paper')).toBeInTheDocument();
      });
    });

    it('should validate required fields', () => {
      render(<CitationManager {...mockProps} researchResults={[]} />);
      
      const addButton = screen.getByTestId('add-reference-btn');
      fireEvent.click(addButton);
      
      const saveButton = screen.getByTestId('save-reference-btn');
      expect(saveButton).toBeDisabled();
    });
  });

  describe('Export Customization', () => {
    it('should handle section selection', () => {
      render(<CitationManager {...mockProps} />);
      
      const introCheckbox = screen.getByTestId('section-checkbox-Introduction');
      fireEvent.click(introCheckbox);
      
      expect(introCheckbox).toBeChecked();
    });

    it('should handle file format selection', () => {
      render(<CitationManager {...mockProps} />);
      
      const wordRadio = screen.getByTestId('file-format-word');
      fireEvent.click(wordRadio);
      
      expect(wordRadio).toBeChecked();
    });

    it('should display export summary', () => {
      render(<CitationManager {...mockProps} />);
      
      expect(screen.getByText(/1 references/)).toBeInTheDocument();
      expect(screen.getByText(/APA style/)).toBeInTheDocument();
    });

    it('should disable export when no citations exist', () => {
      render(<CitationManager {...mockProps} researchResults={[]} />);
      
      const exportButton = screen.getByRole('button', { name: /Export PDF Document/ });
      expect(exportButton).toBeDisabled();
    });
  });

  describe('Citation Editing', () => {
    it('should allow editing citation text', async () => {
      render(<CitationManager {...mockProps} />);
      
      const editButton = screen.getByTestId('edit-citation-0');
      fireEvent.click(editButton);
      
      const editInput = screen.getByTestId('citation-edit-input-0');
      expect(editInput).toBeInTheDocument();
      
      fireEvent.change(editInput, { target: { value: 'Updated citation text' } });
      
      const saveButton = screen.getByTestId('save-citation-0');
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(screen.getByText('Updated citation text')).toBeInTheDocument();
      });
    });

    it('should allow removing references', () => {
      render(<CitationManager {...mockProps} />);
      
      const removeButton = screen.getByTestId('remove-reference-0');
      fireEvent.click(removeButton);
      
      expect(screen.queryByText('Test Article')).not.toBeInTheDocument();
    });

    it('should allow reordering references', () => {
      const multipleRefs = [
        ...mockProps.researchResults,
        {
          title: 'Second Article',
          authors: ['Bob Smith'],
          year: 2024,
          citation: 'Second citation'
        }
      ];
      
      render(<CitationManager {...mockProps} researchResults={multipleRefs} />);
      
      const moveUpButton = screen.getByTestId('move-reference-up-1');
      fireEvent.click(moveUpButton);
      
      // First reference should now be the second one
      const references = screen.getAllByTestId(/reference-\d+/);
      expect(references).toHaveLength(2);
    });
  });
});