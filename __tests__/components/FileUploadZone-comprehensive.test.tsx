import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import FileUploadZone from '../../components/FileUploadZone';

// Mock file-type library
vi.mock('file-type', () => ({
  fileTypeFromBuffer: vi.fn(),
}));

// Mock fetch for API calls
global.fetch = vi.fn();
const mockFetch = vi.mocked(fetch);

describe('FileUploadZone - Comprehensive Tests', () => {
  const mockOnFileUpload = vi.fn();
  const mockOnUploadComplete = vi.fn();
  const mockOnUploadError = vi.fn();
  const mockOnValidationError = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
    mockFetch.mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  describe('Component Initialization', () => {
    it('should render with default props', () => {
      render(<FileUploadZone onFileUpload={mockOnFileUpload} />);
      
      expect(screen.getByText(/drag and drop files here/i)).toBeInTheDocument();
      expect(screen.getByText(/or click to browse/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /upload files/i })).toBeInTheDocument();
    });

    it('should render with custom accept prop', () => {
      render(<FileUploadZone onFileUpload={mockOnFileUpload} accept=".pdf,.doc,.docx" />);
      
      const fileInput = screen.getByLabelText(/upload files/i);
      expect(fileInput).toHaveAttribute('accept', '.pdf,.doc,.docx');
    });

    it('should render with custom maxSize prop', () => {
      render(<FileUploadZone onFileUpload={mockOnFileUpload} maxSize={10 * 1024 * 1024} />);
      
      expect(screen.getByText(/maximum file size: 10mb/i)).toBeInTheDocument();
    });

    it('should render with multiple file support', () => {
      render(<FileUploadZone onFileUpload={mockOnFileUpload} multiple />);
      
      const fileInput = screen.getByLabelText(/upload files/i);
      expect(fileInput).toHaveAttribute('multiple');
    });

    it('should render with custom placeholder text', () => {
      render(
        <FileUploadZone 
          onFileUpload={mockOnFileUpload} 
          placeholder="Drop your research papers here"
        />
      );
      
      expect(screen.getByText(/drop your research papers here/i)).toBeInTheDocument();
    });

    it('should render with disabled state', () => {
      render(<FileUploadZone onFileUpload={mockOnFileUpload} disabled />);
      
      const uploadButton = screen.getByRole('button', { name: /upload files/i });
      expect(uploadButton).toBeDisabled();
      expect(uploadButton).toHaveAttribute('aria-disabled', 'true');
    });
  });

  describe('File Selection via Click', () => {
    it('should trigger file input when upload area is clicked', async () => {
      const user = userEvent.setup();
      render(<FileUploadZone onFileUpload={mockOnFileUpload} />);
      
      const uploadButton = screen.getByRole('button', { name: /upload files/i });
      await user.click(uploadButton);
      
      const fileInput = screen.getByLabelText(/upload files/i);
      expect(fileInput).toBeInTheDocument();
    });

    it('should handle single file selection', async () => {
      const user = userEvent.setup();
      render(<FileUploadZone onFileUpload={mockOnFileUpload} />);
      
      const fileInput = screen.getByLabelText(/upload files/i);
      const testFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
      
      await user.upload(fileInput, testFile);
      
      expect(mockOnFileUpload).toHaveBeenCalledWith([testFile]);
    });

    it('should handle multiple file selection', async () => {
      const user = userEvent.setup();
      render(<FileUploadZone onFileUpload={mockOnFileUpload} multiple />);
      
      const fileInput = screen.getByLabelText(/upload files/i);
      const testFiles = [
        new File(['test1'], 'test1.pdf', { type: 'application/pdf' }),
        new File(['test2'], 'test2.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }),
      ];
      
      await user.upload(fileInput, testFiles);
      
      expect(mockOnFileUpload).toHaveBeenCalledWith(testFiles);
    });

    it('should prevent file selection when disabled', async () => {
      const user = userEvent.setup();
      render(<FileUploadZone onFileUpload={mockOnFileUpload} disabled />);
      
      const uploadButton = screen.getByRole('button', { name: /upload files/i });
      await user.click(uploadButton);
      
      expect(mockOnFileUpload).not.toHaveBeenCalled();
    });
  });

  describe('Drag and Drop Functionality', () => {
    it('should handle dragover event and show hover state', () => {
      render(<FileUploadZone onFileUpload={mockOnFileUpload} />);
      
      const dropZone = screen.getByRole('button', { name: /upload files/i });
      
      fireEvent.dragOver(dropZone, {
        dataTransfer: {
          files: [new File(['test'], 'test.pdf', { type: 'application/pdf' })],
          types: ['Files']
        }
      });
      
      expect(dropZone).toHaveClass('border-blue-400');
      expect(screen.getByText(/drop files here/i)).toBeInTheDocument();
    });

    it('should handle dragleave event and remove hover state', () => {
      render(<FileUploadZone onFileUpload={mockOnFileUpload} />);
      
      const dropZone = screen.getByRole('button', { name: /upload files/i });
      
      fireEvent.dragOver(dropZone);
      fireEvent.dragLeave(dropZone);
      
      expect(dropZone).not.toHaveClass('border-blue-400');
    });

    it('should handle file drop and call onFileUpload', async () => {
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

    it('should prevent drop when disabled', () => {
      render(<FileUploadZone onFileUpload={mockOnFileUpload} disabled />);
      
      const dropZone = screen.getByRole('button', { name: /upload files/i });
      const testFile = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      
      fireEvent.drop(dropZone, {
        dataTransfer: { files: [testFile] }
      });
      
      expect(mockOnFileUpload).not.toHaveBeenCalled();
    });

    it('should handle dragover with invalid file types', () => {
      render(<FileUploadZone onFileUpload={mockOnFileUpload} accept=".pdf" />);
      
      const dropZone = screen.getByRole('button', { name: /upload files/i });
      
      fireEvent.dragOver(dropZone, {
        dataTransfer: {
          files: [new File(['test'], 'test.exe', { type: 'application/x-msdownload' })],
          types: ['Files']
        }
      });
      
      expect(dropZone).toHaveClass('border-red-400');
      expect(screen.getByText(/invalid file type/i)).toBeInTheDocument();
    });
  });

  describe('File Validation', () => {
    it('should validate file size limits', async () => {
      render(
        <FileUploadZone 
          onFileUpload={mockOnFileUpload} 
          onValidationError={mockOnValidationError}
          maxSize={1024} 
        />
      );
      
      const dropZone = screen.getByRole('button', { name: /upload files/i });
      const largeFile = new File(['x'.repeat(2048)], 'large.pdf', { type: 'application/pdf' });
      
      fireEvent.drop(dropZone, {
        dataTransfer: { files: [largeFile] }
      });
      
      await waitFor(() => {
        expect(screen.getByText(/file size exceeds maximum/i)).toBeInTheDocument();
        expect(mockOnValidationError).toHaveBeenCalledWith([{
          file: largeFile,
          errors: ['File size exceeds maximum limit of 1KB']
        }]);
        expect(mockOnFileUpload).not.toHaveBeenCalled();
      });
    });

    it('should validate file extensions', async () => {
      render(
        <FileUploadZone 
          onFileUpload={mockOnFileUpload} 
          onValidationError={mockOnValidationError}
          accept=".pdf,.docx" 
        />
      );
      
      const dropZone = screen.getByRole('button', { name: /upload files/i });
      const invalidFile = new File(['test'], 'test.exe', { type: 'application/x-msdownload' });
      
      fireEvent.drop(dropZone, {
        dataTransfer: { files: [invalidFile] }
      });
      
      await waitFor(() => {
        expect(screen.getByText(/file type not supported/i)).toBeInTheDocument();
        expect(mockOnValidationError).toHaveBeenCalledWith([{
          file: invalidFile,
          errors: ['File type not supported']
        }]);
        expect(mockOnFileUpload).not.toHaveBeenCalled();
      });
    });

    it('should validate MIME types', async () => {
      render(
        <FileUploadZone 
          onFileUpload={mockOnFileUpload} 
          onValidationError={mockOnValidationError}
          allowedMimeTypes={['application/pdf', 'text/plain']}
        />
      );
      
      const dropZone = screen.getByRole('button', { name: /upload files/i });
      const invalidFile = new File(['test'], 'test.pdf', { type: 'application/x-msdownload' });
      
      fireEvent.drop(dropZone, {
        dataTransfer: { files: [invalidFile] }
      });
      
      await waitFor(() => {
        expect(screen.getByText(/invalid mime type/i)).toBeInTheDocument();
        expect(mockOnValidationError).toHaveBeenCalledWith([{
          file: invalidFile,
          errors: ['Invalid MIME type: application/x-msdownload']
        }]);
        expect(mockOnFileUpload).not.toHaveBeenCalled();
      });
    });

    it('should handle mixed valid and invalid files', async () => {
      render(
        <FileUploadZone 
          onFileUpload={mockOnFileUpload} 
          onValidationError={mockOnValidationError}
          maxSize={1024} 
        />
      );
      
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
        expect(mockOnValidationError).toHaveBeenCalledWith([{
          file: invalidFile,
          errors: ['File size exceeds maximum limit of 1KB']
        }]);
      });
    });

    it('should validate empty files', async () => {
      render(
        <FileUploadZone 
          onFileUpload={mockOnFileUpload} 
          onValidationError={mockOnValidationError}
        />
      );
      
      const dropZone = screen.getByRole('button', { name: /upload files/i });
      const emptyFile = new File([''], 'empty.pdf', { type: 'application/pdf' });
      
      fireEvent.drop(dropZone, {
        dataTransfer: { files: [emptyFile] }
      });
      
      await waitFor(() => {
        expect(screen.getByText(/file is empty/i)).toBeInTheDocument();
        expect(mockOnValidationError).toHaveBeenCalledWith([{
          file: emptyFile,
          errors: ['File is empty']
        }]);
        expect(mockOnFileUpload).not.toHaveBeenCalled();
      });
    });

    it('should validate maximum file count', async () => {
      render(
        <FileUploadZone 
          onFileUpload={mockOnFileUpload} 
          onValidationError={mockOnValidationError}
          maxFiles={2}
        />
      );
      
      const dropZone = screen.getByRole('button', { name: /upload files/i });
      const files = [
        new File(['test1'], 'test1.pdf', { type: 'application/pdf' }),
        new File(['test2'], 'test2.pdf', { type: 'application/pdf' }),
        new File(['test3'], 'test3.pdf', { type: 'application/pdf' }),
      ];
      
      fireEvent.drop(dropZone, {
        dataTransfer: { files }
      });
      
      await waitFor(() => {
        expect(screen.getByText(/too many files/i)).toBeInTheDocument();
        expect(mockOnValidationError).toHaveBeenCalledWith([{
          file: files[2],
          errors: ['Maximum 2 files allowed']
        }]);
        expect(mockOnFileUpload).toHaveBeenCalledWith([files[0], files[1]]);
      });
    });
  });

  describe('Upload Progress and Status', () => {
    it('should show upload progress during file upload', async () => {
      mockFetch.mockImplementation(() =>
        new Promise((resolve) => {
          setTimeout(() => resolve(new Response(JSON.stringify({ success: true }))), 100);
        })
      );

      render(
        <FileUploadZone 
          onFileUpload={mockOnFileUpload} 
          showProgress 
          autoUpload 
        />
      );
      
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
      mockFetch.mockResolvedValue(new Response(JSON.stringify({ 
        success: true, 
        file: { id: 'test-id', name: 'test.pdf' }
      })));

      render(
        <FileUploadZone 
          onFileUpload={mockOnFileUpload} 
          onUploadComplete={mockOnUploadComplete}
          showProgress 
          autoUpload 
        />
      );
      
      const dropZone = screen.getByRole('button', { name: /upload files/i });
      const testFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
      
      fireEvent.drop(dropZone, {
        dataTransfer: { files: [testFile] }
      });
      
      await waitFor(() => {
        expect(screen.getByText(/files uploaded successfully/i)).toBeInTheDocument();
        expect(mockOnUploadComplete).toHaveBeenCalledWith({ 
          success: true, 
          file: { id: 'test-id', name: 'test.pdf' }
        });
      });
    });

    it('should show error message on upload failure', async () => {
      mockFetch.mockRejectedValue(new Error('Upload failed'));

      render(
        <FileUploadZone 
          onFileUpload={mockOnFileUpload} 
          onUploadError={mockOnUploadError}
          showProgress 
          autoUpload 
        />
      );
      
      const dropZone = screen.getByRole('button', { name: /upload files/i });
      const testFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
      
      fireEvent.drop(dropZone, {
        dataTransfer: { files: [testFile] }
      });
      
      await waitFor(() => {
        expect(screen.getByText(/upload failed/i)).toBeInTheDocument();
        expect(mockOnUploadError).toHaveBeenCalledWith(expect.any(Error));
      });
    });

    it('should handle server error responses', async () => {
      mockFetch.mockResolvedValue(new Response(JSON.stringify({ 
        error: 'File too large',
        code: 'FILE_TOO_LARGE'
      }), { status: 400 }));

      render(
        <FileUploadZone 
          onFileUpload={mockOnFileUpload} 
          onUploadError={mockOnUploadError}
          showProgress 
          autoUpload 
        />
      );
      
      const dropZone = screen.getByRole('button', { name: /upload files/i });
      const testFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
      
      fireEvent.drop(dropZone, {
        dataTransfer: { files: [testFile] }
      });
      
      await waitFor(() => {
        expect(screen.getByText(/file too large/i)).toBeInTheDocument();
        expect(mockOnUploadError).toHaveBeenCalledWith(expect.objectContaining({
          message: 'File too large'
        }));
      });
    });

    it('should show individual file progress for multiple files', async () => {
      let resolveCount = 0;
      mockFetch.mockImplementation(() =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolveCount++;
            resolve(new Response(JSON.stringify({ 
              success: true,
              file: { id: `test-${resolveCount}`, name: `test${resolveCount}.pdf` }
            })));
          }, 100);
        })
      );

      render(
        <FileUploadZone 
          onFileUpload={mockOnFileUpload} 
          showProgress 
          autoUpload 
          multiple 
        />
      );
      
      const dropZone = screen.getByRole('button', { name: /upload files/i });
      const testFiles = [
        new File(['test1'], 'test1.pdf', { type: 'application/pdf' }),
        new File(['test2'], 'test2.pdf', { type: 'application/pdf' }),
      ];
      
      fireEvent.drop(dropZone, {
        dataTransfer: { files: testFiles }
      });
      
      await waitFor(() => {
        expect(screen.getByText(/uploading 2 files/i)).toBeInTheDocument();
        expect(screen.getAllByRole('progressbar')).toHaveLength(2);
      });
    });
  });

  describe('Keyboard Navigation', () => {
    it('should handle Enter key to trigger file selection', async () => {
      const user = userEvent.setup();
      render(<FileUploadZone onFileUpload={mockOnFileUpload} />);
      
      const dropZone = screen.getByRole('button', { name: /upload files/i });
      dropZone.focus();
      
      await user.keyboard('{Enter}');
      
      const fileInput = screen.getByLabelText(/upload files/i);
      expect(fileInput).toBeInTheDocument();
    });

    it('should handle Space key to trigger file selection', async () => {
      const user = userEvent.setup();
      render(<FileUploadZone onFileUpload={mockOnFileUpload} />);
      
      const dropZone = screen.getByRole('button', { name: /upload files/i });
      dropZone.focus();
      
      await user.keyboard(' ');
      
      const fileInput = screen.getByLabelText(/upload files/i);
      expect(fileInput).toBeInTheDocument();
    });

    it('should have proper focus management', () => {
      render(<FileUploadZone onFileUpload={mockOnFileUpload} />);
      
      const dropZone = screen.getByRole('button', { name: /upload files/i });
      
      dropZone.focus();
      
      expect(dropZone).toHaveFocus();
      expect(dropZone).toHaveClass('focus:ring-2');
    });

    it('should handle Escape key to cancel upload', async () => {
      const user = userEvent.setup();
      mockFetch.mockImplementation(() =>
        new Promise((resolve) => {
          setTimeout(() => resolve(new Response(JSON.stringify({ success: true }))), 1000);
        })
      );

      render(
        <FileUploadZone 
          onFileUpload={mockOnFileUpload} 
          showProgress 
          autoUpload 
        />
      );
      
      const dropZone = screen.getByRole('button', { name: /upload files/i });
      const testFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
      
      fireEvent.drop(dropZone, {
        dataTransfer: { files: [testFile] }
      });
      
      await waitFor(() => {
        expect(screen.getByText(/uploading files/i)).toBeInTheDocument();
      });
      
      await user.keyboard('{Escape}');
      
      await waitFor(() => {
        expect(screen.getByText(/upload cancelled/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<FileUploadZone onFileUpload={mockOnFileUpload} />);
      
      const dropZone = screen.getByRole('button', { name: /upload files/i });
      
      expect(dropZone).toHaveAttribute('aria-label', 'Upload files');
      expect(dropZone).toHaveAttribute('aria-describedby');
      expect(dropZone).toHaveAttribute('tabindex', '0');
    });

    it('should announce drag state changes to screen readers', () => {
      render(<FileUploadZone onFileUpload={mockOnFileUpload} />);
      
      const dropZone = screen.getByRole('button', { name: /upload files/i });
      
      fireEvent.dragEnter(dropZone, {
        dataTransfer: {
          files: [new File(['test'], 'test.pdf', { type: 'application/pdf' })],
          types: ['Files']
        }
      });
      
      expect(screen.getByText(/drop files here/i)).toHaveAttribute('aria-live', 'polite');
    });

    it('should have proper color contrast for accessibility', () => {
      render(<FileUploadZone onFileUpload={mockOnFileUpload} />);
      
      const dropZone = screen.getByRole('button', { name: /upload files/i });
      
      expect(dropZone).toHaveClass('border-gray-300', 'text-gray-700');
    });

    it('should support high contrast mode', () => {
      render(<FileUploadZone onFileUpload={mockOnFileUpload} highContrast />);
      
      const dropZone = screen.getByRole('button', { name: /upload files/i });
      
      expect(dropZone).toHaveClass('border-black', 'text-black');
    });

    it('should have proper focus indicators', () => {
      render(<FileUploadZone onFileUpload={mockOnFileUpload} />);
      
      const dropZone = screen.getByRole('button', { name: /upload files/i });
      
      expect(dropZone).toHaveClass('focus:ring-2', 'focus:ring-blue-500');
    });

    it('should support screen reader announcements for upload status', async () => {
      mockFetch.mockResolvedValue(new Response(JSON.stringify({ success: true })));

      render(
        <FileUploadZone 
          onFileUpload={mockOnFileUpload} 
          showProgress 
          autoUpload 
        />
      );
      
      const dropZone = screen.getByRole('button', { name: /upload files/i });
      const testFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
      
      fireEvent.drop(dropZone, {
        dataTransfer: { files: [testFile] }
      });
      
      await waitFor(() => {
        const statusElement = screen.getByText(/files uploaded successfully/i);
        expect(statusElement).toHaveAttribute('aria-live', 'polite');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle empty file drops gracefully', () => {
      render(<FileUploadZone onFileUpload={mockOnFileUpload} />);
      
      const dropZone = screen.getByRole('button', { name: /upload files/i });
      
      fireEvent.drop(dropZone, {
        dataTransfer: { files: [] }
      });
      
      expect(screen.getByText(/no files selected/i)).toBeInTheDocument();
      expect(mockOnFileUpload).not.toHaveBeenCalled();
    });

    it('should handle corrupted file data gracefully', async () => {
      render(
        <FileUploadZone 
          onFileUpload={mockOnFileUpload} 
          onValidationError={mockOnValidationError}
        />
      );
      
      const dropZone = screen.getByRole('button', { name: /upload files/i });
      const corruptedFile = new File([''], 'corrupted.pdf', { type: 'application/pdf' });
      
      fireEvent.drop(dropZone, {
        dataTransfer: { files: [corruptedFile] }
      });
      
      await waitFor(() => {
        expect(screen.getByText(/file is empty/i)).toBeInTheDocument();
        expect(mockOnValidationError).toHaveBeenCalledWith([{
          file: corruptedFile,
          errors: ['File is empty']
        }]);
        expect(mockOnFileUpload).not.toHaveBeenCalled();
      });
    });

    it('should handle network errors during upload', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      render(
        <FileUploadZone 
          onFileUpload={mockOnFileUpload} 
          onUploadError={mockOnUploadError}
          showProgress 
          autoUpload 
        />
      );
      
      const dropZone = screen.getByRole('button', { name: /upload files/i });
      const testFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
      
      fireEvent.drop(dropZone, {
        dataTransfer: { files: [testFile] }
      });
      
      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
        expect(mockOnUploadError).toHaveBeenCalledWith(expect.objectContaining({
          message: 'Network error'
        }));
      });
    });

    it('should handle timeout errors during upload', async () => {
      mockFetch.mockImplementation(() =>
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Upload timeout')), 100);
        })
      );

      render(
        <FileUploadZone 
          onFileUpload={mockOnFileUpload} 
          onUploadError={mockOnUploadError}
          showProgress 
          autoUpload 
          timeout={50}
        />
      );
      
      const dropZone = screen.getByRole('button', { name: /upload files/i });
      const testFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
      
      fireEvent.drop(dropZone, {
        dataTransfer: { files: [testFile] }
      });
      
      await waitFor(() => {
        expect(screen.getByText(/upload timeout/i)).toBeInTheDocument();
        expect(mockOnUploadError).toHaveBeenCalledWith(expect.objectContaining({
          message: 'Upload timeout'
        }));
      });
    });

    it('should handle file reading errors', async () => {
      const mockFileReader = {
        readAsArrayBuffer: vi.fn(),
        result: null,
        error: new Error('File reading failed'),
        onload: null,
        onerror: null,
      };

      // Mock FileReader
      const originalFileReader = global.FileReader;
      global.FileReader = vi.fn().mockImplementation(() => mockFileReader);

      render(
        <FileUploadZone 
          onFileUpload={mockOnFileUpload} 
          onValidationError={mockOnValidationError}
          validateContent
        />
      );
      
      const dropZone = screen.getByRole('button', { name: /upload files/i });
      const testFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
      
      fireEvent.drop(dropZone, {
        dataTransfer: { files: [testFile] }
      });

      // Simulate file reading error
      if (mockFileReader.onerror) {
        mockFileReader.onerror(new Event('error'));
      }
      
      await waitFor(() => {
        expect(screen.getByText(/file reading failed/i)).toBeInTheDocument();
        expect(mockOnValidationError).toHaveBeenCalledWith([{
          file: testFile,
          errors: ['File reading failed']
        }]);
      });

      global.FileReader = originalFileReader;
    });
  });

  describe('Custom Validation', () => {
    it('should support custom validation function', async () => {
      const customValidator = vi.fn().mockReturnValue(['Custom error']);

      render(
        <FileUploadZone 
          onFileUpload={mockOnFileUpload} 
          onValidationError={mockOnValidationError}
          customValidator={customValidator}
        />
      );
      
      const dropZone = screen.getByRole('button', { name: /upload files/i });
      const testFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
      
      fireEvent.drop(dropZone, {
        dataTransfer: { files: [testFile] }
      });
      
      await waitFor(() => {
        expect(customValidator).toHaveBeenCalledWith(testFile);
        expect(screen.getByText(/custom error/i)).toBeInTheDocument();
        expect(mockOnValidationError).toHaveBeenCalledWith([{
          file: testFile,
          errors: ['Custom error']
        }]);
        expect(mockOnFileUpload).not.toHaveBeenCalled();
      });
    });

    it('should pass custom validation when no errors', async () => {
      const customValidator = vi.fn().mockReturnValue([]);

      render(
        <FileUploadZone 
          onFileUpload={mockOnFileUpload} 
          customValidator={customValidator}
        />
      );
      
      const dropZone = screen.getByRole('button', { name: /upload files/i });
      const testFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
      
      fireEvent.drop(dropZone, {
        dataTransfer: { files: [testFile] }
      });
      
      await waitFor(() => {
        expect(customValidator).toHaveBeenCalledWith(testFile);
        expect(mockOnFileUpload).toHaveBeenCalledWith([testFile]);
      });
    });
  });

  describe('Performance', () => {
    it('should debounce rapid file drops', async () => {
      render(<FileUploadZone onFileUpload={mockOnFileUpload} />);
      
      const dropZone = screen.getByRole('button', { name: /upload files/i });
      const testFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
      
      // Rapid fire drops
      fireEvent.drop(dropZone, { dataTransfer: { files: [testFile] } });
      fireEvent.drop(dropZone, { dataTransfer: { files: [testFile] } });
      fireEvent.drop(dropZone, { dataTransfer: { files: [testFile] } });
      
      await waitFor(() => {
        expect(mockOnFileUpload).toHaveBeenCalledTimes(1);
      });
    });

    it('should handle large file lists efficiently', async () => {
      const manyFiles = Array.from({ length: 100 }, (_, i) => 
        new File(['test'], `test${i}.pdf`, { type: 'application/pdf' })
      );

      render(<FileUploadZone onFileUpload={mockOnFileUpload} />);
      
      const dropZone = screen.getByRole('button', { name: /upload files/i });
      
      const startTime = performance.now();
      fireEvent.drop(dropZone, { dataTransfer: { files: manyFiles } });
      
      await waitFor(() => {
        const endTime = performance.now();
        expect(endTime - startTime).toBeLessThan(1000); // Should process in under 1 second
        expect(mockOnFileUpload).toHaveBeenCalledWith(manyFiles);
      });
    });
  });
});