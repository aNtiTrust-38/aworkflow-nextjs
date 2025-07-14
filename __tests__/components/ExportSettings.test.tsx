import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import ExportSettings from '../../components/ExportSettings';

// Mock fetch for API calls
global.fetch = vi.fn();
const mockFetch = vi.mocked(fetch);

// Mock file system APIs
const mockShowDirectoryPicker = vi.fn();
global.showDirectoryPicker = mockShowDirectoryPicker;

// Mock Electron APIs
const mockElectronAPI = {
  showOpenDialog: vi.fn(),
  showSaveDialog: vi.fn(),
  isElectron: true
};

Object.defineProperty(window, 'electronAPI', {
  value: mockElectronAPI,
  writable: true
});

describe('ExportSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
    
    // Default mock for settings API
    mockFetch.mockImplementation((url: string, options?: any) => {
      if (url === '/api/user-settings') {
        if (options?.method === 'GET') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              exportFolder: '/Users/test/Downloads',
              exportFormat: 'pdf',
              exportTemplate: 'academic',
              autoExport: false,
              exportFilename: 'paper-{timestamp}',
              includeReferences: true,
              includeCitations: true
            })
          } as Response);
        }
        if (options?.method === 'PUT') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true })
          } as Response);
        }
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({})
      } as Response);
    });
  });

  afterEach(() => {
    cleanup();
  });

  describe('Component Rendering', () => {
    it('should render export settings panel', async () => {
      render(<ExportSettings />);
      
      await waitFor(() => {
        expect(screen.getByText('Export Settings')).toBeInTheDocument();
        expect(screen.getByText('Configure export preferences and destination folders')).toBeInTheDocument();
      });
    });

    it('should show loading state initially', async () => {
      render(<ExportSettings />);
      
      expect(screen.getByText('Loading settings...')).toBeInTheDocument();
    });

    it('should display current export folder', async () => {
      render(<ExportSettings />);
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('/Users/test/Downloads')).toBeInTheDocument();
      });
    });

    it('should display export format options', async () => {
      render(<ExportSettings />);
      
      await waitFor(() => {
        expect(screen.getByLabelText('Export Format')).toBeInTheDocument();
        expect(screen.getByRole('option', { name: 'PDF' })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: 'Word Document' })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: 'LaTeX' })).toBeInTheDocument();
      });
    });

    it('should display template options', async () => {
      render(<ExportSettings />);
      
      await waitFor(() => {
        expect(screen.getByLabelText('Export Template')).toBeInTheDocument();
        expect(screen.getByRole('option', { name: 'Academic Paper' })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: 'Research Report' })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: 'Thesis' })).toBeInTheDocument();
      });
    });
  });

  describe('Folder Selection', () => {
    it('should show folder picker button', async () => {
      render(<ExportSettings />);
      
      await waitFor(() => {
        expect(screen.getByText('Choose Folder')).toBeInTheDocument();
      });
    });

    it('should open folder picker when button clicked (Web)', async () => {
      // Mock as web environment
      Object.defineProperty(window, 'electronAPI', {
        value: undefined,
        writable: true
      });
      
      mockShowDirectoryPicker.mockResolvedValue({
        name: 'Downloads',
        getDirectoryHandle: vi.fn()
      });
      
      render(<ExportSettings />);
      
      await waitFor(() => {
        const folderButton = screen.getByText('Choose Folder');
        fireEvent.click(folderButton);
      });
      
      expect(mockShowDirectoryPicker).toHaveBeenCalled();
    });

    it('should open folder picker when button clicked (Electron)', async () => {
      mockElectronAPI.showOpenDialog.mockResolvedValue({
        canceled: false,
        filePaths: ['/Users/test/Documents']
      });
      
      render(<ExportSettings />);
      
      await waitFor(() => {
        const folderButton = screen.getByText('Choose Folder');
        fireEvent.click(folderButton);
      });
      
      expect(mockElectronAPI.showOpenDialog).toHaveBeenCalledWith({
        properties: ['openDirectory'],
        title: 'Select Export Folder'
      });
    });

    it('should update folder path when folder selected', async () => {
      mockElectronAPI.showOpenDialog.mockResolvedValue({
        canceled: false,
        filePaths: ['/Users/test/Documents']
      });
      
      render(<ExportSettings />);
      
      await waitFor(() => {
        const folderButton = screen.getByText('Choose Folder');
        fireEvent.click(folderButton);
      });
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('/Users/test/Documents')).toBeInTheDocument();
      });
    });

    it('should handle folder selection cancellation', async () => {
      mockElectronAPI.showOpenDialog.mockResolvedValue({
        canceled: true,
        filePaths: []
      });
      
      render(<ExportSettings />);
      
      await waitFor(() => {
        const folderButton = screen.getByText('Choose Folder');
        fireEvent.click(folderButton);
      });
      
      await waitFor(() => {
        // Should keep original path
        expect(screen.getByDisplayValue('/Users/test/Downloads')).toBeInTheDocument();
      });
    });

    it('should validate folder path manually entered', async () => {
      render(<ExportSettings />);
      
      await waitFor(() => {
        const folderInput = screen.getByDisplayValue('/Users/test/Downloads');
        fireEvent.change(folderInput, { target: { value: '/invalid/path' } });
        fireEvent.blur(folderInput);
      });
      
      expect(screen.getByText('Invalid folder path')).toBeInTheDocument();
    });

    it('should create folder if it does not exist', async () => {
      render(<ExportSettings />);
      
      await waitFor(() => {
        const folderInput = screen.getByDisplayValue('/Users/test/Downloads');
        fireEvent.change(folderInput, { target: { value: '/Users/test/NewFolder' } });
        fireEvent.blur(folderInput);
      });
      
      expect(screen.getByText('Folder does not exist. Create it?')).toBeInTheDocument();
      
      const createButton = screen.getByText('Create Folder');
      fireEvent.click(createButton);
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/export/create-folder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            path: '/Users/test/NewFolder'
          })
        });
      });
    });
  });

  describe('Export Format Configuration', () => {
    it('should update export format when selection changed', async () => {
      render(<ExportSettings />);
      
      await waitFor(() => {
        const formatSelect = screen.getByLabelText('Export Format');
        fireEvent.change(formatSelect, { target: { value: 'docx' } });
      });
      
      expect(screen.getByRole('option', { name: 'Word Document' })).toBeSelected();
    });

    it('should show format-specific options', async () => {
      render(<ExportSettings />);
      
      await waitFor(() => {
        const formatSelect = screen.getByLabelText('Export Format');
        fireEvent.change(formatSelect, { target: { value: 'pdf' } });
      });
      
      expect(screen.getByLabelText('PDF Quality')).toBeInTheDocument();
      expect(screen.getByLabelText('Include Bookmarks')).toBeInTheDocument();
    });

    it('should show Word-specific options when Word format selected', async () => {
      render(<ExportSettings />);
      
      await waitFor(() => {
        const formatSelect = screen.getByLabelText('Export Format');
        fireEvent.change(formatSelect, { target: { value: 'docx' } });
      });
      
      expect(screen.getByLabelText('Track Changes')).toBeInTheDocument();
      expect(screen.getByLabelText('Include Comments')).toBeInTheDocument();
    });

    it('should show LaTeX-specific options when LaTeX format selected', async () => {
      render(<ExportSettings />);
      
      await waitFor(() => {
        const formatSelect = screen.getByLabelText('Export Format');
        fireEvent.change(formatSelect, { target: { value: 'latex' } });
      });
      
      expect(screen.getByLabelText('LaTeX Engine')).toBeInTheDocument();
      expect(screen.getByLabelText('Include Source Files')).toBeInTheDocument();
    });
  });

  describe('Template Configuration', () => {
    it('should update template when selection changed', async () => {
      render(<ExportSettings />);
      
      await waitFor(() => {
        const templateSelect = screen.getByLabelText('Export Template');
        fireEvent.change(templateSelect, { target: { value: 'thesis' } });
      });
      
      expect(screen.getByRole('option', { name: 'Thesis' })).toBeSelected();
    });

    it('should show template preview', async () => {
      render(<ExportSettings />);
      
      await waitFor(() => {
        const templateSelect = screen.getByLabelText('Export Template');
        fireEvent.change(templateSelect, { target: { value: 'academic' } });
      });
      
      expect(screen.getByText('Template Preview')).toBeInTheDocument();
      expect(screen.getByText('Academic Paper Template')).toBeInTheDocument();
    });

    it('should allow custom template upload', async () => {
      render(<ExportSettings />);
      
      await waitFor(() => {
        const uploadButton = screen.getByText('Upload Custom Template');
        fireEvent.click(uploadButton);
      });
      
      expect(screen.getByText('Upload Template')).toBeInTheDocument();
      expect(screen.getByText('Drop template file here or click to browse')).toBeInTheDocument();
    });

    it('should validate template file format', async () => {
      render(<ExportSettings />);
      
      await waitFor(() => {
        const uploadButton = screen.getByText('Upload Custom Template');
        fireEvent.click(uploadButton);
      });
      
      const fileInput = screen.getByLabelText('Template file');
      const invalidFile = new File(['test'], 'template.txt', { type: 'text/plain' });
      
      fireEvent.change(fileInput, { target: { files: [invalidFile] } });
      
      expect(screen.getByText('Invalid template format')).toBeInTheDocument();
    });
  });

  describe('Filename Configuration', () => {
    it('should display filename pattern input', async () => {
      render(<ExportSettings />);
      
      await waitFor(() => {
        expect(screen.getByLabelText('Filename Pattern')).toBeInTheDocument();
        expect(screen.getByDisplayValue('paper-{timestamp}')).toBeInTheDocument();
      });
    });

    it('should show filename pattern help', async () => {
      render(<ExportSettings />);
      
      await waitFor(() => {
        const helpButton = screen.getByLabelText('Filename pattern help');
        fireEvent.click(helpButton);
      });
      
      expect(screen.getByText('Available Variables')).toBeInTheDocument();
      expect(screen.getByText('{timestamp}')).toBeInTheDocument();
      expect(screen.getByText('{title}')).toBeInTheDocument();
      expect(screen.getByText('{author}')).toBeInTheDocument();
    });

    it('should validate filename pattern', async () => {
      render(<ExportSettings />);
      
      await waitFor(() => {
        const filenameInput = screen.getByLabelText('Filename Pattern');
        fireEvent.change(filenameInput, { target: { value: 'invalid<>filename' } });
        fireEvent.blur(filenameInput);
      });
      
      expect(screen.getByText('Invalid characters in filename')).toBeInTheDocument();
    });

    it('should show filename preview', async () => {
      render(<ExportSettings />);
      
      await waitFor(() => {
        const filenameInput = screen.getByLabelText('Filename Pattern');
        fireEvent.change(filenameInput, { target: { value: 'paper-{timestamp}' } });
      });
      
      expect(screen.getByText('Preview:')).toBeInTheDocument();
      expect(screen.getByText(/paper-\d{4}-\d{2}-\d{2}/)).toBeInTheDocument();
    });
  });

  describe('Advanced Options', () => {
    it('should display advanced options section', async () => {
      render(<ExportSettings />);
      
      await waitFor(() => {
        expect(screen.getByText('Advanced Options')).toBeInTheDocument();
      });
    });

    it('should toggle auto-export setting', async () => {
      render(<ExportSettings />);
      
      await waitFor(() => {
        const autoExportToggle = screen.getByLabelText('Auto-export on completion');
        fireEvent.click(autoExportToggle);
      });
      
      expect(autoExportToggle).toBeChecked();
    });

    it('should toggle include references setting', async () => {
      render(<ExportSettings />);
      
      await waitFor(() => {
        const includeRefsToggle = screen.getByLabelText('Include reference list');
        fireEvent.click(includeRefsToggle);
      });
      
      expect(includeRefsToggle).not.toBeChecked();
    });

    it('should toggle include citations setting', async () => {
      render(<ExportSettings />);
      
      await waitFor(() => {
        const includeCitationsToggle = screen.getByLabelText('Include in-text citations');
        fireEvent.click(includeCitationsToggle);
      });
      
      expect(includeCitationsToggle).not.toBeChecked();
    });

    it('should configure export quality settings', async () => {
      render(<ExportSettings />);
      
      await waitFor(() => {
        const qualitySlider = screen.getByLabelText('Export Quality');
        fireEvent.change(qualitySlider, { target: { value: '80' } });
      });
      
      expect(screen.getByText('80%')).toBeInTheDocument();
    });
  });

  describe('Settings Persistence', () => {
    it('should save settings when save button clicked', async () => {
      render(<ExportSettings />);
      
      await waitFor(() => {
        const formatSelect = screen.getByLabelText('Export Format');
        fireEvent.change(formatSelect, { target: { value: 'docx' } });
        
        const saveButton = screen.getByText('Save Settings');
        fireEvent.click(saveButton);
      });
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/user-settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            exportFormat: 'docx',
            exportFolder: '/Users/test/Downloads',
            exportTemplate: 'academic',
            autoExport: false,
            exportFilename: 'paper-{timestamp}',
            includeReferences: true,
            includeCitations: true
          })
        });
      });
    });

    it('should show save confirmation', async () => {
      render(<ExportSettings />);
      
      await waitFor(() => {
        const saveButton = screen.getByText('Save Settings');
        fireEvent.click(saveButton);
      });
      
      await waitFor(() => {
        expect(screen.getByText('Settings saved successfully')).toBeInTheDocument();
      });
    });

    it('should auto-save settings when changed', async () => {
      render(<ExportSettings autoSave />);
      
      await waitFor(() => {
        const formatSelect = screen.getByLabelText('Export Format');
        fireEvent.change(formatSelect, { target: { value: 'docx' } });
      });
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/user-settings', expect.objectContaining({
          method: 'PUT'
        }));
      });
    });

    it('should reset settings to default when reset button clicked', async () => {
      render(<ExportSettings />);
      
      await waitFor(() => {
        const resetButton = screen.getByText('Reset to Default');
        fireEvent.click(resetButton);
      });
      
      expect(screen.getByText('Reset Settings')).toBeInTheDocument();
      expect(screen.getByText('This will reset all export settings to default values')).toBeInTheDocument();
      
      const confirmButton = screen.getByText('Reset');
      fireEvent.click(confirmButton);
      
      await waitFor(() => {
        expect(screen.getByRole('option', { name: 'PDF' })).toBeSelected();
      });
    });
  });

  describe('Export Actions', () => {
    it('should provide export preview functionality', async () => {
      render(<ExportSettings />);
      
      await waitFor(() => {
        const previewButton = screen.getByText('Preview Export');
        fireEvent.click(previewButton);
      });
      
      expect(screen.getByText('Export Preview')).toBeInTheDocument();
    });

    it('should provide test export functionality', async () => {
      render(<ExportSettings />);
      
      await waitFor(() => {
        const testButton = screen.getByText('Test Export');
        fireEvent.click(testButton);
      });
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/export/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            format: 'pdf',
            template: 'academic',
            settings: expect.any(Object)
          })
        });
      });
    });

    it('should show export progress during test', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url === '/api/export/test') {
          return new Promise(resolve => {
            setTimeout(() => {
              resolve({
                ok: true,
                json: () => Promise.resolve({ success: true })
              } as Response);
            }, 1000);
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({})
        } as Response);
      });
      
      render(<ExportSettings />);
      
      await waitFor(() => {
        const testButton = screen.getByText('Test Export');
        fireEvent.click(testButton);
      });
      
      expect(screen.getByText('Testing export...')).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for form controls', async () => {
      render(<ExportSettings />);
      
      await waitFor(() => {
        expect(screen.getByLabelText('Export Format')).toBeInTheDocument();
        expect(screen.getByLabelText('Export Template')).toBeInTheDocument();
        expect(screen.getByLabelText('Filename Pattern')).toBeInTheDocument();
        expect(screen.getByLabelText('Export folder path')).toBeInTheDocument();
      });
    });

    it('should have proper fieldset grouping', async () => {
      render(<ExportSettings />);
      
      await waitFor(() => {
        expect(screen.getByRole('group', { name: 'Export Format Options' })).toBeInTheDocument();
        expect(screen.getByRole('group', { name: 'Advanced Options' })).toBeInTheDocument();
      });
    });

    it('should support keyboard navigation', async () => {
      render(<ExportSettings />);
      
      await waitFor(() => {
        const formatSelect = screen.getByLabelText('Export Format');
        formatSelect.focus();
        
        fireEvent.keyDown(formatSelect, { key: 'Tab' });
        expect(screen.getByLabelText('Export Template')).toHaveFocus();
      });
    });

    it('should announce setting changes to screen readers', async () => {
      render(<ExportSettings />);
      
      await waitFor(() => {
        const formatSelect = screen.getByLabelText('Export Format');
        fireEvent.change(formatSelect, { target: { value: 'docx' } });
      });
      
      expect(screen.getByText('Export format changed to Word Document')).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('Error Handling', () => {
    it('should handle settings load errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));
      
      render(<ExportSettings />);
      
      await waitFor(() => {
        expect(screen.getByText('Failed to load export settings')).toBeInTheDocument();
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });
    });

    it('should handle settings save errors', async () => {
      mockFetch.mockImplementation((url: string, options?: any) => {
        if (options?.method === 'PUT') {
          return Promise.resolve({
            ok: false,
            json: () => Promise.resolve({ error: 'Save failed' })
          } as Response);
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({})
        } as Response);
      });
      
      render(<ExportSettings />);
      
      await waitFor(() => {
        const saveButton = screen.getByText('Save Settings');
        fireEvent.click(saveButton);
      });
      
      await waitFor(() => {
        expect(screen.getByText('Failed to save settings: Save failed')).toBeInTheDocument();
      });
    });

    it('should handle folder picker errors', async () => {
      mockElectronAPI.showOpenDialog.mockRejectedValue(new Error('Folder picker error'));
      
      render(<ExportSettings />);
      
      await waitFor(() => {
        const folderButton = screen.getByText('Choose Folder');
        fireEvent.click(folderButton);
      });
      
      await waitFor(() => {
        expect(screen.getByText('Failed to open folder picker')).toBeInTheDocument();
      });
    });

    it('should handle template upload errors', async () => {
      mockFetch.mockImplementation((url: string, options?: any) => {
        if (url === '/api/export/template') {
          return Promise.resolve({
            ok: false,
            json: () => Promise.resolve({ error: 'Template upload failed' })
          } as Response);
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({})
        } as Response);
      });
      
      render(<ExportSettings />);
      
      await waitFor(() => {
        const uploadButton = screen.getByText('Upload Custom Template');
        fireEvent.click(uploadButton);
      });
      
      const fileInput = screen.getByLabelText('Template file');
      const templateFile = new File(['template'], 'template.docx', { 
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
      });
      
      fireEvent.change(fileInput, { target: { files: [templateFile] } });
      
      await waitFor(() => {
        expect(screen.getByText('Template upload failed')).toBeInTheDocument();
      });
    });

    it('should validate required settings', async () => {
      render(<ExportSettings />);
      
      await waitFor(() => {
        const folderInput = screen.getByLabelText('Export folder path');
        fireEvent.change(folderInput, { target: { value: '' } });
        
        const saveButton = screen.getByText('Save Settings');
        fireEvent.click(saveButton);
      });
      
      expect(screen.getByText('Export folder is required')).toBeInTheDocument();
    });
  });
});