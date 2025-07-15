import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextApiRequest, NextApiResponse } from 'next';
import handler from '../../pages/api/folders';
import prisma from '@/lib/prisma';

// Note: Prisma and next-auth mocks are defined globally in vitest.setup.ts

const { getServerSession } = await import('next-auth/next');
const mockGetServerSession = vi.mocked(getServerSession);
const mockPrisma = vi.mocked(prisma);

// Mock data
const mockUser = {
  id: 'user123',
  email: 'test@example.com',
  name: 'Test User',
};

const mockFolders = [
  {
    id: 'folder1',
    name: 'Research Papers',
    path: '/research-papers',
    userId: 'user123',
    parentId: null,
    children: [
      {
        id: 'folder2',
        name: 'Literature Review',
        path: '/research-papers/literature-review',
        userId: 'user123',
        parentId: 'folder1',
        children: [],
        files: [],
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z'),
      }
    ],
    files: [],
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  },
  {
    id: 'folder3',
    name: 'References',
    path: '/references',
    userId: 'user123',
    parentId: null,
    children: [],
    files: [],
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  },
];

// Helper function to create mock request and response objects
const createMockReqRes = (method: string, body?: any, query?: any) => {
  const req = {
    method,
    body,
    query: query || {},
  } as NextApiRequest;

  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    setHeader: vi.fn().mockReturnThis(),
    end: vi.fn(),
  } as unknown as NextApiResponse;

  return { req, res };
};

