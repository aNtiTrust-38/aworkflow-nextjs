import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import userEvent from '@testing-library/user-event';

// Mock the components that should be implemented
const FolderBreadcrumb = ({ 
  currentPath, 
  onNavigate, 
  onPathEdit, 
  maxItems = 5,
  showIcons = true,
  editable = true,
  showRoot = true,
  customSeparator = '/',
}: {
  currentPath: string;
  onNavigate: (path: string) => void;
  onPathEdit?: (path: string) => void;
  maxItems?: number;
  showIcons?: boolean;
  editable?: boolean;
  showRoot?: boolean;
  customSeparator?: string;
}) => {
  // RED: This component should be implemented
  return <div data-testid="folder-breadcrumb">Breadcrumb component needs implementation</div>;
};

const FolderNavigationPanel = ({
  currentFolderId,
  onNavigate,
  showHistory = true,
  showBookmarks = true,
  showQuickAccess = true,
  maxHistoryItems = 10,
}: {
  currentFolderId: string | null;
  onNavigate: (folderId: string | null) => void;
  showHistory?: boolean;
  showBookmarks?: boolean;
  showQuickAccess?: boolean;
  maxHistoryItems?: number;
}) => {
  // RED: This component should be implemented
  return <div data-testid="folder-navigation-panel">Navigation panel needs implementation</div>;
};

const FolderPathInput = ({
  currentPath,
  onPathChange,
  onPathValidate,
  showSuggestions = true,
  autoComplete = true,
}: {
  currentPath: string;
  onPathChange: (path: string) => void;
  onPathValidate: (path: string) => Promise<boolean>;
  showSuggestions?: boolean;
  autoComplete?: boolean;
}) => {
  // RED: This component should be implemented
  return <div data-testid="folder-path-input">Path input component needs implementation</div>;
};

