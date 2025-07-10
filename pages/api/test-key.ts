import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { ApiKeyTestRequest, ApiKeyTestResult } from '../../types/settings';

/**
 * Test API key validity for different providers
 */
async function testAnthropicKey(apiKey: string): Promise<ApiKeyTestResult> {
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'test' }]
      })
    });

    if (response.ok) {
      return {
        valid: true,
        details: {
          service: 'Anthropic Claude',
          status: 'connected',
          message: 'API key is valid and working'
        }
      };
    } else if (response.status === 401) {
      return {
        valid: false,
        error: 'Invalid API key',
        details: {
          service: 'Anthropic Claude',
          status: 'unauthorized',
          message: 'API key is invalid or expired'
        }
      };
    } else if (response.status === 429) {
      return {
        valid: true, // Key is valid but rate limited
        details: {
          service: 'Anthropic Claude',
          status: 'rate_limited',
          message: 'API key is valid but rate limited'
        }
      };
    } else {
      return {
        valid: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
        details: {
          service: 'Anthropic Claude',
          status: 'error',
          message: `Unexpected response: ${response.status}`
        }
      };
    }
  } catch (error: any) {
    return {
      valid: false,
      error: error.message,
      details: {
        service: 'Anthropic Claude',
        status: 'error',
        message: 'Network error or service unavailable'
      }
    };
  }
}

async function testOpenAIKey(apiKey: string): Promise<ApiKeyTestResult> {
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
        details: {
          service: 'OpenAI',
          status: 'connected',
          message: 'API key is valid and working'
        }
      };
    } else if (response.status === 401) {
      return {
        valid: false,
        error: 'Invalid API key',
        details: {
          service: 'OpenAI',
          status: 'unauthorized',
          message: 'API key is invalid or expired'
        }
      };
    } else if (response.status === 429) {
      return {
        valid: true,
        details: {
          service: 'OpenAI',
          status: 'rate_limited',
          message: 'API key is valid but rate limited'
        }
      };
    } else {
      return {
        valid: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
        details: {
          service: 'OpenAI',
          status: 'error',
          message: `Unexpected response: ${response.status}`
        }
      };
    }
  } catch (error: any) {
    return {
      valid: false,
      error: error.message,
      details: {
        service: 'OpenAI',
        status: 'error',
        message: 'Network error or service unavailable'
      }
    };
  }
}

async function testZoteroKey(apiKey: string, userId?: string): Promise<ApiKeyTestResult> {
  try {
    if (!userId) {
      return {
        valid: false,
        error: 'User ID required for Zotero API',
        details: {
          service: 'Zotero',
          status: 'error',
          message: 'User ID is required to test Zotero API key'
        }
      };
    }

    const response = await fetch(`https://api.zotero.org/users/${userId}/collections`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Zotero-API-Version': '3'
      }
    });

    if (response.ok) {
      return {
        valid: true,
        details: {
          service: 'Zotero',
          status: 'connected',
          message: 'API key is valid and working'
        }
      };
    } else if (response.status === 403) {
      return {
        valid: false,
        error: 'Invalid API key or insufficient permissions',
        details: {
          service: 'Zotero',
          status: 'unauthorized',
          message: 'API key is invalid or lacks required permissions'
        }
      };
    } else if (response.status === 429) {
      return {
        valid: true,
        details: {
          service: 'Zotero',
          status: 'rate_limited',
          message: 'API key is valid but rate limited'
        }
      };
    } else {
      return {
        valid: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
        details: {
          service: 'Zotero',
          status: 'error',
          message: `Unexpected response: ${response.status}`
        }
      };
    }
  } catch (error: any) {
    return {
      valid: false,
      error: error.message,
      details: {
        service: 'Zotero',
        status: 'error',
        message: 'Network error or service unavailable'
      }
    };
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Check authentication
    const session = await getServerSession(req, res, {});
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (req.method !== 'POST') {
      res.setHeader('Allow', ['POST']);
      return res.status(405).json({ 
        error: `Method ${req.method} not allowed`
      });
    }

    const testRequest: ApiKeyTestRequest = req.body;

    // Validate request
    if (!testRequest.provider || !testRequest.apiKey) {
      return res.status(400).json({
        error: 'Missing required fields',
        details: 'provider and apiKey are required'
      });
    }

    if (!['anthropic', 'openai', 'zotero'].includes(testRequest.provider)) {
      return res.status(400).json({
        error: 'Invalid provider',
        details: 'provider must be one of: anthropic, openai, zotero'
      });
    }

    // Test the API key based on provider
    let result: ApiKeyTestResult;

    switch (testRequest.provider) {
      case 'anthropic':
        result = await testAnthropicKey(testRequest.apiKey);
        break;
      case 'openai':
        result = await testOpenAIKey(testRequest.apiKey);
        break;
      case 'zotero':
        result = await testZoteroKey(testRequest.apiKey, testRequest.userId);
        break;
      default:
        return res.status(400).json({
          error: 'Invalid provider',
          details: 'Unsupported provider specified'
        });
    }

    // Log the test attempt for audit purposes
    console.log(`API key test for ${testRequest.provider}: ${result.valid ? 'success' : 'failed'} - ${session.user?.email || 'unknown'}`);

    return res.status(200).json(result);

  } catch (error: any) {
    console.error('API key test error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
}