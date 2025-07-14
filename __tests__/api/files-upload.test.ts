import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import handler from '../../pages/api/files/upload';
import { PrismaClient } from '@prisma/client';
import formidable from 'formidable';

// Mock next-auth
vi.mock('next-auth/react', () => ({
  getSession: vi.fn(),
}));

// Mock Prisma client
vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(),
}));

// Mock formidable
vi.mock('formidable', () => ({
  default: vi.fn(),
}));

// Mock fs promises
vi.mock('fs/promises', () => ({
  mkdir: vi.fn(),
  copyFile: vi.fn(),
  unlink: vi.fn(),
  access: vi.fn(),
  stat: vi.fn(),
}));

// Mock file-type
vi.mock('file-type', () => ({
  fileTypeFromFile: vi.fn(),
}));

// Mock path
vi.mock('path', () => ({
  join: vi.fn((...args) => args.join('/')),
  extname: vi.fn((path) => path.split('.').pop()),
  basename: vi.fn((path) => path.split('/').pop()),
}));

const mockGetSession = vi.mocked(getSession);
const mockFormidable = vi.mocked(formidable);
const mockPrisma = {
  file: {
    create: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  folder: {
    findUnique: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
  },
};

// Mock PrismaClient constructor
vi.mocked(PrismaClient).mockImplementation(() => mockPrisma as any);

// Mock data
const mockUser = {
  id: 'user123',
  email: 'test@example.com',
  name: 'Test User',
};

const mockFolder = {
  id: 'folder1',
  name: 'Research Papers',
  path: '/research-papers',
  userId: 'user123',
  parentId: null,
};

const mockUploadedFile = {
  filepath: '/tmp/upload_temp_file',
  originalFilename: 'research-paper.pdf',
  mimetype: 'application/pdf',
  size: 2048000,
  hash: 'abc123',
};

// Helper function to create mock request and response objects
const createMockReqRes = (method: string, body?: any, files?: any) => {
  const req = {
    method,
    body,
    files,
  } as NextApiRequest;

  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    setHeader: vi.fn().mockReturnThis(),
    end: vi.fn(),
  } as unknown as NextApiResponse;

  return { req, res };
};

