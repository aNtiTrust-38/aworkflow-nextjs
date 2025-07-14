import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';

interface TestApiKeyRequest {
  provider: 'anthropic' | 'openai' | 'zotero';
  apiKey: string;
  userId?: string; // Required for Zotero
}

interface TestApiKeyResponse {
  valid: boolean;
  provider: string;
  details: {
    service: string;
    status: 'connected' | 'error' | 'unauthorized' | 'rate_limited';
    message?: string;
  };
}

async function testAnthropicKey(apiKey: string): Promise<TestApiKeyResponse> {
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 10,
        messages: [
          {
            role: 'user',
            content: 'Test'
          }
        ]
      })
    });

    if (response.ok) {
      return {
        valid: true,
        provider: 'anthropic',
        details: {
          service: 'Anthropic Claude',
          status: 'connected',
          message: 'API key is valid and working'
        }
      };
    }

    const errorData = await response.json().catch(() => ({}));
    
    if (response.status === 401) {
      return {
        valid: false,
        provider: 'anthropic',
        details: {
          service: 'Anthropic Claude',
          status: 'unauthorized',
          message: errorData.error?.message || 'Invalid API key'
        }
      };
    }

    if (response.status === 429) {
      return {
        valid: false,
        provider: 'anthropic',
        details: {
          service: 'Anthropic Claude',
          status: 'rate_limited',
          message: 'Rate limit exceeded. Please try again later.'
        }
      };
    }

    return {
      valid: false,
      provider: 'anthropic',
      details: {
        service: 'Anthropic Claude',
        status: 'error',
        message: `API error: ${response.status} ${response.statusText}`
      }
    };

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return {
      valid: false,
      provider: 'anthropic',
      details: {
        service: 'Anthropic Claude',
        status: 'error',
        message: `Network error: ${errorMessage}`
      }
    };
  }
}

async function testOpenAiKey(apiKey: string): Promise<TestApiKeyResponse> {
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      return {
        valid: true,
        provider: 'openai',
        details: {
          service: 'OpenAI',
          status: 'connected',
          message: 'API key is valid and working'
        }
      };
    }

    const errorData = await response.json().catch(() => ({}));

    if (response.status === 401) {
      return {
        valid: false,
        provider: 'openai',
        details: {
          service: 'OpenAI',
          status: 'unauthorized',
          message: errorData.error?.message || 'Invalid API key'
        }
      };
    }

    if (response.status === 429) {
      return {
        valid: false,
        provider: 'openai',
        details: {
          service: 'OpenAI',
          status: 'rate_limited',
          message: 'Rate limit exceeded. Please try again later.'
        }
      };
    }

    return {
      valid: false,
      provider: 'openai',
      details: {
        service: 'OpenAI',
        status: 'error',
        message: `API error: ${response.status} ${response.statusText}`
      }
    };

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return {
      valid: false,
      provider: 'openai',
      details: {
        service: 'OpenAI',
        status: 'error',
        message: `Network error: ${errorMessage}`
      }
    };
  }
}

async function testZoteroKey(apiKey: string, userId: string): Promise<TestApiKeyResponse> {
  try {
    const response = await fetch(`https://api.zotero.org/users/${userId}`, {
      method: 'GET',
      headers: {
        'Zotero-API-Key': apiKey
      }
    });

    if (response.ok) {
      const userData = await response.json();
      return {
        valid: true,
        provider: 'zotero',
        details: {
          service: 'Zotero',
          status: 'connected',
          message: `Connected to user: ${userData.displayName || userData.username || userId}`
        }
      };
    }

    if (response.status === 403) {
      return {
        valid: false,
        provider: 'zotero',
        details: {
          service: 'Zotero',
          status: 'unauthorized',
          message: 'Invalid API key or insufficient permissions'
        }
      };
    }

    if (response.status === 404) {
      return {
        valid: false,
        provider: 'zotero',
        details: {
          service: 'Zotero',
          status: 'error',
          message: 'User ID not found'
        }
      };
    }

    return {
      valid: false,
      provider: 'zotero',
      details: {
        service: 'Zotero',
        status: 'error',
        message: `API error: ${response.status} ${response.statusText}`
      }
    };

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return {
      valid: false,
      provider: 'zotero',
      details: {
        service: 'Zotero',
        status: 'error',
        message: `Network error: ${errorMessage}`
      }
    };
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Check authentication
    const session = await getServerSession(req, res, {});
    if (!session || !session.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (req.method !== 'POST') {
      res.setHeader('Allow', ['POST']);
      return res.status(405).json({ 
        error: `Method ${req.method} not allowed`
      });
    }

    const { provider, apiKey, userId }: TestApiKeyRequest = req.body;

    // Validate request
    const errors: string[] = [];

    if (!provider) {
      errors.push('Provider is required');
    } else if (!['anthropic', 'openai', 'zotero'].includes(provider)) {
      errors.push('Provider must be anthropic, openai, or zotero');
    }

    if (!apiKey || typeof apiKey !== 'string' || apiKey.trim() === '') {
      errors.push('API key is required');
    }

    if (provider === 'zotero' && (!userId || typeof userId !== 'string' || userId.trim() === '')) {
      errors.push('User ID is required for Zotero API testing');
    }

    if (errors.length > 0) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors
      });
    }

    // Test the API key based on provider
    let result: TestApiKeyResponse;

    switch (provider) {
      case 'anthropic':
        result = await testAnthropicKey(apiKey);
        break;
      case 'openai':
        result = await testOpenAiKey(apiKey);
        break;
      case 'zotero':
        result = await testZoteroKey(apiKey, userId!);
        break;
      default:
        return res.status(400).json({ 
          error: 'Invalid provider',
          details: ['Unsupported provider']
        });
    }

    return res.status(200).json(result);

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('API key test error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: errorMessage
    });
  }
}