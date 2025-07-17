import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import FileBrowser from '../../components/FileBrowser';

// Mock fetch for API calls
global.fetch = vi.fn();
const mockFetch = vi.mocked(fetch);

// Mock data for enhanced tests
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
    name: 'image.jpg',
    originalName: 'image.jpg',
    path: '/uploads/image.jpg',
    size: 1024000,
    type: 'image/jpeg',
    folderId: 'folder1',
    userId: 'user1',
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z'
  },
  {
    id: 'file3',
    name: 'document.docx',
    originalName: 'document.docx',
    path: '/uploads/document.docx',
    size: 512000,
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    folderId: null,
    userId: 'user1',
    createdAt: '2024-01-03T00:00:00Z',
    updatedAt: '2024-01-03T00:00:00Z'
  }
];

const mockFolders = [
  {
    id: 'folder1',
    name: 'Documents',
    path: '/documents',
    parentId: null,
    children: [],
    fileCount: 2,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  }
];

describe('FileBrowser Enhanced Features', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
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
    vi.clearAllMocks();
  });

  describe('File Preview Integration', () => {
    it('should show file preview panel when file is selected', async () => {
      render(<FileBrowser showPreview={true} />);
      
      await waitFor(() => {
        const fileItem = screen.getByText('research-paper.pdf');
        fireEvent.click(fileItem);
      });
      
      // Preview panel should be visible
      expect(screen.getByTestId('file-preview-panel')).toBeInTheDocument();
      expect(screen.getByText('File Preview')).toBeInTheDocument();
    });

    it('should show file thumbnail in preview panel', async () => {
      render(<FileBrowser showPreview={true} />);
      
      await waitFor(() => {
        const fileItem = screen.getByText('image.jpg');
        fireEvent.click(fileItem);
      });
      
      expect(screen.getByTestId('file-thumbnail')).toBeInTheDocument();
      expect(screen.getByAltText('Preview of image.jpg')).toBeInTheDocument();
    });

    it('should show file metadata in preview panel', async () => {
      render(<FileBrowser showPreview={true} />);
      
      await waitFor(() => {
        const fileItem = screen.getByText('research-paper.pdf');
        fireEvent.click(fileItem);
      });
      
      const previewPanel = screen.getByTestId('file-preview-panel');
      expect(within(previewPanel).getByText('Size: 2.0 MB')).toBeInTheDocument();
      expect(within(previewPanel).getByText('Type: PDF')).toBeInTheDocument();
      expect(within(previewPanel).getByText('Created: Jan 1, 2024')).toBeInTheDocument();
    });

    it('should handle preview for different file types', async () => {
      render(<FileBrowser showPreview={true} />);
      
      // PDF file
      await waitFor(() => {
        const pdfFile = screen.getByText('research-paper.pdf');
        fireEvent.click(pdfFile);
      });
      
      expect(screen.getByTestId('pdf-preview')).toBeInTheDocument();
      
      // Image file
      const imageFile = screen.getByText('image.jpg');
      fireEvent.click(imageFile);
      
      expect(screen.getByTestId('image-preview')).toBeInTheDocument();
      
      // Document file
      const docFile = screen.getByText('document.docx');
      fireEvent.click(docFile);
      
      expect(screen.getByTestId('document-preview')).toBeInTheDocument();
    });

    it('should close preview panel when close button is clicked', async () => {
      render(<FileBrowser showPreview={true} />);
      
      await waitFor(() => {
        const fileItem = screen.getByText('research-paper.pdf');
        fireEvent.click(fileItem);
      });
      
      const closeButton = screen.getByLabelText('Close preview');
      fireEvent.click(closeButton);
      
      expect(screen.queryByTestId('file-preview-panel')).not.toBeInTheDocument();
    });
  });

  describe('Advanced File Operations', () => {
    it('should show file properties dialog when properties option selected', async () => {
      render(<FileBrowser />);
      
      await waitFor(() => {
        const fileItem = screen.getByText('research-paper.pdf');
        fireEvent.contextMenu(fileItem);
      });
      
      const propertiesOption = screen.getByText('Properties');
      fireEvent.click(propertiesOption);
      
      expect(screen.getByText('File Properties')).toBeInTheDocument();
      expect(screen.getByText('research-paper.pdf')).toBeInTheDocument();
    });

    it('should allow file renaming through properties dialog', async () => {
      render(<FileBrowser />);
      
      await waitFor(() => {
        const fileItem = screen.getByText('research-paper.pdf');
        fireEvent.contextMenu(fileItem);
      });
      
      const propertiesOption = screen.getByText('Properties');
      fireEvent.click(propertiesOption);
      
      const nameInput = screen.getByDisplayValue('research-paper.pdf');
      fireEvent.change(nameInput, { target: { value: 'updated-research-paper.pdf' } });
      
      const saveButton = screen.getByText('Save');
      fireEvent.click(saveButton);
      
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

    it('should show file sharing dialog when share option selected', async () => {
      render(<FileBrowser />);
      
      await waitFor(() => {
        const fileItem = screen.getByText('research-paper.pdf');
        fireEvent.contextMenu(fileItem);
      });
      
      const shareOption = screen.getByText('Share');
      fireEvent.click(shareOption);
      
      expect(screen.getByText('Share File')).toBeInTheDocument();
      expect(screen.getByText('Generate shareable link')).toBeInTheDocument();
    });

    it('should duplicate file when duplicate option selected', async () => {
      render(<FileBrowser />);
      
      await waitFor(() => {
        const fileItem = screen.getByText('research-paper.pdf');
        fireEvent.contextMenu(fileItem);
      });
      
      const duplicateOption = screen.getByText('Duplicate');
      fireEvent.click(duplicateOption);
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/files/file1/duplicate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
      });
    });

    it('should show file version history when versions option selected', async () => {
      render(<FileBrowser />);
      
      await waitFor(() => {
        const fileItem = screen.getByText('research-paper.pdf');
        fireEvent.contextMenu(fileItem);
      });
      
      const versionsOption = screen.getByText('Version History');
      fireEvent.click(versionsOption);
      
      expect(screen.getByText('Version History')).toBeInTheDocument();
      expect(screen.getByText('research-paper.pdf')).toBeInTheDocument();
    });
  });

  describe('Advanced Search and Filtering', () => {
    it('should filter files by file type using dropdown', async () => {
      render(<FileBrowser />);
      
      await waitFor(() => {
        const typeFilter = screen.getByLabelText('File Type');
        fireEvent.change(typeFilter, { target: { value: 'pdf' } });
      });
      
      await waitFor(() => {
        expect(screen.getByText('research-paper.pdf')).toBeInTheDocument();
        expect(screen.queryByText('image.jpg')).not.toBeInTheDocument();
        expect(screen.queryByText('document.docx')).not.toBeInTheDocument();
      });
    });

    it('should filter files by size range', async () => {
      render(<FileBrowser />);
      
      await waitFor(() => {
        const sizeFilter = screen.getByLabelText('Size Range');
        fireEvent.change(sizeFilter, { target: { value: '1MB-5MB' } });
      });
      
      await waitFor(() => {
        expect(screen.getByText('research-paper.pdf')).toBeInTheDocument();
        expect(screen.getByText('image.jpg')).toBeInTheDocument();
        expect(screen.queryByText('document.docx')).not.toBeInTheDocument();
      });
    });

    it('should filter files by date range', async () => {
      render(<FileBrowser />);
      
      await waitFor(() => {
        const dateFromInput = screen.getByLabelText('Date From');
        const dateToInput = screen.getByLabelText('Date To');
        
        fireEvent.change(dateFromInput, { target: { value: '2024-01-01' } });
        fireEvent.change(dateToInput, { target: { value: '2024-01-01' } });
      });
      
      await waitFor(() => {
        expect(screen.getByText('research-paper.pdf')).toBeInTheDocument();
        expect(screen.queryByText('image.jpg')).not.toBeInTheDocument();
        expect(screen.queryByText('document.docx')).not.toBeInTheDocument();
      });
    });

    it('should show advanced search dialog when advanced search clicked', async () => {
      render(<FileBrowser />);
      
      const advancedSearchButton = screen.getByText('Advanced Search');
      fireEvent.click(advancedSearchButton);
      
      expect(screen.getByText('Advanced Search')).toBeInTheDocument();
      expect(screen.getByLabelText('File Name')).toBeInTheDocument();
      expect(screen.getByLabelText('File Type')).toBeInTheDocument();
      expect(screen.getByLabelText('Size Range')).toBeInTheDocument();
      expect(screen.getByLabelText('Date Range')).toBeInTheDocument();
    });

    it('should save search criteria and show saved searches', async () => {
      render(<FileBrowser />);
      
      const advancedSearchButton = screen.getByText('Advanced Search');
      fireEvent.click(advancedSearchButton);
      
      const nameInput = screen.getByLabelText('File Name');
      fireEvent.change(nameInput, { target: { value: 'research' } });
      
      const saveSearchButton = screen.getByText('Save Search');
      fireEvent.click(saveSearchButton);
      
      const searchNameInput = screen.getByLabelText('Search Name');
      fireEvent.change(searchNameInput, { target: { value: 'Research Papers' } });
      
      const saveButton = screen.getByText('Save');
      fireEvent.click(saveButton);
      
      expect(screen.getByText('Research Papers')).toBeInTheDocument();
    });

    it('should show search results count', async () => {
      render(<FileBrowser />);
      
      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText('Search files...');
        fireEvent.change(searchInput, { target: { value: 'research' } });
      });
      
      await waitFor(() => {
        expect(screen.getByText('1 result found')).toBeInTheDocument();
      });
    });
  });

  describe('File Organization Features', () => {
    it('should show file tags when tags feature is enabled', async () => {
      render(<FileBrowser showTags={true} />);
      
      await waitFor(() => {
        const fileItem = screen.getByTestId('file-item-file1');
        expect(within(fileItem).getByTestId('file-tags')).toBeInTheDocument();
      });
    });

    it('should allow adding tags to files', async () => {
      render(<FileBrowser showTags={true} />);
      
      await waitFor(() => {
        const fileItem = screen.getByText('research-paper.pdf');
        fireEvent.contextMenu(fileItem);
      });
      
      const addTagOption = screen.getByText('Add Tag');
      fireEvent.click(addTagOption);
      
      const tagInput = screen.getByPlaceholderText('Enter tag name');
      fireEvent.change(tagInput, { target: { value: 'important' } });
      
      const addButton = screen.getByText('Add');
      fireEvent.click(addButton);
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/files/file1/tags', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tag: 'important' })
        });
      });
    });

    it('should filter files by tags', async () => {
      render(<FileBrowser showTags={true} />);
      
      await waitFor(() => {
        const tagFilter = screen.getByLabelText('Filter by Tag');
        fireEvent.change(tagFilter, { target: { value: 'important' } });
      });
      
      await waitFor(() => {
        expect(screen.getByText('research-paper.pdf')).toBeInTheDocument();
        expect(screen.queryByText('image.jpg')).not.toBeInTheDocument();
      });
    });

    it('should show file collections when collections feature is enabled', async () => {
      render(<FileBrowser showCollections={true} />);
      
      expect(screen.getByText('Collections')).toBeInTheDocument();
      expect(screen.getByText('Create Collection')).toBeInTheDocument();
    });

    it('should allow creating new collections', async () => {
      render(<FileBrowser showCollections={true} />);
      
      const createButton = screen.getByText('Create Collection');
      fireEvent.click(createButton);
      
      const nameInput = screen.getByLabelText('Collection Name');
      fireEvent.change(nameInput, { target: { value: 'Research Papers' } });
      
      const saveButton = screen.getByText('Create');
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/collections', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Research Papers' })
        });
      });
    });

    it('should allow adding files to collections', async () => {
      render(<FileBrowser showCollections={true} />);
      
      await waitFor(() => {
        const fileItem = screen.getByText('research-paper.pdf');
        fireEvent.contextMenu(fileItem);
      });
      
      const addToCollectionOption = screen.getByText('Add to Collection');
      fireEvent.click(addToCollectionOption);
      
      const collectionSelect = screen.getByLabelText('Select Collection');
      fireEvent.change(collectionSelect, { target: { value: 'collection1' } });
      
      const addButton = screen.getByText('Add');
      fireEvent.click(addButton);
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/collections/collection1/files', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileId: 'file1' })
        });
      });
    });
  });

  describe('Batch Operations Extended', () => {
    it('should show batch operations toolbar with extended options', async () => {
      render(<FileBrowser />);
      
      await waitFor(() => {
        const file1 = screen.getByText('research-paper.pdf');
        const file2 = screen.getByText('image.jpg');
        
        fireEvent.click(file1);
        fireEvent.click(file2, { ctrlKey: true });
      });
      
      expect(screen.getByText('Batch Operations')).toBeInTheDocument();
      expect(screen.getByText('Download Selected')).toBeInTheDocument();
      expect(screen.getByText('Move Selected')).toBeInTheDocument();
      expect(screen.getByText('Delete Selected')).toBeInTheDocument();
      expect(screen.getByText('Add Tags')).toBeInTheDocument();
      expect(screen.getByText('Add to Collection')).toBeInTheDocument();
    });

    it('should allow batch tagging of selected files', async () => {
      render(<FileBrowser />);
      
      await waitFor(() => {
        const file1 = screen.getByText('research-paper.pdf');
        const file2 = screen.getByText('image.jpg');
        
        fireEvent.click(file1);
        fireEvent.click(file2, { ctrlKey: true });
      });
      
      const addTagsButton = screen.getByText('Add Tags');
      fireEvent.click(addTagsButton);
      
      const tagInput = screen.getByPlaceholderText('Enter tags (comma-separated)');
      fireEvent.change(tagInput, { target: { value: 'important,research' } });
      
      const applyButton = screen.getByText('Apply');
      fireEvent.click(applyButton);
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/files/batch/tags', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileIds: ['file1', 'file2'],
            tags: ['important', 'research']
          })
        });
      });
    });

    it('should allow batch collection assignment', async () => {
      render(<FileBrowser />);
      
      await waitFor(() => {
        const file1 = screen.getByText('research-paper.pdf');
        const file2 = screen.getByText('image.jpg');
        
        fireEvent.click(file1);
        fireEvent.click(file2, { ctrlKey: true });
      });
      
      const addToCollectionButton = screen.getByText('Add to Collection');
      fireEvent.click(addToCollectionButton);
      
      const collectionSelect = screen.getByLabelText('Select Collection');
      fireEvent.change(collectionSelect, { target: { value: 'collection1' } });
      
      const applyButton = screen.getByText('Apply');
      fireEvent.click(applyButton);
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/collections/collection1/files/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileIds: ['file1', 'file2']
          })
        });
      });
    });

    it('should show batch operation progress', async () => {
      render(<FileBrowser />);
      
      await waitFor(() => {
        const file1 = screen.getByText('research-paper.pdf');
        const file2 = screen.getByText('image.jpg');
        
        fireEvent.click(file1);
        fireEvent.click(file2, { ctrlKey: true });
      });
      
      const deleteButton = screen.getByText('Delete Selected');
      fireEvent.click(deleteButton);
      
      const confirmButton = screen.getByText('Delete');
      fireEvent.click(confirmButton);
      
      expect(screen.getByText('Deleting files...')).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
  });

  describe('File Browser Performance', () => {
    it('should implement virtual scrolling for large file lists', async () => {
      const largeFileList = Array.from({ length: 1000 }, (_, i) => ({
        id: `file${i}`,
        name: `file${i}.pdf`,
        originalName: `file${i}.pdf`,
        path: `/uploads/file${i}.pdf`,
        size: 1024000,
        type: 'application/pdf',
        folderId: null,
        userId: 'user1',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      }));
      
      mockFetch.mockImplementation(() => 
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ files: largeFileList })
        } as Response)
      );
      
      render(<FileBrowser virtualScrolling={true} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('virtual-scroll-container')).toBeInTheDocument();
        expect(screen.getByText('file0.pdf')).toBeInTheDocument();
        expect(screen.queryByText('file999.pdf')).not.toBeInTheDocument();
      });
    });

    it('should show loading indicators for async operations', async () => {
      render(<FileBrowser />);
      
      await waitFor(() => {
        const fileItem = screen.getByText('research-paper.pdf');
        fireEvent.contextMenu(fileItem);
      });
      
      const renameOption = screen.getByText('Rename');
      fireEvent.click(renameOption);
      
      const nameInput = screen.getByDisplayValue('research-paper.pdf');
      fireEvent.change(nameInput, { target: { value: 'new-name.pdf' } });
      fireEvent.keyDown(nameInput, { key: 'Enter' });
      
      expect(screen.getByText('Renaming file...')).toBeInTheDocument();
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });

    it('should implement lazy loading for file thumbnails', async () => {
      render(<FileBrowser lazyThumbnails={true} />);
      
      await waitFor(() => {
        const fileItem = screen.getByTestId('file-item-file2');
        expect(within(fileItem).getByTestId('thumbnail-placeholder')).toBeInTheDocument();
      });
      
      // Scroll thumbnail into view
      const thumbnailPlaceholder = screen.getByTestId('thumbnail-placeholder');
      fireEvent.scroll(thumbnailPlaceholder);
      
      await waitFor(() => {
        expect(screen.getByTestId('file-thumbnail')).toBeInTheDocument();
      });
    });
  });

  describe('File Browser Accessibility Extended', () => {
    it('should support screen reader announcements for file operations', async () => {
      render(<FileBrowser />);
      
      await waitFor(() => {
        const fileItem = screen.getByText('research-paper.pdf');
        fireEvent.contextMenu(fileItem);
      });
      
      const deleteOption = screen.getByText('Delete');
      fireEvent.click(deleteOption);
      
      const confirmButton = screen.getByText('Delete');
      fireEvent.click(confirmButton);
      
      expect(screen.getByText('File deleted successfully')).toHaveAttribute('aria-live', 'polite');
    });

    it('should provide keyboard shortcuts for common operations', async () => {
      render(<FileBrowser />);
      
      await waitFor(() => {
        const fileItem = screen.getByText('research-paper.pdf');
        fileItem.focus();
        
        // Test keyboard shortcut for delete
        fireEvent.keyDown(fileItem, { key: 'Delete' });
        expect(screen.getByText('Delete File')).toBeInTheDocument();
        
        // Test keyboard shortcut for rename
        fireEvent.keyDown(fileItem, { key: 'F2' });
        expect(screen.getByDisplayValue('research-paper.pdf')).toBeInTheDocument();
      });
    });

    it('should have proper ARIA labels for complex interactions', async () => {
      render(<FileBrowser />);
      
      await waitFor(() => {
        const fileItem = screen.getByRole('gridcell', { name: /research-paper.pdf/ });
        expect(fileItem).toHaveAttribute('aria-describedby');
        
        const description = document.getElementById(fileItem.getAttribute('aria-describedby')!);
        expect(description).toHaveTextContent('2.0 MB, PDF file, modified Jan 1, 2024');
      });
    });

    it('should support high contrast mode', async () => {
      render(<FileBrowser highContrast={true} />);
      
      await waitFor(() => {
        const fileItem = screen.getByTestId('file-item-file1');
        expect(fileItem).toHaveClass('high-contrast');
      });
    });
  });

  describe('File Browser Integration', () => {
    it('should integrate with file upload component', async () => {
      render(<FileBrowser allowUpload={true} />);
      
      const uploadButton = screen.getByText('Upload Files');
      fireEvent.click(uploadButton);
      
      expect(screen.getByTestId('file-upload-zone')).toBeInTheDocument();
    });

    it('should integrate with folder management', async () => {
      render(<FileBrowser showFolders={true} />);
      
      expect(screen.getByTestId('folder-sidebar')).toBeInTheDocument();
      expect(screen.getByText('Documents')).toBeInTheDocument();
    });

    it('should handle file browser within workflow context', async () => {
      render(<FileBrowser workflowMode={true} />);
      
      await waitFor(() => {
        const fileItem = screen.getByText('research-paper.pdf');
        fireEvent.click(fileItem);
      });
      
      const useInWorkflowButton = screen.getByText('Use in Workflow');
      fireEvent.click(useInWorkflowButton);
      
      expect(screen.getByText('File selected for workflow')).toBeInTheDocument();
    });
  });

  describe('Error Handling Extended', () => {
    it('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));
      
      render(<FileBrowser />);
      
      await waitFor(() => {
        expect(screen.getByText('Network error occurred')).toBeInTheDocument();
        expect(screen.getByText('Check your connection and try again')).toBeInTheDocument();
      });
    });

    it('should handle file operation conflicts', async () => {
      mockFetch.mockImplementation((url: string, options?: any) => {
        if (url.includes('/api/files/file1') && options?.method === 'DELETE') {
          return Promise.resolve({
            ok: false,
            json: () => Promise.resolve({ 
              error: 'File is currently in use',
              details: 'This file is being used in an active workflow'
            })
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
        expect(screen.getByText('File is currently in use')).toBeInTheDocument();
        expect(screen.getByText('This file is being used in an active workflow')).toBeInTheDocument();
      });
    });

    it('should handle permission errors', async () => {
      mockFetch.mockImplementation((url: string, options?: any) => {
        if (url.includes('/api/files/file1') && options?.method === 'PUT') {
          return Promise.resolve({
            ok: false,
            status: 403,
            json: () => Promise.resolve({ error: 'Permission denied' })
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
      fireEvent.change(nameInput, { target: { value: 'new-name.pdf' } });
      fireEvent.keyDown(nameInput, { key: 'Enter' });
      
      await waitFor(() => {
        expect(screen.getByText('Permission denied')).toBeInTheDocument();
      });
    });

    it('should handle file corruption detection', async () => {
      mockFetch.mockImplementation((url: string, options?: any) => {
        if (url.includes('/api/files/file1/validate')) {
          return Promise.resolve({
            ok: false,
            json: () => Promise.resolve({ 
              error: 'File appears to be corrupted',
              details: 'File integrity check failed'
            })
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
      
      const validateOption = screen.getByText('Validate File');
      fireEvent.click(validateOption);
      
      await waitFor(() => {
        expect(screen.getByText('File appears to be corrupted')).toBeInTheDocument();
        expect(screen.getByText('File integrity check failed')).toBeInTheDocument();
      });
    });
  });
});