import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

type Provider = 'anthropic' | 'openai' | 'zotero';

interface TestResult {
  valid: boolean;
  provider: string;
  details: {
    service: string;
    status: 'connected' | 'error' | 'unauthorized' | 'rate_limited';
    message?: string;
    metadata?: {
      model?: string;
      rateLimit?: string;
      credits?: string;
    };
  };
}

interface ValidationError {
  field: string;
  message: string;
}

export function ApiKeyTester() {
  const { data: session } = useSession();
  const [provider, setProvider] = useState<Provider>('anthropic');
  const [apiKey, setApiKey] = useState('');
  const [userId, setUserId] = useState(''); // For Zotero
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [realTimeValidation, setRealTimeValidation] = useState<{
    isValid: boolean;
    message: string;
  } | null>(null);

  // Real-time validation effect
  useEffect(() => {
    if (!apiKey) {
      setRealTimeValidation(null);
      return;
    }

    setIsTyping(true);
    const timer = setTimeout(() => {
      setIsTyping(false);
      validateApiKeyFormat(apiKey, provider);
    }, 500);

    return () => clearTimeout(timer);
  }, [apiKey, provider]);

  // Validate API key format
  const validateApiKeyFormat = (key: string, prov: Provider): string | null => {
    if (!key.trim()) return 'API key is required';

    switch (prov) {
      case 'anthropic':
        if (!key.startsWith('sk-ant-')) {
          const error = 'Anthropic API keys must start with sk-ant-';
          setRealTimeValidation({ isValid: false, message: '✗ Invalid format' });
          return error;
        }
        break;
      case 'openai':
        if (!key.startsWith('sk-')) {
          const error = 'OpenAI API keys must start with sk-';
          setRealTimeValidation({ isValid: false, message: '✗ Invalid format' });
          return error;
        }
        break;
      case 'zotero':
        // Zotero keys can be any format
        break;
    }

    setRealTimeValidation({ isValid: true, message: '✓ Valid format' });
    return null;
  };

  // Handle field blur for validation
  const handleBlur = (field: string, value: string) => {
    if (field === 'apiKey') {
      const error = validateApiKeyFormat(value, provider);
      if (error) {
        setValidationErrors(prev => [
          ...prev.filter(err => err.field !== field),
          { field, message: error }
        ]);
      } else {
        setValidationErrors(prev => prev.filter(err => err.field !== field));
      }
    }
  };

  // Get validation error for field
  const getFieldError = (field: string): string | null => {
    const error = validationErrors.find(err => err.field === field);
    return error ? error.message : null;
  };

  // Check if form can be submitted
  const canSubmit = (): boolean => {
    if (!apiKey.trim()) return false;
    if (provider === 'zotero' && !userId.trim()) return false;
    if (validationErrors.length > 0) return false;
    if (testing) return false;
    return true;
  };

  // Test API key
  const testApiKey = async () => {
    if (!canSubmit()) return;

    try {
      setTesting(true);
      setTestResult(null);

      const requestBody: any = {
        provider,
        apiKey
      };

      if (provider === 'zotero') {
        requestBody.userId = userId;
      }

      const response = await fetch('/api/test-api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const result = await response.json();
      setTestResult(result);
    } catch (error: any) {
      setTestResult({
        valid: false,
        provider,
        details: {
          service: provider === 'anthropic' ? 'Anthropic Claude' : 
                   provider === 'openai' ? 'OpenAI' : 'Zotero',
          status: 'error',
          message: `Network error: ${error.message}`
        }
      });
    } finally {
      setTesting(false);
    }
  };

  // Handle provider change
  const handleProviderChange = (newProvider: Provider) => {
    setProvider(newProvider);
    setApiKey('');
    setUserId('');
    setTestResult(null);
    setValidationErrors([]);
    setRealTimeValidation(null);
  };

  // Handle API key change
  const handleApiKeyChange = (value: string) => {
    setApiKey(value);
    setTestResult(null);
    // Clear validation errors for this field
    setValidationErrors(prev => prev.filter(err => err.field !== 'apiKey'));
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">API Key Testing</h2>
        <p className="text-gray-600 mb-6">Test your API keys for connectivity and functionality</p>

        <div className="space-y-6">
          {/* Provider Selection */}
          <div>
            <label htmlFor="provider" className="block text-sm font-medium text-gray-700 mb-2">
              Select Provider
            </label>
            <select
              id="provider"
              value={provider}
              onChange={(e) => handleProviderChange(e.target.value as Provider)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              tabIndex={0}
            >
              <option value="anthropic">Anthropic</option>
              <option value="openai">OpenAI</option>
              <option value="zotero">Zotero</option>
            </select>
          </div>

          {/* API Key Input */}
          <div>
            <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 mb-2">
              API Key
            </label>
            <input
              id="apiKey"
              type="password"
              value={apiKey}
              onChange={(e) => handleApiKeyChange(e.target.value)}
              onBlur={(e) => handleBlur('apiKey', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                getFieldError('apiKey') ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter your API key..."
              tabIndex={0}
            />
            
            {/* Real-time feedback */}
            {isTyping && apiKey && (
              <p className="mt-1 text-sm text-blue-600">
                Entering {provider === 'anthropic' ? 'Anthropic' : provider === 'openai' ? 'OpenAI' : 'Zotero'} API key...
              </p>
            )}
            
            {realTimeValidation && !isTyping && (
              <p className={`mt-1 text-sm ${realTimeValidation.isValid ? 'text-green-600' : 'text-red-600'}`}>
                {realTimeValidation.message}
              </p>
            )}
            
            {getFieldError('apiKey') && (
              <p className="mt-1 text-sm text-red-600">{getFieldError('apiKey')}</p>
            )}
          </div>

          {/* User ID for Zotero */}
          {provider === 'zotero' && (
            <div>
              <label htmlFor="userId" className="block text-sm font-medium text-gray-700 mb-2">
                User ID
              </label>
              <input
                id="userId"
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your Zotero User ID..."
                tabIndex={0}
              />
            </div>
          )}

          {/* Test Button */}
          <div>
            <button
              onClick={testApiKey}
              disabled={!canSubmit()}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
              tabIndex={0}
            >
              {testing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Testing...
                </>
              ) : (
                'Test API Key'
              )}
            </button>
          </div>

          {/* Progress Bar during testing */}
          {testing && (
            <div className="space-y-2">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full animate-pulse"
                  style={{ width: '75%' }}
                  role="progressbar"
                  aria-valuenow={75}
                  aria-valuemin={0}
                  aria-valuemax={100}
                />
              </div>
              <p className="text-sm text-gray-600 text-center">Testing connection...</p>
            </div>
          )}

          {/* Test Results */}
          {testResult && (
            <div 
              className={`p-4 rounded-lg border ${
                testResult.valid 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-red-50 border-red-200'
              }`}
              role="region"
              aria-label="Test results"
              aria-live="polite"
            >
              <div className="flex items-start space-x-3">
                <div className={`text-xl ${testResult.valid ? 'text-green-600' : 'text-red-600'}`}>
                  {testResult.valid ? '✓' : '✗'}
                </div>
                <div className="flex-1">
                  <h4 className={`font-medium ${testResult.valid ? 'text-green-800' : 'text-red-800'}`}>
                    {testResult.details.service}
                  </h4>
                  <p className={`text-sm mt-1 ${testResult.valid ? 'text-green-700' : 'text-red-700'}`}>
                    Status: {testResult.details.status}
                  </p>
                  {testResult.details.message && (
                    <p className={`text-sm mt-1 ${testResult.valid ? 'text-green-700' : 'text-red-700'}`}>
                      {testResult.valid ? '✓' : '✗'} {testResult.details.message}
                    </p>
                  )}
                  
                  {/* Enhanced metadata display */}
                  {testResult.valid && testResult.details.metadata && (
                    <div className="mt-3 text-sm text-green-700 space-y-1">
                      {testResult.details.metadata.model && (
                        <p>Model: {testResult.details.metadata.model}</p>
                      )}
                      {testResult.details.metadata.rateLimit && (
                        <p>Rate Limit: {testResult.details.metadata.rateLimit}</p>
                      )}
                      {testResult.details.metadata.credits && (
                        <p>Credits: {testResult.details.metadata.credits}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}