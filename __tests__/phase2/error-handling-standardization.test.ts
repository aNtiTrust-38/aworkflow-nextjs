/**
 * Phase 2B: Error Handling Standardization Tests (TDD RED Phase)
 * 
 * These tests define the expected error response behavior across all API endpoints.
 * They should FAIL initially to demonstrate current error format inconsistencies,
 * then pass once standardized error handling is implemented.
 * 
 * Following CLAUDE.md TDD: Write failing tests first, then implement fixes.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextApiRequest, NextApiResponse } from 'next';
import { createMocks } from 'node-mocks-http';

// Mock next-auth
vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn(),
}));

describe('Phase 2B: Error Handling Standardization (TDD RED Phase)', () => {
  let mockGetServerSession: any;

  beforeEach(() => {
    vi.clearAllMocks();
    const { getServerSession } = require('next-auth/next');
    mockGetServerSession = vi.mocked(getServerSession);
    
    // Mock valid session for non-auth error tests
    mockGetServerSession.mockResolvedValue({
      user: { id: 'test-user', email: 'test@example.com' }
    });
  });

  describe('Standardized Error Response Format Tests', () => {
    it('should return consistent error response structure across all endpoints (TDD RED)', async () => {
      // Expected behavior: All endpoints should use identical error response format
      
      const endpointsToTest = [
        { path: '/api/folders', method: 'DELETE', setup: { query: { id: 'nonexistent' } } },
        { path: '/api/files/upload', method: 'POST', setup: { body: {} } },
        { path: '/api/user-settings', method: 'PUT', setup: { body: { invalid: true } } }
      ];

      for (const { path, method, setup } of endpointsToTest) {
        try {
          const handler = (await import(`../../pages${path}`)).default;
          const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
            method,
            ...setup
          });

          await handler(req, res);

          // Expected standardized error response format
          if (res._getStatusCode() >= 400) {
            const responseData = JSON.parse(res._getData());
            
            expect(responseData).toEqual({
              error: expect.any(String), // Human-readable error message
              code: expect.stringMatching(/^[A-Z_]+$/), // Machine-readable error code
              timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/), // ISO timestamp
              details: expect.any(Array), // Optional array of specific issues
              requestId: expect.any(String) // Optional request tracking ID
            });
            
            // Should NOT have old inconsistent formats
            expect(responseData).not.toHaveProperty('message');
            expect(responseData).not.toHaveProperty('status');
            expect(responseData).not.toHaveProperty('success');
          }
          
        } catch (error) {
          // This test should fail initially due to inconsistent error formats
          throw new Error(`Error format inconsistency in ${path}: ${error}`);
        }
      }
    });

    it('should use standardized HTTP status codes for common errors (TDD RED)', async () => {
      // Expected behavior: Consistent HTTP status code usage across endpoints
      
      const errorScenarios = [
        {
          name: 'Resource Not Found',
          expectedStatus: 404,
          expectedCode: 'RESOURCE_NOT_FOUND',
          test: async () => {
            const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
              method: 'GET',
              query: { id: 'nonexistent-resource' }
            });
            const handler = (await import('../../pages/api/folders')).default;
            await handler(req, res);
            return res;
          }
        },
        {
          name: 'Validation Error',
          expectedStatus: 400,
          expectedCode: 'VALIDATION_ERROR',
          test: async () => {
            const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
              method: 'POST',
              body: { name: '' } // Invalid empty name
            });
            const handler = (await import('../../pages/api/folders')).default;
            await handler(req, res);
            return res;
          }
        },
        {
          name: 'Method Not Allowed',
          expectedStatus: 405,
          expectedCode: 'METHOD_NOT_ALLOWED',
          test: async () => {
            const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
              method: 'PATCH' // Unsupported method
            });
            const handler = (await import('../../pages/api/folders')).default;
            await handler(req, res);
            return res;
          }
        }
      ];

      for (const scenario of errorScenarios) {
        const res = await scenario.test();
        
        expect(res._getStatusCode()).toBe(scenario.expectedStatus);
        
        const responseData = JSON.parse(res._getData());
        expect(responseData.code).toBe(scenario.expectedCode);
      }
    });

    it('should sanitize sensitive information from error responses (TDD RED)', async () => {
      // Expected behavior: No sensitive data should be exposed in error messages
      
      // Mock database error with sensitive information
      const mockPrisma = {
        folder: {
          findMany: vi.fn().mockRejectedValue(new Error('Database connection failed: postgres://user:password@localhost:5432/db'))
        }
      };
      
      vi.doMock('@/lib/prisma', () => ({ default: mockPrisma }));

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET'
      });

      const foldersHandler = (await import('../../pages/api/folders')).default;
      await foldersHandler(req, res);

      expect(res._getStatusCode()).toBe(500);
      
      const responseData = JSON.parse(res._getData());
      
      // Should NOT expose sensitive information
      expect(responseData.error).not.toContain('password');
      expect(responseData.error).not.toContain('postgres://');
      expect(responseData.details || []).not.toContain(expect.stringContaining('password'));
      
      // Should contain sanitized error message
      expect(responseData.error).toBe('Internal server error');
      expect(responseData.code).toBe('INTERNAL_SERVER_ERROR');
    });
  });

  describe('Input Validation Error Tests', () => {
    it('should return detailed validation errors for invalid inputs (TDD RED)', async () => {
      // Expected behavior: Validation errors should provide specific field-level feedback
      
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          name: '', // Empty name (invalid)
          parentId: 'invalid-id-format', // Invalid ID format
          extraField: 'not-allowed' // Unexpected field
        }
      });

      const foldersHandler = (await import('../../pages/api/folders')).default;
      await foldersHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      
      const responseData = JSON.parse(res._getData());
      
      expect(responseData).toEqual({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        timestamp: expect.any(String),
        details: [
          {
            field: 'name',
            message: 'Folder name is required',
            code: 'REQUIRED_FIELD'
          },
          {
            field: 'parentId', 
            message: 'Invalid parent folder ID format',
            code: 'INVALID_FORMAT'
          },
          {
            field: 'extraField',
            message: 'Unexpected field in request',
            code: 'UNEXPECTED_FIELD'
          }
        ]
      });
    });

    it('should validate file upload constraints with detailed errors (TDD RED)', async () => {
      // Expected behavior: File upload validation should provide specific error details
      
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        headers: { 'content-type': 'multipart/form-data' },
        body: {} // Mock invalid file upload
      });

      const uploadHandler = (await import('../../pages/api/files/upload')).default;
      await uploadHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      
      const responseData = JSON.parse(res._getData());
      
      expect(responseData).toEqual({
        error: 'File validation failed',
        code: 'FILE_VALIDATION_ERROR',
        timestamp: expect.any(String),
        details: [
          {
            field: 'file',
            message: 'No file provided',
            code: 'MISSING_FILE'
          }
        ]
      });
    });
  });

  describe('Security Error Handling Tests', () => {
    it('should not expose internal system information in error responses (TDD RED)', async () => {
      // Expected behavior: Internal errors should not reveal system details
      
      // Mock various internal system errors
      const internalErrors = [
        new Error('ECONNREFUSED: Connection refused at database-server.internal:5432'),
        new Error('File not found: /var/secure/uploads/user123/secret-file.pdf'),
        new Error('Permission denied: /etc/passwd'),
        new Error('API_KEY=sk-1234567890abcdef in environment variable')
      ];

      for (const error of internalErrors) {
        const mockPrisma = {
          folder: { findMany: vi.fn().mockRejectedValue(error) }
        };
        
        vi.doMock('@/lib/prisma', () => ({ default: mockPrisma }));

        const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
          method: 'GET'
        });

        const foldersHandler = (await import('../../pages/api/folders')).default;
        await foldersHandler(req, res);

        const responseData = JSON.parse(res._getData());
        
        // Should NOT expose any internal system information
        expect(responseData.error).toBe('Internal server error');
        expect(responseData.error).not.toContain('ECONNREFUSED');
        expect(responseData.error).not.toContain('/var/secure');
        expect(responseData.error).not.toContain('/etc/passwd');
        expect(responseData.error).not.toContain('API_KEY');
        expect(responseData.error).not.toContain('sk-');
      }
    });

    it('should include security headers in error responses (TDD RED)', async () => {
      // Expected behavior: Error responses should include proper security headers
      
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET'
      });

      const foldersHandler = (await import('../../pages/api/folders')).default;
      await foldersHandler(req, res);

      // Should include security headers
      expect(res.getHeaders()).toMatchObject({
        'x-content-type-options': 'nosniff',
        'x-frame-options': 'DENY',
        'x-xss-protection': '1; mode=block'
      });
    });
  });

  describe('Error Logging Tests', () => {
    it('should log errors with structured format (TDD RED)', async () => {
      // Expected behavior: Errors should be logged with consistent structured format
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const mockPrisma = {
        folder: { findMany: vi.fn().mockRejectedValue(new Error('Database connection failed')) }
      };
      
      vi.doMock('@/lib/prisma', () => ({ default: mockPrisma }));

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        headers: { 'user-agent': 'test-client/1.0' }
      });

      const foldersHandler = (await import('../../pages/api/folders')).default;
      await foldersHandler(req, res);

      // Should log structured error information
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('API Error'),
        expect.objectContaining({
          endpoint: '/api/folders',
          method: 'GET',
          userId: 'test-user',
          error: 'Database connection failed',
          timestamp: expect.any(String),
          requestId: expect.any(String)
        })
      );

      consoleSpy.mockRestore();
    });
  });
});