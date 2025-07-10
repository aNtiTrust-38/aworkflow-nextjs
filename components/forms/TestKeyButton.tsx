import React, { useState } from 'react';
import { CheckCircleIcon, XCircleIcon, ClockIcon } from '@heroicons/react/24/outline';
import { ApiKeyTestRequest, ApiKeyTestResult } from '../../types/settings';

interface TestKeyButtonProps {
  provider: 'anthropic' | 'openai' | 'zotero';
  apiKey: string;
  userId?: string; // Required for Zotero
  onTestComplete?: (result: ApiKeyTestResult) => void;
  disabled?: boolean;
  className?: string;
}

export function TestKeyButton({
  provider,
  apiKey,
  userId,
  onTestComplete,
  disabled = false,
  className = ''
}: TestKeyButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<ApiKeyTestResult | null>(null);

  const handleTest = async () => {
    if (!apiKey.trim()) {
      const errorResult: ApiKeyTestResult = {
        valid: false,
        error: 'API key is required',
        details: {
          service: provider,
          status: 'error',
          message: 'Please enter an API key before testing'
        }
      };
      setTestResult(errorResult);
      onTestComplete?.(errorResult);
      return;
    }

    if (provider === 'zotero' && !userId?.trim()) {
      const errorResult: ApiKeyTestResult = {
        valid: false,
        error: 'User ID is required for Zotero',
        details: {
          service: 'Zotero',
          status: 'error',
          message: 'Please enter your Zotero User ID'
        }
      };
      setTestResult(errorResult);
      onTestComplete?.(errorResult);
      return;
    }

    setIsLoading(true);
    setTestResult(null);

    try {
      const testRequest: ApiKeyTestRequest = {
        provider,
        apiKey,
        ...(provider === 'zotero' && { userId })
      };

      const response = await fetch('/api/test-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testRequest),
      });

      const result: ApiKeyTestResult = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Test failed');
      }

      setTestResult(result);
      onTestComplete?.(result);
    } catch (error: any) {
      const errorResult: ApiKeyTestResult = {
        valid: false,
        error: error.message,
        details: {
          service: provider,
          status: 'error',
          message: 'Network error or service unavailable'
        }
      };
      setTestResult(errorResult);
      onTestComplete?.(errorResult);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = () => {
    if (isLoading) {
      return <ClockIcon className="h-4 w-4 animate-spin" />;
    }
    
    if (testResult) {
      return testResult.valid ? (
        <CheckCircleIcon className="h-4 w-4 text-green-600" />
      ) : (
        <XCircleIcon className="h-4 w-4 text-red-600" />
      );
    }
    
    return null;
  };

  const getStatusText = () => {
    if (isLoading) return 'Testing...';
    if (!testResult) return 'Test Connection';
    
    if (testResult.valid) {
      if (testResult.details?.status === 'rate_limited') {
        return 'Valid (Rate Limited)';
      }
      return 'Valid';
    } else {
      return 'Invalid';
    }
  };

  const getButtonClasses = () => {
    const baseClasses = `
      inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md
      border focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
      disabled:opacity-50 disabled:cursor-not-allowed
      transition-colors duration-200
      ${className}
    `.trim();

    if (testResult) {
      if (testResult.valid) {
        return `${baseClasses} border-green-300 bg-green-50 text-green-700 hover:bg-green-100`;
      } else {
        return `${baseClasses} border-red-300 bg-red-50 text-red-700 hover:bg-red-100`;
      }
    }

    return `${baseClasses} border-gray-300 bg-white text-gray-700 hover:bg-gray-50`;
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleTest}
        disabled={disabled || isLoading}
        className={getButtonClasses()}
        aria-label={`Test ${provider} API key`}
      >
        {getStatusIcon()}
        {getStatusText()}
      </button>

      {testResult && (
        <div className={`text-xs p-2 rounded ${
          testResult.valid ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
        }`}>
          <div className="font-medium">
            {testResult.details?.service || provider}
          </div>
          <div>
            {testResult.details?.message || testResult.error}
          </div>
          {testResult.details?.status && (
            <div className="text-xs opacity-75 mt-1">
              Status: {testResult.details.status}
            </div>
          )}
        </div>
      )}
    </div>
  );
}