describe('/api/folders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default authenticated session
    mockGetServerSession.mockResolvedValue({
      user: mockUser,
      expires: '2024-12-31',
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/folders', () => {
    it('should return folders for authenticated user', async () => {
      mockPrisma.folder.findMany.mockResolvedValue(mockFolders);

      const { req, res } = createMockReqRes('GET');
      await handler(req, res);

      expect(mockPrisma.folder.findMany).toHaveBeenCalledWith({
        where: { userId: 'user123' },
        include: {
          children: {
            include: {
              children: true,
              files: true,
            },
          },
          files: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        folders: mockFolders.map(folder => ({
          ...folder,
          fileCount: folder.files.length + folder.children.reduce((sum, child) => sum + child.files.length, 0),
        })),
      });
    });

    it('should return empty array when no folders exist', async () => {
      // Clear all mocks and set empty result
      vi.clearAllMocks();
      mockPrisma.folder.findMany.mockResolvedValue([]);
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user123', email: 'test@example.com' },
      });

      const { req, res } = createMockReqRes('GET');
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ folders: [] });
    });

    it('should filter folders by parentId when provided', async () => {
      const { req, res } = createMockReqRes('GET', null, { parentId: 'folder1' });
      await handler(req, res);

      expect(mockPrisma.folder.findMany).toHaveBeenCalledWith({
        where: { 
          userId: 'user123',
          parentId: 'folder1'
        },
        include: {
          children: {
            include: {
              children: true,
              files: true,
            },
          },
          files: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return 401 when user not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const { req, res } = createMockReqRes('GET');
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Unauthorized',
        code: 'AUTH_REQUIRED'
      }));
    });

    it('should handle database errors', async () => {
      mockPrisma.folder.findMany.mockRejectedValue(new Error('Database error'));

      const { req, res } = createMockReqRes('GET');
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch folders' });
    });
  });

  describe('POST /api/folders', () => {
    it('should create new folder for authenticated user', async () => {
      const newFolder = {
        id: 'folder4',
        name: 'New Folder',
        path: '/new-folder',
        userId: 'user123',
        parentId: null,
        children: [],
        files: [],
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z'),
      };

      mockPrisma.folder.create.mockResolvedValue(newFolder);

      const { req, res } = createMockReqRes('POST', {
        name: 'New Folder',
        parentId: null,
      });
      
      await handler(req, res);

      expect(mockPrisma.folder.create).toHaveBeenCalledWith({
        data: {
          name: 'New Folder',
          path: '/new-folder',
          userId: 'user123',
          parentId: null,
        },
        include: {
          children: {
            include: {
              children: true,
              files: true,
            },
          },
          files: true,
        },
      });

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        ...newFolder,
        fileCount: 0,
      });
    });

    it('should create subfolder with correct path', async () => {
      const parentFolder = {
        id: 'folder1',
        name: 'Research Papers',
        path: '/research-papers',
        userId: 'user123',
        parentId: null,
      };

      const newSubfolder = {
        id: 'folder4',
        name: 'Subfolder',
        path: '/research-papers/subfolder',
        userId: 'user123',
        parentId: 'folder1',
        children: [],
        files: [],
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z'),
      };

      mockPrisma.folder.findUnique.mockResolvedValue(parentFolder);
      mockPrisma.folder.create.mockResolvedValue(newSubfolder);

      const { req, res } = createMockReqRes('POST', {
        name: 'Subfolder',
        parentId: 'folder1',
      });
      
      await handler(req, res);

      expect(mockPrisma.folder.findUnique).toHaveBeenCalledWith({
        where: { id: 'folder1' },
        select: { path: true },
      });

      expect(mockPrisma.folder.create).toHaveBeenCalledWith({
        data: {
          name: 'Subfolder',
          path: '/research-papers/subfolder',
          userId: 'user123',
          parentId: 'folder1',
        },
        include: {
          children: {
            include: {
              children: true,
              files: true,
            },
          },
          files: true,
        },
      });

      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should validate required fields', async () => {
      const { req, res } = createMockReqRes('POST', {
        parentId: null,
      });
      
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Folder name is required' });
    });

    it('should validate folder name length', async () => {
      const { req, res } = createMockReqRes('POST', {
        name: 'a'.repeat(256),
        parentId: null,
      });
      
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Folder name must be less than 255 characters' });
    });

    it('should validate folder name contains no invalid characters', async () => {
      const { req, res } = createMockReqRes('POST', {
        name: 'Invalid/Name',
        parentId: null,
      });
      
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Folder name contains invalid characters' });
    });

    it('should return 404 when parent folder not found', async () => {
      mockPrisma.folder.findUnique.mockResolvedValue(null);

      const { req, res } = createMockReqRes('POST', {
        name: 'Subfolder',
        parentId: 'nonexistent',
      });
      
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Parent folder not found' });
    });

    it('should handle duplicate folder names', async () => {
      mockPrisma.folder.create.mockRejectedValue({
        code: 'P2002',
        meta: { target: ['name', 'userId', 'parentId'] },
      });

      const { req, res } = createMockReqRes('POST', {
        name: 'Existing Folder',
        parentId: null,
      });
      
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({ error: 'Folder with this name already exists' });
    });

    it('should return 401 when user not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const { req, res } = createMockReqRes('POST', {
        name: 'New Folder',
        parentId: null,
      });
      
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Unauthorized',
        code: 'AUTH_REQUIRED'
      }));
    });
  });

  describe('PUT /api/folders/[id]', () => {
    it('should update folder name', async () => {
      const updatedFolder = {
        id: 'folder1',
        name: 'Updated Research Papers',
        path: '/updated-research-papers',
        userId: 'user123',
        parentId: null,
        children: [],
        files: [],
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z'),
      };

      mockPrisma.folder.findUnique.mockResolvedValue(mockFolders[0]);
      mockPrisma.folder.update.mockResolvedValue(updatedFolder);

      const { req, res } = createMockReqRes('PUT', {
        name: 'Updated Research Papers',
      }, { id: 'folder1' });
      
      await handler(req, res);

      expect(mockPrisma.folder.findUnique).toHaveBeenCalledWith({
        where: { id: 'folder1' },
        select: { userId: true },
      });

      expect(mockPrisma.folder.update).toHaveBeenCalledWith({
        where: { id: 'folder1' },
        data: {
          name: 'Updated Research Papers',
          path: '/updated-research-papers',
        },
        include: {
          children: {
            include: {
              children: true,
              files: true,
            },
          },
          files: true,
        },
      });

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        ...updatedFolder,
        fileCount: 0,
      });
    });

    it('should move folder to new parent', async () => {
      const parentFolder = {
        id: 'folder1',
        path: '/research-papers',
      };

      const movedFolder = {
        id: 'folder3',
        name: 'References',
        path: '/research-papers/references',
        userId: 'user123',
        parentId: 'folder1',
        children: [],
        files: [],
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z'),
      };

      mockPrisma.folder.findUnique
        .mockResolvedValueOnce(mockFolders[1]) // folder being moved
        .mockResolvedValueOnce(parentFolder); // parent folder
      
      mockPrisma.folder.update.mockResolvedValue(movedFolder);

      const { req, res } = createMockReqRes('PUT', {
        parentId: 'folder1',
      }, { id: 'folder3' });
      
      await handler(req, res);

      expect(mockPrisma.folder.update).toHaveBeenCalledWith({
        where: { id: 'folder3' },
        data: {
          parentId: 'folder1',
          path: '/research-papers/references',
        },
        include: {
          children: {
            include: {
              children: true,
              files: true,
            },
          },
          files: true,
        },
      });

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 404 when folder not found', async () => {
      mockPrisma.folder.findUnique.mockResolvedValue(null);

      const { req, res } = createMockReqRes('PUT', {
        name: 'Updated Name',
      }, { id: 'nonexistent' });
      
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Folder not found',
        code: 'NOT_FOUND'
      }));
    });

    it('should return 403 when user does not own folder', async () => {
      mockPrisma.folder.findUnique.mockResolvedValue({
        ...mockFolders[0],
        userId: 'other-user',
      });

      const { req, res } = createMockReqRes('PUT', {
        name: 'Updated Name',
      }, { id: 'folder1' });
      
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Access denied',
        code: 'FORBIDDEN'
      }));
    });

    it('should validate folder name when updating', async () => {
      mockPrisma.folder.findUnique.mockResolvedValue(mockFolders[0]);

      const { req, res } = createMockReqRes('PUT', {
        name: 'Invalid/Name',
      }, { id: 'folder1' });
      
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Folder name contains invalid characters' });
    });

    it('should prevent moving folder to itself', async () => {
      mockPrisma.folder.findUnique.mockResolvedValue(mockFolders[0]);

      const { req, res } = createMockReqRes('PUT', {
        parentId: 'folder1',
      }, { id: 'folder1' });
      
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Cannot move folder to itself' });
    });

    it('should prevent circular folder structure', async () => {
      // Mock folder structure where folder1 is child of folder2
      mockPrisma.folder.findUnique
        .mockResolvedValueOnce({ ...mockFolders[1], parentId: 'folder1' }) // folder being moved
        .mockResolvedValueOnce(mockFolders[0]); // destination parent

      const { req, res } = createMockReqRes('PUT', {
        parentId: 'folder2',
      }, { id: 'folder1' });
      
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Cannot create circular folder structure' });
    });

    it('should return 401 when user not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const { req, res } = createMockReqRes('PUT', {
        name: 'Updated Name',
      }, { id: 'folder1' });
      
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Unauthorized',
        code: 'AUTH_REQUIRED'
      }));
    });
  });

  describe('DELETE /api/folders/[id]', () => {
    it('should delete empty folder', async () => {
      const emptyFolder = {
        ...mockFolders[1],
        children: [],
        files: [],
      };

      mockPrisma.folder.findUnique.mockResolvedValue(emptyFolder);
      mockPrisma.folder.delete.mockResolvedValue(emptyFolder);

      const { req, res } = createMockReqRes('DELETE', null, { id: 'folder3' });
      
      await handler(req, res);

      expect(mockPrisma.folder.findUnique).toHaveBeenCalledWith({
        where: { id: 'folder3' },
        include: {
          children: true,
          files: true,
        },
      });

      expect(mockPrisma.folder.delete).toHaveBeenCalledWith({
        where: { id: 'folder3' },
      });

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true });
    });

    it('should delete folder with files when force option provided', async () => {
      const folderWithFiles = {
        ...mockFolders[0],
        files: [{ id: 'file1' }],
      };

      mockPrisma.folder.findUnique.mockResolvedValue(folderWithFiles);
      mockPrisma.folder.delete.mockResolvedValue(folderWithFiles);

      const { req, res } = createMockReqRes('DELETE', null, { id: 'folder1', force: 'true' });
      
      await handler(req, res);

      expect(mockPrisma.folder.delete).toHaveBeenCalledWith({
        where: { id: 'folder1' },
      });

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true });
    });

    it('should return 400 when trying to delete folder with files without force', async () => {
      const folderWithFiles = {
        ...mockFolders[0],
        files: [{ id: 'file1' }],
      };

      mockPrisma.folder.findUnique.mockResolvedValue(folderWithFiles);

      const { req, res } = createMockReqRes('DELETE', null, { id: 'folder1' });
      
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR'
      }));
    });

    it('should return 400 when trying to delete folder with subfolders without force', async () => {
      const folderWithSubfolders = {
        ...mockFolders[0],
        files: [],
        children: [{ id: 'subfolder1' }],
      };

      mockPrisma.folder.findUnique.mockResolvedValue(folderWithSubfolders);

      const { req, res } = createMockReqRes('DELETE', null, { id: 'folder1' });
      
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR'
      }));
    });

    it('should return 404 when folder not found', async () => {
      mockPrisma.folder.findUnique.mockResolvedValue(null);

      const { req, res } = createMockReqRes('DELETE', null, { id: 'nonexistent' });
      
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Folder not found',
        code: 'NOT_FOUND'
      }));
    });

    it('should return 403 when user does not own folder', async () => {
      mockPrisma.folder.findUnique.mockResolvedValue({
        ...mockFolders[0],
        userId: 'other-user',
      });

      const { req, res } = createMockReqRes('DELETE', null, { id: 'folder1' });
      
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Access denied',
        code: 'FORBIDDEN'
      }));
    });

    it('should return 401 when user not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const { req, res } = createMockReqRes('DELETE', null, { id: 'folder1' });
      
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Unauthorized',
        code: 'AUTH_REQUIRED'
      }));
    });
  });

  describe('Unsupported methods', () => {
    it('should return 405 for unsupported methods', async () => {
      const { req, res } = createMockReqRes('PATCH');
      
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(405);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Method not allowed',
        code: 'METHOD_NOT_ALLOWED'
      }));
    });
  });

  describe('Input sanitization', () => {
    it('should sanitize folder names', async () => {
      const newFolder = {
        id: 'folder4',
        name: 'Test Folder',
        path: '/test-folder',
        userId: 'user123',
        parentId: null,
        children: [],
        files: [],
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z'),
      };

      mockPrisma.folder.create.mockResolvedValue(newFolder);

      const { req, res } = createMockReqRes('POST', {
        name: '  Test Folder  ',
        parentId: null,
      });
      
      await handler(req, res);

      expect(mockPrisma.folder.create).toHaveBeenCalledWith({
        data: {
          name: 'Test Folder',
          path: '/test-folder',
          userId: 'user123',
          parentId: null,
        },
        include: {
          children: {
            include: {
              children: true,
              files: true,
            },
          },
          files: true,
        },
      });

      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should generate safe paths from folder names', async () => {
      const newFolder = {
        id: 'folder4',
        name: 'Test Folder & More!',
        path: '/test-folder-more',
        userId: 'user123',
        parentId: null,
        children: [],
        files: [],
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z'),
      };

      mockPrisma.folder.create.mockResolvedValue(newFolder);

      const { req, res } = createMockReqRes('POST', {
        name: 'Test Folder & More!',
        parentId: null,
      });
      
      await handler(req, res);

      expect(mockPrisma.folder.create).toHaveBeenCalledWith({
        data: {
          name: 'Test Folder & More!',
          path: '/test-folder-more',
          userId: 'user123',
          parentId: null,
        },
        include: {
          children: {
            include: {
              children: true,
              files: true,
            },
          },
          files: true,
        },
      });

      expect(res.status).toHaveBeenCalledWith(201);
    });
  });
});