import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import FileBrowser from '../../components/FileBrowser';

// Mock fetch for API calls
global.fetch = vi.fn();
const mockFetch = vi.mocked(fetch);

// Mock data
const mockFiles = [
  {
    id: 'file1',
    name: 'research-paper.pdf',
    originalName: 'research-paper.pdf',
    path: '/uploads/research-paper.pdf',
    size: 2048000,
    type: 'application/pdf',
    folderId: 'folder1',
    userId: 'user1',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'file2',
    name: 'literature-review.docx',
    originalName: 'literature-review.docx',
    path: '/uploads/literature-review.docx',
    size: 1024000,
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    folderId: 'folder1',
    userId: 'user1',
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z'
  },
  {
    id: 'file3',
    name: 'notes.txt',
    originalName: 'notes.txt',
    path: '/uploads/notes.txt',
    size: 512,
    type: 'text/plain',
    folderId: null,
    userId: 'user1',
    createdAt: '2024-01-03T00:00:00Z',
    updatedAt: '2024-01-03T00:00:00Z'
  }
];

const mockFolders = [
  {
    id: 'folder1',
    name: 'Research Papers',
    path: '/research-papers',
    parentId: null,
    children: [],
    fileCount: 2,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  }
];

describe('FileBrowser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
    
    // Default mock for API calls
    mockFetch.mockImplementation((url: string, options?: any) => {
      if (url === '/api/files') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ files: mockFiles })
        } as Response);
      }
      if (url === '/api/folders') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ folders: mockFolders })
        } as Response);
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
    it('should render file browser with file list', async () => {
      render(<FileBrowser />);
      
      await waitFor(() => {
        expect(screen.getByText('File Browser')).toBeInTheDocument();
        expect(screen.getByText('research-paper.pdf')).toBeInTheDocument();
        expect(screen.getByText('literature-review.docx')).toBeInTheDocument();
        expect(screen.getByText('notes.txt')).toBeInTheDocument();
      });
    });

    it('should show loading state initially', async () => {
      render(<FileBrowser />);
      
      expect(screen.getByText('Loading files...')).toBeInTheDocument();
    });

    it('should display file information', async () => {
      render(<FileBrowser />);
      
      await waitFor(() => {
        expect(screen.getByText('2.0 MB')).toBeInTheDocument(); // research-paper.pdf
        expect(screen.getByText('1.0 MB')).toBeInTheDocument(); // literature-review.docx
        expect(screen.getByText('512 B')).toBeInTheDocument();  // notes.txt
      });
    });

    it('should show file type icons', async () => {
      render(<FileBrowser />);
      
      await waitFor(() => {
        expect(screen.getByLabelText('PDF file')).toBeInTheDocument();
        expect(screen.getByLabelText('Word document')).toBeInTheDocument();
        expect(screen.getByLabelText('Text file')).toBeInTheDocument();
      });
    });

    it('should display folder structure in sidebar', async () => {
      render(<FileBrowser />);
      
      await waitFor(() => {
        expect(screen.getByText('Research Papers')).toBeInTheDocument();
        expect(screen.getByText('2 files')).toBeInTheDocument();
      });
    });
  });

  describe('File Selection', () => {
    it('should select file when clicked', async () => {
      render(<FileBrowser />);
      
      await waitFor(() => {
        const fileItem = screen.getByText('research-paper.pdf');
        fireEvent.click(fileItem);
      });
      
      const selectedFile = screen.getByText('research-paper.pdf').closest('[data-testid="file-item"]');
      expect(selectedFile).toHaveClass('bg-blue-50', 'border-blue-400');
    });

    it('should support multiple file selection with Ctrl+click', async () => {
      render(<FileBrowser />);
      
      await waitFor(() => {
        const file1 = screen.getByText('research-paper.pdf');
        const file2 = screen.getByText('literature-review.docx');
        
        fireEvent.click(file1);
        fireEvent.click(file2, { ctrlKey: true });
      });
      
      const selectedFiles = screen.getAllByTestId('file-item');
      const selectedCount = selectedFiles.filter(item => 
        item.classList.contains('bg-blue-50')
      ).length;
      
      expect(selectedCount).toBe(2);
    });

    it('should select range of files with Shift+click', async () => {
      render(<FileBrowser />);
      
      await waitFor(() => {
        const file1 = screen.getByText('research-paper.pdf');
        const file3 = screen.getByText('notes.txt');
        
        fireEvent.click(file1);
        fireEvent.click(file3, { shiftKey: true });
      });
      
      const selectedFiles = screen.getAllByTestId('file-item');
      const selectedCount = selectedFiles.filter(item => 
        item.classList.contains('bg-blue-50')
      ).length;
      
      expect(selectedCount).toBe(3);
    });

    it('should clear selection when clicking empty space', async () => {
      render(<FileBrowser />);
      
      await waitFor(() => {
        const file1 = screen.getByText('research-paper.pdf');
        fireEvent.click(file1);
      });
      
      const fileList = screen.getByTestId('file-list');
      fireEvent.click(fileList);
      
      const selectedFiles = screen.getAllByTestId('file-item');
      const selectedCount = selectedFiles.filter(item => 
        item.classList.contains('bg-blue-50')
      ).length;
      
      expect(selectedCount).toBe(0);
    });

    it('should show selection count in toolbar', async () => {
      render(<FileBrowser />);
      
      await waitFor(() => {
        const file1 = screen.getByText('research-paper.pdf');
        const file2 = screen.getByText('literature-review.docx');
        
        fireEvent.click(file1);
        fireEvent.click(file2, { ctrlKey: true });
      });
      
      expect(screen.getByText('2 files selected')).toBeInTheDocument();
    });
  });

  describe('File Operations', () => {
    it('should show context menu on right click', async () => {
      render(<FileBrowser />);
      
      await waitFor(() => {
        const fileItem = screen.getByText('research-paper.pdf');
        fireEvent.contextMenu(fileItem);
      });
      
      expect(screen.getByText('Open')).toBeInTheDocument();
      expect(screen.getByText('Download')).toBeInTheDocument();
      expect(screen.getByText('Rename')).toBeInTheDocument();
      expect(screen.getByText('Move to Folder')).toBeInTheDocument();
      expect(screen.getByText('Delete')).toBeInTheDocument();
    });

    it('should download file when download option selected', async () => {
      // Mock URL.createObjectURL
      global.URL.createObjectURL = vi.fn(() => 'blob:test');
      global.URL.revokeObjectURL = vi.fn();
      
      render(<FileBrowser />);
      
      await waitFor(() => {
        const fileItem = screen.getByText('research-paper.pdf');
        fireEvent.contextMenu(fileItem);
      });
      
      const downloadOption = screen.getByText('Download');
      fireEvent.click(downloadOption);
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/files/file1/download');
      });
    });

    it('should rename file when rename option selected', async () => {
      mockFetch.mockImplementation((url: string, options?: any) => {
        if (url === '/api/files/file1' && options?.method === 'PUT') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true })
          } as Response);
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ files: mockFiles })
        } as Response);
      });
      
      render(<FileBrowser />);
      
      await waitFor(() => {
        const fileItem = screen.getByText('research-paper.pdf');
        fireEvent.contextMenu(fileItem);
      });
      
      const renameOption = screen.getByText('Rename');
      fireEvent.click(renameOption);
      
      const nameInput = screen.getByDisplayValue('research-paper.pdf');
      fireEvent.change(nameInput, { target: { value: 'updated-research-paper.pdf' } });
      fireEvent.keyDown(nameInput, { key: 'Enter' });
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/files/file1', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'updated-research-paper.pdf'
          })
        });
      });
    });

    it('should move file to folder when move option selected', async () => {
      mockFetch.mockImplementation((url: string, options?: any) => {
        if (url === '/api/files/file3' && options?.method === 'PUT') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true })
          } as Response);
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ files: mockFiles, folders: mockFolders })
        } as Response);
      });
      
      render(<FileBrowser />);
      
      await waitFor(() => {
        const fileItem = screen.getByText('notes.txt');
        fireEvent.contextMenu(fileItem);
      });
      
      const moveOption = screen.getByText('Move to Folder');
      fireEvent.click(moveOption);
      
      expect(screen.getByText('Move File')).toBeInTheDocument();
      
      const folderSelect = screen.getByLabelText('Destination Folder');
      fireEvent.change(folderSelect, { target: { value: 'folder1' } });
      
      const moveButton = screen.getByText('Move');
      fireEvent.click(moveButton);
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/files/file3', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            folderId: 'folder1'
          })
        });
      });
    });

    it('should delete file when delete option selected', async () => {
      mockFetch.mockImplementation((url: string, options?: any) => {
        if (url === '/api/files/file1' && options?.method === 'DELETE') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true })
          } as Response);
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ files: mockFiles })
        } as Response);
      });
      
      render(<FileBrowser />);
      
      await waitFor(() => {
        const fileItem = screen.getByText('research-paper.pdf');
        fireEvent.contextMenu(fileItem);
      });
      
      const deleteOption = screen.getByText('Delete');
      fireEvent.click(deleteOption);
      
      // Should show confirmation dialog
      expect(screen.getByText('Delete File')).toBeInTheDocument();
      expect(screen.getByText('Are you sure you want to delete "research-paper.pdf"?')).toBeInTheDocument();
      
      const confirmButton = screen.getByText('Delete');
      fireEvent.click(confirmButton);
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/files/file1', {
          method: 'DELETE'
        });
      });
    });
  });

  describe('Bulk Operations', () => {
    it('should show bulk operations toolbar when files selected', async () => {
      render(<FileBrowser />);
      
      await waitFor(() => {
        const file1 = screen.getByText('research-paper.pdf');
        const file2 = screen.getByText('literature-review.docx');
        
        fireEvent.click(file1);
        fireEvent.click(file2, { ctrlKey: true });
      });
      
      expect(screen.getByText('Bulk Operations')).toBeInTheDocument();
      expect(screen.getByText('Download Selected')).toBeInTheDocument();
      expect(screen.getByText('Move Selected')).toBeInTheDocument();
      expect(screen.getByText('Delete Selected')).toBeInTheDocument();
    });

    it('should download multiple files as zip', async () => {
      render(<FileBrowser />);
      
      await waitFor(() => {
        const file1 = screen.getByText('research-paper.pdf');
        const file2 = screen.getByText('literature-review.docx');
        
        fireEvent.click(file1);
        fireEvent.click(file2, { ctrlKey: true });
      });
      
      const downloadButton = screen.getByText('Download Selected');
      fireEvent.click(downloadButton);
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/files/bulk/download', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileIds: ['file1', 'file2']
          })
        });
      });
    });

    it('should move multiple files to folder', async () => {
      render(<FileBrowser />);
      
      await waitFor(() => {
        const file1 = screen.getByText('research-paper.pdf');
        const file2 = screen.getByText('literature-review.docx');
        
        fireEvent.click(file1);
        fireEvent.click(file2, { ctrlKey: true });
      });
      
      const moveButton = screen.getByText('Move Selected');
      fireEvent.click(moveButton);
      
      expect(screen.getByText('Move Files')).toBeInTheDocument();
      
      const folderSelect = screen.getByLabelText('Destination Folder');
      fireEvent.change(folderSelect, { target: { value: 'folder1' } });
      
      const confirmButton = screen.getByText('Move');
      fireEvent.click(confirmButton);
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/files/bulk/move', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileIds: ['file1', 'file2'],
            folderId: 'folder1'
          })
        });
      });
    });

    it('should delete multiple files', async () => {
      render(<FileBrowser />);
      
      await waitFor(() => {
        const file1 = screen.getByText('research-paper.pdf');
        const file2 = screen.getByText('literature-review.docx');
        
        fireEvent.click(file1);
        fireEvent.click(file2, { ctrlKey: true });
      });
      
      const deleteButton = screen.getByText('Delete Selected');
      fireEvent.click(deleteButton);
      
      expect(screen.getByText('Delete Files')).toBeInTheDocument();
      expect(screen.getByText('Are you sure you want to delete 2 files?')).toBeInTheDocument();
      
      const confirmButton = screen.getByText('Delete');
      fireEvent.click(confirmButton);
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/files/bulk/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileIds: ['file1', 'file2']
          })
        });
      });
    });
  });

  describe('Folder Navigation', () => {
    it('should filter files by folder when folder selected', async () => {
      render(<FileBrowser />);
      
      await waitFor(() => {
        const folder = screen.getByText('Research Papers');
        fireEvent.click(folder);
      });
      
      await waitFor(() => {
        expect(screen.getByText('research-paper.pdf')).toBeInTheDocument();
        expect(screen.getByText('literature-review.docx')).toBeInTheDocument();
        expect(screen.queryByText('notes.txt')).not.toBeInTheDocument();
      });
    });

    it('should show all files when no folder selected', async () => {
      render(<FileBrowser />);
      
      await waitFor(() => {
        const folder = screen.getByText('Research Papers');
        fireEvent.click(folder);
      });
      
      await waitFor(() => {
        expect(screen.queryByText('notes.txt')).not.toBeInTheDocument();
      });
      
      const allFilesButton = screen.getByText('All Files');
      fireEvent.click(allFilesButton);
      
      await waitFor(() => {
        expect(screen.getByText('notes.txt')).toBeInTheDocument();
      });
    });

    it('should show breadcrumb navigation', async () => {
      render(<FileBrowser />);
      
      await waitFor(() => {
        const folder = screen.getByText('Research Papers');
        fireEvent.click(folder);
      });
      
      expect(screen.getByText('All Files')).toBeInTheDocument();
      expect(screen.getByText('>')).toBeInTheDocument();
      expect(screen.getByText('Research Papers')).toBeInTheDocument();
    });
  });

  describe('Search and Filter', () => {
    it('should render search input', async () => {
      render(<FileBrowser />);
      
      expect(screen.getByPlaceholderText('Search files...')).toBeInTheDocument();
    });

    it('should filter files based on search query', async () => {
      render(<FileBrowser />);
      
      await waitFor(() => {
        expect(screen.getByText('research-paper.pdf')).toBeInTheDocument();
        expect(screen.getByText('literature-review.docx')).toBeInTheDocument();
        expect(screen.getByText('notes.txt')).toBeInTheDocument();
      });
      
      const searchInput = screen.getByPlaceholderText('Search files...');
      fireEvent.change(searchInput, { target: { value: 'research' } });
      
      await waitFor(() => {
        expect(screen.getByText('research-paper.pdf')).toBeInTheDocument();
        expect(screen.queryByText('literature-review.docx')).not.toBeInTheDocument();
        expect(screen.queryByText('notes.txt')).not.toBeInTheDocument();
      });
    });

    it('should filter files by type', async () => {
      render(<FileBrowser />);
      
      await waitFor(() => {
        const typeFilter = screen.getByLabelText('File Type');
        fireEvent.change(typeFilter, { target: { value: 'pdf' } });
      });
      
      await waitFor(() => {
        expect(screen.getByText('research-paper.pdf')).toBeInTheDocument();
        expect(screen.queryByText('literature-review.docx')).not.toBeInTheDocument();
        expect(screen.queryByText('notes.txt')).not.toBeInTheDocument();
      });
    });

    it('should sort files by name, size, and date', async () => {
      render(<FileBrowser />);
      
      await waitFor(() => {
        const sortSelect = screen.getByLabelText('Sort by');
        fireEvent.change(sortSelect, { target: { value: 'name' } });
      });
      
      const fileItems = screen.getAllByTestId('file-item');
      expect(fileItems[0]).toHaveTextContent('literature-review.docx');
      expect(fileItems[1]).toHaveTextContent('notes.txt');
      expect(fileItems[2]).toHaveTextContent('research-paper.pdf');
    });

    it('should reverse sort order', async () => {
      render(<FileBrowser />);
      
      await waitFor(() => {
        const sortSelect = screen.getByLabelText('Sort by');
        fireEvent.change(sortSelect, { target: { value: 'size' } });
        
        const reverseButton = screen.getByLabelText('Reverse sort order');
        fireEvent.click(reverseButton);
      });
      
      const fileItems = screen.getAllByTestId('file-item');
      expect(fileItems[0]).toHaveTextContent('notes.txt'); // Smallest first when reversed
    });
  });

  describe('View Options', () => {
    it('should switch between list and grid view', async () => {
      render(<FileBrowser />);
      
      await waitFor(() => {
        const gridViewButton = screen.getByLabelText('Grid view');
        fireEvent.click(gridViewButton);
      });
      
      expect(screen.getByTestId('file-grid')).toBeInTheDocument();
      expect(screen.queryByTestId('file-list')).not.toBeInTheDocument();
    });

    it('should show file previews in grid view', async () => {
      render(<FileBrowser />);
      
      await waitFor(() => {
        const gridViewButton = screen.getByLabelText('Grid view');
        fireEvent.click(gridViewButton);
      });
      
      expect(screen.getByTestId('file-preview-file1')).toBeInTheDocument();
      expect(screen.getByTestId('file-preview-file2')).toBeInTheDocument();
    });
  });

  describe('File Preview', () => {
    it('should open file preview when file double-clicked', async () => {
      render(<FileBrowser />);
      
      await waitFor(() => {
        const fileItem = screen.getByText('research-paper.pdf');
        fireEvent.doubleClick(fileItem);
      });
      
      expect(screen.getByText('File Preview')).toBeInTheDocument();
      expect(screen.getByText('research-paper.pdf')).toBeInTheDocument();
    });

    it('should show file metadata in preview', async () => {
      render(<FileBrowser />);
      
      await waitFor(() => {
        const fileItem = screen.getByText('research-paper.pdf');
        fireEvent.doubleClick(fileItem);
      });
      
      expect(screen.getByText('Size: 2.0 MB')).toBeInTheDocument();
      expect(screen.getByText('Type: PDF')).toBeInTheDocument();
      expect(screen.getByText('Created: Jan 1, 2024')).toBeInTheDocument();
    });

    it('should close preview when close button clicked', async () => {
      render(<FileBrowser />);
      
      await waitFor(() => {
        const fileItem = screen.getByText('research-paper.pdf');
        fireEvent.doubleClick(fileItem);
      });
      
      const closeButton = screen.getByLabelText('Close preview');
      fireEvent.click(closeButton);
      
      expect(screen.queryByText('File Preview')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for file list', async () => {
      render(<FileBrowser />);
      
      await waitFor(() => {
        const fileList = screen.getByRole('grid');
        expect(fileList).toHaveAttribute('aria-label', 'File list');
      });
    });

    it('should have proper ARIA attributes for file items', async () => {
      render(<FileBrowser />);
      
      await waitFor(() => {
        const fileItem = screen.getByRole('gridcell', { name: /research-paper.pdf/ });
        expect(fileItem).toHaveAttribute('aria-selected', 'false');
      });
    });

    it('should support keyboard navigation', async () => {
      render(<FileBrowser />);
      
      await waitFor(() => {
        const fileItem = screen.getByText('research-paper.pdf');
        fileItem.focus();
        
        fireEvent.keyDown(fileItem, { key: 'ArrowDown' });
        expect(screen.getByText('literature-review.docx')).toHaveFocus();
        
        fireEvent.keyDown(fileItem, { key: 'Enter' });
        expect(fileItem.closest('[data-testid="file-item"]')).toHaveClass('bg-blue-50');
      });
    });

    it('should announce file operations to screen readers', async () => {
      render(<FileBrowser />);
      
      await waitFor(() => {
        const fileItem = screen.getByText('research-paper.pdf');
        fireEvent.click(fileItem);
      });
      
      expect(screen.getByText('research-paper.pdf selected')).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));
      
      render(<FileBrowser />);
      
      await waitFor(() => {
        expect(screen.getByText('Failed to load files')).toBeInTheDocument();
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });
    });

    it('should handle file operation errors', async () => {
      mockFetch.mockImplementation((url: string, options?: any) => {
        if (url === '/api/files/file1' && options?.method === 'DELETE') {
          return Promise.resolve({
            ok: false,
            json: () => Promise.resolve({ error: 'File is in use' })
          } as Response);
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ files: mockFiles })
        } as Response);
      });
      
      render(<FileBrowser />);
      
      await waitFor(() => {
        const fileItem = screen.getByText('research-paper.pdf');
        fireEvent.contextMenu(fileItem);
      });
      
      const deleteOption = screen.getByText('Delete');
      fireEvent.click(deleteOption);
      
      const confirmButton = screen.getByText('Delete');
      fireEvent.click(confirmButton);
      
      await waitFor(() => {
        expect(screen.getByText('File is in use')).toBeInTheDocument();
      });
    });

    it('should handle empty file list', async () => {
      mockFetch.mockImplementation(() => {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ files: [] })
        } as Response);
      });
      
      render(<FileBrowser />);
      
      await waitFor(() => {
        expect(screen.getByText('No files found')).toBeInTheDocument();
        expect(screen.getByText('Upload files to get started')).toBeInTheDocument();
      });
    });
  });
});