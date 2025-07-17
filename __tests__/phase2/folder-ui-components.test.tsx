import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import FolderManager from '../../components/FolderManager';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

// Mock fetch for API calls
global.fetch = vi.fn();
const mockFetch = vi.mocked(fetch);

// Mock drag and drop context
const DndWrapper = ({ children }: { children: React.ReactNode }) => (
  <DndProvider backend={HTML5Backend}>
    {children}
  </DndProvider>
);

describe('Enhanced Folder UI Components - RED Phase Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  afterEach(() => {
    cleanup();
  });

  describe('Advanced Folder Tree Visualization', () => {
    it('should render folder tree with virtual scrolling for large datasets', async () => {
      // RED: Test virtual scrolling with 10,000+ folders
      const mockLargeFolderSet = Array.from({ length: 10000 }, (_, i) => ({
        id: `folder-${i}`,
        name: `Folder ${i}`,
        path: `/folder-${i}`,
        parentId: i > 0 && i % 100 === 0 ? `folder-${i - 1}` : null,
        children: [],
        files: [],
        fileCount: Math.floor(Math.random() * 50),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ folders: mockLargeFolderSet }),
      } as Response);

      render(<FolderManager />);

      await waitFor(() => {
        expect(screen.getByText('Folder Manager')).toBeInTheDocument();
      });

      // Should implement virtual scrolling container
      const virtualContainer = screen.getByTestId('virtual-scroll-container');
      expect(virtualContainer).toBeInTheDocument();
      expect(virtualContainer).toHaveAttribute('data-virtualized', 'true');
      
      // Should only render visible items (not all 10,000)
      const visibleItems = screen.getAllByTestId('folder-item');
      expect(visibleItems.length).toBeLessThan(100); // Only visible items rendered
      
      // Should have proper scroll indicators
      expect(screen.getByTestId('scroll-indicator')).toBeInTheDocument();
      expect(screen.getByText('Showing 1-50 of 10,000 folders')).toBeInTheDocument();
    });

    it('should render folder tree with customizable view modes', async () => {
      // RED: Test different view modes (list, grid, tree, tiles)
      const mockFolders = [
        {
          id: 'folder-1',
          name: 'Documents',
          path: '/documents',
          parentId: null,
          children: [],
          files: [],
          fileCount: 25,
          thumbnail: '/thumbnails/folder-1.jpg',
          color: '#3B82F6',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ folders: mockFolders }),
      } as Response);

      render(<FolderManager />);

      await waitFor(() => {
        expect(screen.getByText('Documents')).toBeInTheDocument();
      });

      // Should have view mode selector
      const viewModeSelector = screen.getByTestId('view-mode-selector');
      expect(viewModeSelector).toBeInTheDocument();
      
      // Test switching to grid view
      const gridViewButton = screen.getByLabelText('Grid View');
      fireEvent.click(gridViewButton);
      
      await waitFor(() => {
        const gridContainer = screen.getByTestId('folder-grid-container');
        expect(gridContainer).toBeInTheDocument();
        expect(gridContainer).toHaveClass('grid', 'grid-cols-4');
      });
      
      // Test switching to list view
      const listViewButton = screen.getByLabelText('List View');
      fireEvent.click(listViewButton);
      
      await waitFor(() => {
        const listContainer = screen.getByTestId('folder-list-container');
        expect(listContainer).toBeInTheDocument();
        expect(listContainer).toHaveClass('space-y-1');
      });
      
      // Test switching to tiles view
      const tilesViewButton = screen.getByLabelText('Tiles View');
      fireEvent.click(tilesViewButton);
      
      await waitFor(() => {
        const tilesContainer = screen.getByTestId('folder-tiles-container');
        expect(tilesContainer).toBeInTheDocument();
        expect(tilesContainer).toHaveClass('grid', 'grid-cols-6');
      });
    });

    it('should render folder tree with advanced sorting and filtering', async () => {
      // RED: Test advanced sorting options and multi-criteria filtering
      const mockFolders = [
        {
          id: 'folder-1',
          name: 'Alpha Project',
          path: '/alpha-project',
          parentId: null,
          children: [],
          files: [],
          fileCount: 15,
          size: 1024 * 1024 * 50, // 50MB
          tags: ['project', 'active'],
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-15T00:00:00Z',
          lastAccessed: '2024-01-14T00:00:00Z',
        },
        {
          id: 'folder-2',
          name: 'Beta Archive',
          path: '/beta-archive',
          parentId: null,
          children: [],
          files: [],
          fileCount: 100,
          size: 1024 * 1024 * 200, // 200MB
          tags: ['archive', 'completed'],
          createdAt: '2023-12-01T00:00:00Z',
          updatedAt: '2023-12-15T00:00:00Z',
          lastAccessed: '2023-12-14T00:00:00Z',
        },
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ folders: mockFolders }),
      } as Response);

      render(<FolderManager />);

      await waitFor(() => {
        expect(screen.getByText('Alpha Project')).toBeInTheDocument();
        expect(screen.getByText('Beta Archive')).toBeInTheDocument();
      });

      // Should have advanced sort options
      const sortDropdown = screen.getByTestId('sort-dropdown');
      expect(sortDropdown).toBeInTheDocument();
      
      fireEvent.click(sortDropdown);
      
      expect(screen.getByText('Name (A-Z)')).toBeInTheDocument();
      expect(screen.getByText('Name (Z-A)')).toBeInTheDocument();
      expect(screen.getByText('Size (Largest)')).toBeInTheDocument();
      expect(screen.getByText('Size (Smallest)')).toBeInTheDocument();
      expect(screen.getByText('Modified (Newest)')).toBeInTheDocument();
      expect(screen.getByText('Modified (Oldest)')).toBeInTheDocument();
      expect(screen.getByText('File Count (Most)')).toBeInTheDocument();
      expect(screen.getByText('File Count (Least)')).toBeInTheDocument();
      expect(screen.getByText('Last Accessed (Recent)')).toBeInTheDocument();
      
      // Test sorting by size
      fireEvent.click(screen.getByText('Size (Largest)'));
      
      await waitFor(() => {
        const folders = screen.getAllByTestId('folder-item');
        expect(folders[0]).toHaveTextContent('Beta Archive'); // 200MB first
        expect(folders[1]).toHaveTextContent('Alpha Project'); // 50MB second
      });
      
      // Should have advanced filter panel
      const filterButton = screen.getByTestId('filter-button');
      fireEvent.click(filterButton);
      
      const filterPanel = screen.getByTestId('filter-panel');
      expect(filterPanel).toBeInTheDocument();
      
      // Test filtering by tags
      const tagFilter = screen.getByTestId('tag-filter');
      fireEvent.click(tagFilter);
      
      const activeTag = screen.getByText('active');
      fireEvent.click(activeTag);
      
      await waitFor(() => {
        expect(screen.getByText('Alpha Project')).toBeInTheDocument();
        expect(screen.queryByText('Beta Archive')).not.toBeInTheDocument();
      });
      
      // Test filtering by date range
      const dateRangeFilter = screen.getByTestId('date-range-filter');
      expect(dateRangeFilter).toBeInTheDocument();
      
      const startDateInput = screen.getByLabelText('Start Date');
      const endDateInput = screen.getByLabelText('End Date');
      
      fireEvent.change(startDateInput, { target: { value: '2024-01-01' } });
      fireEvent.change(endDateInput, { target: { value: '2024-01-31' } });
      
      await waitFor(() => {
        expect(screen.getByText('Alpha Project')).toBeInTheDocument();
        expect(screen.queryByText('Beta Archive')).not.toBeInTheDocument();
      });
    });

    it('should render folder tree with real-time collaboration indicators', async () => {
      // RED: Test real-time collaboration features and presence indicators
      const mockFoldersWithCollaboration = [
        {
          id: 'folder-1',
          name: 'Shared Project',
          path: '/shared-project',
          parentId: null,
          children: [],
          files: [],
          fileCount: 10,
          collaboration: {
            activeUsers: [
              { id: 'user-1', name: 'Alice', avatar: '/avatars/alice.jpg', status: 'editing' },
              { id: 'user-2', name: 'Bob', avatar: '/avatars/bob.jpg', status: 'viewing' },
            ],
            recentActivity: [
              { userId: 'user-1', action: 'file_added', timestamp: '2024-01-15T10:00:00Z' },
              { userId: 'user-2', action: 'folder_accessed', timestamp: '2024-01-15T09:55:00Z' },
            ],
            lockInfo: {
              locked: true,
              lockedBy: 'user-1',
              lockedAt: '2024-01-15T10:00:00Z',
              reason: 'bulk_operation',
            },
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ folders: mockFoldersWithCollaboration }),
      } as Response);

      render(<FolderManager />);

      await waitFor(() => {
        expect(screen.getByText('Shared Project')).toBeInTheDocument();
      });

      // Should show active user avatars
      const activeUsers = screen.getByTestId('active-users');
      expect(activeUsers).toBeInTheDocument();
      
      const userAvatars = screen.getAllByTestId('user-avatar');
      expect(userAvatars).toHaveLength(2);
      
      // Should show user status indicators
      const editingIndicator = screen.getByTestId('user-editing-indicator');
      expect(editingIndicator).toBeInTheDocument();
      expect(editingIndicator).toHaveClass('bg-green-500');
      
      const viewingIndicator = screen.getByTestId('user-viewing-indicator');
      expect(viewingIndicator).toBeInTheDocument();
      expect(viewingIndicator).toHaveClass('bg-blue-500');
      
      // Should show lock indicator
      const lockIndicator = screen.getByTestId('folder-lock-indicator');
      expect(lockIndicator).toBeInTheDocument();
      expect(lockIndicator).toHaveAttribute('title', 'Locked by Alice for bulk operation');
      
      // Should show recent activity
      const activityIndicator = screen.getByTestId('recent-activity-indicator');
      expect(activityIndicator).toBeInTheDocument();
      
      fireEvent.mouseOver(activityIndicator);
      
      await waitFor(() => {
        expect(screen.getByText('Alice added a file')).toBeInTheDocument();
        expect(screen.getByText('Bob accessed folder')).toBeInTheDocument();
      });
    });
  });

  describe('Advanced Folder Operations Interface', () => {
    it('should render advanced folder creation wizard', async () => {
      // RED: Test multi-step folder creation with templates and batch operations
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ folders: [] }),
      } as Response);

      render(<FolderManager />);

      await waitFor(() => {
        expect(screen.getByText('Create Folder')).toBeInTheDocument();
      });

      const createButton = screen.getByText('Create Folder');
      fireEvent.click(createButton);

      // Should show advanced creation wizard
      const wizard = screen.getByTestId('folder-creation-wizard');
      expect(wizard).toBeInTheDocument();
      
      // Step 1: Basic Information
      expect(screen.getByText('Step 1: Basic Information')).toBeInTheDocument();
      expect(screen.getByLabelText('Folder Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Description')).toBeInTheDocument();
      expect(screen.getByLabelText('Color')).toBeInTheDocument();
      expect(screen.getByLabelText('Tags')).toBeInTheDocument();
      
      // Fill basic information
      fireEvent.change(screen.getByLabelText('Folder Name'), { target: { value: 'Research Project' } });
      fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Academic research project folder' } });
      
      const nextButton = screen.getByText('Next');
      fireEvent.click(nextButton);
      
      // Step 2: Template Selection
      expect(screen.getByText('Step 2: Template Selection')).toBeInTheDocument();
      expect(screen.getByText('No Template')).toBeInTheDocument();
      expect(screen.getByText('Research Project')).toBeInTheDocument();
      expect(screen.getByText('Document Archive')).toBeInTheDocument();
      expect(screen.getByText('Custom Template')).toBeInTheDocument();
      
      // Select research project template
      fireEvent.click(screen.getByText('Research Project'));
      
      // Should show template preview
      const templatePreview = screen.getByTestId('template-preview');
      expect(templatePreview).toBeInTheDocument();
      expect(screen.getByText('Literature Review')).toBeInTheDocument();
      expect(screen.getByText('Data Collection')).toBeInTheDocument();
      expect(screen.getByText('Analysis')).toBeInTheDocument();
      expect(screen.getByText('Writing')).toBeInTheDocument();
      
      fireEvent.click(nextButton);
      
      // Step 3: Permissions and Sharing
      expect(screen.getByText('Step 3: Permissions and Sharing')).toBeInTheDocument();
      expect(screen.getByLabelText('Private')).toBeInTheDocument();
      expect(screen.getByLabelText('Team Access')).toBeInTheDocument();
      expect(screen.getByLabelText('Public')).toBeInTheDocument();
      
      // Select team access
      fireEvent.click(screen.getByLabelText('Team Access'));
      
      expect(screen.getByText('Team Members')).toBeInTheDocument();
      expect(screen.getByText('Permission Level')).toBeInTheDocument();
      
      fireEvent.click(nextButton);
      
      // Step 4: Review and Create
      expect(screen.getByText('Step 4: Review and Create')).toBeInTheDocument();
      expect(screen.getByText('Name: Research Project')).toBeInTheDocument();
      expect(screen.getByText('Template: Research Project')).toBeInTheDocument();
      expect(screen.getByText('Access: Team Access')).toBeInTheDocument();
      
      const createFinalButton = screen.getByText('Create Folder');
      fireEvent.click(createFinalButton);
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/folders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'Research Project',
            description: 'Academic research project folder',
            template: 'research-project',
            permissions: { type: 'team', level: 'read-write' },
          }),
        });
      });
    });

    it('should render batch folder operations interface', async () => {
      // RED: Test batch operations for multiple folders
      const mockFolders = [
        {
          id: 'folder-1',
          name: 'Project Alpha',
          path: '/project-alpha',
          parentId: null,
          children: [],
          files: [],
          fileCount: 10,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'folder-2',
          name: 'Project Beta',
          path: '/project-beta',
          parentId: null,
          children: [],
          files: [],
          fileCount: 15,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ folders: mockFolders }),
      } as Response);

      render(<FolderManager />);

      await waitFor(() => {
        expect(screen.getByText('Project Alpha')).toBeInTheDocument();
        expect(screen.getByText('Project Beta')).toBeInTheDocument();
      });

      // Should show batch selection mode toggle
      const batchModeButton = screen.getByTestId('batch-mode-toggle');
      expect(batchModeButton).toBeInTheDocument();
      
      fireEvent.click(batchModeButton);
      
      // Should show checkboxes for each folder
      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes).toHaveLength(2);
      
      // Select both folders
      fireEvent.click(checkboxes[0]);
      fireEvent.click(checkboxes[1]);
      
      // Should show batch operations toolbar
      const batchToolbar = screen.getByTestId('batch-operations-toolbar');
      expect(batchToolbar).toBeInTheDocument();
      
      expect(screen.getByText('2 folders selected')).toBeInTheDocument();
      expect(screen.getByText('Move')).toBeInTheDocument();
      expect(screen.getByText('Copy')).toBeInTheDocument();
      expect(screen.getByText('Delete')).toBeInTheDocument();
      expect(screen.getByText('Archive')).toBeInTheDocument();
      expect(screen.getByText('Tag')).toBeInTheDocument();
      expect(screen.getByText('Share')).toBeInTheDocument();
      
      // Test batch delete
      const deleteButton = screen.getByText('Delete');
      fireEvent.click(deleteButton);
      
      const batchDeleteDialog = screen.getByTestId('batch-delete-dialog');
      expect(batchDeleteDialog).toBeInTheDocument();
      expect(screen.getByText('Delete 2 folders?')).toBeInTheDocument();
      expect(screen.getByText('This will delete:')).toBeInTheDocument();
      expect(screen.getByText('• Project Alpha (10 files)')).toBeInTheDocument();
      expect(screen.getByText('• Project Beta (15 files)')).toBeInTheDocument();
      
      const confirmDeleteButton = screen.getByText('Delete All');
      fireEvent.click(confirmDeleteButton);
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/folders/batch', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            folderIds: ['folder-1', 'folder-2'],
            force: true,
          }),
        });
      });
    });

    it('should render folder analytics and insights dashboard', async () => {
      // RED: Test folder analytics and usage insights
      const mockFolderWithAnalytics = {
        id: 'folder-1',
        name: 'Project Documents',
        path: '/project-documents',
        parentId: null,
        children: [],
        files: [],
        fileCount: 50,
        analytics: {
          totalSize: 1024 * 1024 * 500, // 500MB
          fileTypes: {
            pdf: 20,
            docx: 15,
            xlsx: 10,
            pptx: 5,
          },
          accessStats: {
            totalAccesses: 245,
            uniqueUsers: 12,
            averageAccessTime: 180, // seconds
            popularFiles: ['report.pdf', 'presentation.pptx'],
          },
          timeline: [
            { date: '2024-01-01', files: 10, size: 1024 * 1024 * 100 },
            { date: '2024-01-07', files: 25, size: 1024 * 1024 * 250 },
            { date: '2024-01-14', files: 50, size: 1024 * 1024 * 500 },
          ],
          predictions: {
            estimatedGrowth: 1.2, // 20% growth
            recommendedActions: ['archive_old_files', 'compress_images'],
          },
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ folders: [mockFolderWithAnalytics] }),
      } as Response);

      render(<FolderManager />);

      await waitFor(() => {
        expect(screen.getByText('Project Documents')).toBeInTheDocument();
      });

      // Right-click to open context menu
      const folderItem = screen.getByText('Project Documents');
      fireEvent.contextMenu(folderItem);
      
      // Should have analytics option
      const analyticsOption = screen.getByText('View Analytics');
      expect(analyticsOption).toBeInTheDocument();
      
      fireEvent.click(analyticsOption);
      
      // Should open analytics dashboard
      const analyticsDashboard = screen.getByTestId('folder-analytics-dashboard');
      expect(analyticsDashboard).toBeInTheDocument();
      
      // Should show size breakdown
      expect(screen.getByText('Total Size: 500 MB')).toBeInTheDocument();
      expect(screen.getByText('File Count: 50')).toBeInTheDocument();
      
      // Should show file type distribution
      const fileTypeChart = screen.getByTestId('file-type-chart');
      expect(fileTypeChart).toBeInTheDocument();
      expect(screen.getByText('PDF: 20 files')).toBeInTheDocument();
      expect(screen.getByText('DOCX: 15 files')).toBeInTheDocument();
      
      // Should show access statistics
      const accessStats = screen.getByTestId('access-statistics');
      expect(accessStats).toBeInTheDocument();
      expect(screen.getByText('Total Accesses: 245')).toBeInTheDocument();
      expect(screen.getByText('Unique Users: 12')).toBeInTheDocument();
      expect(screen.getByText('Avg. Access Time: 3m')).toBeInTheDocument();
      
      // Should show growth timeline
      const timelineChart = screen.getByTestId('growth-timeline-chart');
      expect(timelineChart).toBeInTheDocument();
      
      // Should show predictions and recommendations
      const recommendations = screen.getByTestId('recommendations-panel');
      expect(recommendations).toBeInTheDocument();
      expect(screen.getByText('Estimated Growth: +20%')).toBeInTheDocument();
      expect(screen.getByText('Archive old files')).toBeInTheDocument();
      expect(screen.getByText('Compress images')).toBeInTheDocument();
    });
  });

  describe('Enhanced Drag and Drop Interface', () => {
    it('should render advanced drag and drop with visual feedback', async () => {
      // RED: Test advanced drag and drop with multiple selection and visual feedback
      const mockFolders = [
        {
          id: 'folder-1',
          name: 'Source Folder',
          path: '/source',
          parentId: null,
          children: [],
          files: [],
          fileCount: 5,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'folder-2',
          name: 'Target Folder',
          path: '/target',
          parentId: null,
          children: [],
          files: [],
          fileCount: 10,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ folders: mockFolders }),
      } as Response);

      render(
        <DndWrapper>
          <FolderManager />
        </DndWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Source Folder')).toBeInTheDocument();
        expect(screen.getByText('Target Folder')).toBeInTheDocument();
      });

      const sourceFolder = screen.getByText('Source Folder');
      const targetFolder = screen.getByText('Target Folder');
      
      // Should show drag handle
      const dragHandle = screen.getByTestId('drag-handle-folder-1');
      expect(dragHandle).toBeInTheDocument();
      
      // Start dragging
      fireEvent.dragStart(sourceFolder, {
        dataTransfer: {
          setData: vi.fn(),
          effectAllowed: 'move',
        },
      });
      
      // Should show drag preview
      const dragPreview = screen.getByTestId('drag-preview');
      expect(dragPreview).toBeInTheDocument();
      expect(dragPreview).toHaveTextContent('Moving 1 folder');
      
      // Should show drop zones
      const dropZones = screen.getAllByTestId('drop-zone');
      expect(dropZones.length).toBeGreaterThan(0);
      
      // Drag over target folder
      fireEvent.dragOver(targetFolder, {
        dataTransfer: {
          dropEffect: 'move',
        },
      });
      
      // Should show drop indicator
      const dropIndicator = screen.getByTestId('drop-indicator');
      expect(dropIndicator).toBeInTheDocument();
      expect(dropIndicator).toHaveClass('bg-blue-100', 'border-blue-400');
      
      // Should show drop action preview
      const dropActionPreview = screen.getByTestId('drop-action-preview');
      expect(dropActionPreview).toBeInTheDocument();
      expect(dropActionPreview).toHaveTextContent('Move to Target Folder');
      
      // Drop the folder
      fireEvent.drop(targetFolder, {
        dataTransfer: {
          getData: () => 'folder-1',
        },
      });
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/folders/folder-1', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            parentId: 'folder-2',
          }),
        });
      });
    });

    it('should render drag and drop with conflict resolution', async () => {
      // RED: Test drag and drop conflict resolution when names conflict
      const mockFolders = [
        {
          id: 'folder-1',
          name: 'Documents',
          path: '/documents',
          parentId: null,
          children: [],
          files: [],
          fileCount: 5,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'folder-2',
          name: 'Archive',
          path: '/archive',
          parentId: null,
          children: [
            {
              id: 'folder-3',
              name: 'Documents', // Same name as folder-1
              path: '/archive/documents',
              parentId: 'folder-2',
              children: [],
              files: [],
              fileCount: 3,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ],
          files: [],
          fileCount: 10,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      mockFetch.mockImplementation((url, options) => {
        if (options?.method === 'PUT' && url.includes('folder-1')) {
          return Promise.resolve({
            ok: false,
            status: 409,
            json: () => Promise.resolve({
              error: 'Folder name conflict',
              code: 'NAME_CONFLICT',
              conflictDetails: {
                existingFolder: {
                  id: 'folder-3',
                  name: 'Documents',
                  path: '/archive/documents',
                },
              },
            }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ folders: mockFolders }),
        });
      });

      render(
        <DndWrapper>
          <FolderManager />
        </DndWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Documents')).toBeInTheDocument();
        expect(screen.getByText('Archive')).toBeInTheDocument();
      });

      const documentsFolder = screen.getByText('Documents');
      const archiveFolder = screen.getByText('Archive');
      
      // Drag Documents folder to Archive folder
      fireEvent.dragStart(documentsFolder);
      fireEvent.dragOver(archiveFolder);
      fireEvent.drop(archiveFolder);
      
      // Should show conflict resolution dialog
      await waitFor(() => {
        const conflictDialog = screen.getByTestId('conflict-resolution-dialog');
        expect(conflictDialog).toBeInTheDocument();
        expect(screen.getByText('Folder Name Conflict')).toBeInTheDocument();
        expect(screen.getByText('A folder named "Documents" already exists in Archive')).toBeInTheDocument();
      });
      
      // Should show resolution options
      expect(screen.getByText('Keep Both')).toBeInTheDocument();
      expect(screen.getByText('Replace Existing')).toBeInTheDocument();
      expect(screen.getByText('Rename New')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
      
      // Select "Rename New" option
      fireEvent.click(screen.getByText('Rename New'));
      
      // Should show rename input
      const renameInput = screen.getByTestId('conflict-rename-input');
      expect(renameInput).toBeInTheDocument();
      expect(renameInput).toHaveValue('Documents (2)');
      
      // Confirm rename
      const confirmButton = screen.getByText('Confirm');
      fireEvent.click(confirmButton);
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/folders/folder-1', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'Documents (2)',
            parentId: 'folder-2',
          }),
        });
      });
    });

    it('should render drag and drop with multi-selection support', async () => {
      // RED: Test drag and drop with multiple folders selected
      const mockFolders = [
        {
          id: 'folder-1',
          name: 'Folder 1',
          path: '/folder-1',
          parentId: null,
          children: [],
          files: [],
          fileCount: 5,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'folder-2',
          name: 'Folder 2',
          path: '/folder-2',
          parentId: null,
          children: [],
          files: [],
          fileCount: 3,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'folder-3',
          name: 'Target Folder',
          path: '/target',
          parentId: null,
          children: [],
          files: [],
          fileCount: 10,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ folders: mockFolders }),
      } as Response);

      render(
        <DndWrapper>
          <FolderManager />
        </DndWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Folder 1')).toBeInTheDocument();
        expect(screen.getByText('Folder 2')).toBeInTheDocument();
        expect(screen.getByText('Target Folder')).toBeInTheDocument();
      });

      // Enable multi-selection mode
      const multiSelectButton = screen.getByTestId('multi-select-toggle');
      fireEvent.click(multiSelectButton);
      
      // Select multiple folders
      const folder1Checkbox = screen.getByLabelText('Select Folder 1');
      const folder2Checkbox = screen.getByLabelText('Select Folder 2');
      
      fireEvent.click(folder1Checkbox);
      fireEvent.click(folder2Checkbox);
      
      // Should show multi-selection indicator
      const selectionIndicator = screen.getByTestId('selection-indicator');
      expect(selectionIndicator).toBeInTheDocument();
      expect(selectionIndicator).toHaveTextContent('2 folders selected');
      
      // Start dragging one of the selected folders
      const folder1 = screen.getByText('Folder 1');
      fireEvent.dragStart(folder1);
      
      // Should show multi-drag preview
      const multiDragPreview = screen.getByTestId('multi-drag-preview');
      expect(multiDragPreview).toBeInTheDocument();
      expect(multiDragPreview).toHaveTextContent('Moving 2 folders');
      
      const targetFolder = screen.getByText('Target Folder');
      fireEvent.dragOver(targetFolder);
      fireEvent.drop(targetFolder);
      
      // Should show batch operation confirmation
      await waitFor(() => {
        const batchConfirmDialog = screen.getByTestId('batch-operation-confirm');
        expect(batchConfirmDialog).toBeInTheDocument();
        expect(screen.getByText('Move 2 folders to Target Folder?')).toBeInTheDocument();
        expect(screen.getByText('• Folder 1 (5 files)')).toBeInTheDocument();
        expect(screen.getByText('• Folder 2 (3 files)')).toBeInTheDocument();
      });
      
      const confirmButton = screen.getByText('Move All');
      fireEvent.click(confirmButton);
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/folders/batch-move', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            folderIds: ['folder-1', 'folder-2'],
            targetParentId: 'folder-3',
          }),
        });
      });
    });
  });

  describe('Accessibility and Keyboard Navigation', () => {
    it('should support comprehensive keyboard navigation', async () => {
      // RED: Test comprehensive keyboard navigation for folder operations
      const mockFolders = [
        {
          id: 'folder-1',
          name: 'Documents',
          path: '/documents',
          parentId: null,
          children: [
            {
              id: 'folder-2',
              name: 'Subfolder',
              path: '/documents/subfolder',
              parentId: 'folder-1',
              children: [],
              files: [],
              fileCount: 5,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ],
          files: [],
          fileCount: 10,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ folders: mockFolders }),
      } as Response);

      render(<FolderManager />);

      await waitFor(() => {
        expect(screen.getByText('Documents')).toBeInTheDocument();
      });

      const folderItem = screen.getByRole('treeitem', { name: /Documents/ });
      
      // Test focus and selection
      folderItem.focus();
      expect(folderItem).toHaveFocus();
      
      // Test arrow key navigation
      fireEvent.keyDown(folderItem, { key: 'ArrowRight' });
      expect(folderItem).toHaveAttribute('aria-expanded', 'true');
      
      // Should show subfolder
      await waitFor(() => {
        expect(screen.getByText('Subfolder')).toBeInTheDocument();
      });
      
      // Test moving to subfolder
      fireEvent.keyDown(folderItem, { key: 'ArrowDown' });
      const subfolderItem = screen.getByRole('treeitem', { name: /Subfolder/ });
      expect(subfolderItem).toHaveFocus();
      
      // Test collapsing parent
      fireEvent.keyDown(folderItem, { key: 'ArrowLeft' });
      expect(folderItem).toHaveAttribute('aria-expanded', 'false');
      
      // Test context menu with keyboard
      fireEvent.keyDown(folderItem, { key: 'ContextMenu' });
      const contextMenu = screen.getByRole('menu');
      expect(contextMenu).toBeInTheDocument();
      
      // Test menu navigation
      fireEvent.keyDown(contextMenu, { key: 'ArrowDown' });
      const renameMenuItem = screen.getByRole('menuitem', { name: /Rename/ });
      expect(renameMenuItem).toHaveFocus();
      
      // Test activating menu item
      fireEvent.keyDown(renameMenuItem, { key: 'Enter' });
      
      // Should enter rename mode
      await waitFor(() => {
        const renameInput = screen.getByDisplayValue('Documents');
        expect(renameInput).toBeInTheDocument();
        expect(renameInput).toHaveFocus();
      });
      
      // Test escape to cancel rename
      const renameInput = screen.getByDisplayValue('Documents');
      fireEvent.keyDown(renameInput, { key: 'Escape' });
      
      // Should exit rename mode
      await waitFor(() => {
        expect(screen.queryByDisplayValue('Documents')).not.toBeInTheDocument();
        expect(folderItem).toHaveFocus();
      });
    });

    it('should provide comprehensive screen reader support', async () => {
      // RED: Test screen reader announcements and ARIA attributes
      const mockFolders = [
        {
          id: 'folder-1',
          name: 'Important Documents',
          path: '/important-documents',
          parentId: null,
          children: [],
          files: [],
          fileCount: 25,
          isPrivate: true,
          hasNotifications: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ folders: mockFolders }),
      } as Response);

      render(<FolderManager />);

      await waitFor(() => {
        expect(screen.getByText('Important Documents')).toBeInTheDocument();
      });

      // Should have proper ARIA structure
      const folderTree = screen.getByRole('tree', { name: /Folder structure/ });
      expect(folderTree).toBeInTheDocument();
      
      const folderItem = screen.getByRole('treeitem');
      expect(folderItem).toHaveAttribute('aria-level', '1');
      expect(folderItem).toHaveAttribute('aria-posinset', '1');
      expect(folderItem).toHaveAttribute('aria-setsize', '1');
      
      // Should have descriptive labels
      expect(folderItem).toHaveAttribute('aria-label', 'Important Documents, private folder, 25 files, has notifications');
      
      // Should have live region for announcements
      const liveRegion = screen.getByRole('status');
      expect(liveRegion).toBeInTheDocument();
      expect(liveRegion).toHaveAttribute('aria-live', 'polite');
      
      // Test folder selection announcement
      fireEvent.click(folderItem);
      
      await waitFor(() => {
        expect(liveRegion).toHaveTextContent('Important Documents folder selected');
      });
      
      // Test folder expansion announcement
      fireEvent.keyDown(folderItem, { key: 'ArrowRight' });
      
      await waitFor(() => {
        expect(liveRegion).toHaveTextContent('Important Documents folder expanded');
      });
      
      // Test error announcement
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      
      const createButton = screen.getByText('Create Folder');
      fireEvent.click(createButton);
      
      const dialog = screen.getByRole('dialog');
      const nameInput = screen.getByLabelText('Folder Name');
      const submitButton = screen.getByText('Create');
      
      fireEvent.change(nameInput, { target: { value: 'Test Folder' } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(liveRegion).toHaveTextContent('Error creating folder: Network error');
      });
    });

    it('should support high contrast and reduced motion preferences', async () => {
      // RED: Test accessibility preferences support
      const mockFolders = [
        {
          id: 'folder-1',
          name: 'Documents',
          path: '/documents',
          parentId: null,
          children: [],
          files: [],
          fileCount: 10,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ folders: mockFolders }),
      } as Response);

      // Mock high contrast preference
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
          matches: query.includes('prefers-contrast: high'),
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      render(<FolderManager />);

      await waitFor(() => {
        expect(screen.getByText('Documents')).toBeInTheDocument();
      });

      // Should apply high contrast styles
      const folderManager = screen.getByTestId('folder-manager');
      expect(folderManager).toHaveClass('high-contrast');
      
      const folderItem = screen.getByText('Documents');
      expect(folderItem.closest('[data-testid="folder-item"]')).toHaveClass(
        'border-2',
        'border-black',
        'bg-white'
      );
      
      // Test focus indicators are enhanced
      folderItem.focus();
      expect(folderItem.closest('[data-testid="folder-item"]')).toHaveClass(
        'focus:ring-4',
        'focus:ring-black'
      );
      
      // Test reduced motion preference
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
          matches: query.includes('prefers-reduced-motion: reduce'),
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      // Should disable animations
      const animatedElements = screen.getAllByClassName('transition-transform');
      animatedElements.forEach(element => {
        expect(element).toHaveClass('transition-none');
      });
      
      // Should use instant feedback instead of animations
      const expandButton = screen.getByLabelText('Expand Documents');
      fireEvent.click(expandButton);
      
      // Should expand immediately without animation
      expect(folderItem.closest('[data-testid="folder-item"]')).toHaveAttribute('aria-expanded', 'true');
    });
  });
});