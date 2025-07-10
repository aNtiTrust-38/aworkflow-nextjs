import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMocks } from 'node-mocks-http';
import settingsHandler from '../pages/api/settings';
import testKeyHandler from '../pages/api/test-key';
import setupStatusHandler from '../pages/api/setup-status';
import { ApiKeyTestRequest, SettingsUpdateRequest } from '../types/settings';
import { getServerSession } from 'next-auth/next';
import { getSettingsStorage } from '../lib/settings-storage';

// Mock next-auth
vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn()
}));

// Mock settings storage
vi.mock('../lib/settings-storage', () => ({
  getSettingsStorage: vi.fn(() => ({
    getMaskedSettings: vi.fn(),
    updateSettings: vi.fn(),
    deleteSetting: vi.fn(),
    isSetup: vi.fn()
  }))
}));

// Mock fetch for external API calls
global.fetch = vi.fn();

describe('/api/settings', () => {
  const mockGetServerSession = vi.mocked(getServerSession);
  const mockGetSettingsStorage = vi.mocked(getSettingsStorage);

  const createMockStorage = (overrides: any = {}) => {
    return {
      getMaskedSettings: vi.fn(),
      updateSettings: vi.fn(),
      deleteSetting: vi.fn(),
      isSetup: vi.fn(),
      ...overrides
    };
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 for unauthenticated requests', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const { req, res } = createMocks({
      method: 'GET',
    });

    await settingsHandler(req, res);

    expect(res._getStatusCode()).toBe(401);
    expect(JSON.parse(res._getData())).toEqual({
      error: 'Unauthorized'
    });
  });

  it('handles GET request successfully', async () => {
    mockGetServerSession.mockResolvedValue({ user: { email: 'test@example.com' } });
    
    const mockSettings = {
      anthropicKey: 'sk-ant-••••••••',
      configured: { anthropic: true, auth: false }
    };

    const mockStorage = createMockStorage({
      getMaskedSettings: vi.fn().mockResolvedValue(mockSettings)
    });
    
    mockGetSettingsStorage.mockReturnValue(mockStorage as any);

    const { req, res } = createMocks({
      method: 'GET',
    });

    await settingsHandler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(JSON.parse(res._getData())).toEqual(mockSettings);
  });

  it('handles POST request with valid data', async () => {
    mockGetServerSession.mockResolvedValue({ user: { email: 'test@example.com' } });

    const mockStorage = createMockStorage({
      updateSettings: vi.fn().mockResolvedValue(undefined),
      getMaskedSettings: vi.fn().mockResolvedValue({
        anthropicKey: 'sk-ant-••••••••',
        configured: { anthropic: true }
      })
    });
    
    mockGetSettingsStorage.mockReturnValue(mockStorage as any);

    const updateData: SettingsUpdateRequest = {
      anthropicKey: 'sk-ant-newkey123'
    };

    const { req, res } = createMocks({
      method: 'POST',
      body: updateData,
    });

    await settingsHandler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(mockStorage.updateSettings).toHaveBeenCalledWith(
      updateData,
      'test@example.com'
    );
  });

  it('validates required fields in POST request', async () => {
    mockGetServerSession.mockResolvedValue({ user: { email: 'test@example.com' } });

    const { req, res } = createMocks({
      method: 'POST',
      body: {
        anthropicKey: '', // Empty required field
        nextauthSecret: ''
      },
    });

    await settingsHandler(req, res);

    expect(res._getStatusCode()).toBe(400);
    const response = JSON.parse(res._getData());
    expect(response.error).toBe('Validation failed');
    expect(response.details).toContain('Anthropic API key cannot be empty');
  });

  it('validates budget is positive number', async () => {
    mockGetServerSession.mockResolvedValue({ user: { email: 'test@example.com' } });

    const { req, res } = createMocks({
      method: 'POST',
      body: {
        aiMonthlyBudget: -50
      },
    });

    await settingsHandler(req, res);

    expect(res._getStatusCode()).toBe(400);
    const response = JSON.parse(res._getData());
    expect(response.details).toContain('AI monthly budget must be a positive number');
  });

  it('handles DELETE request', async () => {
    mockGetServerSession.mockResolvedValue({ user: { email: 'test@example.com' } });

    const mockStorage = createMockStorage({
      deleteSetting: vi.fn().mockResolvedValue(undefined)
    });
    
    mockGetSettingsStorage.mockReturnValue(mockStorage as any);

    const { req, res } = createMocks({
      method: 'DELETE',
      query: { key: 'openai_api_key' },
    });

    await settingsHandler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(mockStorage.deleteSetting).toHaveBeenCalledWith(
      'openai_api_key',
      'test@example.com'
    );
  });

  it('handles storage errors gracefully', async () => {
    mockGetServerSession.mockResolvedValue({ user: { email: 'test@example.com' } });

    const mockStorage = createMockStorage({
      getMaskedSettings: vi.fn().mockRejectedValue(new Error('Database error'))
    });
    
    mockGetSettingsStorage.mockReturnValue(mockStorage as any);

    const { req, res } = createMocks({
      method: 'GET',
    });

    await settingsHandler(req, res);

    expect(res._getStatusCode()).toBe(500);
    expect(JSON.parse(res._getData())).toEqual({
      error: 'Failed to retrieve settings',
      details: 'Database error'
    });
  });

  it('returns 405 for unsupported methods', async () => {
    mockGetServerSession.mockResolvedValue({ user: { email: 'test@example.com' } });

    const { req, res } = createMocks({
      method: 'PATCH',
    });

    await settingsHandler(req, res);

    expect(res._getStatusCode()).toBe(405);
    expect(res._getHeaders()).toHaveProperty('allow', ['GET', 'POST', 'PUT', 'DELETE']);
  });
});

