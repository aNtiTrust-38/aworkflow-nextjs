import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { testApiHandler } from 'next-test-api-route-handler';
import uploadHandler from '../../pages/api/files/upload';
import foldersHandler from '../../pages/api/folders';
import { promises as fs } from 'fs';
import formidable from 'formidable';
import { fileTypeFromBuffer } from 'file-type';
import prisma from '@/lib/prisma';
import path from 'path';

// Mock dependencies
vi.mock('formidable', () => ({
  default: vi.fn(),
}));

vi.mock('fs', () => ({
  promises: {
    readFile: vi.fn(),
    copyFile: vi.fn(),
    unlink: vi.fn(),
    access: vi.fn(),
    mkdir: vi.fn(),
    stat: vi.fn(),
    readdir: vi.fn(),
  },
}));

vi.mock('file-type', () => ({
  fileTypeFromBuffer: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  default: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    folder: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    file: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

const mockFormidable = vi.mocked(formidable);
const mockFs = vi.mocked(fs);
const mockFileTypeFromBuffer = vi.mocked(fileTypeFromBuffer);
const mockPrisma = vi.mocked(prisma);

describe('File Upload Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default successful mocks
    mockFs.access.mockResolvedValue(undefined);
    mockFs.copyFile.mockResolvedValue(undefined);
    mockFs.unlink.mockResolvedValue(undefined);
    mockFs.mkdir.mockResolvedValue(undefined);
    mockFs.readFile.mockResolvedValue(Buffer.from('test content'));
    mockFs.stat.mockResolvedValue({ size: 1024 } as any);
    mockFs.readdir.mockResolvedValue([]);
    mockFileTypeFromBuffer.mockResolvedValue({ mime: 'application/pdf', ext: 'pdf' });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('File Upload with Folder Creation', () => {
    it('should create folder and upload file in single workflow', async () => {
      // Mock user
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
      };

      // Step 1: Create folder
      mockPrisma.folder.create.mockResolvedValue({
        id: 'folder-123',
        name: 'Research Papers',
        path: '/research-papers',
        userId: 'user-123',
        parentId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Step 2: Upload file to folder
      const testFile = {
        filepath: '/tmp/test-file',
        originalFilename: 'research.pdf',
        mimetype: 'application/pdf',
        size: 1024 * 1024,
        hash: 'test-hash',
      };

      mockFormidable.mockImplementation(() => ({
        parse: vi.fn().mockResolvedValue([
          { folderId: 'folder-123' },
          { file: testFile }
        ])
      }));

      mockPrisma.folder.findUnique.mockResolvedValue({
        id: 'folder-123',
        name: 'Research Papers',
        path: '/research-papers',
        userId: 'user-123',
        parentId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockPrisma.file.create.mockResolvedValue({
        id: 'file-123',
        name: 'research.pdf',
        originalName: 'research.pdf',
        path: '/uploads/user-123/research.pdf',
        size: 1024 * 1024,
        type: 'application/pdf',
        userId: 'user-123',
        folderId: 'folder-123',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Test folder creation first
      await testApiHandler({
        handler: foldersHandler,
        test: async ({ fetch }) => {
          const response = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: 'Research Papers',
              path: '/research-papers',
            }),
          });

          expect(response.status).toBe(201);
          const folderData = await response.json();
          expect(folderData.folder.name).toBe('Research Papers');
        },
      });

      // Test file upload to folder
      await testApiHandler({
        handler: uploadHandler,
        test: async ({ fetch }) => {
          const formData = new FormData();
          formData.append('file', new Blob(['test content'], { type: 'application/pdf' }), 'research.pdf');
          formData.append('folderId', 'folder-123');
          
          const response = await fetch({
            method: 'POST',
            body: formData,
          });

          expect(response.status).toBe(201);
          const uploadData = await response.json();
          expect(uploadData.file.folderId).toBe('folder-123');
          expect(uploadData.file.name).toBe('research.pdf');
        },
      });
    });

    it('should handle nested folder structure with file upload', async () => {
      // Create parent folder
      mockPrisma.folder.create
        .mockResolvedValueOnce({
          id: 'parent-folder',
          name: 'Documents',
          path: '/documents',
          userId: 'user-123',
          parentId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .mockResolvedValueOnce({
          id: 'child-folder',
          name: 'Research',
          path: '/documents/research',
          userId: 'user-123',
          parentId: 'parent-folder',
          createdAt: new Date(),
          updatedAt: new Date(),
        });

      // Upload file to child folder
      const testFile = {
        filepath: '/tmp/nested-file',
        originalFilename: 'nested-research.pdf',
        mimetype: 'application/pdf',
        size: 1024,
        hash: 'nested-hash',
      };

      mockFormidable.mockImplementation(() => ({
        parse: vi.fn().mockResolvedValue([
          { folderId: 'child-folder' },
          { file: testFile }
        ])
      }));

      mockPrisma.folder.findUnique.mockResolvedValue({
        id: 'child-folder',
        name: 'Research',
        path: '/documents/research',
        userId: 'user-123',
        parentId: 'parent-folder',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockPrisma.file.create.mockResolvedValue({
        id: 'nested-file',
        name: 'nested-research.pdf',
        originalName: 'nested-research.pdf',
        path: '/uploads/user-123/nested-research.pdf',
        size: 1024,
        type: 'application/pdf',
        userId: 'user-123',
        folderId: 'child-folder',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await testApiHandler({
        handler: uploadHandler,
        test: async ({ fetch }) => {
          const formData = new FormData();
          formData.append('file', new Blob(['nested content'], { type: 'application/pdf' }), 'nested-research.pdf');
          formData.append('folderId', 'child-folder');
          
          const response = await fetch({
            method: 'POST',
            body: formData,
          });

          expect(response.status).toBe(201);
          const data = await response.json();
          expect(data.file.folderId).toBe('child-folder');
          expect(data.file.name).toBe('nested-research.pdf');
        },
      });
    });
  });

  describe('File Organization and Management', () => {
    it('should organize files by type automatically', async () => {
      const files = [
        {
          filepath: '/tmp/doc1',
          originalFilename: 'document.pdf',
          mimetype: 'application/pdf',
          size: 1024,
          hash: 'doc-hash',
        },
        {
          filepath: '/tmp/img1',
          originalFilename: 'image.jpg',
          mimetype: 'image/jpeg',
          size: 2048,
          hash: 'img-hash',
        },
        {
          filepath: '/tmp/text1',
          originalFilename: 'notes.txt',
          mimetype: 'text/plain',
          size: 512,
          hash: 'text-hash',
        },
      ];

      mockFormidable.mockImplementation(() => ({
        parse: vi.fn().mockResolvedValue([
          {},
          { files }
        ])
      }));

      mockPrisma.file.create
        .mockResolvedValueOnce({
          id: 'file-pdf',
          name: 'document.pdf',
          originalName: 'document.pdf',
          path: '/uploads/user-123/document.pdf',
          size: 1024,
          type: 'application/pdf',
          userId: 'user-123',
          folderId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .mockResolvedValueOnce({
          id: 'file-jpg',
          name: 'image.jpg',
          originalName: 'image.jpg',
          path: '/uploads/user-123/image.jpg',
          size: 2048,
          type: 'image/jpeg',
          userId: 'user-123',
          folderId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .mockResolvedValueOnce({
          id: 'file-txt',
          name: 'notes.txt',
          originalName: 'notes.txt',
          path: '/uploads/user-123/notes.txt',
          size: 512,
          type: 'text/plain',
          userId: 'user-123',
          folderId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

      await testApiHandler({
        handler: uploadHandler,
        test: async ({ fetch }) => {
          const formData = new FormData();
          formData.append('files', new Blob(['pdf content'], { type: 'application/pdf' }), 'document.pdf');
          formData.append('files', new Blob(['jpg content'], { type: 'image/jpeg' }), 'image.jpg');
          formData.append('files', new Blob(['text content'], { type: 'text/plain' }), 'notes.txt');
          
          const response = await fetch({
            method: 'POST',
            body: formData,
          });

          expect(response.status).toBe(201);
          const data = await response.json();
          expect(data.files).toHaveLength(3);
          
          // Verify different file types are handled
          const pdfFile = data.files.find((f: any) => f.type === 'application/pdf');
          const jpgFile = data.files.find((f: any) => f.type === 'image/jpeg');
          const txtFile = data.files.find((f: any) => f.type === 'text/plain');
          
          expect(pdfFile.name).toBe('document.pdf');
          expect(jpgFile.name).toBe('image.jpg');
          expect(txtFile.name).toBe('notes.txt');
        },
      });
    });

    it('should handle file name conflicts across different folders', async () => {
      const testFile = {
        filepath: '/tmp/conflict-file',
        originalFilename: 'document.pdf',
        mimetype: 'application/pdf',
        size: 1024,
        hash: 'conflict-hash',
      };

      mockFormidable.mockImplementation(() => ({
        parse: vi.fn().mockResolvedValue([
          { folderId: 'folder-a' },
          { file: testFile }
        ])
      }));

      // Mock existing file in different folder
      mockPrisma.file.findMany.mockResolvedValue([
        {
          id: 'existing-file',
          name: 'document.pdf',
          folderId: 'folder-b', // Different folder
          userId: 'user-123',
        }
      ]);

      mockPrisma.folder.findUnique.mockResolvedValue({
        id: 'folder-a',
        name: 'Folder A',
        userId: 'user-123',
        parentId: null,
        path: '/folder-a',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockPrisma.file.create.mockResolvedValue({
        id: 'new-file',
        name: 'document.pdf',
        originalName: 'document.pdf',
        path: '/uploads/user-123/document.pdf',
        size: 1024,
        type: 'application/pdf',
        userId: 'user-123',
        folderId: 'folder-a',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await testApiHandler({
        handler: uploadHandler,
        test: async ({ fetch }) => {
          const formData = new FormData();
          formData.append('file', new Blob(['test content'], { type: 'application/pdf' }), 'document.pdf');
          formData.append('folderId', 'folder-a');
          
          const response = await fetch({
            method: 'POST',
            body: formData,
          });

          expect(response.status).toBe(201);
          const data = await response.json();
          
          // Should allow same filename in different folders
          expect(data.file.name).toBe('document.pdf');
          expect(data.file.folderId).toBe('folder-a');
        },
      });
    });
  });

  describe('File System Integration', () => {
    it('should create directory structure and store files', async () => {
      const testFile = {
        filepath: '/tmp/fs-test',
        originalFilename: 'filesystem-test.pdf',
        mimetype: 'application/pdf',
        size: 1024,
        hash: 'fs-hash',
      };

      mockFormidable.mockImplementation(() => ({
        parse: vi.fn().mockResolvedValue([
          {},
          { file: testFile }
        ])
      }));

      // Mock directory doesn't exist initially
      mockFs.access.mockRejectedValueOnce(new Error('Directory does not exist'));

      mockPrisma.file.create.mockResolvedValue({
        id: 'fs-file',
        name: 'filesystem-test.pdf',
        originalName: 'filesystem-test.pdf',
        path: '/uploads/user-123/filesystem-test.pdf',
        size: 1024,
        type: 'application/pdf',
        userId: 'user-123',
        folderId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await testApiHandler({
        handler: uploadHandler,
        test: async ({ fetch }) => {
          const formData = new FormData();
          formData.append('file', new Blob(['filesystem test'], { type: 'application/pdf' }), 'filesystem-test.pdf');
          
          const response = await fetch({
            method: 'POST',
            body: formData,
          });

          expect(response.status).toBe(201);
          
          // Verify directory creation
          expect(mockFs.mkdir).toHaveBeenCalledWith(
            expect.stringContaining('/uploads/anonymous-user'),
            { recursive: true }
          );
          
          // Verify file copy
          expect(mockFs.copyFile).toHaveBeenCalledWith(
            '/tmp/fs-test',
            expect.stringContaining('/uploads/anonymous-user/filesystem-test.pdf')
          );
          
          // Verify cleanup
          expect(mockFs.unlink).toHaveBeenCalledWith('/tmp/fs-test');
        },
      });
    });

    it('should handle file system permission errors', async () => {
      const testFile = {
        filepath: '/tmp/permission-test',
        originalFilename: 'permission-test.pdf',
        mimetype: 'application/pdf',
        size: 1024,
        hash: 'permission-hash',
      };

      mockFormidable.mockImplementation(() => ({
        parse: vi.fn().mockResolvedValue([
          {},
          { file: testFile }
        ])
      }));

      // Mock permission error
      mockFs.mkdir.mockRejectedValue(new Error('EACCES: permission denied'));

      await testApiHandler({
        handler: uploadHandler,
        test: async ({ fetch }) => {
          const formData = new FormData();
          formData.append('file', new Blob(['permission test'], { type: 'application/pdf' }), 'permission-test.pdf');
          
          const response = await fetch({
            method: 'POST',
            body: formData,
          });

          expect(response.status).toBe(400);
          const data = await response.json();
          expect(data.errors).toContainEqual({
            filename: 'permission-test.pdf',
            error: 'Failed to process file'
          });
        },
      });
    });

    it('should handle disk space exhaustion', async () => {
      const testFile = {
        filepath: '/tmp/disk-space-test',
        originalFilename: 'disk-space-test.pdf',
        mimetype: 'application/pdf',
        size: 1024,
        hash: 'disk-space-hash',
      };

      mockFormidable.mockImplementation(() => ({
        parse: vi.fn().mockResolvedValue([
          {},
          { file: testFile }
        ])
      }));

      // Mock disk space error
      mockFs.copyFile.mockRejectedValue(new Error('ENOSPC: no space left on device'));

      await testApiHandler({
        handler: uploadHandler,
        test: async ({ fetch }) => {
          const formData = new FormData();
          formData.append('file', new Blob(['disk space test'], { type: 'application/pdf' }), 'disk-space-test.pdf');
          
          const response = await fetch({
            method: 'POST',
            body: formData,
          });

          expect(response.status).toBe(400);
          const data = await response.json();
          expect(data.errors).toContainEqual({
            filename: 'disk-space-test.pdf',
            error: 'Failed to process file'
          });
        },
      });
    });
  });

  describe('Database Integration', () => {
    it('should handle database connection failures gracefully', async () => {
      const testFile = {
        filepath: '/tmp/db-test',
        originalFilename: 'db-test.pdf',
        mimetype: 'application/pdf',
        size: 1024,
        hash: 'db-hash',
      };

      mockFormidable.mockImplementation(() => ({
        parse: vi.fn().mockResolvedValue([
          {},
          { file: testFile }
        ])
      }));

      // Mock database connection failure
      mockPrisma.file.create.mockRejectedValue(new Error('connect ECONNREFUSED'));

      await testApiHandler({
        handler: uploadHandler,
        test: async ({ fetch }) => {
          const formData = new FormData();
          formData.append('file', new Blob(['db test'], { type: 'application/pdf' }), 'db-test.pdf');
          
          const response = await fetch({
            method: 'POST',
            body: formData,
          });

          expect(response.status).toBe(201);
          const data = await response.json();
          
          // Should create mock file record when database fails
          expect(data.file.id).toMatch(/^mock-/);
          expect(data.file.name).toBe('db-test.pdf');
        },
      });
    });

    it('should handle database constraint violations', async () => {
      const testFile = {
        filepath: '/tmp/constraint-test',
        originalFilename: 'constraint-test.pdf',
        mimetype: 'application/pdf',
        size: 1024,
        hash: 'constraint-hash',
      };

      mockFormidable.mockImplementation(() => ({
        parse: vi.fn().mockResolvedValue([
          {},
          { file: testFile }
        ])
      }));

      // Mock unique constraint violation
      mockPrisma.file.create.mockRejectedValue(new Error('Unique constraint failed'));

      await testApiHandler({
        handler: uploadHandler,
        test: async ({ fetch }) => {
          const formData = new FormData();
          formData.append('file', new Blob(['constraint test'], { type: 'application/pdf' }), 'constraint-test.pdf');
          
          const response = await fetch({
            method: 'POST',
            body: formData,
          });

          expect(response.status).toBe(201);
          const data = await response.json();
          
          // Should create mock file record when constraint fails
          expect(data.file.id).toMatch(/^mock-/);
          expect(data.file.name).toBe('constraint-test.pdf');
        },
      });
    });

    it('should maintain referential integrity with folders', async () => {
      const testFile = {
        filepath: '/tmp/integrity-test',
        originalFilename: 'integrity-test.pdf',
        mimetype: 'application/pdf',
        size: 1024,
        hash: 'integrity-hash',
      };

      mockFormidable.mockImplementation(() => ({
        parse: vi.fn().mockResolvedValue([
          { folderId: 'valid-folder' },
          { file: testFile }
        ])
      }));

      // Mock valid folder
      mockPrisma.folder.findUnique.mockResolvedValue({
        id: 'valid-folder',
        name: 'Valid Folder',
        userId: 'user-123',
        parentId: null,
        path: '/valid-folder',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockPrisma.file.create.mockResolvedValue({
        id: 'integrity-file',
        name: 'integrity-test.pdf',
        originalName: 'integrity-test.pdf',
        path: '/uploads/user-123/integrity-test.pdf',
        size: 1024,
        type: 'application/pdf',
        userId: 'user-123',
        folderId: 'valid-folder',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await testApiHandler({
        handler: uploadHandler,
        test: async ({ fetch }) => {
          const formData = new FormData();
          formData.append('file', new Blob(['integrity test'], { type: 'application/pdf' }), 'integrity-test.pdf');
          formData.append('folderId', 'valid-folder');
          
          const response = await fetch({
            method: 'POST',
            body: formData,
          });

          expect(response.status).toBe(201);
          const data = await response.json();
          
          // Should maintain folder reference
          expect(data.file.folderId).toBe('valid-folder');
          
          // Should have validated folder exists
          expect(mockPrisma.folder.findUnique).toHaveBeenCalledWith({
            where: { id: 'valid-folder' },
            select: { userId: true },
          });
        },
      });
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large file uploads efficiently', async () => {
      const largeFile = {
        filepath: '/tmp/large-file',
        originalFilename: 'large-file.pdf',
        mimetype: 'application/pdf',
        size: 45 * 1024 * 1024, // 45MB
        hash: 'large-hash',
      };

      mockFormidable.mockImplementation(() => ({
        parse: vi.fn().mockResolvedValue([
          {},
          { file: largeFile }
        ])
      }));

      mockPrisma.file.create.mockResolvedValue({
        id: 'large-file-id',
        name: 'large-file.pdf',
        originalName: 'large-file.pdf',
        path: '/uploads/user-123/large-file.pdf',
        size: 45 * 1024 * 1024,
        type: 'application/pdf',
        userId: 'user-123',
        folderId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await testApiHandler({
        handler: uploadHandler,
        test: async ({ fetch }) => {
          const formData = new FormData();
          formData.append('file', new Blob(['large file content'], { type: 'application/pdf' }), 'large-file.pdf');
          
          const response = await fetch({
            method: 'POST',
            body: formData,
          });

          expect(response.status).toBe(201);
          const data = await response.json();
          
          // Should include performance headers for large files
          expect(response.headers.get('x-processing-mode')).toBe('streaming');
          expect(response.headers.get('x-chunk-size')).toBe('1MB');
          expect(data.file.size).toBe(45 * 1024 * 1024);
        },
      });
    });

    it('should handle concurrent uploads efficiently', async () => {
      const concurrentFiles = Array.from({ length: 5 }, (_, i) => ({
        filepath: `/tmp/concurrent-${i}`,
        originalFilename: `concurrent-${i}.pdf`,
        mimetype: 'application/pdf',
        size: 1024 * (i + 1),
        hash: `concurrent-hash-${i}`,
      }));

      mockFormidable.mockImplementation(() => ({
        parse: vi.fn().mockResolvedValue([
          {},
          { files: concurrentFiles }
        ])
      }));

      concurrentFiles.forEach((file, i) => {
        mockPrisma.file.create.mockResolvedValueOnce({
          id: `concurrent-file-${i}`,
          name: `concurrent-${i}.pdf`,
          originalName: `concurrent-${i}.pdf`,
          path: `/uploads/user-123/concurrent-${i}.pdf`,
          size: 1024 * (i + 1),
          type: 'application/pdf',
          userId: 'user-123',
          folderId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      });

      await testApiHandler({
        handler: uploadHandler,
        test: async ({ fetch }) => {
          const formData = new FormData();
          concurrentFiles.forEach((file, i) => {
            formData.append('files', new Blob([`concurrent content ${i}`], { type: 'application/pdf' }), `concurrent-${i}.pdf`);
          });
          
          const response = await fetch({
            method: 'POST',
            body: formData,
          });

          expect(response.status).toBe(201);
          const data = await response.json();
          
          // Should process all files
          expect(data.files).toHaveLength(5);
          data.files.forEach((file: any, i: number) => {
            expect(file.name).toBe(`concurrent-${i}.pdf`);
          });
        },
      });
    });

    it('should handle memory-intensive operations efficiently', async () => {
      const memoryFile = {
        filepath: '/tmp/memory-test',
        originalFilename: 'memory-test.pdf',
        mimetype: 'application/pdf',
        size: 1024,
        hash: 'memory-hash',
      };

      mockFormidable.mockImplementation(() => ({
        parse: vi.fn().mockResolvedValue([
          {},
          { file: memoryFile }
        ])
      }));

      // Mock large buffer for file type checking
      const largeBuffer = Buffer.alloc(10 * 1024 * 1024); // 10MB
      mockFs.readFile.mockResolvedValue(largeBuffer);

      mockPrisma.file.create.mockResolvedValue({
        id: 'memory-file',
        name: 'memory-test.pdf',
        originalName: 'memory-test.pdf',
        path: '/uploads/user-123/memory-test.pdf',
        size: 1024,
        type: 'application/pdf',
        userId: 'user-123',
        folderId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await testApiHandler({
        handler: uploadHandler,
        test: async ({ fetch }) => {
          const formData = new FormData();
          formData.append('file', new Blob(['memory test'], { type: 'application/pdf' }), 'memory-test.pdf');
          
          const response = await fetch({
            method: 'POST',
            body: formData,
          });

          expect(response.status).toBe(201);
          const data = await response.json();
          
          // Should handle large buffer without memory issues
          expect(data.file.name).toBe('memory-test.pdf');
          expect(mockFileTypeFromBuffer).toHaveBeenCalledWith(largeBuffer);
        },
      });
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should recover from partial failures in multi-file uploads', async () => {
      const mixedFiles = [
        {
          filepath: '/tmp/success-file',
          originalFilename: 'success.pdf',
          mimetype: 'application/pdf',
          size: 1024,
          hash: 'success-hash',
        },
        {
          filepath: '/tmp/fail-file',
          originalFilename: 'fail.pdf',
          mimetype: 'application/pdf',
          size: 1024,
          hash: 'fail-hash',
        },
      ];

      mockFormidable.mockImplementation(() => ({
        parse: vi.fn().mockResolvedValue([
          {},
          { files: mixedFiles }
        ])
      }));

      // Mock successful creation for first file
      mockPrisma.file.create
        .mockResolvedValueOnce({
          id: 'success-file-id',
          name: 'success.pdf',
          originalName: 'success.pdf',
          path: '/uploads/user-123/success.pdf',
          size: 1024,
          type: 'application/pdf',
          userId: 'user-123',
          folderId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .mockRejectedValueOnce(new Error('Database error'));

      // Mock file copy to succeed for first file, fail for second
      mockFs.copyFile
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('File copy failed'));

      await testApiHandler({
        handler: uploadHandler,
        test: async ({ fetch }) => {
          const formData = new FormData();
          formData.append('files', new Blob(['success content'], { type: 'application/pdf' }), 'success.pdf');
          formData.append('files', new Blob(['fail content'], { type: 'application/pdf' }), 'fail.pdf');
          
          const response = await fetch({
            method: 'POST',
            body: formData,
          });

          expect(response.status).toBe(201);
          const data = await response.json();
          
          // Should have one successful file and one error
          expect(data.files).toHaveLength(1);
          expect(data.files[0].name).toBe('success.pdf');
          expect(data.errors).toHaveLength(1);
          expect(data.errors[0].filename).toBe('fail.pdf');
        },
      });
    });

    it('should handle cleanup failures gracefully', async () => {
      const testFile = {
        filepath: '/tmp/cleanup-test',
        originalFilename: 'cleanup-test.pdf',
        mimetype: 'application/pdf',
        size: 1024,
        hash: 'cleanup-hash',
      };

      mockFormidable.mockImplementation(() => ({
        parse: vi.fn().mockResolvedValue([
          {},
          { file: testFile }
        ])
      }));

      // Mock successful processing but failed cleanup
      mockPrisma.file.create.mockResolvedValue({
        id: 'cleanup-file',
        name: 'cleanup-test.pdf',
        originalName: 'cleanup-test.pdf',
        path: '/uploads/user-123/cleanup-test.pdf',
        size: 1024,
        type: 'application/pdf',
        userId: 'user-123',
        folderId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockFs.unlink.mockRejectedValue(new Error('Cleanup failed'));

      await testApiHandler({
        handler: uploadHandler,
        test: async ({ fetch }) => {
          const formData = new FormData();
          formData.append('file', new Blob(['cleanup test'], { type: 'application/pdf' }), 'cleanup-test.pdf');
          
          const response = await fetch({
            method: 'POST',
            body: formData,
          });

          expect(response.status).toBe(201);
          const data = await response.json();
          
          // Should succeed despite cleanup failure
          expect(data.file.name).toBe('cleanup-test.pdf');
          expect(mockFs.unlink).toHaveBeenCalledWith('/tmp/cleanup-test');
        },
      });
    });
  });
});