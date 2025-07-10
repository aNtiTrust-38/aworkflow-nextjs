import { createMocks } from 'node-mocks-http';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import handler from '../../pages/api/test-api-keys';

// Mock NextAuth
vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn()
}));

// Mock fetch for API testing
global.fetch = vi.fn();

const { getServerSession } = await import('next-auth/next');
const mockGetServerSession = vi.mocked(getServerSession);
const mockFetch = vi.mocked(fetch);

describe('/api/test-api-keys', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Authentication', () => {
    it('should return 401 for unauthenticated requests', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const { req, res } = createMocks({
        method: 'POST',
        body: {
          provider: 'anthropic',
          apiKey: 'sk-test-key'
        }
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(401);
      expect(JSON.parse(res._getData())).toEqual({
        error: 'Unauthorized'
      });
    });

    it('should proceed for authenticated requests', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { 
          id: 'user123',
          email: 'test@example.com' 
        }
      });

      // Mock successful Anthropic API response
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ type: 'message', content: [{ text: 'Test response' }] })
      } as Response);

      const { req, res } = createMocks({
        method: 'POST',
        body: {
          provider: 'anthropic',
          apiKey: 'sk-ant-valid-key'
        }
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
    });
  });

  describe('POST /api/test-api-keys', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue({
        user: { 
          id: 'user123',
          email: 'test@example.com' 
        }
      });
    });

    describe('Request Validation', () => {
      it('should validate required fields', async () => {
        const { req, res } = createMocks({
          method: 'POST',
          body: {}
        });

        await handler(req, res);

        expect(res._getStatusCode()).toBe(400);
        const data = JSON.parse(res._getData());
        expect(data.error).toBe('Validation failed');
        expect(data.details).toContain('Provider is required');
        expect(data.details).toContain('API key is required');
      });

      it('should validate provider values', async () => {
        const { req, res } = createMocks({
          method: 'POST',
          body: {
            provider: 'invalid-provider',
            apiKey: 'sk-test-key'
          }
        });

        await handler(req, res);

        expect(res._getStatusCode()).toBe(400);
        const data = JSON.parse(res._getData());
        expect(data.error).toBe('Validation failed');
        expect(data.details).toContain('Provider must be anthropic, openai, or zotero');
      });

      it('should validate API key format', async () => {
        const { req, res } = createMocks({
          method: 'POST',
          body: {
            provider: 'anthropic',
            apiKey: ''
          }
        });

        await handler(req, res);

        expect(res._getStatusCode()).toBe(400);
        const data = JSON.parse(res._getData());
        expect(data.error).toBe('Validation failed');
        expect(data.details).toContain('API key is required');
      });
    });

    describe('Anthropic API Testing', () => {
      it('should test valid Anthropic API key', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: () => Promise.resolve({
            type: 'message',
            content: [{ text: 'Test response from Claude' }]
          })
        } as Response);

        const { req, res } = createMocks({
          method: 'POST',
          body: {
            provider: 'anthropic',
            apiKey: 'sk-ant-valid-key-123'
          }
        });

        await handler(req, res);

        expect(res._getStatusCode()).toBe(200);
        const data = JSON.parse(res._getData());
        
        expect(data.valid).toBe(true);
        expect(data.provider).toBe('anthropic');
        expect(data.details.service).toBe('Anthropic Claude');
        expect(data.details.status).toBe('connected');

        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.anthropic.com/v1/messages',
          expect.objectContaining({
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': 'sk-ant-valid-key-123',
              'anthropic-version': '2023-06-01'
            }
          })
        );
      });

      it('should handle invalid Anthropic API key', async () => {
        mockFetch.mockResolvedValue({
          ok: false,
          status: 401,
          statusText: 'Unauthorized',
          json: () => Promise.resolve({
            error: { type: 'authentication_error', message: 'Invalid API key' }
          })
        } as Response);

        const { req, res } = createMocks({
          method: 'POST',
          body: {
            provider: 'anthropic',
            apiKey: 'sk-ant-invalid-key'
          }
        });

        await handler(req, res);

        expect(res._getStatusCode()).toBe(200);
        const data = JSON.parse(res._getData());
        
        expect(data.valid).toBe(false);
        expect(data.provider).toBe('anthropic');
        expect(data.details.status).toBe('unauthorized');
        expect(data.details.message).toContain('Invalid API key');
      });

      it('should handle Anthropic rate limiting', async () => {
        mockFetch.mockResolvedValue({
          ok: false,
          status: 429,
          statusText: 'Too Many Requests',
          json: () => Promise.resolve({
            error: { type: 'rate_limit_error', message: 'Rate limit exceeded' }
          })
        } as Response);

        const { req, res } = createMocks({
          method: 'POST',
          body: {
            provider: 'anthropic',
            apiKey: 'sk-ant-rate-limited'
          }
        });

        await handler(req, res);

        expect(res._getStatusCode()).toBe(200);
        const data = JSON.parse(res._getData());
        
        expect(data.valid).toBe(false);
        expect(data.provider).toBe('anthropic');
        expect(data.details.status).toBe('rate_limited');
      });
    });

    describe('OpenAI API Testing', () => {
      it('should test valid OpenAI API key', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: () => Promise.resolve({
            data: [
              { id: 'gpt-4', object: 'model', owned_by: 'openai' }
            ]
          })
        } as Response);

        const { req, res } = createMocks({
          method: 'POST',
          body: {
            provider: 'openai',
            apiKey: 'sk-valid-openai-key'
          }
        });

        await handler(req, res);

        expect(res._getStatusCode()).toBe(200);
        const data = JSON.parse(res._getData());
        
        expect(data.valid).toBe(true);
        expect(data.provider).toBe('openai');
        expect(data.details.service).toBe('OpenAI');
        expect(data.details.status).toBe('connected');

        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.openai.com/v1/models',
          expect.objectContaining({
            method: 'GET',
            headers: {
              'Authorization': 'Bearer sk-valid-openai-key',
              'Content-Type': 'application/json'
            }
          })
        );
      });

      it('should handle invalid OpenAI API key', async () => {
        mockFetch.mockResolvedValue({
          ok: false,
          status: 401,
          statusText: 'Unauthorized',
          json: () => Promise.resolve({
            error: { message: 'Invalid Authentication' }
          })
        } as Response);

        const { req, res } = createMocks({
          method: 'POST',
          body: {
            provider: 'openai',
            apiKey: 'sk-invalid-openai-key'
          }
        });

        await handler(req, res);

        expect(res._getStatusCode()).toBe(200);
        const data = JSON.parse(res._getData());
        
        expect(data.valid).toBe(false);
        expect(data.provider).toBe('openai');
        expect(data.details.status).toBe('unauthorized');
      });
    });

    describe('Zotero API Testing', () => {
      it('should test valid Zotero API key', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: () => Promise.resolve({
            id: 12345,
            username: 'testuser',
            displayName: 'Test User'
          })
        } as Response);

        const { req, res } = createMocks({
          method: 'POST',
          body: {
            provider: 'zotero',
            apiKey: 'valid-zotero-key',
            userId: '12345'
          }
        });

        await handler(req, res);

        expect(res._getStatusCode()).toBe(200);
        const data = JSON.parse(res._getData());
        
        expect(data.valid).toBe(true);
        expect(data.provider).toBe('zotero');
        expect(data.details.service).toBe('Zotero');
        expect(data.details.status).toBe('connected');

        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.zotero.org/users/12345',
          expect.objectContaining({
            method: 'GET',
            headers: {
              'Zotero-API-Key': 'valid-zotero-key'
            }
          })
        );
      });

      it('should require userId for Zotero testing', async () => {
        const { req, res } = createMocks({
          method: 'POST',
          body: {
            provider: 'zotero',
            apiKey: 'zotero-key-without-userid'
          }
        });

        await handler(req, res);

        expect(res._getStatusCode()).toBe(400);
        const data = JSON.parse(res._getData());
        expect(data.error).toBe('Validation failed');
        expect(data.details).toContain('User ID is required for Zotero API testing');
      });

      it('should handle invalid Zotero credentials', async () => {
        mockFetch.mockResolvedValue({
          ok: false,
          status: 403,
          statusText: 'Forbidden'
        } as Response);

        const { req, res } = createMocks({
          method: 'POST',
          body: {
            provider: 'zotero',
            apiKey: 'invalid-zotero-key',
            userId: '12345'
          }
        });

        await handler(req, res);

        expect(res._getStatusCode()).toBe(200);
        const data = JSON.parse(res._getData());
        
        expect(data.valid).toBe(false);
        expect(data.provider).toBe('zotero');
        expect(data.details.status).toBe('unauthorized');
      });
    });

    describe('Error Handling', () => {
      it('should handle network errors', async () => {
        mockFetch.mockRejectedValue(new Error('Network error'));

        const { req, res } = createMocks({
          method: 'POST',
          body: {
            provider: 'anthropic',
            apiKey: 'sk-test-key'
          }
        });

        await handler(req, res);

        expect(res._getStatusCode()).toBe(200);
        const data = JSON.parse(res._getData());
        
        expect(data.valid).toBe(false);
        expect(data.details.status).toBe('error');
        expect(data.details.message).toContain('Network error');
      });

      it('should handle unexpected API responses', async () => {
        mockFetch.mockResolvedValue({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error'
        } as Response);

        const { req, res } = createMocks({
          method: 'POST',
          body: {
            provider: 'openai',
            apiKey: 'sk-test-key'
          }
        });

        await handler(req, res);

        expect(res._getStatusCode()).toBe(200);
        const data = JSON.parse(res._getData());
        
        expect(data.valid).toBe(false);
        expect(data.details.status).toBe('error');
      });
    });
  });

  describe('HTTP Methods', () => {
    it('should return 405 for unsupported methods', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user123', email: 'test@example.com' }
      });

      const { req, res } = createMocks({
        method: 'GET'
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(405);
      expect(JSON.parse(res._getData())).toEqual({
        error: 'Method GET not allowed'
      });
      expect(res.getHeader('Allow')).toEqual(['POST']);
    });
  });
});