describe('/api/test-key', () => {
  const mockGetServerSession = vi.mocked(getServerSession);
  const mockFetch = vi.mocked(fetch);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 for unauthenticated requests', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const { req, res } = createMocks({
      method: 'POST',
    });

    await testKeyHandler(req, res);

    expect(res._getStatusCode()).toBe(401);
  });

  it('validates required fields', async () => {
    mockGetServerSession.mockResolvedValue({ user: { email: 'test@example.com' } });

    const { req, res } = createMocks({
      method: 'POST',
      body: { provider: 'anthropic' }, // Missing apiKey
    });

    await testKeyHandler(req, res);

    expect(res._getStatusCode()).toBe(400);
    expect(JSON.parse(res._getData())).toEqual({
      error: 'Missing required fields',
      details: 'provider and apiKey are required'
    });
  });

  it('validates provider values', async () => {
    mockGetServerSession.mockResolvedValue({ user: { email: 'test@example.com' } });

    const { req, res } = createMocks({
      method: 'POST',
      body: {
        provider: 'invalid',
        apiKey: 'test-key'
      },
    });

    await testKeyHandler(req, res);

    expect(res._getStatusCode()).toBe(400);
    expect(JSON.parse(res._getData())).toEqual({
      error: 'Invalid provider',
      details: 'provider must be one of: anthropic, openai, zotero'
    });
  });

  it('tests Anthropic API key successfully', async () => {
    mockGetServerSession.mockResolvedValue({ user: { email: 'test@example.com' } });
    
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ message: 'Success' })
    } as Response);

    const testRequest: ApiKeyTestRequest = {
      provider: 'anthropic',
      apiKey: 'sk-ant-test123'
    };

    const { req, res } = createMocks({
      method: 'POST',
      body: testRequest,
    });

    await testKeyHandler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const response = JSON.parse(res._getData());
    expect(response.valid).toBe(true);
    expect(response.details.service).toBe('Anthropic Claude');
  });

  it('handles Anthropic API key authentication error', async () => {
    mockGetServerSession.mockResolvedValue({ user: { email: 'test@example.com' } });
    
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized'
    } as Response);

    const { req, res } = createMocks({
      method: 'POST',
      body: {
        provider: 'anthropic',
        apiKey: 'invalid-key'
      },
    });

    await testKeyHandler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const response = JSON.parse(res._getData());
    expect(response.valid).toBe(false);
    expect(response.error).toBe('Invalid API key');
  });

  it('tests OpenAI API key successfully', async () => {
    mockGetServerSession.mockResolvedValue({ user: { email: 'test@example.com' } });
    
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: [] })
    } as Response);

    const { req, res } = createMocks({
      method: 'POST',
      body: {
        provider: 'openai',
        apiKey: 'sk-test123'
      },
    });

    await testKeyHandler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const response = JSON.parse(res._getData());
    expect(response.valid).toBe(true);
    expect(response.details.service).toBe('OpenAI');
  });

  it('handles rate limiting gracefully', async () => {
    mockGetServerSession.mockResolvedValue({ user: { email: 'test@example.com' } });
    
    mockFetch.mockResolvedValue({
      ok: false,
      status: 429,
      statusText: 'Too Many Requests'
    } as Response);

    const { req, res } = createMocks({
      method: 'POST',
      body: {
        provider: 'anthropic',
        apiKey: 'sk-ant-test123'
      },
    });

    await testKeyHandler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const response = JSON.parse(res._getData());
    expect(response.valid).toBe(true); // Rate limited but key is valid
    expect(response.details.status).toBe('rate_limited');
  });

  it('requires userId for Zotero provider', async () => {
    mockGetServerSession.mockResolvedValue({ user: { email: 'test@example.com' } });

    const { req, res } = createMocks({
      method: 'POST',
      body: {
        provider: 'zotero',
        apiKey: 'test-key'
        // Missing userId
      },
    });

    await testKeyHandler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const response = JSON.parse(res._getData());
    expect(response.valid).toBe(false);
    expect(response.error).toBe('User ID required for Zotero API');
  });

  it('tests Zotero API key with userId', async () => {
    mockGetServerSession.mockResolvedValue({ user: { email: 'test@example.com' } });
    
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ([])
    } as Response);

    const { req, res } = createMocks({
      method: 'POST',
      body: {
        provider: 'zotero',
        apiKey: 'test-key',
        userId: '12345'
      },
    });

    await testKeyHandler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const response = JSON.parse(res._getData());
    expect(response.valid).toBe(true);
    expect(response.details.service).toBe('Zotero');
  });

  it('handles network errors', async () => {
    mockGetServerSession.mockResolvedValue({ user: { email: 'test@example.com' } });
    
    mockFetch.mockRejectedValue(new Error('Network error'));

    const { req, res } = createMocks({
      method: 'POST',
      body: {
        provider: 'anthropic',
        apiKey: 'sk-ant-test123'
      },
    });

    await testKeyHandler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const response = JSON.parse(res._getData());
    expect(response.valid).toBe(false);
    expect(response.error).toBe('Network error');
  });

  it('returns 405 for non-POST methods', async () => {
    mockGetServerSession.mockResolvedValue({ user: { email: 'test@example.com' } });

    const { req, res } = createMocks({
      method: 'GET',
    });

    await testKeyHandler(req, res);

    expect(res._getStatusCode()).toBe(405);
    expect(res._getHeaders()).toHaveProperty('allow', ['POST']);
  });
});

