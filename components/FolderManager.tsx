import React, { useState, useEffect, useCallback, useRef } from 'react';

interface Folder {
  id: string;
  name: string;
  path: string;
  parentId: string | null;
  children: Folder[];
  files: any[];
  fileCount: number;
  createdAt: string;
  updatedAt: string;
}

interface FolderManagerProps {
  onFolderSelect?: (folder: Folder | null) => void;
  selectedFolderId?: string | null;
}

interface ContextMenu {
  x: number;
  y: number;
  folderId: string;
  visible: boolean;
}

interface CreateFolderDialog {
  open: boolean;
  parentId: string | null;
  parentName: string;
}

interface DeleteConfirmDialog {
  open: boolean;
  folder: Folder | null;
}

const FolderManager: React.FC<FolderManagerProps> = ({
  onFolderSelect,
  selectedFolderId = null,
}) => {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [contextMenu, setContextMenu] = useState<ContextMenu>({
    x: 0,
    y: 0,
    folderId: '',
    visible: false,
  });
  const [createDialog, setCreateDialog] = useState<CreateFolderDialog>({
    open: false,
    parentId: null,
    parentName: '',
  });
  const [deleteDialog, setDeleteDialog] = useState<DeleteConfirmDialog>({
    open: false,
    folder: null,
  });
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [draggedFolderId, setDraggedFolderId] = useState<string | null>(null);

  const contextMenuRef = useRef<HTMLDivElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  // Load folders from API
  const loadFolders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/folders');
      if (!response.ok) {
        throw new Error('Failed to load folders');
      }
      
      const data = await response.json();
      setFolders(data.folders || []);
    } catch (err) {
      setError('Failed to load folders');
      console.error('Error loading folders:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load folders on mount
  useEffect(() => {
    loadFolders();
  }, [loadFolders]);

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

  // Focus edit input when editing starts
  useEffect(() => {
    if (editingFolderId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingFolderId]);

  // Create folder
  const handleCreateFolder = async (name: string, parentId: string | null) => {
    try {
      const response = await fetch('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, parentId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create folder');
      }

      await loadFolders();
      setCreateDialog({ open: false, parentId: null, parentName: '' });
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Update folder
  const handleUpdateFolder = async (folderId: string, updates: { name?: string; parentId?: string }) => {
    try {
      const response = await fetch(`/api/folders/${folderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update folder');
      }

      await loadFolders();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Delete folder
  const handleDeleteFolder = async (folderId: string, force: boolean = false) => {
    try {
      const url = force ? `/api/folders/${folderId}?force=true` : `/api/folders/${folderId}`;
      const response = await fetch(url, { method: 'DELETE' });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete folder');
      }

      await loadFolders();
      setDeleteDialog({ open: false, folder: null });
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Filter folders based on search
  const filteredFolders = folders.filter(folder =>
    folder.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Toggle folder expansion
  const toggleFolderExpansion = (folderId: string) => {
    setExpandedFolders(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(folderId)) {
        newExpanded.delete(folderId);
      } else {
        newExpanded.add(folderId);
      }
      return newExpanded;
    });
  };

  // Handle context menu
  const handleContextMenu = (event: React.MouseEvent, folderId: string) => {
    event.preventDefault();
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      folderId,
      visible: true,
    });
  };

  // Handle folder click
  const handleFolderClick = (folder: Folder) => {
    onFolderSelect?.(folder);
  };

  // Handle rename
  const handleRename = (folder: Folder) => {
    setEditingFolderId(folder.id);
    setEditingName(folder.name);
    setContextMenu(prev => ({ ...prev, visible: false }));
  };

  // Handle rename submit
  const handleRenameSubmit = async () => {
    if (editingFolderId && editingName.trim()) {
      await handleUpdateFolder(editingFolderId, { name: editingName.trim() });
    }
    setEditingFolderId(null);
    setEditingName('');
  };

  // Handle rename cancel
  const handleRenameCancel = () => {
    setEditingFolderId(null);
    setEditingName('');
  };

  // Handle drag start
  const handleDragStart = (event: React.DragEvent, folderId: string) => {
    setDraggedFolderId(folderId);
    event.dataTransfer.effectAllowed = 'move';
  };

  // Handle drag over
  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  };

  // Handle drop
  const handleDrop = async (event: React.DragEvent, targetFolderId: string) => {
    event.preventDefault();
    
    if (draggedFolderId && draggedFolderId !== targetFolderId) {
      await handleUpdateFolder(draggedFolderId, { parentId: targetFolderId });
    }
    
    setDraggedFolderId(null);
  };

  // Handle keyboard navigation
  const handleKeyDown = (event: React.KeyboardEvent, folder: Folder) => {
    switch (event.key) {
      case 'ArrowRight':
        if (!expandedFolders.has(folder.id)) {
          toggleFolderExpansion(folder.id);
        }
        break;
      case 'ArrowLeft':
        if (expandedFolders.has(folder.id)) {
          toggleFolderExpansion(folder.id);
        }
        break;
      case 'Enter':
        handleFolderClick(folder);
        break;
    }
  };

  // Render folder tree item
  const renderFolderItem = (folder: Folder, level: number = 0) => {
    const isExpanded = expandedFolders.has(folder.id);
    const isSelected = selectedFolderId === folder.id;
    const isEditing = editingFolderId === folder.id;

    return (
      <div key={folder.id} data-level={level}>
        <div
          className={`flex items-center px-2 py-1 rounded-md cursor-pointer group hover:bg-gray-100 ${
            isSelected ? 'bg-blue-50 border border-blue-200' : ''
          }`}
          style={{ paddingLeft: `${level * 20 + 8}px` }}
          data-testid="folder-item"
          draggable
          onDragStart={(e) => handleDragStart(e, folder.id)}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, folder.id)}
          onContextMenu={(e) => handleContextMenu(e, folder.id)}
          onClick={() => handleFolderClick(folder)}
          onKeyDown={(e) => handleKeyDown(e, folder)}
          tabIndex={0}
          role="treeitem"
          aria-expanded={folder.children.length > 0 ? isExpanded : undefined}
          aria-level={level + 1}
          aria-selected={isSelected}
        >
          {/* Expand/collapse button */}
          {folder.children.length > 0 && (
            <button
              className="w-4 h-4 mr-1 flex items-center justify-center hover:bg-gray-200 rounded"
              onClick={(e) => {
                e.stopPropagation();
                toggleFolderExpansion(folder.id);
              }}
              aria-label={isExpanded ? `Collapse ${folder.name}` : `Expand ${folder.name}`}
            >
              <svg
                className={`w-3 h-3 transform transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}

          {/* Folder icon */}
          <div className="w-4 h-4 mr-2 text-blue-500">
            <svg fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
            </svg>
          </div>

          {/* Folder name */}
          {isEditing ? (
            <input
              ref={editInputRef}
              type="text"
              value={editingName}
              onChange={(e) => setEditingName(e.target.value)}
              onBlur={handleRenameSubmit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleRenameSubmit();
                } else if (e.key === 'Escape') {
                  handleRenameCancel();
                }
              }}
              className="flex-1 px-1 py-0 text-sm border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          ) : (
            <span className="flex-1 text-sm">{folder.name}</span>
          )}

          {/* File count */}
          <span className="text-xs text-gray-500 ml-2">
            {folder.fileCount} file{folder.fileCount !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Children */}
        {isExpanded && folder.children.map(child => renderFolderItem(child, level + 1))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="p-4 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">Loading folders...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center">
        <p className="text-red-600 mb-4">Failed to load folders</p>
        <button
          onClick={loadFolders}
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
          <h2 className="text-lg font-semibold text-gray-900">Folder Manager</h2>
          <button
            onClick={() => setCreateDialog({ open: true, parentId: null, parentName: 'Root' })}
            className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
          >
            Create Folder
          </button>
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Search folders..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Folder tree */}
      <div className="flex-1 overflow-auto p-4" role="tree" aria-label="Folder structure">
        {filteredFolders.length === 0 ? (
          searchQuery ? (
            <p className="text-gray-500 text-center py-8">
              No folders found matching "{searchQuery}"
            </p>
          ) : (
            <p className="text-gray-500 text-center py-8">
              No folders yet. Create your first folder to get started.
            </p>
          )
        ) : (
          filteredFolders
            .filter(folder => folder.parentId === null)
            .map(folder => renderFolderItem(folder))
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
              const folder = folders.find(f => f.id === contextMenu.folderId);
              if (folder) handleRename(folder);
            }}
            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
          >
            Rename
          </button>
          <button
            onClick={() => {
              const folder = folders.find(f => f.id === contextMenu.folderId);
              setDeleteDialog({ open: true, folder: folder || null });
              setContextMenu(prev => ({ ...prev, visible: false }));
            }}
            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 text-red-600"
          >
            Delete
          </button>
          <button
            onClick={() => {
              const folder = folders.find(f => f.id === contextMenu.folderId);
              setCreateDialog({ 
                open: true, 
                parentId: contextMenu.folderId, 
                parentName: folder?.name || '' 
              });
              setContextMenu(prev => ({ ...prev, visible: false }));
            }}
            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
          >
            Create Subfolder
          </button>
        </div>
      )}

      {/* Create Folder Dialog */}
      {createDialog.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4" aria-live="polite">Create New Folder</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const name = formData.get('name') as string;
                if (name.trim()) {
                  handleCreateFolder(name.trim(), createDialog.parentId);
                }
              }}
            >
              <div className="mb-4">
                <label htmlFor="folderName" className="block text-sm font-medium text-gray-700 mb-2">
                  Folder Name
                </label>
                <input
                  id="folderName"
                  name="name"
                  type="text"
                  required
                  autoFocus
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="mb-4">
                <label htmlFor="parentFolder" className="block text-sm font-medium text-gray-700 mb-2">
                  Parent Folder
                </label>
                <select
                  id="parentFolder"
                  value={createDialog.parentId || ''}
                  onChange={(e) => setCreateDialog(prev => ({ ...prev, parentId: e.target.value || null }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Root</option>
                  {folders.map(folder => (
                    <option key={folder.id} value={folder.id}>
                      {folder.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setCreateDialog({ open: false, parentId: null, parentName: '' })}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteDialog.open && deleteDialog.folder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Delete Folder</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to delete "{deleteDialog.folder.name}"?
            </p>
            {deleteDialog.folder.fileCount > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4">
                <p className="text-yellow-800 text-sm">
                  This folder contains {deleteDialog.folder.fileCount} files.
                </p>
                <p className="text-yellow-800 text-sm">
                  All files will be permanently deleted.
                </p>
              </div>
            )}
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setDeleteDialog({ open: false, folder: null })}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteDialog.folder && handleDeleteFolder(deleteDialog.folder.id, true)}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border-t border-red-200">
          <p className="text-red-600 text-sm">{error}</p>
          <button
            onClick={() => setError(null)}
            className="text-red-600 text-sm underline mt-1"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
};

export default FolderManager;