describe('Folder Navigation and Breadcrumb Components - RED Phase Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  afterEach(() => {
    cleanup();
  });

  describe('Enhanced Breadcrumb Navigation', () => {
    it('should render breadcrumb with hierarchical path navigation', async () => {
      // RED: Test breadcrumb rendering with deep folder hierarchy
      const mockPath = '/projects/research/academic/papers/2024/january';
      const mockOnNavigate = vi.fn();

      render(
        <FolderBreadcrumb
          currentPath={mockPath}
          onNavigate={mockOnNavigate}
        />
      );

      // Should render breadcrumb container
      const breadcrumb = screen.getByTestId('folder-breadcrumb');
      expect(breadcrumb).toBeInTheDocument();
      
      // Should show root folder
      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('Projects')).toBeInTheDocument();
      expect(screen.getByText('Research')).toBeInTheDocument();
      expect(screen.getByText('Academic')).toBeInTheDocument();
      expect(screen.getByText('Papers')).toBeInTheDocument();
      expect(screen.getByText('2024')).toBeInTheDocument();
      expect(screen.getByText('January')).toBeInTheDocument();
      
      // Should show separators between items
      const separators = screen.getAllByText('/');
      expect(separators).toHaveLength(6); // 7 items = 6 separators
      
      // Should highlight current folder
      const currentFolder = screen.getByText('January');
      expect(currentFolder).toHaveClass('font-semibold', 'text-blue-600');
      
      // Should make parent folders clickable
      const projectsFolder = screen.getByText('Projects');
      expect(projectsFolder).toHaveClass('cursor-pointer', 'hover:text-blue-600');
      
      // Test navigation to parent folder
      fireEvent.click(projectsFolder);
      expect(mockOnNavigate).toHaveBeenCalledWith('/projects');
    });

    it('should render breadcrumb with overflow handling for long paths', async () => {
      // RED: Test breadcrumb overflow with collapse/expand functionality
      const mockLongPath = '/very/long/path/with/many/nested/folders/that/exceeds/normal/display/width/and/needs/truncation';
      const mockOnNavigate = vi.fn();

      render(
        <FolderBreadcrumb
          currentPath={mockLongPath}
          onNavigate={mockOnNavigate}
          maxItems={5}
        />
      );

      // Should show only first few items, ellipsis, and last item
      expect(screen.getByText('Very')).toBeInTheDocument();
      expect(screen.getByText('Long')).toBeInTheDocument();
      expect(screen.getByText('...')).toBeInTheDocument();
      expect(screen.getByText('Needs')).toBeInTheDocument();
      expect(screen.getByText('Truncation')).toBeInTheDocument();
      
      // Should not show all middle items
      expect(screen.queryByText('Many')).not.toBeInTheDocument();
      expect(screen.queryByText('Nested')).not.toBeInTheDocument();
      
      // Should show expand button
      const expandButton = screen.getByLabelText('Show full path');
      expect(expandButton).toBeInTheDocument();
      
      // Test expanding full path
      fireEvent.click(expandButton);
      
      await waitFor(() => {
        expect(screen.getByText('Many')).toBeInTheDocument();
        expect(screen.getByText('Nested')).toBeInTheDocument();
        expect(screen.getByText('Folders')).toBeInTheDocument();
      });
      
      // Should show collapse button
      const collapseButton = screen.getByLabelText('Collapse path');
      expect(collapseButton).toBeInTheDocument();
      
      // Test collapsing back
      fireEvent.click(collapseButton);
      
      await waitFor(() => {
        expect(screen.queryByText('Many')).not.toBeInTheDocument();
        expect(screen.getByText('...')).toBeInTheDocument();
      });
    });

    it('should render breadcrumb with drag and drop support', async () => {
      // RED: Test breadcrumb with drag and drop for folder reordering
      const mockPath = '/projects/research/papers';
      const mockOnNavigate = vi.fn();
      const mockOnFolderMove = vi.fn();

      render(
        <FolderBreadcrumb
          currentPath={mockPath}
          onNavigate={mockOnNavigate}
          onFolderMove={mockOnFolderMove}
          enableDragDrop={true}
        />
      );

      // Should have drag handles on breadcrumb items
      const dragHandles = screen.getAllByTestId('breadcrumb-drag-handle');
      expect(dragHandles).toHaveLength(3); // projects, research, papers
      
      // Test dragging a folder from elsewhere onto breadcrumb
      const researchItem = screen.getByText('Research');
      
      fireEvent.dragOver(researchItem, {
        dataTransfer: {
          types: ['folder'],
          getData: () => JSON.stringify({ folderId: 'external-folder', name: 'External Folder' }),
        },
      });
      
      // Should show drop indicator
      const dropIndicator = screen.getByTestId('breadcrumb-drop-indicator');
      expect(dropIndicator).toBeInTheDocument();
      
      // Should show drop preview
      const dropPreview = screen.getByTestId('breadcrumb-drop-preview');
      expect(dropPreview).toBeInTheDocument();
      expect(dropPreview).toHaveTextContent('Move External Folder to Research');
      
      // Test dropping
      fireEvent.drop(researchItem, {
        dataTransfer: {
          getData: () => JSON.stringify({ folderId: 'external-folder', name: 'External Folder' }),
        },
      });
      
      expect(mockOnFolderMove).toHaveBeenCalledWith('external-folder', '/projects/research');
    });

    it('should render breadcrumb with inline editing capabilities', async () => {
      // RED: Test breadcrumb with inline folder renaming
      const mockPath = '/projects/research/papers';
      const mockOnNavigate = vi.fn();
      const mockOnPathEdit = vi.fn();

      render(
        <FolderBreadcrumb
          currentPath={mockPath}
          onNavigate={mockOnNavigate}
          onPathEdit={mockOnPathEdit}
          editable={true}
        />
      );

      // Should show edit buttons on hover
      const researchItem = screen.getByText('Research');
      fireEvent.mouseEnter(researchItem);
      
      const editButton = screen.getByLabelText('Edit Research folder name');
      expect(editButton).toBeInTheDocument();
      
      // Test entering edit mode
      fireEvent.click(editButton);
      
      const editInput = screen.getByDisplayValue('Research');
      expect(editInput).toBeInTheDocument();
      expect(editInput).toHaveFocus();
      
      // Test editing folder name
      fireEvent.change(editInput, { target: { value: 'Updated Research' } });
      fireEvent.keyDown(editInput, { key: 'Enter' });
      
      expect(mockOnPathEdit).toHaveBeenCalledWith('/projects/updated-research/papers');
      
      // Test canceling edit
      fireEvent.click(editButton);
      const cancelEditInput = screen.getByDisplayValue('Research');
      fireEvent.keyDown(cancelEditInput, { key: 'Escape' });
      
      expect(mockOnPathEdit).not.toHaveBeenCalledWith('/projects/updated-research/papers');
    });

    it('should render breadcrumb with context menu actions', async () => {
      // RED: Test breadcrumb with right-click context menu
      const mockPath = '/projects/research/papers';
      const mockOnNavigate = vi.fn();
      const mockOnFolderAction = vi.fn();

      render(
        <FolderBreadcrumb
          currentPath={mockPath}
          onNavigate={mockOnNavigate}
          onFolderAction={mockOnFolderAction}
        />
      );

      // Right-click on breadcrumb item
      const researchItem = screen.getByText('Research');
      fireEvent.contextMenu(researchItem);
      
      // Should show context menu
      const contextMenu = screen.getByTestId('breadcrumb-context-menu');
      expect(contextMenu).toBeInTheDocument();
      
      // Should show folder-specific actions
      expect(screen.getByText('Open in New Tab')).toBeInTheDocument();
      expect(screen.getByText('Copy Path')).toBeInTheDocument();
      expect(screen.getByText('Create Subfolder')).toBeInTheDocument();
      expect(screen.getByText('Rename')).toBeInTheDocument();
      expect(screen.getByText('Properties')).toBeInTheDocument();
      expect(screen.getByText('Add to Bookmarks')).toBeInTheDocument();
      
      // Test copying path
      const copyPathAction = screen.getByText('Copy Path');
      fireEvent.click(copyPathAction);
      
      expect(mockOnFolderAction).toHaveBeenCalledWith('copy-path', '/projects/research');
      
      // Test creating subfolder
      const createSubfolderAction = screen.getByText('Create Subfolder');
      fireEvent.click(createSubfolderAction);
      
      expect(mockOnFolderAction).toHaveBeenCalledWith('create-subfolder', '/projects/research');
    });

    it('should render breadcrumb with accessibility features', async () => {
      // RED: Test breadcrumb accessibility and keyboard navigation
      const mockPath = '/projects/research/papers';
      const mockOnNavigate = vi.fn();

      render(
        <FolderBreadcrumb
          currentPath={mockPath}
          onNavigate={mockOnNavigate}
        />
      );

      // Should have proper ARIA structure
      const breadcrumb = screen.getByRole('navigation', { name: 'Folder breadcrumb' });
      expect(breadcrumb).toBeInTheDocument();
      
      const breadcrumbList = screen.getByRole('list');
      expect(breadcrumbList).toBeInTheDocument();
      
      const breadcrumbItems = screen.getAllByRole('listitem');
      expect(breadcrumbItems).toHaveLength(4); // home, projects, research, papers
      
      // Should have proper ARIA labels
      const currentItem = screen.getByRole('link', { name: 'Papers, current folder' });
      expect(currentItem).toHaveAttribute('aria-current', 'location');
      
      // Test keyboard navigation
      const projectsLink = screen.getByRole('link', { name: 'Projects' });
      projectsLink.focus();
      
      fireEvent.keyDown(projectsLink, { key: 'ArrowRight' });
      
      const researchLink = screen.getByRole('link', { name: 'Research' });
      expect(researchLink).toHaveFocus();
      
      // Test activation with Enter
      fireEvent.keyDown(researchLink, { key: 'Enter' });
      expect(mockOnNavigate).toHaveBeenCalledWith('/projects/research');
      
      // Test activation with Space
      fireEvent.keyDown(projectsLink, { key: ' ' });
      expect(mockOnNavigate).toHaveBeenCalledWith('/projects');
    });
  });

  describe('Enhanced Navigation Panel', () => {
    it('should render navigation panel with history tracking', async () => {
      // RED: Test navigation panel with folder history
      const mockCurrentFolderId = 'folder-3';
      const mockOnNavigate = vi.fn();
      const mockHistory = [
        { folderId: 'folder-1', name: 'Documents', path: '/documents', timestamp: Date.now() - 300000 },
        { folderId: 'folder-2', name: 'Images', path: '/images', timestamp: Date.now() - 200000 },
        { folderId: 'folder-3', name: 'Projects', path: '/projects', timestamp: Date.now() - 100000 },
      ];

      render(
        <FolderNavigationPanel
          currentFolderId={mockCurrentFolderId}
          onNavigate={mockOnNavigate}
          history={mockHistory}
          showHistory={true}
        />
      );

      // Should show history section
      const historySection = screen.getByTestId('navigation-history');
      expect(historySection).toBeInTheDocument();
      expect(screen.getByText('Recent Folders')).toBeInTheDocument();
      
      // Should show history items
      expect(screen.getByText('Documents')).toBeInTheDocument();
      expect(screen.getByText('Images')).toBeInTheDocument();
      expect(screen.getByText('Projects')).toBeInTheDocument();
      
      // Should show timestamps
      expect(screen.getByText('5 minutes ago')).toBeInTheDocument();
      expect(screen.getByText('3 minutes ago')).toBeInTheDocument();
      expect(screen.getByText('2 minutes ago')).toBeInTheDocument();
      
      // Should highlight current folder
      const currentItem = screen.getByText('Projects');
      expect(currentItem.closest('[data-testid="history-item"]')).toHaveClass('bg-blue-50', 'border-blue-200');
      
      // Test navigation to history item
      const documentsItem = screen.getByText('Documents');
      fireEvent.click(documentsItem);
      
      expect(mockOnNavigate).toHaveBeenCalledWith('folder-1');
      
      // Should show clear history button
      const clearHistoryButton = screen.getByText('Clear History');
      expect(clearHistoryButton).toBeInTheDocument();
      
      fireEvent.click(clearHistoryButton);
      
      // Should show confirmation dialog
      const confirmDialog = screen.getByTestId('clear-history-dialog');
      expect(confirmDialog).toBeInTheDocument();
      expect(screen.getByText('Clear navigation history?')).toBeInTheDocument();
    });

    it('should render navigation panel with bookmarks management', async () => {
      // RED: Test navigation panel with folder bookmarks
      const mockCurrentFolderId = 'folder-1';
      const mockOnNavigate = vi.fn();
      const mockBookmarks = [
        { folderId: 'folder-1', name: 'Important Documents', path: '/important', icon: 'star' },
        { folderId: 'folder-2', name: 'Active Projects', path: '/projects/active', icon: 'folder' },
        { folderId: 'folder-3', name: 'Archive', path: '/archive', icon: 'archive' },
      ];

      render(
        <FolderNavigationPanel
          currentFolderId={mockCurrentFolderId}
          onNavigate={mockOnNavigate}
          bookmarks={mockBookmarks}
          showBookmarks={true}
        />
      );

      // Should show bookmarks section
      const bookmarksSection = screen.getByTestId('navigation-bookmarks');
      expect(bookmarksSection).toBeInTheDocument();
      expect(screen.getByText('Bookmarks')).toBeInTheDocument();
      
      // Should show bookmark items with icons
      const starIcon = screen.getByTestId('bookmark-icon-star');
      expect(starIcon).toBeInTheDocument();
      expect(screen.getByText('Important Documents')).toBeInTheDocument();
      
      const folderIcon = screen.getByTestId('bookmark-icon-folder');
      expect(folderIcon).toBeInTheDocument();
      expect(screen.getByText('Active Projects')).toBeInTheDocument();
      
      // Test navigation to bookmark
      const archiveBookmark = screen.getByText('Archive');
      fireEvent.click(archiveBookmark);
      
      expect(mockOnNavigate).toHaveBeenCalledWith('folder-3');
      
      // Should show bookmark management options
      const importantDocsItem = screen.getByText('Important Documents');
      fireEvent.contextMenu(importantDocsItem);
      
      const bookmarkContextMenu = screen.getByTestId('bookmark-context-menu');
      expect(bookmarkContextMenu).toBeInTheDocument();
      expect(screen.getByText('Edit Bookmark')).toBeInTheDocument();
      expect(screen.getByText('Remove Bookmark')).toBeInTheDocument();
      expect(screen.getByText('Change Icon')).toBeInTheDocument();
      
      // Test adding new bookmark
      const addBookmarkButton = screen.getByText('Add Bookmark');
      fireEvent.click(addBookmarkButton);
      
      const addBookmarkDialog = screen.getByTestId('add-bookmark-dialog');
      expect(addBookmarkDialog).toBeInTheDocument();
      expect(screen.getByLabelText('Bookmark Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Folder Path')).toBeInTheDocument();
      expect(screen.getByLabelText('Icon')).toBeInTheDocument();
    });

    it('should render navigation panel with quick access shortcuts', async () => {
      // RED: Test navigation panel with quick access and shortcuts
      const mockCurrentFolderId = 'folder-1';
      const mockOnNavigate = vi.fn();
      const mockQuickAccess = [
        { folderId: 'folder-1', name: 'Desktop', path: '/desktop', type: 'system' },
        { folderId: 'folder-2', name: 'Downloads', path: '/downloads', type: 'system' },
        { folderId: 'folder-3', name: 'Recent Files', path: '/recent', type: 'virtual' },
        { folderId: 'folder-4', name: 'Shared with Me', path: '/shared', type: 'virtual' },
        { folderId: 'folder-5', name: 'Trash', path: '/trash', type: 'system' },
      ];

      render(
        <FolderNavigationPanel
          currentFolderId={mockCurrentFolderId}
          onNavigate={mockOnNavigate}
          quickAccess={mockQuickAccess}
          showQuickAccess={true}
        />
      );

      // Should show quick access section
      const quickAccessSection = screen.getByTestId('navigation-quick-access');
      expect(quickAccessSection).toBeInTheDocument();
      expect(screen.getByText('Quick Access')).toBeInTheDocument();
      
      // Should show system folders
      expect(screen.getByText('Desktop')).toBeInTheDocument();
      expect(screen.getByText('Downloads')).toBeInTheDocument();
      expect(screen.getByText('Trash')).toBeInTheDocument();
      
      // Should show virtual folders
      expect(screen.getByText('Recent Files')).toBeInTheDocument();
      expect(screen.getByText('Shared with Me')).toBeInTheDocument();
      
      // Should show different icons for different types
      const systemIcon = screen.getByTestId('quick-access-icon-system');
      expect(systemIcon).toBeInTheDocument();
      
      const virtualIcon = screen.getByTestId('quick-access-icon-virtual');
      expect(virtualIcon).toBeInTheDocument();
      
      // Test navigation to quick access item
      const downloadsItem = screen.getByText('Downloads');
      fireEvent.click(downloadsItem);
      
      expect(mockOnNavigate).toHaveBeenCalledWith('folder-2');
      
      // Should show customization options
      const customizeButton = screen.getByText('Customize');
      fireEvent.click(customizeButton);
      
      const customizeDialog = screen.getByTestId('customize-quick-access-dialog');
      expect(customizeDialog).toBeInTheDocument();
      expect(screen.getByText('Customize Quick Access')).toBeInTheDocument();
      
      // Should allow reordering
      const reorderableList = screen.getByTestId('quick-access-reorderable-list');
      expect(reorderableList).toBeInTheDocument();
      
      // Should allow hiding/showing items
      const visibilityCheckboxes = screen.getAllByLabelText(/Show in Quick Access/);
      expect(visibilityCheckboxes).toHaveLength(5);
    });

    it('should render navigation panel with search and filtering', async () => {
      // RED: Test navigation panel with search functionality
      const mockCurrentFolderId = 'folder-1';
      const mockOnNavigate = vi.fn();
      const mockOnSearch = vi.fn();

      render(
        <FolderNavigationPanel
          currentFolderId={mockCurrentFolderId}
          onNavigate={mockOnNavigate}
          onSearch={mockOnSearch}
          showSearch={true}
        />
      );

      // Should show search section
      const searchSection = screen.getByTestId('navigation-search');
      expect(searchSection).toBeInTheDocument();
      
      // Should show search input
      const searchInput = screen.getByPlaceholderText('Search folders...');
      expect(searchInput).toBeInTheDocument();
      
      // Test search functionality
      fireEvent.change(searchInput, { target: { value: 'documents' } });
      
      await waitFor(() => {
        expect(mockOnSearch).toHaveBeenCalledWith('documents');
      });
      
      // Should show search results
      const searchResults = screen.getByTestId('search-results');
      expect(searchResults).toBeInTheDocument();
      
      // Should show search filters
      const searchFilters = screen.getByTestId('search-filters');
      expect(searchFilters).toBeInTheDocument();
      
      expect(screen.getByText('File Type')).toBeInTheDocument();
      expect(screen.getByText('Date Modified')).toBeInTheDocument();
      expect(screen.getByText('Size')).toBeInTheDocument();
      expect(screen.getByText('Tags')).toBeInTheDocument();
      
      // Test advanced search
      const advancedSearchButton = screen.getByText('Advanced Search');
      fireEvent.click(advancedSearchButton);
      
      const advancedSearchDialog = screen.getByTestId('advanced-search-dialog');
      expect(advancedSearchDialog).toBeInTheDocument();
      
      // Should show advanced search options
      expect(screen.getByLabelText('Folder Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Path Contains')).toBeInTheDocument();
      expect(screen.getByLabelText('Created After')).toBeInTheDocument();
      expect(screen.getByLabelText('Modified Before')).toBeInTheDocument();
      expect(screen.getByLabelText('File Count')).toBeInTheDocument();
      expect(screen.getByLabelText('Total Size')).toBeInTheDocument();
      
      // Test saved searches
      const savedSearchesSection = screen.getByTestId('saved-searches');
      expect(savedSearchesSection).toBeInTheDocument();
      expect(screen.getByText('Saved Searches')).toBeInTheDocument();
      
      const saveCurrentSearchButton = screen.getByText('Save Current Search');
      fireEvent.click(saveCurrentSearchButton);
      
      const saveSearchDialog = screen.getByTestId('save-search-dialog');
      expect(saveSearchDialog).toBeInTheDocument();
      expect(screen.getByLabelText('Search Name')).toBeInTheDocument();
    });
  });

  describe('Enhanced Path Input Component', () => {
    it('should render path input with autocomplete and validation', async () => {
      // RED: Test path input with autocomplete suggestions
      const mockCurrentPath = '/projects/research';
      const mockOnPathChange = vi.fn();
      const mockOnPathValidate = vi.fn().mockResolvedValue(true);

      render(
        <FolderPathInput
          currentPath={mockCurrentPath}
          onPathChange={mockOnPathChange}
          onPathValidate={mockOnPathValidate}
          showSuggestions={true}
          autoComplete={true}
        />
      );

      // Should show path input
      const pathInput = screen.getByTestId('folder-path-input');
      expect(pathInput).toBeInTheDocument();
      
      const input = screen.getByRole('textbox', { name: 'Folder path' });
      expect(input).toBeInTheDocument();
      expect(input).toHaveValue('/projects/research');
      
      // Test typing to trigger autocomplete
      fireEvent.focus(input);
      fireEvent.change(input, { target: { value: '/projects/research/ac' } });
      
      // Should show autocomplete suggestions
      await waitFor(() => {
        const suggestions = screen.getByTestId('path-suggestions');
        expect(suggestions).toBeInTheDocument();
      });
      
      // Should show matching suggestions
      expect(screen.getByText('/projects/research/academic')).toBeInTheDocument();
      expect(screen.getByText('/projects/research/active')).toBeInTheDocument();
      expect(screen.getByText('/projects/research/archive')).toBeInTheDocument();
      
      // Test selecting suggestion
      const academicSuggestion = screen.getByText('/projects/research/academic');
      fireEvent.click(academicSuggestion);
      
      expect(mockOnPathChange).toHaveBeenCalledWith('/projects/research/academic');
      
      // Test keyboard navigation of suggestions
      fireEvent.change(input, { target: { value: '/projects/research/ac' } });
      
      await waitFor(() => {
        const suggestions = screen.getByTestId('path-suggestions');
        expect(suggestions).toBeInTheDocument();
      });
      
      fireEvent.keyDown(input, { key: 'ArrowDown' });
      
      const selectedSuggestion = screen.getByRole('option', { selected: true });
      expect(selectedSuggestion).toHaveTextContent('/projects/research/academic');
      
      fireEvent.keyDown(input, { key: 'Enter' });
      expect(mockOnPathChange).toHaveBeenCalledWith('/projects/research/academic');
    });

    it('should render path input with validation and error handling', async () => {
      // RED: Test path input validation and error states
      const mockCurrentPath = '/projects/research';
      const mockOnPathChange = vi.fn();
      const mockOnPathValidate = vi.fn();

      render(
        <FolderPathInput
          currentPath={mockCurrentPath}
          onPathChange={mockOnPathChange}
          onPathValidate={mockOnPathValidate}
          showValidation={true}
        />
      );

      const input = screen.getByRole('textbox', { name: 'Folder path' });
      
      // Test invalid path
      mockOnPathValidate.mockResolvedValue(false);
      
      fireEvent.change(input, { target: { value: '/invalid/path' } });
      fireEvent.blur(input);
      
      await waitFor(() => {
        expect(mockOnPathValidate).toHaveBeenCalledWith('/invalid/path');
      });
      
      // Should show error state
      await waitFor(() => {
        expect(input).toHaveClass('border-red-500');
        const errorMessage = screen.getByText('Invalid folder path');
        expect(errorMessage).toBeInTheDocument();
        expect(errorMessage).toHaveClass('text-red-600');
      });
      
      // Test valid path
      mockOnPathValidate.mockResolvedValue(true);
      
      fireEvent.change(input, { target: { value: '/projects/valid' } });
      fireEvent.blur(input);
      
      await waitFor(() => {
        expect(mockOnPathValidate).toHaveBeenCalledWith('/projects/valid');
      });
      
      // Should show success state
      await waitFor(() => {
        expect(input).toHaveClass('border-green-500');
        const successIcon = screen.getByTestId('path-valid-icon');
        expect(successIcon).toBeInTheDocument();
      });
      
      // Test path format validation
      fireEvent.change(input, { target: { value: 'relative/path' } });
      fireEvent.blur(input);
      
      await waitFor(() => {
        const formatError = screen.getByText('Path must start with /');
        expect(formatError).toBeInTheDocument();
      });
      
      // Test path character validation
      fireEvent.change(input, { target: { value: '/path/with/invalid<>characters' } });
      fireEvent.blur(input);
      
      await waitFor(() => {
        const characterError = screen.getByText('Path contains invalid characters');
        expect(characterError).toBeInTheDocument();
      });
    });

    it('should render path input with breadcrumb visualization', async () => {
      // RED: Test path input with breadcrumb-style visualization
      const mockCurrentPath = '/projects/research/academic/papers';
      const mockOnPathChange = vi.fn();
      const mockOnPathValidate = vi.fn().mockResolvedValue(true);

      render(
        <FolderPathInput
          currentPath={mockCurrentPath}
          onPathChange={mockOnPathChange}
          onPathValidate={mockOnPathValidate}
          showBreadcrumb={true}
        />
      );

      // Should show breadcrumb visualization
      const breadcrumbVisualization = screen.getByTestId('path-breadcrumb-visualization');
      expect(breadcrumbVisualization).toBeInTheDocument();
      
      // Should show path segments as clickable breadcrumbs
      expect(screen.getByText('projects')).toBeInTheDocument();
      expect(screen.getByText('research')).toBeInTheDocument();
      expect(screen.getByText('academic')).toBeInTheDocument();
      expect(screen.getByText('papers')).toBeInTheDocument();
      
      // Test clicking on breadcrumb segment
      const researchSegment = screen.getByText('research');
      fireEvent.click(researchSegment);
      
      expect(mockOnPathChange).toHaveBeenCalledWith('/projects/research');
      
      // Should show edit indicators
      const editIndicators = screen.getAllByTestId('path-segment-edit-indicator');
      expect(editIndicators).toHaveLength(4);
      
      // Test editing individual segment
      const academicSegment = screen.getByText('academic');
      fireEvent.doubleClick(academicSegment);
      
      const segmentEditInput = screen.getByDisplayValue('academic');
      expect(segmentEditInput).toBeInTheDocument();
      
      fireEvent.change(segmentEditInput, { target: { value: 'theoretical' } });
      fireEvent.keyDown(segmentEditInput, { key: 'Enter' });
      
      expect(mockOnPathChange).toHaveBeenCalledWith('/projects/research/theoretical/papers');
    });

    it('should render path input with history and favorites', async () => {
      // RED: Test path input with path history and favorites
      const mockCurrentPath = '/projects/research';
      const mockOnPathChange = vi.fn();
      const mockOnPathValidate = vi.fn().mockResolvedValue(true);
      const mockPathHistory = [
        '/projects/research/academic',
        '/projects/research/commercial',
        '/projects/archive',
        '/documents/important',
      ];
      const mockFavoritePaths = [
        '/projects/research/academic',
        '/documents/important',
        '/downloads',
      ];

      render(
        <FolderPathInput
          currentPath={mockCurrentPath}
          onPathChange={mockOnPathChange}
          onPathValidate={mockOnPathValidate}
          pathHistory={mockPathHistory}
          favoritePaths={mockFavoritePaths}
          showHistory={true}
          showFavorites={true}
        />
      );

      const input = screen.getByRole('textbox', { name: 'Folder path' });
      
      // Should show history dropdown button
      const historyButton = screen.getByLabelText('Path history');
      expect(historyButton).toBeInTheDocument();
      
      fireEvent.click(historyButton);
      
      // Should show history dropdown
      const historyDropdown = screen.getByTestId('path-history-dropdown');
      expect(historyDropdown).toBeInTheDocument();
      
      // Should show recent paths
      expect(screen.getByText('/projects/research/academic')).toBeInTheDocument();
      expect(screen.getByText('/projects/research/commercial')).toBeInTheDocument();
      expect(screen.getByText('/projects/archive')).toBeInTheDocument();
      expect(screen.getByText('/documents/important')).toBeInTheDocument();
      
      // Test selecting from history
      const academicPath = screen.getByText('/projects/research/academic');
      fireEvent.click(academicPath);
      
      expect(mockOnPathChange).toHaveBeenCalledWith('/projects/research/academic');
      
      // Should show favorites button
      const favoritesButton = screen.getByLabelText('Favorite paths');
      expect(favoritesButton).toBeInTheDocument();
      
      fireEvent.click(favoritesButton);
      
      // Should show favorites dropdown
      const favoritesDropdown = screen.getByTestId('path-favorites-dropdown');
      expect(favoritesDropdown).toBeInTheDocument();
      
      // Should show favorite paths with star icons
      const favoriteItems = screen.getAllByTestId('favorite-path-item');
      expect(favoriteItems).toHaveLength(3);
      
      // Test selecting from favorites
      const importantPath = screen.getByText('/documents/important');
      fireEvent.click(importantPath);
      
      expect(mockOnPathChange).toHaveBeenCalledWith('/documents/important');
      
      // Should show add to favorites button
      const addToFavoritesButton = screen.getByLabelText('Add current path to favorites');
      expect(addToFavoritesButton).toBeInTheDocument();
      
      fireEvent.click(addToFavoritesButton);
      
      // Should show confirmation
      const favoriteConfirmation = screen.getByText('Added to favorites');
      expect(favoriteConfirmation).toBeInTheDocument();
    });
  });
});