describe('/api/setup-status', () => {
  const mockGetSettingsStorage = vi.mocked(getSettingsStorage);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns setup status successfully', async () => {
    const mockStorage = {
      isSetup: vi.fn().mockResolvedValue(false),
      getMaskedSettings: vi.fn().mockResolvedValue({
        configured: {
          anthropic: false,
          openai: false,
          auth: false,
          database: false,
          zotero: false
        }
      })
    };
    
    mockGetSettingsStorage.mockReturnValue(mockStorage as any);

    const { req, res } = createMocks({
      method: 'GET',
    });

    await setupStatusHandler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const response = JSON.parse(res._getData());
    expect(response.isSetup).toBe(false);
    expect(response.completedSteps).toEqual([]);
    expect(response.nextStep).toBe('anthropic_setup');
    expect(response.requiredSettings).toContain('anthropic_api_key');
  });

  it('returns completed setup status', async () => {
    const mockStorage = {
      isSetup: vi.fn().mockResolvedValue(true),
      getMaskedSettings: vi.fn().mockResolvedValue({
        configured: {
          anthropic: true,
          openai: true,
          auth: true,
          database: false,
          zotero: true
        }
      })
    };
    
    mockGetSettingsStorage.mockReturnValue(mockStorage as any);

    const { req, res } = createMocks({
      method: 'GET',
    });

    await setupStatusHandler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const response = JSON.parse(res._getData());
    expect(response.isSetup).toBe(true);
    expect(response.completedSteps).toContain('anthropic_setup');
    expect(response.completedSteps).toContain('auth_setup');
    expect(response.completedSteps).toContain('openai_setup');
    expect(response.completedSteps).toContain('zotero_setup');
  });

  it('handles storage errors gracefully', async () => {
    const mockStorage = {
      isSetup: vi.fn().mockRejectedValue(new Error('Database error')),
      getMaskedSettings: vi.fn()
    };
    
    mockGetSettingsStorage.mockReturnValue(mockStorage as any);

    const { req, res } = createMocks({
      method: 'GET',
    });

    await setupStatusHandler(req, res);

    expect(res._getStatusCode()).toBe(500);
    expect(JSON.parse(res._getData())).toEqual({
      error: 'Failed to retrieve setup status',
      details: 'Database error'
    });
  });

  it('returns 405 for non-GET methods', async () => {
    const { req, res } = createMocks({
      method: 'POST',
    });

    await setupStatusHandler(req, res);

    expect(res._getStatusCode()).toBe(405);
    expect(res._getHeaders()).toHaveProperty('allow', ['GET']);
  });

  it('determines next step correctly based on configuration', async () => {
    const mockStorage = {
      isSetup: vi.fn().mockResolvedValue(false),
      getMaskedSettings: vi.fn().mockResolvedValue({
        configured: {
          anthropic: true,
          openai: false,
          auth: false,
          database: false,
          zotero: false
        }
      })
    };
    
    mockGetSettingsStorage.mockReturnValue(mockStorage as any);

    const { req, res } = createMocks({
      method: 'GET',
    });

    await setupStatusHandler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const response = JSON.parse(res._getData());
    expect(response.nextStep).toBe('auth_setup'); // Should skip to auth since anthropic is done
  });
});