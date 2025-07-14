import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import FileUploadZone from '../../components/FileUploadZone';

// Mock file-type library
vi.mock('file-type', () => ({
  fileTypeFromBuffer: vi.fn(),
}));

// Mock fetch for API calls
global.fetch = vi.fn();
const mockFetch = vi.mocked(fetch);

describe('FileUploadZone', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  afterEach(() => {
    cleanup();
  });

  describe('Component Rendering', () => {
    it('should render drag-and-drop zone with proper accessibility', async () => {
      render(<FileUploadZone onFileUpload={vi.fn()} />);
      
      // Should show drag and drop area
      expect(screen.getByText(/drag and drop files here/i)).toBeInTheDocument();
      expect(screen.getByText(/or click to browse/i)).toBeInTheDocument();
      
      // Should have proper ARIA attributes
      const dropZone = screen.getByRole('button', { name: /upload files/i });
      expect(dropZone).toHaveAttribute('aria-label', 'Upload files');
      expect(dropZone).toHaveAttribute('tabindex', '0');
    });

    it('should show supported file types in description', async () => {
      render(<FileUploadZone onFileUpload={vi.fn()} />);
      
      expect(screen.getByText(/supported formats:/i)).toBeInTheDocument();
      expect(screen.getByText(/pdf, docx, txt, md/i)).toBeInTheDocument();
    });

    it('should render with custom accept prop', async () => {
      render(<FileUploadZone onFileUpload={vi.fn()} accept=".pdf,.doc" />);
      
      const fileInput = screen.getByLabelText(/upload files/i);
      expect(fileInput).toHaveAttribute('accept', '.pdf,.doc');
    });

    it('should render with custom maxSize prop', async () => {
      render(<FileUploadZone onFileUpload={vi.fn()} maxSize={5 * 1024 * 1024} />);
      
      expect(screen.getByText(/maximum file size: 5mb/i)).toBeInTheDocument();
    });
  });

  describe('File Selection via Click', () => {
    it('should trigger file input when clicked', async () => {
      const mockOnFileUpload = vi.fn();
      render(<FileUploadZone onFileUpload={mockOnFileUpload} />);
      
      const dropZone = screen.getByRole('button', { name: /upload files/i });
      fireEvent.click(dropZone);
      
      const fileInput = screen.getByLabelText(/upload files/i);
      expect(fileInput).toBeInTheDocument();
    });

    it('should handle file selection via input', async () => {
      const mockOnFileUpload = vi.fn();
      render(<FileUploadZone onFileUpload={mockOnFileUpload} />);
      
      const fileInput = screen.getByLabelText(/upload files/i);
      const testFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
      
      fireEvent.change(fileInput, { target: { files: [testFile] } });
      
      await waitFor(() => {
        expect(mockOnFileUpload).toHaveBeenCalledWith([testFile]);
      });
    });

    it('should handle multiple file selection', async () => {
      const mockOnFileUpload = vi.fn();
      render(<FileUploadZone onFileUpload={mockOnFileUpload} multiple />);
      
      const fileInput = screen.getByLabelText(/upload files/i);
      const testFiles = [
        new File(['test1'], 'test1.pdf', { type: 'application/pdf' }),
        new File(['test2'], 'test2.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }),
      ];
      
      fireEvent.change(fileInput, { target: { files: testFiles } });
      
      await waitFor(() => {
        expect(mockOnFileUpload).toHaveBeenCalledWith(testFiles);
      });
    });
  });

  describe('Drag and Drop Functionality', () => {
    it('should handle dragover event and show hover state', async () => {
      render(<FileUploadZone onFileUpload={vi.fn()} />);
      
      const dropZone = screen.getByRole('button', { name: /upload files/i });
      
      fireEvent.dragOver(dropZone);
      
      expect(dropZone).toHaveClass('border-blue-400', 'bg-blue-50');
      expect(screen.getByText(/drop files here/i)).toBeInTheDocument();
    });

    it('should handle dragleave event and remove hover state', async () => {
      render(<FileUploadZone onFileUpload={vi.fn()} />);
      
      const dropZone = screen.getByRole('button', { name: /upload files/i });
      
      fireEvent.dragOver(dropZone);
      fireEvent.dragLeave(dropZone);
      
      expect(dropZone).not.toHaveClass('border-blue-400', 'bg-blue-50');
    });

    it('should handle file drop and call onFileUpload', async () => {
      const mockOnFileUpload = vi.fn();
      render(<FileUploadZone onFileUpload={mockOnFileUpload} />);
      
      const dropZone = screen.getByRole('button', { name: /upload files/i });
      const testFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
      
      fireEvent.drop(dropZone, {
        dataTransfer: { files: [testFile] }
      });
      
      await waitFor(() => {
        expect(mockOnFileUpload).toHaveBeenCalledWith([testFile]);
      });
    });

    it('should handle multiple file drop', async () => {
      const mockOnFileUpload = vi.fn();
      render(<FileUploadZone onFileUpload={mockOnFileUpload} multiple />);
      
      const dropZone = screen.getByRole('button', { name: /upload files/i });
      const testFiles = [
        new File(['test1'], 'test1.pdf', { type: 'application/pdf' }),
        new File(['test2'], 'test2.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }),
      ];
      
      fireEvent.drop(dropZone, {
        dataTransfer: { files: testFiles }
      });
      
      await waitFor(() => {
        expect(mockOnFileUpload).toHaveBeenCalledWith(testFiles);
      });
    });
  });

  describe('File Validation', () => {
    it('should reject files exceeding maxSize', async () => {
      const mockOnFileUpload = vi.fn();
      render(<FileUploadZone onFileUpload={mockOnFileUpload} maxSize={1024} />);
      
      const dropZone = screen.getByRole('button', { name: /upload files/i });
      const largeFile = new File(['x'.repeat(2048)], 'large.pdf', { type: 'application/pdf' });
      
      fireEvent.drop(dropZone, {
        dataTransfer: { files: [largeFile] }
      });
      
      await waitFor(() => {
        expect(screen.getByText(/file size exceeds maximum/i)).toBeInTheDocument();
        expect(mockOnFileUpload).not.toHaveBeenCalled();
      });
    });

    it('should reject files with invalid extensions', async () => {
      const mockOnFileUpload = vi.fn();
      render(<FileUploadZone onFileUpload={mockOnFileUpload} accept=".pdf,.docx" />);
      
      const dropZone = screen.getByRole('button', { name: /upload files/i });
      const invalidFile = new File(['test'], 'test.exe', { type: 'application/x-msdownload' });
      
      fireEvent.drop(dropZone, {
        dataTransfer: { files: [invalidFile] }
      });
      
      await waitFor(() => {
        expect(screen.getByText(/file type not supported/i)).toBeInTheDocument();
        expect(mockOnFileUpload).not.toHaveBeenCalled();
      });
    });

    it('should show validation errors for multiple files', async () => {
      const mockOnFileUpload = vi.fn();
      render(<FileUploadZone onFileUpload={mockOnFileUpload} maxSize={1024} />);
      
      const dropZone = screen.getByRole('button', { name: /upload files/i });
      const validFile = new File(['small'], 'small.pdf', { type: 'application/pdf' });
      const invalidFile = new File(['x'.repeat(2048)], 'large.pdf', { type: 'application/pdf' });
      
      fireEvent.drop(dropZone, {
        dataTransfer: { files: [validFile, invalidFile] }
      });
      
      await waitFor(() => {
        expect(screen.getByText(/1 file processed successfully/i)).toBeInTheDocument();
        expect(screen.getByText(/1 file failed validation/i)).toBeInTheDocument();
        expect(mockOnFileUpload).toHaveBeenCalledWith([validFile]);
      });
    });
  });

  describe('Upload Progress', () => {
    it('should show upload progress during file upload', async () => {
      const mockOnFileUpload = vi.fn();
      render(<FileUploadZone onFileUpload={mockOnFileUpload} showProgress />);
      
      const dropZone = screen.getByRole('button', { name: /upload files/i });
      const testFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
      
      fireEvent.drop(dropZone, {
        dataTransfer: { files: [testFile] }
      });
      
      await waitFor(() => {
        expect(screen.getByText(/uploading files/i)).toBeInTheDocument();
        expect(screen.getByRole('progressbar')).toBeInTheDocument();
      });
    });

    it('should show success message after upload completion', async () => {
      const mockOnFileUpload = vi.fn().mockResolvedValue({ success: true });
      render(<FileUploadZone onFileUpload={mockOnFileUpload} showProgress />);
      
      const dropZone = screen.getByRole('button', { name: /upload files/i });
      const testFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
      
      fireEvent.drop(dropZone, {
        dataTransfer: { files: [testFile] }
      });
      
      await waitFor(() => {
        expect(screen.getByText(/files uploaded successfully/i)).toBeInTheDocument();
      });
    });

    it('should show error message on upload failure', async () => {
      const mockOnFileUpload = vi.fn().mockRejectedValue(new Error('Upload failed'));
      render(<FileUploadZone onFileUpload={mockOnFileUpload} showProgress />);
      
      const dropZone = screen.getByRole('button', { name: /upload files/i });
      const testFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
      
      fireEvent.drop(dropZone, {
        dataTransfer: { files: [testFile] }
      });
      
      await waitFor(() => {
        expect(screen.getByText(/upload failed/i)).toBeInTheDocument();
      });
    });
  });

  describe('Keyboard Navigation', () => {
    it('should handle Enter key to trigger file selection', async () => {
      const mockOnFileUpload = vi.fn();
      render(<FileUploadZone onFileUpload={mockOnFileUpload} />);
      
      const dropZone = screen.getByRole('button', { name: /upload files/i });
      
      fireEvent.keyDown(dropZone, { key: 'Enter' });
      
      const fileInput = screen.getByLabelText(/upload files/i);
      expect(fileInput).toBeInTheDocument();
    });

    it('should handle Space key to trigger file selection', async () => {
      const mockOnFileUpload = vi.fn();
      render(<FileUploadZone onFileUpload={mockOnFileUpload} />);
      
      const dropZone = screen.getByRole('button', { name: /upload files/i });
      
      fireEvent.keyDown(dropZone, { key: ' ' });
      
      const fileInput = screen.getByLabelText(/upload files/i);
      expect(fileInput).toBeInTheDocument();
    });

    it('should be focusable and have proper focus indicators', async () => {
      render(<FileUploadZone onFileUpload={vi.fn()} />);
      
      const dropZone = screen.getByRole('button', { name: /upload files/i });
      
      dropZone.focus();
      
      expect(dropZone).toHaveFocus();
      expect(dropZone).toHaveClass('focus:ring-2', 'focus:ring-blue-500');
    });
  });

  describe('Error Handling', () => {
    it('should handle empty file drops gracefully', async () => {
      const mockOnFileUpload = vi.fn();
      render(<FileUploadZone onFileUpload={mockOnFileUpload} />);
      
      const dropZone = screen.getByRole('button', { name: /upload files/i });
      
      fireEvent.drop(dropZone, {
        dataTransfer: { files: [] }
      });
      
      await waitFor(() => {
        expect(screen.getByText(/no files selected/i)).toBeInTheDocument();
        expect(mockOnFileUpload).not.toHaveBeenCalled();
      });
    });

    it('should handle corrupted file data gracefully', async () => {
      const mockOnFileUpload = vi.fn();
      render(<FileUploadZone onFileUpload={mockOnFileUpload} />);
      
      const dropZone = screen.getByRole('button', { name: /upload files/i });
      const corruptedFile = new File([''], 'corrupted.pdf', { type: 'application/pdf' });
      
      fireEvent.drop(dropZone, {
        dataTransfer: { files: [corruptedFile] }
      });
      
      await waitFor(() => {
        expect(screen.getByText(/file appears to be corrupted/i)).toBeInTheDocument();
        expect(mockOnFileUpload).not.toHaveBeenCalled();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes for screen readers', async () => {
      render(<FileUploadZone onFileUpload={vi.fn()} />);
      
      const dropZone = screen.getByRole('button', { name: /upload files/i });
      
      expect(dropZone).toHaveAttribute('aria-label', 'Upload files');
      expect(dropZone).toHaveAttribute('aria-describedby');
      
      const description = screen.getByText(/drag and drop files here/i);
      expect(description).toHaveAttribute('id', dropZone.getAttribute('aria-describedby'));
    });

    it('should announce drag state changes to screen readers', async () => {
      render(<FileUploadZone onFileUpload={vi.fn()} />);
      
      const dropZone = screen.getByRole('button', { name: /upload files/i });
      
      // Use more comprehensive drag events to trigger react-dropzone state
      fireEvent.dragEnter(dropZone, {
        dataTransfer: {
          files: [new File(['test'], 'test.pdf', { type: 'application/pdf' })],
          types: ['Files']
        }
      });
      fireEvent.dragOver(dropZone, {
        dataTransfer: {
          files: [new File(['test'], 'test.pdf', { type: 'application/pdf' })],
          types: ['Files']
        }
      });
      
      await waitFor(() => {
        expect(screen.getByText(/drop files here/i)).toHaveAttribute('aria-live', 'polite');
      });
    });

    it('should have proper color contrast for accessibility', async () => {
      render(<FileUploadZone onFileUpload={vi.fn()} />);
      
      const dropZone = screen.getByRole('button', { name: /upload files/i });
      
      // Should have proper contrast colors
      expect(dropZone).toHaveClass('border-gray-300', 'text-gray-700');
      
      // Use more comprehensive drag events to trigger react-dropzone state
      fireEvent.dragEnter(dropZone, {
        dataTransfer: {
          files: [new File(['test'], 'test.pdf', { type: 'application/pdf' })],
          types: ['Files']
        }
      });
      fireEvent.dragOver(dropZone, {
        dataTransfer: {
          files: [new File(['test'], 'test.pdf', { type: 'application/pdf' })],
          types: ['Files']
        }
      });
      
      // Should have proper contrast in hover state
      await waitFor(() => {
        expect(dropZone).toHaveClass('border-blue-400', 'text-blue-700');
      });
    });
  });
});