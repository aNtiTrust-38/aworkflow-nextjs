import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import FolderManager from '../../components/FolderManager';

// Mock fetch for API calls
global.fetch = vi.fn();
const mockFetch = vi.mocked(fetch);

// Mock data for enhanced tests
const mockFolders = [
  {
    id: 'folder1',
    name: 'Research',
    path: '/research',
    parentId: null,
    children: [
      {
        id: 'folder2',
        name: 'Papers',
        path: '/research/papers',
        parentId: 'folder1',
        children: [],
        files: [],
        fileCount: 5,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      },
      {
        id: 'folder3',
        name: 'Data',
        path: '/research/data',
        parentId: 'folder1',
        children: [],
        files: [],
        fileCount: 3,
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
    id: 'folder4',
    name: 'Archive',
    path: '/archive',
    parentId: null,
    children: [],
    files: [],
    fileCount: 0,
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z'
  }
];

describe('FolderManager Enhanced Features', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
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

  describe('Advanced Folder Operations', () => {
    it('should support folder templates for quick creation', async () => {
      render(<FolderManager showTemplates={true} />);
      
      await waitFor(() => {
        expect(screen.getByText('Folder Templates')).toBeInTheDocument();
        expect(screen.getByText('Research Project')).toBeInTheDocument();
        expect(screen.getByText('Document Archive')).toBeInTheDocument();
        expect(screen.getByText('Media Collection')).toBeInTheDocument();
      });
    });

    it('should create folder structure from template', async () => {
      render(<FolderManager showTemplates={true} />);
      
      await waitFor(() => {
        const researchTemplate = screen.getByText('Research Project');
        fireEvent.click(researchTemplate);
      });
      
      const nameInput = screen.getByLabelText('Project Name');
      fireEvent.change(nameInput, { target: { value: 'My Research' } });
      
      const createButton = screen.getByText('Create Structure');
      fireEvent.click(createButton);
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/folders/template', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            template: 'research-project',
            name: 'My Research'
          })
        });
      });
    });

    it('should show folder properties dialog', async () => {
      render(<FolderManager />);
      
      await waitFor(() => {
        const folderItem = screen.getByText('Research');
        fireEvent.contextMenu(folderItem);
      });
      
      const propertiesOption = screen.getByText('Properties');
      fireEvent.click(propertiesOption);
      
      expect(screen.getByText('Folder Properties')).toBeInTheDocument();
      expect(screen.getByText('Research')).toBeInTheDocument();
      expect(screen.getByText('Path: /research')).toBeInTheDocument();
      expect(screen.getByText('Size: 10 files')).toBeInTheDocument();
    });

    it('should allow setting folder permissions', async () => {
      render(<FolderManager supportPermissions={true} />);
      
      await waitFor(() => {
        const folderItem = screen.getByText('Research');
        fireEvent.contextMenu(folderItem);
      });
      
      const permissionsOption = screen.getByText('Permissions');
      fireEvent.click(permissionsOption);
      
      expect(screen.getByText('Folder Permissions')).toBeInTheDocument();
      expect(screen.getByLabelText('Read Access')).toBeInTheDocument();
      expect(screen.getByLabelText('Write Access')).toBeInTheDocument();
      expect(screen.getByLabelText('Delete Access')).toBeInTheDocument();
    });

    it('should support folder sharing with external users', async () => {
      render(<FolderManager supportSharing={true} />);
      
      await waitFor(() => {
        const folderItem = screen.getByText('Research');
        fireEvent.contextMenu(folderItem);
      });
      
      const shareOption = screen.getByText('Share');
      fireEvent.click(shareOption);
      
      expect(screen.getByText('Share Folder')).toBeInTheDocument();
      expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
      expect(screen.getByLabelText('Permission Level')).toBeInTheDocument();
    });

    it('should show folder activity and history', async () => {
      render(<FolderManager showActivity={true} />);
      
      await waitFor(() => {
        const folderItem = screen.getByText('Research');
        fireEvent.contextMenu(folderItem);
      });
      
      const activityOption = screen.getByText('Activity');
      fireEvent.click(activityOption);
      
      expect(screen.getByText('Folder Activity')).toBeInTheDocument();
      expect(screen.getByText('Recent Changes')).toBeInTheDocument();
    });

    it('should support folder bookmarks', async () => {
      render(<FolderManager supportBookmarks={true} />);
      
      await waitFor(() => {
        const folderItem = screen.getByText('Research');
        fireEvent.contextMenu(folderItem);
      });
      
      const bookmarkOption = screen.getByText('Add Bookmark');
      fireEvent.click(bookmarkOption);
      
      expect(screen.getByText('Research')).toBeInTheDocument();
      expect(screen.getByTestId('bookmark-star')).toBeInTheDocument();
    });
  });

  describe('Bulk Folder Operations', () => {
    it('should support multi-select for folder operations', async () => {
      render(<FolderManager allowMultiSelect={true} />);
      
      await waitFor(() => {
        const folder1 = screen.getByText('Research');
        const folder2 = screen.getByText('Archive');
        
        fireEvent.click(folder1);
        fireEvent.click(folder2, { ctrlKey: true });
      });
      
      expect(screen.getByText('2 folders selected')).toBeInTheDocument();
      expect(screen.getByText('Bulk Operations')).toBeInTheDocument();
    });

    it('should allow bulk deletion of folders', async () => {
      render(<FolderManager allowMultiSelect={true} />);
      
      await waitFor(() => {
        const folder1 = screen.getByText('Research');
        const folder2 = screen.getByText('Archive');
        
        fireEvent.click(folder1);
        fireEvent.click(folder2, { ctrlKey: true });
      });
      
      const deleteButton = screen.getByText('Delete Selected');
      fireEvent.click(deleteButton);
      
      expect(screen.getByText('Delete 2 folders?')).toBeInTheDocument();
      
      const confirmButton = screen.getByText('Delete');
      fireEvent.click(confirmButton);
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/folders/bulk/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            folderIds: ['folder1', 'folder4']
          })
        });
      });
    });

    it('should allow bulk moving of folders', async () => {
      render(<FolderManager allowMultiSelect={true} />);
      
      await waitFor(() => {
        const folder1 = screen.getByText('Research');
        const folder2 = screen.getByText('Archive');
        
        fireEvent.click(folder1);
        fireEvent.click(folder2, { ctrlKey: true });
      });
      
      const moveButton = screen.getByText('Move Selected');
      fireEvent.click(moveButton);
      
      const destinationSelect = screen.getByLabelText('Destination');
      fireEvent.change(destinationSelect, { target: { value: 'new-parent' } });
      
      const confirmButton = screen.getByText('Move');
      fireEvent.click(confirmButton);
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/folders/bulk/move', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            folderIds: ['folder1', 'folder4'],
            destinationId: 'new-parent'
          })
        });
      });
    });

    it('should show progress for bulk operations', async () => {
      render(<FolderManager allowMultiSelect={true} />);
      
      await waitFor(() => {
        const folder1 = screen.getByText('Research');
        const folder2 = screen.getByText('Archive');
        
        fireEvent.click(folder1);
        fireEvent.click(folder2, { ctrlKey: true });
      });
      
      const deleteButton = screen.getByText('Delete Selected');
      fireEvent.click(deleteButton);
      
      const confirmButton = screen.getByText('Delete');
      fireEvent.click(confirmButton);
      
      expect(screen.getByText('Deleting folders...')).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
  });

  describe('Advanced Search and Filtering', () => {
    it('should support advanced folder search', async () => {
      render(<FolderManager />);
      
      const advancedSearchButton = screen.getByText('Advanced Search');
      fireEvent.click(advancedSearchButton);
      
      expect(screen.getByText('Advanced Folder Search')).toBeInTheDocument();
      expect(screen.getByLabelText('Folder Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Created Date')).toBeInTheDocument();
      expect(screen.getByLabelText('File Count')).toBeInTheDocument();
    });

    it('should filter folders by date range', async () => {
      render(<FolderManager />);
      
      const advancedSearchButton = screen.getByText('Advanced Search');
      fireEvent.click(advancedSearchButton);
      
      const dateFromInput = screen.getByLabelText('Created From');
      const dateToInput = screen.getByLabelText('Created To');
      
      fireEvent.change(dateFromInput, { target: { value: '2024-01-01' } });
      fireEvent.change(dateToInput, { target: { value: '2024-01-01' } });
      
      const searchButton = screen.getByText('Search');
      fireEvent.click(searchButton);
      
      await waitFor(() => {
        expect(screen.getByText('Research')).toBeInTheDocument();
        expect(screen.queryByText('Archive')).not.toBeInTheDocument();
      });
    });

    it('should filter folders by file count', async () => {
      render(<FolderManager />);
      
      const advancedSearchButton = screen.getByText('Advanced Search');
      fireEvent.click(advancedSearchButton);
      
      const fileCountInput = screen.getByLabelText('Minimum File Count');
      fireEvent.change(fileCountInput, { target: { value: '5' } });
      
      const searchButton = screen.getByText('Search');
      fireEvent.click(searchButton);
      
      await waitFor(() => {
        expect(screen.getByText('Research')).toBeInTheDocument();
        expect(screen.queryByText('Archive')).not.toBeInTheDocument();
      });
    });

    it('should save and load search filters', async () => {
      render(<FolderManager />);
      
      const advancedSearchButton = screen.getByText('Advanced Search');
      fireEvent.click(advancedSearchButton);
      
      const nameInput = screen.getByLabelText('Folder Name');
      fireEvent.change(nameInput, { target: { value: 'Research' } });
      
      const saveFilterButton = screen.getByText('Save Filter');
      fireEvent.click(saveFilterButton);
      
      const filterNameInput = screen.getByLabelText('Filter Name');
      fireEvent.change(filterNameInput, { target: { value: 'Research Folders' } });
      
      const saveButton = screen.getByText('Save');
      fireEvent.click(saveButton);
      
      expect(screen.getByText('Research Folders')).toBeInTheDocument();
    });

    it('should show folder statistics', async () => {
      render(<FolderManager showStatistics={true} />);
      
      await waitFor(() => {
        expect(screen.getByText('Folder Statistics')).toBeInTheDocument();
        expect(screen.getByText('Total folders: 4')).toBeInTheDocument();
        expect(screen.getByText('Total files: 13')).toBeInTheDocument();
        expect(screen.getByText('Average files per folder: 3.3')).toBeInTheDocument();
      });
    });
  });

  describe('Folder Synchronization', () => {
    it('should support folder synchronization with external services', async () => {
      render(<FolderManager supportSync={true} />);
      
      await waitFor(() => {
        const folderItem = screen.getByText('Research');
        fireEvent.contextMenu(folderItem);
      });
      
      const syncOption = screen.getByText('Sync Settings');
      fireEvent.click(syncOption);
      
      expect(screen.getByText('Folder Synchronization')).toBeInTheDocument();
      expect(screen.getByLabelText('Sync Provider')).toBeInTheDocument();
      expect(screen.getByLabelText('Sync Direction')).toBeInTheDocument();
    });

    it('should show sync status indicators', async () => {
      render(<FolderManager supportSync={true} />);
      
      await waitFor(() => {
        const folderItem = screen.getByTestId('folder-item');
        expect(within(folderItem).getByTestId('sync-status')).toBeInTheDocument();
      });
    });

    it('should handle sync conflicts', async () => {
      render(<FolderManager supportSync={true} />);
      
      await waitFor(() => {
        const folderItem = screen.getByText('Research');
        fireEvent.contextMenu(folderItem);
      });
      
      const syncOption = screen.getByText('Resolve Conflicts');
      fireEvent.click(syncOption);
      
      expect(screen.getByText('Sync Conflicts')).toBeInTheDocument();
      expect(screen.getByText('Choose resolution strategy')).toBeInTheDocument();
    });

    it('should show sync progress', async () => {
      render(<FolderManager supportSync={true} />);
      
      await waitFor(() => {
        const folderItem = screen.getByText('Research');
        fireEvent.contextMenu(folderItem);
      });
      
      const syncNowOption = screen.getByText('Sync Now');
      fireEvent.click(syncNowOption);
      
      expect(screen.getByText('Syncing folder...')).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
  });

  describe('Folder Automation', () => {
    it('should support folder rules and automation', async () => {
      render(<FolderManager supportAutomation={true} />);
      
      await waitFor(() => {
        const folderItem = screen.getByText('Research');
        fireEvent.contextMenu(folderItem);
      });
      
      const rulesOption = screen.getByText('Folder Rules');
      fireEvent.click(rulesOption);
      
      expect(screen.getByText('Folder Automation Rules')).toBeInTheDocument();
      expect(screen.getByText('Create Rule')).toBeInTheDocument();
    });

    it('should create auto-organization rules', async () => {
      render(<FolderManager supportAutomation={true} />);
      
      await waitFor(() => {
        const folderItem = screen.getByText('Research');
        fireEvent.contextMenu(folderItem);
      });
      
      const rulesOption = screen.getByText('Folder Rules');
      fireEvent.click(rulesOption);
      
      const createRuleButton = screen.getByText('Create Rule');
      fireEvent.click(createRuleButton);
      
      expect(screen.getByText('New Folder Rule')).toBeInTheDocument();
      expect(screen.getByLabelText('Rule Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Trigger')).toBeInTheDocument();
      expect(screen.getByLabelText('Action')).toBeInTheDocument();
    });

    it('should show active automation rules', async () => {
      render(<FolderManager supportAutomation={true} />);
      
      await waitFor(() => {
        expect(screen.getByText('Active Rules')).toBeInTheDocument();
        expect(screen.getByText('Auto-sort by file type')).toBeInTheDocument();
        expect(screen.getByText('Move old files to archive')).toBeInTheDocument();
      });
    });

    it('should support scheduled folder operations', async () => {
      render(<FolderManager supportScheduling={true} />);
      
      await waitFor(() => {
        const folderItem = screen.getByText('Research');
        fireEvent.contextMenu(folderItem);
      });
      
      const scheduleOption = screen.getByText('Schedule Operation');
      fireEvent.click(scheduleOption);
      
      expect(screen.getByText('Schedule Folder Operation')).toBeInTheDocument();
      expect(screen.getByLabelText('Operation Type')).toBeInTheDocument();
      expect(screen.getByLabelText('Schedule')).toBeInTheDocument();
    });
  });

  describe('Folder Visualization', () => {
    it('should show folder size visualization', async () => {
      render(<FolderManager showVisualization={true} />);
      
      await waitFor(() => {
        expect(screen.getByText('Folder Size Visualization')).toBeInTheDocument();
        expect(screen.getByTestId('folder-treemap')).toBeInTheDocument();
      });
    });

    it('should display folder hierarchy chart', async () => {
      render(<FolderManager showHierarchy={true} />);
      
      await waitFor(() => {
        expect(screen.getByText('Folder Hierarchy')).toBeInTheDocument();
        expect(screen.getByTestId('hierarchy-chart')).toBeInTheDocument();
      });
    });

    it('should show folder usage analytics', async () => {
      render(<FolderManager showAnalytics={true} />);
      
      await waitFor(() => {
        expect(screen.getByText('Folder Analytics')).toBeInTheDocument();
        expect(screen.getByText('Most accessed folders')).toBeInTheDocument();
        expect(screen.getByText('Storage usage over time')).toBeInTheDocument();
      });
    });

    it('should support different view modes', async () => {
      render(<FolderManager />);
      
      await waitFor(() => {
        expect(screen.getByText('Tree View')).toBeInTheDocument();
        expect(screen.getByText('List View')).toBeInTheDocument();
        expect(screen.getByText('Card View')).toBeInTheDocument();
      });
      
      const cardViewButton = screen.getByText('Card View');
      fireEvent.click(cardViewButton);
      
      expect(screen.getByTestId('folder-cards')).toBeInTheDocument();
    });
  });

  describe('Performance and Optimization', () => {
    it('should implement lazy loading for large folder structures', async () => {
      const largeFolderStructure = Array.from({ length: 1000 }, (_, i) => ({
        id: `folder${i}`,
        name: `Folder ${i}`,
        path: `/folder${i}`,
        parentId: null,
        children: [],
        files: [],
        fileCount: 0,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      }));
      
      mockFetch.mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ folders: largeFolderStructure })
        } as Response)
      );
      
      render(<FolderManager lazyLoading={true} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('lazy-load-container')).toBeInTheDocument();
        expect(screen.getByText('Folder 0')).toBeInTheDocument();
        expect(screen.queryByText('Folder 999')).not.toBeInTheDocument();
      });
    });

    it('should cache folder data for performance', async () => {
      render(<FolderManager enableCaching={true} />);
      
      await waitFor(() => {
        expect(screen.getByText('Research')).toBeInTheDocument();
      });
      
      // Simulate re-render
      render(<FolderManager enableCaching={true} />);
      
      // Should load from cache without API call
      expect(screen.getByText('Research')).toBeInTheDocument();
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should show loading states for async operations', async () => {
      render(<FolderManager />);
      
      await waitFor(() => {
        const folderItem = screen.getByText('Research');
        fireEvent.contextMenu(folderItem);
      });
      
      const renameOption = screen.getByText('Rename');
      fireEvent.click(renameOption);
      
      const nameInput = screen.getByDisplayValue('Research');
      fireEvent.change(nameInput, { target: { value: 'Updated Research' } });
      fireEvent.keyDown(nameInput, { key: 'Enter' });
      
      expect(screen.getByText('Renaming folder...')).toBeInTheDocument();
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });

    it('should implement virtual scrolling for large lists', async () => {
      render(<FolderManager virtualScrolling={true} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('virtual-scroll-container')).toBeInTheDocument();
      });
    });
  });

  describe('Advanced Accessibility', () => {
    it('should support comprehensive keyboard navigation', async () => {
      render(<FolderManager />);
      
      await waitFor(() => {
        const folderTree = screen.getByRole('tree');
        const firstFolder = within(folderTree).getByRole('treeitem', { name: /Research/ });
        
        firstFolder.focus();
        expect(firstFolder).toHaveFocus();
        
        // Test arrow key navigation
        fireEvent.keyDown(firstFolder, { key: 'ArrowDown' });
        const nextFolder = within(folderTree).getByRole('treeitem', { name: /Archive/ });
        expect(nextFolder).toHaveFocus();
        
        // Test context menu via keyboard
        fireEvent.keyDown(nextFolder, { key: 'F10' });
        expect(screen.getByText('Rename')).toBeInTheDocument();
      });
    });

    it('should provide detailed screen reader support', async () => {
      render(<FolderManager enhancedA11y={true} />);
      
      await waitFor(() => {
        const folderItem = screen.getByRole('treeitem', { name: /Research/ });
        expect(folderItem).toHaveAttribute('aria-describedby');
        
        const description = document.getElementById(folderItem.getAttribute('aria-describedby')!);
        expect(description).toHaveTextContent('Research folder, 10 files, 2 subfolders');
      });
    });

    it('should announce folder operations', async () => {
      render(<FolderManager />);
      
      await waitFor(() => {
        const folderItem = screen.getByText('Research');
        fireEvent.contextMenu(folderItem);
      });
      
      const deleteOption = screen.getByText('Delete');
      fireEvent.click(deleteOption);
      
      const confirmButton = screen.getByText('Delete');
      fireEvent.click(confirmButton);
      
      expect(screen.getByText('Folder deleted successfully')).toHaveAttribute('aria-live', 'polite');
    });

    it('should support high contrast mode', async () => {
      render(<FolderManager highContrast={true} />);
      
      await waitFor(() => {
        const folderItem = screen.getByTestId('folder-item');
        expect(folderItem).toHaveClass('high-contrast');
      });
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle folder operation conflicts', async () => {
      mockFetch.mockImplementation((url: string, options?: any) => {
        if (url.includes('/api/folders/folder1') && options?.method === 'DELETE') {
          return Promise.resolve({
            ok: false,
            json: () => Promise.resolve({ 
              error: 'Folder contains active files',
              details: 'Cannot delete folder with files currently in use'
            })
          } as Response);
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ folders: mockFolders })
        } as Response);
      });
      
      render(<FolderManager />);
      
      await waitFor(() => {
        const folderItem = screen.getByText('Research');
        fireEvent.contextMenu(folderItem);
      });
      
      const deleteOption = screen.getByText('Delete');
      fireEvent.click(deleteOption);
      
      const confirmButton = screen.getByText('Delete');
      fireEvent.click(confirmButton);
      
      await waitFor(() => {
        expect(screen.getByText('Folder contains active files')).toBeInTheDocument();
        expect(screen.getByText('Cannot delete folder with files currently in use')).toBeInTheDocument();
      });
    });

    it('should handle permission errors gracefully', async () => {
      mockFetch.mockImplementation((url: string, options?: any) => {
        if (url.includes('/api/folders/folder1') && options?.method === 'PUT') {
          return Promise.resolve({
            ok: false,
            status: 403,
            json: () => Promise.resolve({ error: 'Permission denied' })
          } as Response);
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ folders: mockFolders })
        } as Response);
      });
      
      render(<FolderManager />);
      
      await waitFor(() => {
        const folderItem = screen.getByText('Research');
        fireEvent.contextMenu(folderItem);
      });
      
      const renameOption = screen.getByText('Rename');
      fireEvent.click(renameOption);
      
      const nameInput = screen.getByDisplayValue('Research');
      fireEvent.change(nameInput, { target: { value: 'Updated Research' } });
      fireEvent.keyDown(nameInput, { key: 'Enter' });
      
      await waitFor(() => {
        expect(screen.getByText('Permission denied')).toBeInTheDocument();
      });
    });

    it('should provide recovery options for failed operations', async () => {
      mockFetch.mockImplementation((url: string, options?: any) => {
        if (url.includes('/api/folders') && options?.method === 'POST') {
          return Promise.resolve({
            ok: false,
            json: () => Promise.resolve({ error: 'Network error' })
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
      fireEvent.change(nameInput, { target: { value: 'New Folder' } });
      
      const submitButton = screen.getByText('Create');
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
        expect(screen.getByText('Retry')).toBeInTheDocument();
        expect(screen.getByText('Save Draft')).toBeInTheDocument();
      });
    });

    it('should handle data corruption gracefully', async () => {
      mockFetch.mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ folders: null })
        } as Response)
      );
      
      render(<FolderManager />);
      
      await waitFor(() => {
        expect(screen.getByText('Data corruption detected')).toBeInTheDocument();
        expect(screen.getByText('Refresh')).toBeInTheDocument();
        expect(screen.getByText('Report Issue')).toBeInTheDocument();
      });
    });
  });
});