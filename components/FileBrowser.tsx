import React, { useState, useEffect, useCallback, useRef } from 'react';

interface File {
  id: string;
  name: string;
  originalName: string;
  path: string;
  size: number;
  type: string;
  folderId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Folder {
  id: string;
  name: string;
  path: string;
  parentId: string | null;
  children: Folder[];
  files: File[];
  fileCount: number;
  createdAt: string;
  updatedAt: string;
}

interface FileBrowserProps {
  selectedFolderId?: string | null;
  onFileSelect?: (file: File | null) => void;
  onFileDownload?: (file: File) => void;
  onFileDelete?: (file: File) => void;
  selectedFileId?: string | null;
  selectionMode?: 'single' | 'multiple' | 'none';
  showActions?: boolean;
  showDetails?: boolean;
  allowUpload?: boolean;
  onFileUpload?: (files: File[], folderId: string | null) => void;
}

interface ContextMenu {
  x: number;
  y: number;
  fileId: string;
  visible: boolean;
}

interface DeleteConfirmDialog {
  open: boolean;
  file: File | null;
}

interface SortConfig {
  field: 'name' | 'size' | 'type' | 'createdAt';
  direction: 'asc' | 'desc';
}

const FileBrowser: React.FC<FileBrowserProps> = ({
  selectedFolderId = null,
  onFileSelect,
  onFileDownload,
  onFileDelete,
  selectedFileId = null,
  selectionMode = 'single',
  showActions = true,
  showDetails = true,
  allowUpload = false,
  onFileUpload,
}) => {
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [contextMenu, setContextMenu] = useState<ContextMenu>({
    x: 0,
    y: 0,
    fileId: '',
    visible: false,
  });
  const [deleteDialog, setDeleteDialog] = useState<DeleteConfirmDialog>({
    open: false,
    file: null,
  });
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    field: 'createdAt',
    direction: 'desc',
  });
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  const contextMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load files from API
  const loadFiles = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const url = selectedFolderId 
        ? `/api/files?folderId=${selectedFolderId}`
        : '/api/files';
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to load files');
      }
      
      const data = await response.json();
      setFiles(data.files || []);
    } catch (err) {
      setError('Failed to load files');
      console.error('Error loading files:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedFolderId]);

  // Load files when folder changes
  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
        setContextMenu(prev => ({ ...prev, visible: false }));
      }
    };

    if (contextMenu.visible) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [contextMenu.visible]);

  // Handle file upload
  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = event.target.files;
    if (fileList && onFileUpload) {
      const filesArray = Array.from(fileList);
      onFileUpload(filesArray as any, selectedFolderId);
    }
    // Reset input value
    event.target.value = '';
  }, [onFileUpload, selectedFolderId]);

  // Filter and sort files
  const filteredAndSortedFiles = files
    .filter(file =>
      file.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      file.originalName.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      const { field, direction } = sortConfig;
      let comparison = 0;

      switch (field) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'size':
          comparison = a.size - b.size;
          break;
        case 'type':
          comparison = a.type.localeCompare(b.type);
          break;
        case 'createdAt':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
      }

      return direction === 'asc' ? comparison : -comparison;
    });

  // Handle file selection
  const handleFileClick = (file: File, event?: React.MouseEvent) => {
    if (selectionMode === 'none') return;

    if (selectionMode === 'multiple' && event?.ctrlKey) {
      setSelectedFiles(prev => {
        const newSelected = new Set(prev);
        if (newSelected.has(file.id)) {
          newSelected.delete(file.id);
        } else {
          newSelected.add(file.id);
        }
        return newSelected;
      });
    } else {
      setSelectedFiles(new Set([file.id]));
      onFileSelect?.(file);
    }
  };

  // Handle context menu
  const handleContextMenu = (event: React.MouseEvent, file: File) => {
    if (!showActions) return;
    
    event.preventDefault();
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      fileId: file.id,
      visible: true,
    });
  };

  // Handle file download
  const handleDownload = (file: File) => {
    if (onFileDownload) {
      onFileDownload(file);
    } else {
      // Default download behavior
      const link = document.createElement('a');
      link.href = file.path;
      link.download = file.originalName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    setContextMenu(prev => ({ ...prev, visible: false }));
  };

  // Handle file delete
  const handleDelete = (file: File) => {
    setDeleteDialog({ open: true, file });
    setContextMenu(prev => ({ ...prev, visible: false }));
  };

  // Confirm delete
  const confirmDelete = async () => {
    if (!deleteDialog.file) return;

    if (onFileDelete) {
      onFileDelete(deleteDialog.file);
    } else {
      // Default delete behavior
      try {
        const response = await fetch(`/api/files/${deleteDialog.file.id}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          throw new Error('Failed to delete file');
        }

        await loadFiles();
      } catch (err) {
        setError('Failed to delete file');
        console.error('Error deleting file:', err);
      }
    }

    setDeleteDialog({ open: false, file: null });
  };

  // Handle sort
  const handleSort = (field: SortConfig['field']) => {
    setSortConfig(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const formattedSize = (bytes / Math.pow(k, i)).toFixed(1);
    return `${formattedSize} ${sizes[i]}`;
  };

  // Format date
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString();
  };

  // Get file icon
  const getFileIcon = (type: string): string => {
    if (type.startsWith('image/')) return '🖼️';
    if (type.includes('pdf')) return '📄';
    if (type.includes('word') || type.includes('document')) return '📝';
    if (type.includes('text')) return '📃';
    return '📁';
  };

  // Get sort icon
  const getSortIcon = (field: SortConfig['field']) => {
    if (sortConfig.field !== field) {
      return <span className="text-gray-400">↕️</span>;
    }
    return sortConfig.direction === 'asc' ? '↑' : '↓';
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">Loading files...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={loadFiles}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            File Browser
            {selectedFolderId && <span className="text-sm text-gray-500 ml-2">(Folder view)</span>}
          </h2>
          <div className="flex items-center space-x-2">
            {allowUpload && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                  data-testid="upload-button"
                >
                  Upload Files
                </button>
              </>
            )}
            <div className="flex rounded-md border border-gray-300">
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1 text-sm ${
                  viewMode === 'list'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                List
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1 text-sm border-l border-gray-300 ${
                  viewMode === 'grid'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Grid
              </button>
            </div>
          </div>
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Search files..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          data-testid="search-input"
        />
      </div>

      {/* File list/grid */}
      <div className="flex-1 overflow-auto p-4">
        {filteredAndSortedFiles.length === 0 ? (
          searchQuery ? (
            <p className="text-gray-500 text-center py-8">
              No files found matching "{searchQuery}"
            </p>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No files found</p>
              <p className="text-gray-500">Upload files to get started</p>
            </div>
          )
        ) : viewMode === 'list' ? (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {/* Table header */}
            <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
              <div className="flex items-center space-x-4 text-sm font-medium text-gray-700">
                <div className="flex-1 min-w-0">
                  <button
                    onClick={() => handleSort('name')}
                    className="flex items-center hover:text-gray-900"
                  >
                    Name {getSortIcon('name')}
                  </button>
                </div>
                {showDetails && (
                  <>
                    <div className="w-20">
                      <button
                        onClick={() => handleSort('size')}
                        className="flex items-center hover:text-gray-900"
                      >
                        Size {getSortIcon('size')}
                      </button>
                    </div>
                    <div className="w-32">
                      <button
                        onClick={() => handleSort('type')}
                        className="flex items-center hover:text-gray-900"
                      >
                        Type {getSortIcon('type')}
                      </button>
                    </div>
                    <div className="w-24">
                      <button
                        onClick={() => handleSort('createdAt')}
                        className="flex items-center hover:text-gray-900"
                      >
                        Date {getSortIcon('createdAt')}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Table body */}
            <div role="table" aria-label="Files">
              {filteredAndSortedFiles.map(file => {
                const isSelected = selectedFiles.has(file.id) || selectedFileId === file.id;
                
                return (
                  <div
                    key={file.id}
                    className={`flex items-center px-4 py-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${
                      isSelected ? 'bg-blue-50 border-blue-200' : ''
                    }`}
                    onClick={(e) => handleFileClick(file, e)}
                    onContextMenu={(e) => handleContextMenu(e, file)}
                    data-testid="file-item"
                    role="row"
                    aria-selected={isSelected}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleFileClick(file);
                      }
                    }}
                  >
                    <div className="flex-1 min-w-0 flex items-center">
                      <span className="mr-3 text-2xl">{getFileIcon(file.type)}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {file.name}
                        </p>
                        {file.name !== file.originalName && (
                          <p className="text-xs text-gray-500 truncate">
                            Original: {file.originalName}
                          </p>
                        )}
                      </div>
                    </div>
                    {showDetails && (
                      <>
                        <div className="w-20 text-sm text-gray-500">
                          {formatFileSize(file.size)}
                        </div>
                        <div className="w-32 text-sm text-gray-500 truncate">
                          {file.type.split('/')[1]?.toUpperCase() || 'Unknown'}
                        </div>
                        <div className="w-24 text-sm text-gray-500">
                          {formatDate(file.createdAt)}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* Grid view */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {filteredAndSortedFiles.map(file => {
              const isSelected = selectedFiles.has(file.id) || selectedFileId === file.id;
              
              return (
                <div
                  key={file.id}
                  className={`p-4 border rounded-lg cursor-pointer hover:shadow-md transition-shadow ${
                    isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  }`}
                  onClick={(e) => handleFileClick(file, e)}
                  onContextMenu={(e) => handleContextMenu(e, file)}
                  data-testid="file-item"
                  role="button"
                  aria-selected={isSelected}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleFileClick(file);
                    }
                  }}
                >
                  <div className="text-center">
                    <div className="text-4xl mb-2">{getFileIcon(file.type)}</div>
                    <p className="text-sm font-medium text-gray-900 truncate" title={file.name}>
                      {file.name}
                    </p>
                    {showDetails && (
                      <p className="text-xs text-gray-500 mt-1">
                        {formatFileSize(file.size)}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu.visible && (
        <div
          ref={contextMenuRef}
          className="fixed bg-white border border-gray-200 rounded-md shadow-lg py-1 z-50"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            onClick={() => {
              const file = files.find(f => f.id === contextMenu.fileId);
              if (file) onFileSelect?.(file);
              setContextMenu(prev => ({ ...prev, visible: false }));
            }}
            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
          >
            Open
          </button>
          <button
            onClick={() => {
              const file = files.find(f => f.id === contextMenu.fileId);
              if (file) handleDownload(file);
            }}
            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
          >
            Download
          </button>
          <button
            onClick={() => {
              const file = files.find(f => f.id === contextMenu.fileId);
              setContextMenu(prev => ({ ...prev, visible: false }));
              // TODO: Implement rename functionality
            }}
            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
          >
            Rename
          </button>
          <button
            onClick={() => {
              const file = files.find(f => f.id === contextMenu.fileId);
              setContextMenu(prev => ({ ...prev, visible: false }));
              // TODO: Implement move to folder functionality
            }}
            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
          >
            Move to Folder
          </button>
          <button
            onClick={() => {
              const file = files.find(f => f.id === contextMenu.fileId);
              if (file) handleDelete(file);
            }}
            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 text-red-600"
          >
            Delete
          </button>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteDialog.open && deleteDialog.file && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Delete File</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to delete "{deleteDialog.file.name}"?
            </p>
            <p className="text-sm text-gray-500 mb-6">
              This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setDeleteDialog({ open: false, file: null })}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Selection summary */}
      {selectionMode === 'multiple' && selectedFiles.size > 0 && (
        <div className="p-4 bg-blue-50 border-t border-blue-200">
          <p className="text-sm text-blue-800">
            {selectedFiles.size} file{selectedFiles.size !== 1 ? 's' : ''} selected
          </p>
        </div>
      )}
    </div>
  );
};

export default FileBrowser;