describe('/api/files/upload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default authenticated session
    mockGetSession.mockResolvedValue({
      user: mockUser,
      expires: '2024-12-31',
    });

    // Default formidable mock
    mockFormidable.mockImplementation(() => ({
      parse: vi.fn().mockResolvedValue([
        { folderId: 'folder1' },
        { file: mockUploadedFile }
      ]),
    }));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/files/upload', () => {
    it('should upload file successfully', async () => {
      const createdFile = {
        id: 'file1',
        name: 'research-paper.pdf',
        originalName: 'research-paper.pdf',
        path: '/uploads/user123/research-paper.pdf',
        size: 2048000,
        type: 'application/pdf',
        folderId: 'folder1',
        userId: 'user123',
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z'),
      };

      mockPrisma.folder.findUnique.mockResolvedValue(mockFolder);
      mockPrisma.file.create.mockResolvedValue(createdFile);

      const { req, res } = createMockReqRes('POST');
      await handler(req, res);

      expect(mockPrisma.file.create).toHaveBeenCalledWith({
        data: {
          name: 'research-paper.pdf',
          originalName: 'research-paper.pdf',
          path: '/uploads/user123/research-paper.pdf',
          size: 2048000,
          type: 'application/pdf',
          folderId: 'folder1',
          userId: 'user123',
        },
      });

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        file: createdFile,
      });
    });

    it('should upload file to root folder when no folderId provided', async () => {
      const createdFile = {
        id: 'file1',
        name: 'research-paper.pdf',
        originalName: 'research-paper.pdf',
        path: '/uploads/user123/research-paper.pdf',
        size: 2048000,
        type: 'application/pdf',
        folderId: null,
        userId: 'user123',
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z'),
      };

      mockFormidable.mockImplementation(() => ({
        parse: vi.fn().mockResolvedValue([
          {},
          { file: mockUploadedFile }
        ]),
      }));

      mockPrisma.file.create.mockResolvedValue(createdFile);

      const { req, res } = createMockReqRes('POST');
      await handler(req, res);

      expect(mockPrisma.file.create).toHaveBeenCalledWith({
        data: {
          name: 'research-paper.pdf',
          originalName: 'research-paper.pdf',
          path: '/uploads/user123/research-paper.pdf',
          size: 2048000,
          type: 'application/pdf',
          folderId: null,
          userId: 'user123',
        },
      });

      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should upload multiple files', async () => {
      const files = [
        { ...mockUploadedFile, originalFilename: 'file1.pdf' },
        { ...mockUploadedFile, originalFilename: 'file2.docx', mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
      ];

      mockFormidable.mockImplementation(() => ({
        parse: vi.fn().mockResolvedValue([
          { folderId: 'folder1' },
          { files: files }
        ]),
      }));

      const createdFiles = [
        {
          id: 'file1',
          name: 'file1.pdf',
          originalName: 'file1.pdf',
          path: '/uploads/user123/file1.pdf',
          size: 2048000,
          type: 'application/pdf',
          folderId: 'folder1',
          userId: 'user123',
          createdAt: new Date('2024-01-01T00:00:00Z'),
          updatedAt: new Date('2024-01-01T00:00:00Z'),
        },
        {
          id: 'file2',
          name: 'file2.docx',
          originalName: 'file2.docx',
          path: '/uploads/user123/file2.docx',
          size: 2048000,
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          folderId: 'folder1',
          userId: 'user123',
          createdAt: new Date('2024-01-01T00:00:00Z'),
          updatedAt: new Date('2024-01-01T00:00:00Z'),
        },
      ];

      mockPrisma.folder.findUnique.mockResolvedValue(mockFolder);
      mockPrisma.file.create
        .mockResolvedValueOnce(createdFiles[0])
        .mockResolvedValueOnce(createdFiles[1]);

      const { req, res } = createMockReqRes('POST');
      await handler(req, res);

      expect(mockPrisma.file.create).toHaveBeenCalledTimes(2);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        files: createdFiles,
      });
    });

    it('should validate file size limits', async () => {
      const largeFile = {
        ...mockUploadedFile,
        size: 100 * 1024 * 1024, // 100MB
      };

      mockFormidable.mockImplementation(() => ({
        parse: vi.fn().mockResolvedValue([
          { folderId: 'folder1' },
          { file: largeFile }
        ]),
      }));

      const { req, res } = createMockReqRes('POST');
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'File size exceeds maximum limit of 50MB',
      });
    });

    it('should validate file types', async () => {
      const invalidFile = {
        ...mockUploadedFile,
        originalFilename: 'malicious.exe',
        mimetype: 'application/x-msdownload',
      };

      mockFormidable.mockImplementation(() => ({
        parse: vi.fn().mockResolvedValue([
          { folderId: 'folder1' },
          { file: invalidFile }
        ]),
      }));

      const { req, res } = createMockReqRes('POST');
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'File type not allowed: application/x-msdownload',
      });
    });

    it('should validate file extension', async () => {
      const invalidFile = {
        ...mockUploadedFile,
        originalFilename: 'document.exe',
        mimetype: 'application/pdf', // Mimetype doesn't match extension
      };

      mockFormidable.mockImplementation(() => ({
        parse: vi.fn().mockResolvedValue([
          { folderId: 'folder1' },
          { file: invalidFile }
        ]),
      }));

      const { req, res } = createMockReqRes('POST');
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'File extension .exe is not allowed',
      });
    });

    it('should scan for malware', async () => {
      const suspiciousFile = {
        ...mockUploadedFile,
        originalFilename: 'suspicious.pdf',
      };

      mockFormidable.mockImplementation(() => ({
        parse: vi.fn().mockResolvedValue([
          { folderId: 'folder1' },
          { file: suspiciousFile }
        ]),
      }));

      // Mock file-type to return malicious content
      const { fileTypeFromFile } = await import('file-type');
      vi.mocked(fileTypeFromFile).mockResolvedValue({
        ext: 'exe',
        mime: 'application/x-msdownload',
      });

      const { req, res } = createMockReqRes('POST');
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'File appears to be malicious or corrupted',
      });
    });

    it('should return 404 when folder not found', async () => {
      mockPrisma.folder.findUnique.mockResolvedValue(null);

      const { req, res } = createMockReqRes('POST');
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Folder not found',
      });
    });

    it('should return 403 when user does not own folder', async () => {
      mockPrisma.folder.findUnique.mockResolvedValue({
        ...mockFolder,
        userId: 'other-user',
      });

      const { req, res } = createMockReqRes('POST');
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Access denied to folder',
      });
    });

    it('should handle duplicate file names', async () => {
      const existingFile = {
        id: 'existing-file',
        name: 'research-paper.pdf',
        userId: 'user123',
        folderId: 'folder1',
      };

      mockPrisma.folder.findUnique.mockResolvedValue(mockFolder);
      mockPrisma.file.findMany.mockResolvedValue([existingFile]);

      const createdFile = {
        id: 'file1',
        name: 'research-paper (1).pdf',
        originalName: 'research-paper.pdf',
        path: '/uploads/user123/research-paper (1).pdf',
        size: 2048000,
        type: 'application/pdf',
        folderId: 'folder1',
        userId: 'user123',
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z'),
      };

      mockPrisma.file.create.mockResolvedValue(createdFile);

      const { req, res } = createMockReqRes('POST');
      await handler(req, res);

      expect(mockPrisma.file.create).toHaveBeenCalledWith({
        data: {
          name: 'research-paper (1).pdf',
          originalName: 'research-paper.pdf',
          path: '/uploads/user123/research-paper (1).pdf',
          size: 2048000,
          type: 'application/pdf',
          folderId: 'folder1',
          userId: 'user123',
        },
      });

      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should create user upload directory if it does not exist', async () => {
      const fs = await import('fs/promises');
      vi.mocked(fs.access).mockRejectedValue(new Error('Directory does not exist'));
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);

      mockPrisma.folder.findUnique.mockResolvedValue(mockFolder);
      mockPrisma.file.create.mockResolvedValue({
        id: 'file1',
        name: 'research-paper.pdf',
        originalName: 'research-paper.pdf',
        path: '/uploads/user123/research-paper.pdf',
        size: 2048000,
        type: 'application/pdf',
        folderId: 'folder1',
        userId: 'user123',
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z'),
      });

      const { req, res } = createMockReqRes('POST');
      await handler(req, res);

      expect(fs.mkdir).toHaveBeenCalledWith('/uploads/user123', { recursive: true });
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should handle form parsing errors', async () => {
      mockFormidable.mockImplementation(() => ({
        parse: vi.fn().mockRejectedValue(new Error('Form parsing failed')),
      }));

      const { req, res } = createMockReqRes('POST');
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Failed to parse form data',
      });
    });

    it('should handle file system errors', async () => {
      const fs = await import('fs/promises');
      vi.mocked(fs.copyFile).mockRejectedValue(new Error('File system error'));

      mockPrisma.folder.findUnique.mockResolvedValue(mockFolder);

      const { req, res } = createMockReqRes('POST');
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Failed to save file',
      });
    });

    it('should clean up temporary files on error', async () => {
      const fs = await import('fs/promises');
      vi.mocked(fs.copyFile).mockRejectedValue(new Error('File system error'));
      vi.mocked(fs.unlink).mockResolvedValue();

      mockPrisma.folder.findUnique.mockResolvedValue(mockFolder);

      const { req, res } = createMockReqRes('POST');
      await handler(req, res);

      expect(fs.unlink).toHaveBeenCalledWith('/tmp/upload_temp_file');
      expect(res.status).toHaveBeenCalledWith(500);
    });

    it('should return 401 when user not authenticated', async () => {
      mockGetSession.mockResolvedValue(null);

      const { req, res } = createMockReqRes('POST');
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Unauthorized',
      });
    });

    it('should return 400 when no files provided', async () => {
      mockFormidable.mockImplementation(() => ({
        parse: vi.fn().mockResolvedValue([{}, {}]),
      }));

      const { req, res } = createMockReqRes('POST');
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'No files uploaded',
      });
    });

    it('should handle storage quota exceeded', async () => {
      // Mock user with storage quota
      mockGetSession.mockResolvedValue({
        user: { ...mockUser, storageQuota: 1024 * 1024 }, // 1MB quota
        expires: '2024-12-31',
      });

      // Mock current usage
      mockPrisma.file.findMany.mockResolvedValue([
        { size: 800 * 1024 }, // 800KB existing
      ]);

      const { req, res } = createMockReqRes('POST');
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(413);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Storage quota exceeded',
        quota: 1024 * 1024,
        used: 800 * 1024,
        available: 224 * 1024,
      });
    });

    it('should generate unique file names for batch uploads', async () => {
      const files = [
        { ...mockUploadedFile, originalFilename: 'document.pdf' },
        { ...mockUploadedFile, originalFilename: 'document.pdf' },
        { ...mockUploadedFile, originalFilename: 'document.pdf' },
      ];

      mockFormidable.mockImplementation(() => ({
        parse: vi.fn().mockResolvedValue([
          { folderId: 'folder1' },
          { files: files }
        ]),
      }));

      const createdFiles = [
        {
          id: 'file1',
          name: 'document.pdf',
          originalName: 'document.pdf',
          path: '/uploads/user123/document.pdf',
          size: 2048000,
          type: 'application/pdf',
          folderId: 'folder1',
          userId: 'user123',
          createdAt: new Date('2024-01-01T00:00:00Z'),
          updatedAt: new Date('2024-01-01T00:00:00Z'),
        },
        {
          id: 'file2',
          name: 'document (1).pdf',
          originalName: 'document.pdf',
          path: '/uploads/user123/document (1).pdf',
          size: 2048000,
          type: 'application/pdf',
          folderId: 'folder1',
          userId: 'user123',
          createdAt: new Date('2024-01-01T00:00:00Z'),
          updatedAt: new Date('2024-01-01T00:00:00Z'),
        },
        {
          id: 'file3',
          name: 'document (2).pdf',
          originalName: 'document.pdf',
          path: '/uploads/user123/document (2).pdf',
          size: 2048000,
          type: 'application/pdf',
          folderId: 'folder1',
          userId: 'user123',
          createdAt: new Date('2024-01-01T00:00:00Z'),
          updatedAt: new Date('2024-01-01T00:00:00Z'),
        },
      ];

      mockPrisma.folder.findUnique.mockResolvedValue(mockFolder);
      mockPrisma.file.create
        .mockResolvedValueOnce(createdFiles[0])
        .mockResolvedValueOnce(createdFiles[1])
        .mockResolvedValueOnce(createdFiles[2]);

      const { req, res } = createMockReqRes('POST');
      await handler(req, res);

      expect(mockPrisma.file.create).toHaveBeenCalledTimes(3);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        files: createdFiles,
      });
    });
  });

  describe('Unsupported methods', () => {
    it('should return 405 for unsupported methods', async () => {
      const { req, res } = createMockReqRes('GET');
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(405);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Method not allowed',
      });
    });
  });

  describe('File validation', () => {
    it('should validate file content matches extension', async () => {
      const { fileTypeFromFile } = await import('file-type');
      vi.mocked(fileTypeFromFile).mockResolvedValue({
        ext: 'pdf',
        mime: 'application/pdf',
      });

      mockPrisma.folder.findUnique.mockResolvedValue(mockFolder);
      mockPrisma.file.create.mockResolvedValue({
        id: 'file1',
        name: 'research-paper.pdf',
        originalName: 'research-paper.pdf',
        path: '/uploads/user123/research-paper.pdf',
        size: 2048000,
        type: 'application/pdf',
        folderId: 'folder1',
        userId: 'user123',
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z'),
      });

      const { req, res } = createMockReqRes('POST');
      await handler(req, res);

      expect(fileTypeFromFile).toHaveBeenCalledWith('/tmp/upload_temp_file');
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should reject files with empty content', async () => {
      const emptyFile = {
        ...mockUploadedFile,
        size: 0,
      };

      mockFormidable.mockImplementation(() => ({
        parse: vi.fn().mockResolvedValue([
          { folderId: 'folder1' },
          { file: emptyFile }
        ]),
      }));

      const { req, res } = createMockReqRes('POST');
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'File is empty',
      });
    });

    it('should reject files without filename', async () => {
      const noNameFile = {
        ...mockUploadedFile,
        originalFilename: '',
      };

      mockFormidable.mockImplementation(() => ({
        parse: vi.fn().mockResolvedValue([
          { folderId: 'folder1' },
          { file: noNameFile }
        ]),
      }));

      const { req, res } = createMockReqRes('POST');
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'File name is required',
      });
    });

    it('should sanitize file names', async () => {
      const unsafeFile = {
        ...mockUploadedFile,
        originalFilename: '../../../etc/passwd',
      };

      mockFormidable.mockImplementation(() => ({
        parse: vi.fn().mockResolvedValue([
          { folderId: 'folder1' },
          { file: unsafeFile }
        ]),
      }));

      mockPrisma.folder.findUnique.mockResolvedValue(mockFolder);
      mockPrisma.file.create.mockResolvedValue({
        id: 'file1',
        name: 'passwd',
        originalName: '../../../etc/passwd',
        path: '/uploads/user123/passwd',
        size: 2048000,
        type: 'application/pdf',
        folderId: 'folder1',
        userId: 'user123',
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z'),
      });

      const { req, res } = createMockReqRes('POST');
      await handler(req, res);

      expect(mockPrisma.file.create).toHaveBeenCalledWith({
        data: {
          name: 'passwd',
          originalName: '../../../etc/passwd',
          path: '/uploads/user123/passwd',
          size: 2048000,
          type: 'application/pdf',
          folderId: 'folder1',
          userId: 'user123',
        },
      });

      expect(res.status).toHaveBeenCalledWith(201);
    });
  });
});