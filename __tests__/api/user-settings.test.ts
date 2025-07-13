import { createMocks } from 'node-mocks-http';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import handler from '../../pages/api/user-settings';
import { generateMasterKey } from '../../lib/crypto';

// Mock NextAuth
vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn()
}));

// Mock UserSettingsStorage
vi.mock('../../lib/user-settings-storage', () => ({
  getUserSettingsStorage: vi.fn(() => ({
    getCompleteSettings: vi.fn(),
    storeCompleteSettings: vi.fn(),
    deleteUserSettings: vi.fn()
  }))
}));

const { getServerSession } = await import('next-auth/next');
const { getUserSettingsStorage } = await import('../../lib/user-settings-storage');

const mockGetServerSession = vi.mocked(getServerSession);
const mockGetUserSettingsStorage = vi.mocked(getUserSettingsStorage);
const mockStorage = {
  prisma: {} as any,
  encryptionService: {} as any,
  getCompleteSettings: vi.fn(),
  storeCompleteSettings: vi.fn(),
  deleteUserSettings: vi.fn(),
  storeApiKeys: vi.fn(),
  getApiKeys: vi.fn(),
  storePreferences: vi.fn(),
  getPreferences: vi.fn(),
  storeAiSettings: vi.fn(),
  getAiSettings: vi.fn()
};

