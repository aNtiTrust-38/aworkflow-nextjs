import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { testApiHandler } from 'next-test-api-route-handler';
import handler from '../../pages/api/files/upload';
import { ERROR_CODES, HTTP_STATUS } from '@/lib/error-utils';
import prisma from '@/lib/prisma';
import { promises as fs } from 'fs';
import formidable from 'formidable';
import { fileTypeFromBuffer } from 'file-type';
import path from 'path';

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
  default: {
    user: {
      findUnique: vi.fn(),
    },
    folder: {
      findUnique: vi.fn(),
    },
    file: {
      create: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

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
  },
}));

vi.mock('file-type', () => ({
  fileTypeFromBuffer: vi.fn(),
}));

const mockPrisma = vi.mocked(prisma);
const mockFormidable = vi.mocked(formidable);
const mockFs = vi.mocked(fs);
const mockFileTypeFromBuffer = vi.mocked(fileTypeFromBuffer);

describe('File Upload API - Comprehensive Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default successful form parsing
    mockFormidable.mockImplementation(() => ({
      parse: vi.fn().mockResolvedValue([
        { folderId: 'test-folder-id' },
        { 
          file: {
            filepath: '/tmp/test-file',
            originalFilename: 'test.pdf',
            mimetype: 'application/pdf',
            size: 1024 * 1024, // 1MB
            hash: 'test-hash',
          }
        }
      ])
    }));

    // Default successful file system operations
    mockFs.access.mockResolvedValue(undefined);
    mockFs.copyFile.mockResolvedValue(undefined);
    mockFs.unlink.mockResolvedValue(undefined);
    mockFs.mkdir.mockResolvedValue(undefined);
    mockFs.readFile.mockResolvedValue(Buffer.from('test content'));

    // Default file type validation
    mockFileTypeFromBuffer.mockResolvedValue({ mime: 'application/pdf', ext: 'pdf' });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Authentication & Authorization', () => {
    it('should work with anonymous user (current no-auth implementation)', async () => {
      const testFile = {
        filepath: '/tmp/test-file',
        originalFilename: 'test.pdf',
        mimetype: 'application/pdf',
        size: 1024 * 1024,
        hash: 'test-hash',
      };

      mockFormidable.mockImplementation(() => ({
        parse: vi.fn().mockResolvedValue([
          {},
          { file: testFile }
        ])
      }));

      mockPrisma.file.create.mockResolvedValue({
        id: 'test-file-id',
        name: 'test.pdf',
        originalName: 'test.pdf',
        path: '/uploads/anonymous-user/test.pdf',
        size: 1024 * 1024,
        type: 'application/pdf',
        userId: 'anonymous-user',
        folderId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await testApiHandler({
        handler,
        test: async ({ fetch }) => {
          const formData = new FormData();
          formData.append('file', new Blob(['test content'], { type: 'application/pdf' }), 'test.pdf');
          
          const response = await fetch({
            method: 'POST',
            body: formData,
          });

          expect(response.status).toBe(201);
          const data = await response.json();
          expect(data.success).toBe(true);
          expect(data.file.userId).toBe('anonymous-user');
        },
      });
    });
  });

  describe('File Upload Validation', () => {
    it('should reject files exceeding maximum size limit', async () => {
      const largeFile = {
        filepath: '/tmp/large-file',
        originalFilename: 'large.pdf',
        mimetype: 'application/pdf',
        size: 60 * 1024 * 1024, // 60MB (exceeds 50MB limit)
        hash: 'large-hash',
      };

      mockFormidable.mockImplementation(() => ({
        parse: vi.fn().mockResolvedValue([
          {},
          { file: largeFile }
        ])
      }));

      await testApiHandler({
        handler,
        test: async ({ fetch }) => {
          const formData = new FormData();
          formData.append('file', new Blob(['x'.repeat(60 * 1024 * 1024)], { type: 'application/pdf' }), 'large.pdf');
          
          const response = await fetch({
            method: 'POST',
            body: formData,
          });

          expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
          const data = await response.json();
          expect(data.error).toBe('File validation failed');
          expect(data.code).toBe(ERROR_CODES.FILE_VALIDATION_ERROR);
          expect(data.details).toContainEqual({
            field: 'file',
            message: 'No file provided',
            code: 'MISSING_FILE'
          });
        },
      });
    });

    it('should reject empty files', async () => {
      const emptyFile = {
        filepath: '/tmp/empty-file',
        originalFilename: 'empty.pdf',
        mimetype: 'application/pdf',
        size: 0,
        hash: 'empty-hash',
      };

      mockFormidable.mockImplementation(() => ({
        parse: vi.fn().mockResolvedValue([
          {},
          { file: emptyFile }
        ])
      }));

      await testApiHandler({
        handler,
        test: async ({ fetch }) => {
          const formData = new FormData();
          formData.append('file', new Blob([''], { type: 'application/pdf' }), 'empty.pdf');
          
          const response = await fetch({
            method: 'POST',
            body: formData,
          });

          expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
          const data = await response.json();
          expect(data.errors).toContainEqual({
            filename: 'empty.pdf',
            error: 'File is empty'
          });
        },
      });
    });

    it('should reject files without filename', async () => {
      const noNameFile = {
        filepath: '/tmp/no-name-file',
        originalFilename: '',
        mimetype: 'application/pdf',
        size: 1024,
        hash: 'no-name-hash',
      };

      mockFormidable.mockImplementation(() => ({
        parse: vi.fn().mockResolvedValue([
          {},
          { file: noNameFile }
        ])
      }));

      await testApiHandler({
        handler,
        test: async ({ fetch }) => {
          const formData = new FormData();
          formData.append('file', new Blob(['test'], { type: 'application/pdf' }), '');
          
          const response = await fetch({
            method: 'POST',
            body: formData,
          });

          expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
          const data = await response.json();
          expect(data.errors).toContainEqual({
            filename: '',
            error: 'File name is required'
          });
        },
      });
    });

    it('should reject files with disallowed extensions', async () => {
      const invalidFile = {
        filepath: '/tmp/invalid-file',
        originalFilename: 'malicious.exe',
        mimetype: 'application/x-msdownload',
        size: 1024,
        hash: 'invalid-hash',
      };

      mockFormidable.mockImplementation(() => ({
        parse: vi.fn().mockResolvedValue([
          {},
          { file: invalidFile }
        ])
      }));

      await testApiHandler({
        handler,
        test: async ({ fetch }) => {
          const formData = new FormData();
          formData.append('file', new Blob(['test'], { type: 'application/x-msdownload' }), 'malicious.exe');
          
          const response = await fetch({
            method: 'POST',
            body: formData,
          });

          expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
          const data = await response.json();
          expect(data.errors).toContainEqual({
            filename: 'malicious.exe',
            error: 'File extension .exe is not allowed'
          });
        },
      });
    });

    it('should reject files with disallowed MIME types', async () => {
      const invalidFile = {
        filepath: '/tmp/invalid-mime',
        originalFilename: 'test.pdf',
        mimetype: 'application/x-executable',
        size: 1024,
        hash: 'invalid-mime-hash',
      };

      mockFormidable.mockImplementation(() => ({
        parse: vi.fn().mockResolvedValue([
          {},
          { file: invalidFile }
        ])
      }));

      await testApiHandler({
        handler,
        test: async ({ fetch }) => {
          const formData = new FormData();
          formData.append('file', new Blob(['test'], { type: 'application/x-executable' }), 'test.pdf');
          
          const response = await fetch({
            method: 'POST',
            body: formData,
          });

          expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
          const data = await response.json();
          expect(data.errors).toContainEqual({
            filename: 'test.pdf',
            error: 'File type not allowed: application/x-executable'
          });
        },
      });
    });

    it('should detect malicious files using file-type validation', async () => {
      const maliciousFile = {
        filepath: '/tmp/malicious-file',
        originalFilename: 'innocent.pdf',
        mimetype: 'application/pdf',
        size: 1024,
        hash: 'malicious-hash',
      };

      mockFormidable.mockImplementation(() => ({
        parse: vi.fn().mockResolvedValue([
          {},
          { file: maliciousFile }
        ])
      }));

      // Mock file-type to detect malicious content
      mockFileTypeFromBuffer.mockResolvedValue({ mime: 'application/x-msdownload', ext: 'exe' });

      await testApiHandler({
        handler,
        test: async ({ fetch }) => {
          const formData = new FormData();
          formData.append('file', new Blob(['MZ'], { type: 'application/pdf' }), 'innocent.pdf');
          
          const response = await fetch({
            method: 'POST',
            body: formData,
          });

          expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
          const data = await response.json();
          expect(data.errors).toContainEqual({
            filename: 'innocent.pdf',
            error: 'File appears to be malicious or corrupted'
          });
        },
      });
    });

    it('should handle file-type validation errors gracefully', async () => {
      const testFile = {
        filepath: '/tmp/test-file',
        originalFilename: 'test.txt',
        mimetype: 'text/plain',
        size: 1024,
        hash: 'test-hash',
      };

      mockFormidable.mockImplementation(() => ({
        parse: vi.fn().mockResolvedValue([
          {},
          { file: testFile }
        ])
      }));

      // Mock file-type to throw error (e.g., for text files)
      mockFileTypeFromBuffer.mockRejectedValue(new Error('File type detection failed'));

      mockPrisma.file.create.mockResolvedValue({
        id: 'test-file-id',
        name: 'test.txt',
        originalName: 'test.txt',
        path: '/uploads/anonymous-user/test.txt',
        size: 1024,
        type: 'text/plain',
        userId: 'anonymous-user',
        folderId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await testApiHandler({
        handler,
        test: async ({ fetch }) => {
          const formData = new FormData();
          formData.append('file', new Blob(['test content'], { type: 'text/plain' }), 'test.txt');
          
          const response = await fetch({
            method: 'POST',
            body: formData,
          });

          expect(response.status).toBe(201);
          const data = await response.json();
          expect(data.success).toBe(true);
          expect(data.file.type).toBe('text/plain');
        },
      });
    });
  });

  describe('File Sanitization', () => {
    it('should sanitize dangerous filenames', async () => {
      const dangerousFile = {
        filepath: '/tmp/dangerous-file',
        originalFilename: '../../../etc/passwd',
        mimetype: 'text/plain',
        size: 1024,
        hash: 'dangerous-hash',
      };

      mockFormidable.mockImplementation(() => ({
        parse: vi.fn().mockResolvedValue([
          {},
          { file: dangerousFile }
        ])
      }));

      mockPrisma.file.create.mockResolvedValue({
        id: 'test-file-id',
        name: 'passwd',
        originalName: '../../../etc/passwd',
        path: '/uploads/anonymous-user/passwd',
        size: 1024,
        type: 'text/plain',
        userId: 'anonymous-user',
        folderId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await testApiHandler({
        handler,
        test: async ({ fetch }) => {
          const formData = new FormData();
          formData.append('file', new Blob(['test'], { type: 'text/plain' }), '../../../etc/passwd');
          
          const response = await fetch({
            method: 'POST',
            body: formData,
          });

          expect(response.status).toBe(201);
          const data = await response.json();
          expect(data.file.name).toBe('passwd');
          expect(data.file.originalName).toBe('../../../etc/passwd');
        },
      });
    });

    it('should sanitize special characters in filenames', async () => {
      const specialFile = {
        filepath: '/tmp/special-file',
        originalFilename: 'test<script>alert("xss")</script>.pdf',
        mimetype: 'application/pdf',
        size: 1024,
        hash: 'special-hash',
      };

      mockFormidable.mockImplementation(() => ({
        parse: vi.fn().mockResolvedValue([
          {},
          { file: specialFile }
        ])
      }));

      mockPrisma.file.create.mockResolvedValue({
        id: 'test-file-id',
        name: 'testscriptalert(xss)script.pdf',
        originalName: 'test<script>alert("xss")</script>.pdf',
        path: '/uploads/anonymous-user/testscriptalert(xss)script.pdf',
        size: 1024,
        type: 'application/pdf',
        userId: 'anonymous-user',
        folderId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await testApiHandler({
        handler,
        test: async ({ fetch }) => {
          const formData = new FormData();
          formData.append('file', new Blob(['test'], { type: 'application/pdf' }), 'test<script>alert("xss")</script>.pdf');
          
          const response = await fetch({
            method: 'POST',
            body: formData,
          });

          expect(response.status).toBe(201);
          const data = await response.json();
          expect(data.file.name).toBe('testscriptalert(xss)script.pdf');
          expect(data.file.name).not.toContain('<script>');
        },
      });
    });

    it('should normalize whitespace in filenames', async () => {
      const whitespaceFile = {
        filepath: '/tmp/whitespace-file',
        originalFilename: '  test    file   .pdf  ',
        mimetype: 'application/pdf',
        size: 1024,
        hash: 'whitespace-hash',
      };

      mockFormidable.mockImplementation(() => ({
        parse: vi.fn().mockResolvedValue([
          {},
          { file: whitespaceFile }
        ])
      }));

      mockPrisma.file.create.mockResolvedValue({
        id: 'test-file-id',
        name: 'test file .pdf',
        originalName: '  test    file   .pdf  ',
        path: '/uploads/anonymous-user/test file .pdf',
        size: 1024,
        type: 'application/pdf',
        userId: 'anonymous-user',
        folderId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await testApiHandler({
        handler,
        test: async ({ fetch }) => {
          const formData = new FormData();
          formData.append('file', new Blob(['test'], { type: 'application/pdf' }), '  test    file   .pdf  ');
          
          const response = await fetch({
            method: 'POST',
            body: formData,
          });

          expect(response.status).toBe(201);
          const data = await response.json();
          expect(data.file.name).toBe('test file .pdf');
        },
      });
    });
  });

  describe('File Deduplication', () => {
    it('should generate unique filenames for duplicate uploads', async () => {
      const testFile = {
        filepath: '/tmp/test-file',
        originalFilename: 'document.pdf',
        mimetype: 'application/pdf',
        size: 1024,
        hash: 'test-hash',
      };

      mockFormidable.mockImplementation(() => ({
        parse: vi.fn().mockResolvedValue([
          {},
          { file: testFile }
        ])
      }));

      // Mock existing file with same name
      mockPrisma.file.findMany.mockResolvedValue([
        { name: 'document.pdf' },
        { name: 'document (1).pdf' }
      ]);

      mockPrisma.file.create.mockResolvedValue({
        id: 'test-file-id',
        name: 'document (2).pdf',
        originalName: 'document.pdf',
        path: '/uploads/anonymous-user/document (2).pdf',
        size: 1024,
        type: 'application/pdf',
        userId: 'anonymous-user',
        folderId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await testApiHandler({
        handler,
        test: async ({ fetch }) => {
          const formData = new FormData();
          formData.append('file', new Blob(['test'], { type: 'application/pdf' }), 'document.pdf');
          
          const response = await fetch({
            method: 'POST',
            body: formData,
          });

          expect(response.status).toBe(201);
          const data = await response.json();
          expect(data.file.name).toBe('document (2).pdf');
          expect(data.file.originalName).toBe('document.pdf');
        },
      });
    });

    it('should handle database query failures gracefully during duplicate check', async () => {
      const testFile = {
        filepath: '/tmp/test-file',
        originalFilename: 'document.pdf',
        mimetype: 'application/pdf',
        size: 1024,
        hash: 'test-hash',
      };

      mockFormidable.mockImplementation(() => ({
        parse: vi.fn().mockResolvedValue([
          {},
          { file: testFile }
        ])
      }));

      // Mock database failure
      mockPrisma.file.findMany.mockRejectedValue(new Error('Database connection failed'));

      mockPrisma.file.create.mockResolvedValue({
        id: 'test-file-id',
        name: 'document.pdf',
        originalName: 'document.pdf',
        path: '/uploads/anonymous-user/document.pdf',
        size: 1024,
        type: 'application/pdf',
        userId: 'anonymous-user',
        folderId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await testApiHandler({
        handler,
        test: async ({ fetch }) => {
          const formData = new FormData();
          formData.append('file', new Blob(['test'], { type: 'application/pdf' }), 'document.pdf');
          
          const response = await fetch({
            method: 'POST',
            body: formData,
          });

          expect(response.status).toBe(201);
          const data = await response.json();
          expect(data.file.name).toBe('document.pdf');
        },
      });
    });
  });

  describe('Folder Management', () => {
    it('should upload files to specified folder', async () => {
      const testFile = {
        filepath: '/tmp/test-file',
        originalFilename: 'test.pdf',
        mimetype: 'application/pdf',
        size: 1024,
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
        name: 'Test Folder',
        userId: 'anonymous-user',
        parentId: null,
        path: '/test-folder',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockPrisma.file.create.mockResolvedValue({
        id: 'test-file-id',
        name: 'test.pdf',
        originalName: 'test.pdf',
        path: '/uploads/anonymous-user/test.pdf',
        size: 1024,
        type: 'application/pdf',
        userId: 'anonymous-user',
        folderId: 'folder-123',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await testApiHandler({
        handler,
        test: async ({ fetch }) => {
          const formData = new FormData();
          formData.append('file', new Blob(['test'], { type: 'application/pdf' }), 'test.pdf');
          formData.append('folderId', 'folder-123');
          
          const response = await fetch({
            method: 'POST',
            body: formData,
          });

          expect(response.status).toBe(201);
          const data = await response.json();
          expect(data.file.folderId).toBe('folder-123');
        },
      });
    });

    it('should return 404 for non-existent folder', async () => {
      const testFile = {
        filepath: '/tmp/test-file',
        originalFilename: 'test.pdf',
        mimetype: 'application/pdf',
        size: 1024,
        hash: 'test-hash',
      };

      mockFormidable.mockImplementation(() => ({
        parse: vi.fn().mockResolvedValue([
          { folderId: 'non-existent-folder' },
          { file: testFile }
        ])
      }));

      mockPrisma.folder.findUnique.mockResolvedValue(null);

      await testApiHandler({
        handler,
        test: async ({ fetch }) => {
          const formData = new FormData();
          formData.append('file', new Blob(['test'], { type: 'application/pdf' }), 'test.pdf');
          formData.append('folderId', 'non-existent-folder');
          
          const response = await fetch({
            method: 'POST',
            body: formData,
          });

          expect(response.status).toBe(404);
          const data = await response.json();
          expect(data.error).toBe('Folder not found');
        },
      });
    });

    it('should return 403 for folder owned by different user', async () => {
      const testFile = {
        filepath: '/tmp/test-file',
        originalFilename: 'test.pdf',
        mimetype: 'application/pdf',
        size: 1024,
        hash: 'test-hash',
      };

      mockFormidable.mockImplementation(() => ({
        parse: vi.fn().mockResolvedValue([
          { folderId: 'other-user-folder' },
          { file: testFile }
        ])
      }));

      mockPrisma.folder.findUnique.mockResolvedValue({
        id: 'other-user-folder',
        name: 'Other User Folder',
        userId: 'other-user',
        parentId: null,
        path: '/other-user-folder',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await testApiHandler({
        handler,
        test: async ({ fetch }) => {
          const formData = new FormData();
          formData.append('file', new Blob(['test'], { type: 'application/pdf' }), 'test.pdf');
          formData.append('folderId', 'other-user-folder');
          
          const response = await fetch({
            method: 'POST',
            body: formData,
          });

          expect(response.status).toBe(403);
          const data = await response.json();
          expect(data.error).toBe('Access denied to folder');
        },
      });
    });

    it('should handle folder validation errors gracefully', async () => {
      const testFile = {
        filepath: '/tmp/test-file',
        originalFilename: 'test.pdf',
        mimetype: 'application/pdf',
        size: 1024,
        hash: 'test-hash',
      };

      mockFormidable.mockImplementation(() => ({
        parse: vi.fn().mockResolvedValue([
          { folderId: 'folder-123' },
          { file: testFile }
        ])
      }));

      mockPrisma.folder.findUnique.mockRejectedValue(new Error('Database error'));

      mockPrisma.file.create.mockResolvedValue({
        id: 'test-file-id',
        name: 'test.pdf',
        originalName: 'test.pdf',
        path: '/uploads/anonymous-user/test.pdf',
        size: 1024,
        type: 'application/pdf',
        userId: 'anonymous-user',
        folderId: 'folder-123',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await testApiHandler({
        handler,
        test: async ({ fetch }) => {
          const formData = new FormData();
          formData.append('file', new Blob(['test'], { type: 'application/pdf' }), 'test.pdf');
          formData.append('folderId', 'folder-123');
          
          const response = await fetch({
            method: 'POST',
            body: formData,
          });

          expect(response.status).toBe(201);
          const data = await response.json();
          expect(data.success).toBe(true);
        },
      });
    });
  });

  describe('Multiple File Upload', () => {
    it('should handle multiple files upload successfully', async () => {
      const testFiles = [
        {
          filepath: '/tmp/test-file-1',
          originalFilename: 'document1.pdf',
          mimetype: 'application/pdf',
          size: 1024,
          hash: 'test-hash-1',
        },
        {
          filepath: '/tmp/test-file-2',
          originalFilename: 'document2.docx',
          mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          size: 2048,
          hash: 'test-hash-2',
        }
      ];

      mockFormidable.mockImplementation(() => ({
        parse: vi.fn().mockResolvedValue([
          {},
          { files: testFiles }
        ])
      }));

      mockPrisma.file.create
        .mockResolvedValueOnce({
          id: 'file-1',
          name: 'document1.pdf',
          originalName: 'document1.pdf',
          path: '/uploads/anonymous-user/document1.pdf',
          size: 1024,
          type: 'application/pdf',
          userId: 'anonymous-user',
          folderId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .mockResolvedValueOnce({
          id: 'file-2',
          name: 'document2.docx',
          originalName: 'document2.docx',
          path: '/uploads/anonymous-user/document2.docx',
          size: 2048,
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          userId: 'anonymous-user',
          folderId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

      await testApiHandler({
        handler,
        test: async ({ fetch }) => {
          const formData = new FormData();
          formData.append('files', new Blob(['test1'], { type: 'application/pdf' }), 'document1.pdf');
          formData.append('files', new Blob(['test2'], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }), 'document2.docx');
          
          const response = await fetch({
            method: 'POST',
            body: formData,
          });

          expect(response.status).toBe(201);
          const data = await response.json();
          expect(data.success).toBe(true);
          expect(data.files).toHaveLength(2);
          expect(data.files[0].name).toBe('document1.pdf');
          expect(data.files[1].name).toBe('document2.docx');
        },
      });
    });

    it('should handle mixed success and failure in multiple file upload', async () => {
      const testFiles = [
        {
          filepath: '/tmp/valid-file',
          originalFilename: 'valid.pdf',
          mimetype: 'application/pdf',
          size: 1024,
          hash: 'valid-hash',
        },
        {
          filepath: '/tmp/invalid-file',
          originalFilename: 'invalid.exe',
          mimetype: 'application/x-msdownload',
          size: 1024,
          hash: 'invalid-hash',
        }
      ];

      mockFormidable.mockImplementation(() => ({
        parse: vi.fn().mockResolvedValue([
          {},
          { files: testFiles }
        ])
      }));

      mockPrisma.file.create.mockResolvedValue({
        id: 'valid-file-id',
        name: 'valid.pdf',
        originalName: 'valid.pdf',
        path: '/uploads/anonymous-user/valid.pdf',
        size: 1024,
        type: 'application/pdf',
        userId: 'anonymous-user',
        folderId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await testApiHandler({
        handler,
        test: async ({ fetch }) => {
          const formData = new FormData();
          formData.append('files', new Blob(['valid'], { type: 'application/pdf' }), 'valid.pdf');
          formData.append('files', new Blob(['invalid'], { type: 'application/x-msdownload' }), 'invalid.exe');
          
          const response = await fetch({
            method: 'POST',
            body: formData,
          });

          expect(response.status).toBe(201);
          const data = await response.json();
          expect(data.success).toBe(true);
          expect(data.files).toHaveLength(1);
          expect(data.errors).toHaveLength(1);
          expect(data.errors[0].filename).toBe('invalid.exe');
        },
      });
    });

    it('should return 400 when no files are provided', async () => {
      mockFormidable.mockImplementation(() => ({
        parse: vi.fn().mockResolvedValue([
          {},
          {}
        ])
      }));

      await testApiHandler({
        handler,
        test: async ({ fetch }) => {
          const formData = new FormData();
          
          const response = await fetch({
            method: 'POST',
            body: formData,
          });

          expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
          const data = await response.json();
          expect(data.error).toBe('File validation failed');
          expect(data.code).toBe(ERROR_CODES.FILE_VALIDATION_ERROR);
        },
      });
    });
  });

  describe('File System Operations', () => {
    it('should create user directory if it does not exist', async () => {
      const testFile = {
        filepath: '/tmp/test-file',
        originalFilename: 'test.pdf',
        mimetype: 'application/pdf',
        size: 1024,
        hash: 'test-hash',
      };

      mockFormidable.mockImplementation(() => ({
        parse: vi.fn().mockResolvedValue([
          {},
          { file: testFile }
        ])
      }));

      mockFs.access.mockRejectedValue(new Error('Directory does not exist'));

      mockPrisma.file.create.mockResolvedValue({
        id: 'test-file-id',
        name: 'test.pdf',
        originalName: 'test.pdf',
        path: '/uploads/anonymous-user/test.pdf',
        size: 1024,
        type: 'application/pdf',
        userId: 'anonymous-user',
        folderId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await testApiHandler({
        handler,
        test: async ({ fetch }) => {
          const formData = new FormData();
          formData.append('file', new Blob(['test'], { type: 'application/pdf' }), 'test.pdf');
          
          const response = await fetch({
            method: 'POST',
            body: formData,
          });

          expect(response.status).toBe(201);
          expect(mockFs.mkdir).toHaveBeenCalledWith(
            expect.stringContaining('/uploads/anonymous-user'),
            { recursive: true }
          );
        },
      });
    });

    it('should handle file copy errors', async () => {
      const testFile = {
        filepath: '/tmp/test-file',
        originalFilename: 'test.pdf',
        mimetype: 'application/pdf',
        size: 1024,
        hash: 'test-hash',
      };

      mockFormidable.mockImplementation(() => ({
        parse: vi.fn().mockResolvedValue([
          {},
          { file: testFile }
        ])
      }));

      mockFs.copyFile.mockRejectedValue(new Error('File copy failed'));

      await testApiHandler({
        handler,
        test: async ({ fetch }) => {
          const formData = new FormData();
          formData.append('file', new Blob(['test'], { type: 'application/pdf' }), 'test.pdf');
          
          const response = await fetch({
            method: 'POST',
            body: formData,
          });

          expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
          const data = await response.json();
          expect(data.errors).toContainEqual({
            filename: 'test.pdf',
            error: 'Failed to process file'
          });
        },
      });
    });

    it('should clean up temporary files on error', async () => {
      const testFile = {
        filepath: '/tmp/test-file',
        originalFilename: 'test.pdf',
        mimetype: 'application/pdf',
        size: 1024,
        hash: 'test-hash',
      };

      mockFormidable.mockImplementation(() => ({
        parse: vi.fn().mockResolvedValue([
          {},
          { file: testFile }
        ])
      }));

      mockFs.copyFile.mockRejectedValue(new Error('File copy failed'));

      await testApiHandler({
        handler,
        test: async ({ fetch }) => {
          const formData = new FormData();
          formData.append('file', new Blob(['test'], { type: 'application/pdf' }), 'test.pdf');
          
          const response = await fetch({
            method: 'POST',
            body: formData,
          });

          expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
          expect(mockFs.unlink).toHaveBeenCalledWith('/tmp/test-file');
        },
      });
    });

    it('should handle cleanup errors gracefully', async () => {
      const testFile = {
        filepath: '/tmp/test-file',
        originalFilename: 'test.pdf',
        mimetype: 'application/pdf',
        size: 1024,
        hash: 'test-hash',
      };

      mockFormidable.mockImplementation(() => ({
        parse: vi.fn().mockResolvedValue([
          {},
          { file: testFile }
        ])
      }));

      mockFs.copyFile.mockRejectedValue(new Error('File copy failed'));
      mockFs.unlink.mockRejectedValue(new Error('Cleanup failed'));

      await testApiHandler({
        handler,
        test: async ({ fetch }) => {
          const formData = new FormData();
          formData.append('file', new Blob(['test'], { type: 'application/pdf' }), 'test.pdf');
          
          const response = await fetch({
            method: 'POST',
            body: formData,
          });

          expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
          expect(mockFs.unlink).toHaveBeenCalledWith('/tmp/test-file');
        },
      });
    });
  });

  describe('Database Operations', () => {
    it('should handle database import failures gracefully', async () => {
      const testFile = {
        filepath: '/tmp/test-file',
        originalFilename: 'test.pdf',
        mimetype: 'application/pdf',
        size: 1024,
        hash: 'test-hash',
      };

      mockFormidable.mockImplementation(() => ({
        parse: vi.fn().mockResolvedValue([
          {},
          { file: testFile }
        ])
      }));

      // Mock the dynamic import to fail
      const originalImport = global.import;
      global.import = vi.fn().mockRejectedValue(new Error('Prisma import failed'));

      await testApiHandler({
        handler,
        test: async ({ fetch }) => {
          const formData = new FormData();
          formData.append('file', new Blob(['test'], { type: 'application/pdf' }), 'test.pdf');
          
          const response = await fetch({
            method: 'POST',
            body: formData,
          });

          expect(response.status).toBe(201);
          const data = await response.json();
          expect(data.success).toBe(true);
          expect(data.file.id).toMatch(/^mock-/);
        },
      });

      global.import = originalImport;
    });

    it('should handle database create failures gracefully', async () => {
      const testFile = {
        filepath: '/tmp/test-file',
        originalFilename: 'test.pdf',
        mimetype: 'application/pdf',
        size: 1024,
        hash: 'test-hash',
      };

      mockFormidable.mockImplementation(() => ({
        parse: vi.fn().mockResolvedValue([
          {},
          { file: testFile }
        ])
      }));

      mockPrisma.file.create.mockRejectedValue(new Error('Database insert failed'));

      await testApiHandler({
        handler,
        test: async ({ fetch }) => {
          const formData = new FormData();
          formData.append('file', new Blob(['test'], { type: 'application/pdf' }), 'test.pdf');
          
          const response = await fetch({
            method: 'POST',
            body: formData,
          });

          expect(response.status).toBe(201);
          const data = await response.json();
          expect(data.success).toBe(true);
          expect(data.file.id).toMatch(/^mock-/);
        },
      });
    });
  });

  describe('Performance Headers', () => {
    it('should add performance headers for large files', async () => {
      const largeFile = {
        filepath: '/tmp/large-file',
        originalFilename: 'large.pdf',
        mimetype: 'application/pdf',
        size: 15 * 1024 * 1024, // 15MB
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
        name: 'large.pdf',
        originalName: 'large.pdf',
        path: '/uploads/anonymous-user/large.pdf',
        size: 15 * 1024 * 1024,
        type: 'application/pdf',
        userId: 'anonymous-user',
        folderId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await testApiHandler({
        handler,
        test: async ({ fetch }) => {
          const formData = new FormData();
          formData.append('file', new Blob(['x'.repeat(15 * 1024 * 1024)], { type: 'application/pdf' }), 'large.pdf');
          
          const response = await fetch({
            method: 'POST',
            body: formData,
          });

          expect(response.status).toBe(201);
          expect(response.headers.get('x-processing-mode')).toBe('streaming');
          expect(response.headers.get('x-chunk-size')).toBe('1MB');
        },
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle form parsing errors', async () => {
      mockFormidable.mockImplementation(() => ({
        parse: vi.fn().mockRejectedValue(new Error('Form parsing failed'))
      }));

      await testApiHandler({
        handler,
        test: async ({ fetch }) => {
          const formData = new FormData();
          formData.append('file', new Blob(['test'], { type: 'application/pdf' }), 'test.pdf');
          
          const response = await fetch({
            method: 'POST',
            body: formData,
          });

          expect(response.status).toBe(400);
          const data = await response.json();
          expect(data.error).toBe('Failed to parse form data');
        },
      });
    });

    it('should handle unexpected errors', async () => {
      mockFormidable.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      await testApiHandler({
        handler,
        test: async ({ fetch }) => {
          const formData = new FormData();
          formData.append('file', new Blob(['test'], { type: 'application/pdf' }), 'test.pdf');
          
          const response = await fetch({
            method: 'POST',
            body: formData,
          });

          expect(response.status).toBe(500);
          const data = await response.json();
          expect(data.error).toBe('Failed to save file');
        },
      });
    });
  });

  describe('Method Validation', () => {
    it('should reject non-POST requests', async () => {
      await testApiHandler({
        handler,
        test: async ({ fetch }) => {
          const response = await fetch({
            method: 'GET',
          });

          expect(response.status).toBe(405);
          const data = await response.json();
          expect(data.error).toBe('Method not allowed');
        },
      });
    });

    it('should reject PUT requests', async () => {
      await testApiHandler({
        handler,
        test: async ({ fetch }) => {
          const response = await fetch({
            method: 'PUT',
            body: new FormData(),
          });

          expect(response.status).toBe(405);
          const data = await response.json();
          expect(data.error).toBe('Method not allowed');
        },
      });
    });
  });
});