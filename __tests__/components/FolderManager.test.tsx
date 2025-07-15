import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import FolderManager from '../../components/FolderManager';

// Mock fetch for API calls
global.fetch = vi.fn();
const mockFetch = vi.mocked(fetch);

// Mock data
const mockFolders = [
  {
    id: 'folder1',
    name: 'Research Papers',
    path: '/research-papers',
    parentId: null,
    children: [
      {
        id: 'folder2',
        name: 'Literature Review',
        path: '/research-papers/literature-review',
        parentId: 'folder1',
        children: [],
        files: [],
        fileCount: 5,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      }
    ],
    files: [],
    fileCount: 10,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'folder3',
    name: 'References',
    path: '/references',
    parentId: null,
    children: [],
    files: [],
    fileCount: 3,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  }
];

describe('FolderManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
    
    // Default mock for folder API
    mockFetch.mockImplementation((url: string, options?: any) => {
      if (url === '/api/folders') {
        if (options?.method === 'GET') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ folders: mockFolders })
          } as Response);
        }
        if (options?.method === 'POST') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ 
              id: 'new-folder',
              name: 'New Folder',
              path: '/new-folder',
              parentId: null,
              children: [],
              files: [],
              fileCount: 0,
              createdAt: '2024-01-01T00:00:00Z',
              updatedAt: '2024-01-01T00:00:00Z'
            })
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
    it('should render folder manager with tree structure', async () => {
      render(<FolderManager />);
      
      await waitFor(() => {
        expect(screen.getByText('Folder Manager')).toBeInTheDocument();
        expect(screen.getByText('Research Papers')).toBeInTheDocument();
        expect(screen.getByText('References')).toBeInTheDocument();
      });
    });

    it('should show loading state initially', async () => {
      render(<FolderManager />);
      
      expect(screen.getByText('Loading folders...')).toBeInTheDocument();
    });

    it('should render folder tree with proper hierarchy', async () => {
      render(<FolderManager />);
      
      await waitFor(() => {
        const researchFolder = screen.getByText('Research Papers');
        const literatureFolder = screen.getByText('Literature Review');
        
        expect(researchFolder).toBeInTheDocument();
        expect(literatureFolder).toBeInTheDocument();
        
        // Literature Review should be nested under Research Papers
        const literatureItem = literatureFolder.closest('[data-level="1"]');
        expect(literatureItem).toBeInTheDocument();
      });
    });

    it('should show file counts for each folder', async () => {
      render(<FolderManager />);
      
      await waitFor(() => {
        expect(screen.getByText('10 files')).toBeInTheDocument();
        expect(screen.getByText('5 files')).toBeInTheDocument();
        expect(screen.getByText('3 files')).toBeInTheDocument();
      });
    });
  });

  describe('Folder Creation', () => {
    it('should show create folder button', async () => {
      render(<FolderManager />);
      
      await waitFor(() => {
        expect(screen.getByText('Create Folder')).toBeInTheDocument();
      });
    });

    it('should open create folder dialog when button clicked', async () => {
      render(<FolderManager />);
      
      await waitFor(() => {
        const createButton = screen.getByText('Create Folder');
        fireEvent.click(createButton);
      });
      
      expect(screen.getByText('Create New Folder')).toBeInTheDocument();
      expect(screen.getByLabelText('Folder Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Parent Folder')).toBeInTheDocument();
    });

    it('should create folder with valid input', async () => {
      render(<FolderManager />);
      
      await waitFor(() => {
        const createButton = screen.getByText('Create Folder');
        fireEvent.click(createButton);
      });
      
      const nameInput = screen.getByLabelText('Folder Name');
      const submitButton = screen.getByText('Create');
      
      fireEvent.change(nameInput, { target: { value: 'New Test Folder' } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/folders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'New Test Folder',
            parentId: null
          })
        });
      });
    });

    it('should validate folder name is required', async () => {
      render(<FolderManager />);
      
      await waitFor(() => {
        const createButton = screen.getByText('Create Folder');
        fireEvent.click(createButton);
      });
      
      const submitButton = screen.getByText('Create');
      fireEvent.click(submitButton);
      
      expect(screen.getByText('Folder name is required')).toBeInTheDocument();
    });

    it('should validate folder name length', async () => {
      render(<FolderManager />);
      
      await waitFor(() => {
        const createButton = screen.getByText('Create Folder');
        fireEvent.click(createButton);
      });
      
      const nameInput = screen.getByLabelText('Folder Name');
      const submitButton = screen.getByText('Create');
      
      fireEvent.change(nameInput, { target: { value: 'a'.repeat(256) } });
      fireEvent.click(submitButton);
      
      expect(screen.getByText('Folder name must be less than 255 characters')).toBeInTheDocument();
    });

    it('should create subfolder with parent selection', async () => {
      render(<FolderManager />);
      
      await waitFor(() => {
        const createButton = screen.getByText('Create Folder');
        fireEvent.click(createButton);
      });
      
      const nameInput = screen.getByLabelText('Folder Name');
      const parentSelect = screen.getByLabelText('Parent Folder');
      const submitButton = screen.getByText('Create');
      
      fireEvent.change(nameInput, { target: { value: 'Subfolder' } });
      fireEvent.change(parentSelect, { target: { value: 'folder1' } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/folders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'Subfolder',
            parentId: 'folder1'
          })
        });
      });
    });
  });

  describe('Folder Operations', () => {
    it('should show context menu on right click', async () => {
      render(<FolderManager />);
      
      await waitFor(() => {
        const folderItem = screen.getByText('Research Papers');
        fireEvent.contextMenu(folderItem);
      });
      
      expect(screen.getByText('Rename')).toBeInTheDocument();
      expect(screen.getByText('Delete')).toBeInTheDocument();
      expect(screen.getByText('Create Subfolder')).toBeInTheDocument();
    });

    it('should rename folder when rename option selected', async () => {
      mockFetch.mockImplementation((url: string, options?: any) => {
        if (url === '/api/folders') {
          if (options?.method === 'GET') {
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve({ folders: mockFolders })
            } as Response);
          }
        }
        if (url === '/api/folders/folder1') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true })
          } as Response);
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({})
        } as Response);
      });
      
      render(<FolderManager />);
      
      await waitFor(() => {
        const folderItem = screen.getByText('Research Papers');
        fireEvent.contextMenu(folderItem);
      });
      
      const renameOption = screen.getByText('Rename');
      fireEvent.click(renameOption);
      
      const nameInput = screen.getByDisplayValue('Research Papers');
      fireEvent.change(nameInput, { target: { value: 'Updated Research Papers' } });
      fireEvent.keyDown(nameInput, { key: 'Enter' });
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/folders/folder1', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'Updated Research Papers'
          })
        });
      });
    });

    it('should delete folder when delete option selected', async () => {
      mockFetch.mockImplementation((url: string, options?: any) => {
        if (url === '/api/folders') {
          if (options?.method === 'GET') {
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve({ folders: mockFolders })
            } as Response);
          }
        }
        if (url === '/api/folders/folder3') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true })
          } as Response);
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({})
        } as Response);
      });
      
      render(<FolderManager />);
      
      await waitFor(() => {
        const folderItem = screen.getByText('References');
        fireEvent.contextMenu(folderItem);
      });
      
      const deleteOption = screen.getByText('Delete');
      fireEvent.click(deleteOption);
      
      // Should show confirmation dialog
      expect(screen.getByText('Delete Folder')).toBeInTheDocument();
      expect(screen.getByText('Are you sure you want to delete "References"?')).toBeInTheDocument();
      
      const confirmButton = screen.getByText('Delete');
      fireEvent.click(confirmButton);
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/folders/folder3', {
          method: 'DELETE'
        });
      });
    });

    it('should warn when deleting folder with files', async () => {
      render(<FolderManager />);
      
      await waitFor(() => {
        const folderItem = screen.getByText('Research Papers');
        fireEvent.contextMenu(folderItem);
      });
      
      const deleteOption = screen.getByText('Delete');
      fireEvent.click(deleteOption);
      
      expect(screen.getByText('This folder contains 10 files')).toBeInTheDocument();
      expect(screen.getByText('All files will be permanently deleted')).toBeInTheDocument();
    });
  });

  describe('Folder Expansion/Collapse', () => {
    it('should expand folder when clicked', async () => {
      render(<FolderManager />);
      
      await waitFor(() => {
        const expandButton = screen.getByLabelText('Expand Research Papers');
        fireEvent.click(expandButton);
      });
      
      expect(screen.getByText('Literature Review')).toBeInTheDocument();
    });

    it('should collapse folder when clicked again', async () => {
      render(<FolderManager />);
      
      await waitFor(() => {
        const expandButton = screen.getByLabelText('Expand Research Papers');
        fireEvent.click(expandButton);
      });
      
      expect(screen.getByText('Literature Review')).toBeInTheDocument();
      
      const collapseButton = screen.getByLabelText('Collapse Research Papers');
      fireEvent.click(collapseButton);
      
      expect(screen.queryByText('Literature Review')).not.toBeInTheDocument();
    });

    it('should remember expansion state', async () => {
      render(<FolderManager />);
      
      await waitFor(() => {
        const expandButton = screen.getByLabelText('Expand Research Papers');
        fireEvent.click(expandButton);
      });
      
      expect(screen.getByText('Literature Review')).toBeInTheDocument();
      
      // Simulate re-render
      cleanup();
      render(<FolderManager />);
      
      await waitFor(() => {
        expect(screen.getByText('Literature Review')).toBeInTheDocument();
      });
    });
  });

  describe('Drag and Drop', () => {
    it('should handle folder reordering via drag and drop', async () => {
      render(<FolderManager />);
      
      await waitFor(() => {
        const sourceFolder = screen.getByText('References');
        const targetFolder = screen.getByText('Research Papers');
        
        fireEvent.dragStart(sourceFolder, {
          dataTransfer: { setData: vi.fn() }
        });
        
        fireEvent.dragOver(targetFolder);
        fireEvent.drop(targetFolder);
      });
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/folders/folder3', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            parentId: 'folder1'
          })
        });
      });
    });

    it('should show drop indicator during drag operation', async () => {
      render(<FolderManager />);
      
      await waitFor(() => {
        const sourceFolder = screen.getByText('References');
        const targetFolder = screen.getByText('Research Papers');
        
        fireEvent.dragStart(sourceFolder);
        fireEvent.dragOver(targetFolder);
      });
      
      expect(targetFolder.closest('[data-testid="folder-item"]')).toHaveClass('bg-blue-50', 'border-blue-400');
    });

    it('should prevent dropping folder onto itself', async () => {
      render(<FolderManager />);
      
      await waitFor(() => {
        const folder = screen.getByText('Research Papers');
        
        fireEvent.dragStart(folder);
        fireEvent.dragOver(folder);
        fireEvent.drop(folder);
      });
      
      expect(mockFetch).not.toHaveBeenCalledWith('/api/folders/folder1', expect.any(Object));
    });
  });

  describe('Search and Filter', () => {
    it('should render search input', async () => {
      render(<FolderManager />);
      
      expect(screen.getByPlaceholderText('Search folders...')).toBeInTheDocument();
    });

    it('should filter folders based on search query', async () => {
      render(<FolderManager />);
      
      await waitFor(() => {
        expect(screen.getByText('Research Papers')).toBeInTheDocument();
        expect(screen.getByText('References')).toBeInTheDocument();
      });
      
      const searchInput = screen.getByPlaceholderText('Search folders...');
      fireEvent.change(searchInput, { target: { value: 'Research' } });
      
      await waitFor(() => {
        expect(screen.getByText('Research Papers')).toBeInTheDocument();
        expect(screen.queryByText('References')).not.toBeInTheDocument();
      });
    });

    it('should show no results message when search has no matches', async () => {
      render(<FolderManager />);
      
      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText('Search folders...');
        fireEvent.change(searchInput, { target: { value: 'nonexistent' } });
      });
      
      expect(screen.getByText('No folders found matching "nonexistent"')).toBeInTheDocument();
    });

    it('should clear search when search input is cleared', async () => {
      render(<FolderManager />);
      
      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText('Search folders...');
        fireEvent.change(searchInput, { target: { value: 'Research' } });
      });
      
      await waitFor(() => {
        expect(screen.queryByText('References')).not.toBeInTheDocument();
      });
      
      const searchInput = screen.getByPlaceholderText('Search folders...');
      fireEvent.change(searchInput, { target: { value: '' } });
      
      await waitFor(() => {
        expect(screen.getByText('References')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for folder tree', async () => {
      render(<FolderManager />);
      
      await waitFor(() => {
        const folderTree = screen.getByRole('tree');
        expect(folderTree).toHaveAttribute('aria-label', 'Folder structure');
      });
    });

    it('should have proper ARIA attributes for folder items', async () => {
      render(<FolderManager />);
      
      await waitFor(() => {
        const folderItem = screen.getByRole('treeitem', { name: /Research Papers/ });
        expect(folderItem).toHaveAttribute('aria-expanded', 'false');
        expect(folderItem).toHaveAttribute('aria-level', '1');
      });
    });

    it('should support keyboard navigation', async () => {
      render(<FolderManager />);
      
      await waitFor(() => {
        const folderItem = screen.getByRole('treeitem', { name: /Research Papers/ });
        folderItem.focus();
        
        fireEvent.keyDown(folderItem, { key: 'ArrowRight' });
        expect(folderItem).toHaveAttribute('aria-expanded', 'true');
        
        fireEvent.keyDown(folderItem, { key: 'ArrowLeft' });
        expect(folderItem).toHaveAttribute('aria-expanded', 'false');
      });
    });

    it('should announce folder operations to screen readers', async () => {
      render(<FolderManager />);
      
      await waitFor(() => {
        const createButton = screen.getByText('Create Folder');
        fireEvent.click(createButton);
      });
      
      expect(screen.getByText('Create New Folder')).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));
      
      render(<FolderManager />);
      
      await waitFor(() => {
        expect(screen.getByText('Failed to load folders')).toBeInTheDocument();
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });
    });

    it('should retry loading folders when retry button clicked', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      
      render(<FolderManager />);
      
      await waitFor(() => {
        expect(screen.getByText('Failed to load folders')).toBeInTheDocument();
      });
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ folders: mockFolders })
      } as Response);
      
      const retryButton = screen.getByText('Retry');
      fireEvent.click(retryButton);
      
      await waitFor(() => {
        expect(screen.getByText('Research Papers')).toBeInTheDocument();
      });
    });

    it('should handle folder creation errors', async () => {
      mockFetch.mockImplementation((url: string, options?: any) => {
        if (url === '/api/folders' && options?.method === 'POST') {
          return Promise.resolve({
            ok: false,
            json: () => Promise.resolve({ error: 'Folder already exists' })
          } as Response);
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ folders: mockFolders })
        } as Response);
      });
      
      render(<FolderManager />);
      
      await waitFor(() => {
        const createButton = screen.getByText('Create Folder');
        fireEvent.click(createButton);
      });
      
      const nameInput = screen.getByLabelText('Folder Name');
      const submitButton = screen.getByText('Create');
      
      fireEvent.change(nameInput, { target: { value: 'Existing Folder' } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Folder already exists')).toBeInTheDocument();
      });
    });
  });
});