describe('/api/user-settings', () => {
  beforeEach(() => {
    process.env.SETTINGS_ENCRYPTION_KEY = generateMasterKey();
    vi.clearAllMocks();
    mockGetUserSettingsStorage.mockReturnValue(mockStorage);
  });

  afterEach(() => {
    delete process.env.SETTINGS_ENCRYPTION_KEY;
  });

  describe('Authentication', () => {
    it('should return 401 for unauthenticated requests', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const { req, res } = createMocks({
        method: 'GET'
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

      mockStorage.getCompleteSettings.mockResolvedValue({
        anthropicApiKey: null,
        openaiApiKey: null,
        monthlyBudget: 100,
        preferredProvider: 'auto',
        citationStyle: 'apa',
        defaultLanguage: 'en',
        adhdFriendlyMode: false,
        theme: 'system',
        reducedMotion: false,
        highContrast: false
      });

      const { req, res } = createMocks({
        method: 'GET'
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
    });
  });

  describe('GET /api/user-settings', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue({
        user: { 
          id: 'user123',
          email: 'test@example.com' 
        }
      });
    });

    it('should return default settings for new users', async () => {
      mockStorage.getCompleteSettings.mockResolvedValue({
        anthropicApiKey: null,
        openaiApiKey: null,
        monthlyBudget: 100,
        preferredProvider: 'auto',
        citationStyle: 'apa',
        defaultLanguage: 'en',
        adhdFriendlyMode: false,
        theme: 'system',
        reducedMotion: false,
        highContrast: false
      });

      const { req, res } = createMocks({
        method: 'GET'
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      
      expect(data).toEqual({
        anthropicApiKey: null,
        openaiApiKey: null,
        monthlyBudget: 100,
        preferredProvider: 'auto',
        citationStyle: 'apa',
        defaultLanguage: 'en',
        adhdFriendlyMode: false,
        theme: 'system',
        reducedMotion: false,
        highContrast: false
      });
    });

    it('should return existing user settings', async () => {
      mockStorage.getCompleteSettings.mockResolvedValue({
        anthropicApiKey: 'sk-decrypted-key',
        openaiApiKey: null,
        monthlyBudget: 200,
        preferredProvider: 'anthropic',
        citationStyle: 'mla',
        defaultLanguage: 'es',
        adhdFriendlyMode: true,
        theme: 'dark',
        reducedMotion: false,
        highContrast: true
      });

      const { req, res } = createMocks({
        method: 'GET'
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      
      // API keys should be decrypted, other fields should match
      expect(data.monthlyBudget).toBe(200);
      expect(data.preferredProvider).toBe('anthropic');
      expect(data.citationStyle).toBe('mla');
      expect(data.defaultLanguage).toBe('es');
      expect(data.adhdFriendlyMode).toBe(true);
      expect(data.theme).toBe('dark');
      expect(data.highContrast).toBe(true);
    });

    it('should handle database errors gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      mockStorage.getCompleteSettings.mockRejectedValue(new Error('Database error'));

      const { req, res } = createMocks({
        method: 'GET'
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(500);
      expect(JSON.parse(res._getData())).toEqual({
        error: 'Failed to retrieve user settings',
        details: expect.any(String)
      });
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('PUT /api/user-settings', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue({
        user: { 
          id: 'user123',
          email: 'test@example.com' 
        }
      });
    });

    it('should update API keys with encryption', async () => {
      const updateData = {
        anthropicApiKey: 'sk-ant-new-key-123',
        openaiApiKey: 'sk-openai-new-key-456'
      };

      mockStorage.storeCompleteSettings.mockResolvedValue(undefined);
      mockStorage.getCompleteSettings.mockResolvedValue({
        anthropicApiKey: 'sk-ant-new-key-123',
        openaiApiKey: 'sk-openai-new-key-456',
        monthlyBudget: 100,
        preferredProvider: 'auto',
        citationStyle: 'apa',
        defaultLanguage: 'en',
        adhdFriendlyMode: false,
        theme: 'system',
        reducedMotion: false,
        highContrast: false
      });

      const { req, res } = createMocks({
        method: 'PUT',
        body: updateData
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(mockStorage.storeCompleteSettings).toHaveBeenCalled();
    });

    it('should update preferences without encryption', async () => {
      const updateData = {
        citationStyle: 'chicago',
        theme: 'dark',
        adhdFriendlyMode: true
      };

      mockStorage.storeCompleteSettings.mockResolvedValue(undefined);
      mockStorage.getCompleteSettings.mockResolvedValue({
        anthropicApiKey: null,
        openaiApiKey: null,
        monthlyBudget: 100,
        preferredProvider: 'auto',
        citationStyle: 'chicago',
        defaultLanguage: 'en',
        adhdFriendlyMode: true,
        theme: 'dark',
        reducedMotion: false,
        highContrast: false
      });

      const { req, res } = createMocks({
        method: 'PUT',
        body: updateData
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      
      expect(data.citationStyle).toBe('chicago');
      expect(data.theme).toBe('dark');
      expect(data.adhdFriendlyMode).toBe(true);
    });

    it('should validate required fields', async () => {
      const invalidData = {
        anthropicApiKey: '',
        monthlyBudget: -50
      };

      const { req, res } = createMocks({
        method: 'PUT',
        body: invalidData
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      
      expect(data.error).toBe('Validation failed');
      expect(Array.isArray(data.details)).toBe(true);
    });

    it('should handle partial updates', async () => {
      const updateData = {
        monthlyBudget: 250
      };

      mockStorage.storeCompleteSettings.mockResolvedValue(undefined);
      mockStorage.getCompleteSettings.mockResolvedValue({
        anthropicApiKey: null,
        openaiApiKey: null,
        monthlyBudget: 250,
        preferredProvider: 'auto',
        citationStyle: 'apa',
        defaultLanguage: 'en',
        adhdFriendlyMode: false,
        theme: 'system',
        reducedMotion: false,
        highContrast: false
      });

      const { req, res } = createMocks({
        method: 'PUT',
        body: updateData
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.monthlyBudget).toBe(250);
    });

    it('should handle encryption errors', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const updateData = {
        anthropicApiKey: 'sk-test-key'
      };

      // Mock storage to throw encryption error
      mockStorage.storeCompleteSettings.mockRejectedValue(new Error('Encryption failed'));

      const { req, res } = createMocks({
        method: 'PUT',
        body: updateData
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(500);
      expect(JSON.parse(res._getData())).toEqual({
        error: 'Failed to update user settings',
        details: expect.any(String)
      });
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('DELETE /api/user-settings', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue({
        user: { 
          id: 'user123',
          email: 'test@example.com' 
        }
      });
    });

    it('should delete all user settings', async () => {
      mockStorage.deleteUserSettings.mockResolvedValue(undefined);

      const { req, res } = createMocks({
        method: 'DELETE'
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(JSON.parse(res._getData())).toEqual({
        success: true,
        message: 'User settings deleted successfully'
      });

      expect(mockStorage.deleteUserSettings).toHaveBeenCalledWith('user123');
    });

    it('should handle deletion of non-existent settings', async () => {
      mockStorage.deleteUserSettings.mockResolvedValue(undefined);

      const { req, res } = createMocks({
        method: 'DELETE'
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(JSON.parse(res._getData())).toEqual({
        success: true,
        message: 'User settings deleted successfully'
      });
    });
  });

  describe('HTTP Methods', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue({
        user: { 
          id: 'user123',
          email: 'test@example.com' 
        }
      });
    });

    it('should return 405 for unsupported methods', async () => {
      const { req, res } = createMocks({
        method: 'PATCH'
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(405);
      expect(JSON.parse(res._getData())).toEqual({
        error: 'Method PATCH not allowed'
      });
    });

    it('should set proper Allow header for 405 responses', async () => {
      const { req, res } = createMocks({
        method: 'POST'
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(405);
      expect(res.getHeader('Allow')).toEqual(['GET', 'PUT', 'DELETE']);
    });
  });

  describe('Error Handling', () => {
    it('should handle unexpected errors gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      mockGetServerSession.mockRejectedValue(new Error('Auth service down'));

      const { req, res } = createMocks({
        method: 'GET'
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(500);
      expect(JSON.parse(res._getData())).toEqual({
        error: 'Internal server error',
        details: expect.any(String)
      });
      
      consoleErrorSpy.mockRestore();
    });
  });
});