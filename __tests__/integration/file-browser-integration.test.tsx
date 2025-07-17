import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import FileBrowser from '../../components/FileBrowser';
import FileUploadZone from '../../components/FileUploadZone';
import FolderManager from '../../components/FolderManager';

// Mock fetch for API calls
global.fetch = vi.fn();
const mockFetch = vi.mocked(fetch);

// Mock data for integration tests
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
    tags: ['important', 'research'],
    collections: ['research-collection'],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'file2',
    name: 'data-analysis.xlsx',
    originalName: 'data-analysis.xlsx',
    path: '/uploads/data-analysis.xlsx',
    size: 1024000,
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    folderId: 'folder2',
    userId: 'user1',
    tags: ['data', 'analysis'],
    collections: ['data-collection'],
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z'
  },
  {
    id: 'file3',
    name: 'presentation.pptx',
    originalName: 'presentation.pptx',
    path: '/uploads/presentation.pptx',
    size: 5120000,
    type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    folderId: null,
    userId: 'user1',
    tags: ['presentation'],
    collections: [],
    createdAt: '2024-01-03T00:00:00Z',
    updatedAt: '2024-01-03T00:00:00Z'
  }
];

const mockFolders = [
  {
    id: 'folder1',
    name: 'Research',
    path: '/research',
    parentId: null,
    children: [
      {
        id: 'folder2',
        name: 'Data',
        path: '/research/data',
        parentId: 'folder1',
        children: [],
        files: [mockFiles[1]],
        fileCount: 1,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      }
    ],
    files: [mockFiles[0]],
    fileCount: 2,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  }
];

const mockCollections = [
  {
    id: 'research-collection',
    name: 'Research Papers',
    description: 'Collection of research papers',
    fileCount: 1,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'data-collection',
    name: 'Data Analysis',
    description: 'Collection of data analysis files',
    fileCount: 1,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  }
];

// Mock WorkflowContext for integration tests
const mockWorkflowContext = {
  currentStep: 'RESEARCH',
  selectedFiles: [],
  addFile: vi.fn(),
  removeFile: vi.fn(),
  currentProject: {
    id: 'project1',
    name: 'Research Project',
    files: [],
    folders: []
  }
};

describe('File Browser Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default comprehensive mock for all API endpoints
    mockFetch.mockImplementation((url: string, options?: any) => {
      // File operations
      if (url === '/api/files' || url.startsWith('/api/files?')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ files: mockFiles })
        } as Response);
      }
      
      // Folder operations
      if (url === '/api/folders' || url.startsWith('/api/folders?')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ folders: mockFolders })
        } as Response);
      }
      
      // Collection operations
      if (url === '/api/collections' || url.startsWith('/api/collections?')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ collections: mockCollections })
        } as Response);
      }
      
      // File upload operations
      if (url === '/api/files/upload' && options?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ 
            success: true,
            file: {
              id: 'uploaded-file',
              name: 'uploaded.pdf',
              originalName: 'uploaded.pdf',
              path: '/uploads/uploaded.pdf',
              size: 1024000,
              type: 'application/pdf',
              folderId: null,
              userId: 'user1',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }
          })
        } as Response);
      }
      
      // Default response
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true })
      } as Response);
    });
  });

  describe('File Browser with Folder Integration', () => {
    it('should integrate file browser with folder navigation', async () => {
      render(
        <div>
          <FolderManager onFolderSelect={vi.fn()} />
          <FileBrowser selectedFolderId="folder1" />
        </div>
      );
      
      await waitFor(() => {
        // Should show folder structure
        expect(screen.getByText('Research')).toBeInTheDocument();
        expect(screen.getByText('Data')).toBeInTheDocument();
        
        // Should show files in selected folder
        expect(screen.getByText('research-paper.pdf')).toBeInTheDocument();
      });
    });

    it('should update file list when folder is selected', async () => {
      const mockOnFolderSelect = vi.fn();
      
      render(
        <div>
          <FolderManager onFolderSelect={mockOnFolderSelect} />
          <FileBrowser />
        </div>
      );
      
      await waitFor(() => {
        const dataFolder = screen.getByText('Data');
        fireEvent.click(dataFolder);
      });
      
      expect(mockOnFolderSelect).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'folder2',
          name: 'Data'
        })
      );
    });

    it('should show breadcrumb navigation for folder hierarchy', async () => {
      render(<FileBrowser selectedFolderId="folder2" showBreadcrumbs={true} />);
      
      await waitFor(() => {
        expect(screen.getByText('All Files')).toBeInTheDocument();
        expect(screen.getByText('Research')).toBeInTheDocument();
        expect(screen.getByText('Data')).toBeInTheDocument();
      });
    });

    it('should allow navigation through breadcrumbs', async () => {
      const mockOnFolderSelect = vi.fn();
      
      render(
        <FileBrowser 
          selectedFolderId="folder2" 
          showBreadcrumbs={true}
          onFolderSelect={mockOnFolderSelect}
        />
      );
      
      await waitFor(() => {
        const researchBreadcrumb = screen.getByText('Research');
        fireEvent.click(researchBreadcrumb);
      });
      
      expect(mockOnFolderSelect).toHaveBeenCalledWith('folder1');
    });

    it('should support drag and drop files between folders', async () => {
      render(<FileBrowser allowDragDrop={true} />);
      
      await waitFor(() => {
        const fileItem = screen.getByText('presentation.pptx');
        const folderItem = screen.getByText('Research');
        
        fireEvent.dragStart(fileItem);
        fireEvent.dragOver(folderItem);
        fireEvent.drop(folderItem);
      });
      
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
  });

  describe('File Browser with Upload Integration', () => {
    it('should integrate file browser with upload zone', async () => {
      const mockOnFileUpload = vi.fn();
      
      render(
        <div>
          <FileUploadZone onFileUpload={mockOnFileUpload} />
          <FileBrowser />
        </div>
      );
      
      await waitFor(() => {
        expect(screen.getByText(/drag and drop files here/i)).toBeInTheDocument();
        expect(screen.getByText('research-paper.pdf')).toBeInTheDocument();
      });
    });

    it('should refresh file list after successful upload', async () => {
      const mockOnFileUpload = vi.fn().mockResolvedValue({ success: true });
      
      render(
        <div>
          <FileUploadZone onFileUpload={mockOnFileUpload} />
          <FileBrowser />
        </div>
      );
      
      await waitFor(() => {
        const dropZone = screen.getByRole('button', { name: /upload files/i });
        const testFile = new File(['content'], 'new-file.pdf', { type: 'application/pdf' });
        
        fireEvent.drop(dropZone, {
          dataTransfer: { files: [testFile] }
        });
      });
      
      await waitFor(() => {
        expect(mockOnFileUpload).toHaveBeenCalledWith([testFile]);
        // Should refresh file list
        expect(mockFetch).toHaveBeenCalledWith('/api/files');
      });
    });

    it('should upload files to selected folder', async () => {
      const mockOnFileUpload = vi.fn();
      
      render(
        <div>
          <FileUploadZone onFileUpload={mockOnFileUpload} folderId="folder1" />
          <FileBrowser selectedFolderId="folder1" />
        </div>
      );
      
      await waitFor(() => {
        const dropZone = screen.getByRole('button', { name: /upload files/i });
        const testFile = new File(['content'], 'new-file.pdf', { type: 'application/pdf' });
        
        fireEvent.drop(dropZone, {
          dataTransfer: { files: [testFile] }
        });
      });
      
      await waitFor(() => {
        expect(mockOnFileUpload).toHaveBeenCalledWith([testFile]);
      });
    });

    it('should show upload progress in file browser', async () => {
      render(
        <div>
          <FileUploadZone onFileUpload={vi.fn()} showProgress={true} />
          <FileBrowser showUploadProgress={true} />
        </div>
      );
      
      await waitFor(() => {
        const dropZone = screen.getByRole('button', { name: /upload files/i });
        const testFile = new File(['content'], 'new-file.pdf', { type: 'application/pdf' });
        
        fireEvent.drop(dropZone, {
          dataTransfer: { files: [testFile] }
        });
      });
      
      await waitFor(() => {
        expect(screen.getByText('Upload Progress')).toBeInTheDocument();
        expect(screen.getByRole('progressbar')).toBeInTheDocument();
      });
    });
  });

  describe('File Browser with Collections', () => {
    it('should show file collections in sidebar', async () => {
      render(<FileBrowser showCollections={true} />);
      
      await waitFor(() => {
        expect(screen.getByText('Collections')).toBeInTheDocument();
        expect(screen.getByText('Research Papers')).toBeInTheDocument();
        expect(screen.getByText('Data Analysis')).toBeInTheDocument();
      });
    });

    it('should filter files by collection', async () => {
      render(<FileBrowser showCollections={true} />);
      
      await waitFor(() => {
        const researchCollection = screen.getByText('Research Papers');
        fireEvent.click(researchCollection);
      });
      
      await waitFor(() => {
        expect(screen.getByText('research-paper.pdf')).toBeInTheDocument();
        expect(screen.queryByText('data-analysis.xlsx')).not.toBeInTheDocument();
      });
    });

    it('should create new collection from selected files', async () => {
      render(<FileBrowser showCollections={true} />);
      
      await waitFor(() => {
        const file1 = screen.getByText('research-paper.pdf');
        const file2 = screen.getByText('data-analysis.xlsx');
        
        fireEvent.click(file1);
        fireEvent.click(file2, { ctrlKey: true });
      });
      
      const createCollectionButton = screen.getByText('Create Collection');
      fireEvent.click(createCollectionButton);
      
      const nameInput = screen.getByLabelText('Collection Name');
      fireEvent.change(nameInput, { target: { value: 'New Collection' } });
      
      const createButton = screen.getByText('Create');
      fireEvent.click(createButton);
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/collections', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'New Collection',
            fileIds: ['file1', 'file2']
          })
        });
      });
    });

    it('should add files to existing collection', async () => {
      render(<FileBrowser showCollections={true} />);
      
      await waitFor(() => {
        const file = screen.getByText('presentation.pptx');
        fireEvent.contextMenu(file);
      });
      
      const addToCollectionOption = screen.getByText('Add to Collection');
      fireEvent.click(addToCollectionOption);
      
      const collectionSelect = screen.getByLabelText('Select Collection');
      fireEvent.change(collectionSelect, { target: { value: 'research-collection' } });
      
      const addButton = screen.getByText('Add');
      fireEvent.click(addButton);
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/collections/research-collection/files', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileId: 'file3'
          })
        });
      });
    });
  });

  describe('File Browser with Tagging System', () => {
    it('should show file tags in file browser', async () => {
      render(<FileBrowser showTags={true} />);
      
      await waitFor(() => {
        const fileItem = screen.getByTestId('file-item-file1');
        expect(within(fileItem).getByText('important')).toBeInTheDocument();
        expect(within(fileItem).getByText('research')).toBeInTheDocument();
      });
    });

    it('should filter files by tags', async () => {
      render(<FileBrowser showTags={true} />);
      
      await waitFor(() => {
        const tagFilter = screen.getByLabelText('Filter by Tag');
        fireEvent.change(tagFilter, { target: { value: 'research' } });
      });
      
      await waitFor(() => {
        expect(screen.getByText('research-paper.pdf')).toBeInTheDocument();
        expect(screen.queryByText('data-analysis.xlsx')).not.toBeInTheDocument();
        expect(screen.queryByText('presentation.pptx')).not.toBeInTheDocument();
      });
    });

    it('should add tags to multiple files', async () => {
      render(<FileBrowser showTags={true} />);
      
      await waitFor(() => {
        const file1 = screen.getByText('research-paper.pdf');
        const file2 = screen.getByText('data-analysis.xlsx');
        
        fireEvent.click(file1);
        fireEvent.click(file2, { ctrlKey: true });
      });
      
      const addTagsButton = screen.getByText('Add Tags');
      fireEvent.click(addTagsButton);
      
      const tagInput = screen.getByPlaceholderText('Enter tags (comma-separated)');
      fireEvent.change(tagInput, { target: { value: 'project,analysis' } });
      
      const applyButton = screen.getByText('Apply');
      fireEvent.click(applyButton);
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/files/batch/tags', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileIds: ['file1', 'file2'],
            tags: ['project', 'analysis']
          })
        });
      });
    });

    it('should show tag cloud for quick filtering', async () => {
      render(<FileBrowser showTags={true} showTagCloud={true} />);
      
      await waitFor(() => {
        expect(screen.getByText('Tag Cloud')).toBeInTheDocument();
        expect(screen.getByText('important')).toBeInTheDocument();
        expect(screen.getByText('research')).toBeInTheDocument();
        expect(screen.getByText('data')).toBeInTheDocument();
        expect(screen.getByText('analysis')).toBeInTheDocument();
      });
    });
  });

  describe('File Browser with Workflow Integration', () => {
    it('should integrate with workflow context', async () => {
      render(<FileBrowser workflowMode={true} workflowContext={mockWorkflowContext} />);
      
      await waitFor(() => {
        expect(screen.getByText('Workflow Mode')).toBeInTheDocument();
        expect(screen.getByText('Current Step: RESEARCH')).toBeInTheDocument();
      });
    });

    it('should show workflow-relevant files', async () => {
      render(<FileBrowser workflowMode={true} workflowContext={mockWorkflowContext} />);
      
      await waitFor(() => {
        const fileItem = screen.getByTestId('file-item-file1');
        expect(within(fileItem).getByText('Relevant for RESEARCH')).toBeInTheDocument();
      });
    });

    it('should add files to workflow', async () => {
      render(<FileBrowser workflowMode={true} workflowContext={mockWorkflowContext} />);
      
      await waitFor(() => {
        const file = screen.getByText('research-paper.pdf');
        fireEvent.click(file);
      });
      
      const addToWorkflowButton = screen.getByText('Add to Workflow');
      fireEvent.click(addToWorkflowButton);
      
      expect(mockWorkflowContext.addFile).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'file1',
          name: 'research-paper.pdf'
        })
      );
    });

    it('should show workflow step suggestions', async () => {
      render(<FileBrowser workflowMode={true} workflowContext={mockWorkflowContext} />);
      
      await waitFor(() => {
        const file = screen.getByText('data-analysis.xlsx');
        fireEvent.click(file);
      });
      
      expect(screen.getByText('Suggested for GENERATE step')).toBeInTheDocument();
    });

    it('should track file usage in workflow', async () => {
      render(<FileBrowser workflowMode={true} workflowContext={mockWorkflowContext} />);
      
      await waitFor(() => {
        const fileItem = screen.getByTestId('file-item-file1');
        expect(within(fileItem).getByText('Used in 2 workflows')).toBeInTheDocument();
      });
    });
  });

  describe('File Browser with Search Integration', () => {
    it('should provide unified search across files, folders, and collections', async () => {
      render(<FileBrowser unifiedSearch={true} />);
      
      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText('Search files, folders, collections...');
        fireEvent.change(searchInput, { target: { value: 'research' } });
      });
      
      await waitFor(() => {
        expect(screen.getByText('Files (1)')).toBeInTheDocument();
        expect(screen.getByText('Folders (1)')).toBeInTheDocument();
        expect(screen.getByText('Collections (1)')).toBeInTheDocument();
      });
    });

    it('should show search results with context', async () => {
      render(<FileBrowser unifiedSearch={true} />);
      
      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText('Search files, folders, collections...');
        fireEvent.change(searchInput, { target: { value: 'research' } });
      });
      
      await waitFor(() => {
        expect(screen.getByText('research-paper.pdf')).toBeInTheDocument();
        expect(screen.getByText('in Research folder')).toBeInTheDocument();
      });
    });

    it('should provide search suggestions', async () => {
      render(<FileBrowser unifiedSearch={true} showSuggestions={true} />);
      
      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText('Search files, folders, collections...');
        fireEvent.focus(searchInput);
        fireEvent.change(searchInput, { target: { value: 'res' } });
      });
      
      await waitFor(() => {
        expect(screen.getByText('research-paper.pdf')).toBeInTheDocument();
        expect(screen.getByText('Research (folder)')).toBeInTheDocument();
        expect(screen.getByText('Research Papers (collection)')).toBeInTheDocument();
      });
    });

    it('should save search history', async () => {
      render(<FileBrowser unifiedSearch={true} saveSearchHistory={true} />);
      
      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText('Search files, folders, collections...');
        fireEvent.change(searchInput, { target: { value: 'research' } });
        fireEvent.keyDown(searchInput, { key: 'Enter' });
      });
      
      await waitFor(() => {
        expect(screen.getByText('Search History')).toBeInTheDocument();
        expect(screen.getByText('research')).toBeInTheDocument();
      });
    });
  });

  describe('File Browser with Sharing and Collaboration', () => {
    it('should show sharing status for files', async () => {
      render(<FileBrowser showSharing={true} />);
      
      await waitFor(() => {
        const fileItem = screen.getByTestId('file-item-file1');
        expect(within(fileItem).getByTestId('sharing-indicator')).toBeInTheDocument();
      });
    });

    it('should create shareable links', async () => {
      render(<FileBrowser showSharing={true} />);
      
      await waitFor(() => {
        const file = screen.getByText('research-paper.pdf');
        fireEvent.contextMenu(file);
      });
      
      const shareOption = screen.getByText('Share');
      fireEvent.click(shareOption);
      
      const generateLinkButton = screen.getByText('Generate Link');
      fireEvent.click(generateLinkButton);
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/files/file1/share', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'link',
            permissions: 'read'
          })
        });
      });
    });

    it('should show collaboration activity', async () => {
      render(<FileBrowser showCollaboration={true} />);
      
      await waitFor(() => {
        const fileItem = screen.getByTestId('file-item-file1');
        expect(within(fileItem).getByText('2 collaborators')).toBeInTheDocument();
      });
    });

    it('should handle permission changes', async () => {
      render(<FileBrowser showSharing={true} />);
      
      await waitFor(() => {
        const file = screen.getByText('research-paper.pdf');
        fireEvent.contextMenu(file);
      });
      
      const shareOption = screen.getByText('Share');
      fireEvent.click(shareOption);
      
      const permissionSelect = screen.getByLabelText('Permission Level');
      fireEvent.change(permissionSelect, { target: { value: 'edit' } });
      
      const updateButton = screen.getByText('Update');
      fireEvent.click(updateButton);
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/files/file1/permissions', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            permissions: 'edit'
          })
        });
      });
    });
  });

  describe('File Browser Performance and Optimization', () => {
    it('should implement lazy loading for large file lists', async () => {
      const largeFileList = Array.from({ length: 1000 }, (_, i) => ({
        id: `file${i}`,
        name: `file${i}.pdf`,
        originalName: `file${i}.pdf`,
        path: `/uploads/file${i}.pdf`,
        size: 1024000,
        type: 'application/pdf',
        folderId: null,
        userId: 'user1',
        tags: [],
        collections: [],
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

    it('should cache API responses for performance', async () => {
      render(<FileBrowser enableCaching={true} />);
      
      await waitFor(() => {
        expect(screen.getByText('research-paper.pdf')).toBeInTheDocument();
      });
      
      // Simulate component re-render
      render(<FileBrowser enableCaching={true} />);
      
      // Should load from cache without additional API call
      expect(screen.getByText('research-paper.pdf')).toBeInTheDocument();
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should implement progressive loading for thumbnails', async () => {
      render(<FileBrowser showThumbnails={true} progressiveLoading={true} />);
      
      await waitFor(() => {
        const fileItem = screen.getByTestId('file-item-file1');
        expect(within(fileItem).getByTestId('thumbnail-placeholder')).toBeInTheDocument();
      });
      
      // Simulate thumbnail loading
      await waitFor(() => {
        expect(screen.getByTestId('file-thumbnail')).toBeInTheDocument();
      });
    });

    it('should handle memory optimization for large datasets', async () => {
      render(<FileBrowser memoryOptimization={true} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('memory-optimized-container')).toBeInTheDocument();
      });
    });
  });

  describe('File Browser Error Handling and Recovery', () => {
    it('should handle API failures gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('API Error'));
      
      render(<FileBrowser />);
      
      await waitFor(() => {
        expect(screen.getByText('Failed to load files')).toBeInTheDocument();
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });
    });

    it('should provide offline support', async () => {
      render(<FileBrowser offlineSupport={true} />);
      
      // Simulate offline state
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      });
      
      await waitFor(() => {
        expect(screen.getByText('Offline Mode')).toBeInTheDocument();
        expect(screen.getByText('Some features may be limited')).toBeInTheDocument();
      });
    });

    it('should handle sync conflicts', async () => {
      render(<FileBrowser />);
      
      await waitFor(() => {
        const file = screen.getByText('research-paper.pdf');
        fireEvent.contextMenu(file);
      });
      
      const renameOption = screen.getByText('Rename');
      fireEvent.click(renameOption);
      
      // Simulate conflict
      mockFetch.mockImplementation(() =>
        Promise.resolve({
          ok: false,
          status: 409,
          json: () => Promise.resolve({ 
            error: 'Conflict detected',
            details: 'File has been modified by another user'
          })
        } as Response)
      );
      
      const nameInput = screen.getByDisplayValue('research-paper.pdf');
      fireEvent.change(nameInput, { target: { value: 'updated-research-paper.pdf' } });
      fireEvent.keyDown(nameInput, { key: 'Enter' });
      
      await waitFor(() => {
        expect(screen.getByText('Conflict detected')).toBeInTheDocument();
        expect(screen.getByText('File has been modified by another user')).toBeInTheDocument();
      });
    });

    it('should provide data recovery options', async () => {
      render(<FileBrowser enableRecovery={true} />);
      
      await waitFor(() => {
        const file = screen.getByText('research-paper.pdf');
        fireEvent.contextMenu(file);
      });
      
      const recoveryOption = screen.getByText('Recovery Options');
      fireEvent.click(recoveryOption);
      
      expect(screen.getByText('File Recovery')).toBeInTheDocument();
      expect(screen.getByText('View Version History')).toBeInTheDocument();
      expect(screen.getByText('Restore from Backup')).toBeInTheDocument();
    });
  });
});