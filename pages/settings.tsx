import React, { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import { getServerSession } from 'next-auth/next';
import Head from 'next/head';
import { 
  CogIcon, 
  KeyIcon, 
  ShieldCheckIcon, 
  CloudIcon,
  CircleStackIcon,
  BookOpenIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { FormField, TestKeyButton, SettingsCard, LoadingButton } from '../components/forms';
import { 
  MaskedSettings, 
  SettingsUpdateRequest, 
  SettingsValidationError,
  ApiKeyTestResult 
} from '../types/settings';

interface SettingsPageProps {
  initialSettings: MaskedSettings | null;
  error?: string;
}

export default function SettingsPage({ initialSettings, error }: SettingsPageProps) {
  const [settings, setSettings] = useState<MaskedSettings | null>(initialSettings);
  const [formData, setFormData] = useState<Partial<SettingsUpdateRequest>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [testResults, setTestResults] = useState<Record<string, ApiKeyTestResult>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [activeCard, setActiveCard] = useState<string | null>(null);

  useEffect(() => {
    if (initialSettings) {
      // Initialize form data with masked values for display
      setFormData({
        anthropicKey: '',
        openaiKey: '',
        aiMonthlyBudget: initialSettings.aiMonthlyBudget || 100,
        nextauthSecret: '',
        nextauthUrl: initialSettings.nextauthUrl || '',
        zoteroApiKey: '',
        zoteroUserId: initialSettings.zoteroUserId || '',
        enableAnalytics: initialSettings.enableAnalytics || false
      });
    }
  }, [initialSettings]);

  const handleFieldChange = (key: string, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    
    // Clear error when user starts typing
    if (errors[key]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[key];
        return newErrors;
      });
    }
    
    // Reset save status when form changes
    if (saveStatus === 'success') {
      setSaveStatus('idle');
    }
  };

  const handleTestResult = (key: string, result: ApiKeyTestResult) => {
    setTestResults(prev => ({ ...prev, [key]: result }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    // Only validate fields that have been modified
    Object.keys(formData).forEach(key => {
      const value = formData[key as keyof SettingsUpdateRequest];
      
      if (key === 'anthropicKey' && value && typeof value === 'string') {
        if (!value.startsWith('sk-ant-')) {
          newErrors[key] = 'Anthropic API key must start with sk-ant-';
        }
      }
      
      if (key === 'openaiKey' && value && typeof value === 'string') {
        if (!value.startsWith('sk-')) {
          newErrors[key] = 'OpenAI API key must start with sk-';
        }
      }
      
      if (key === 'nextauthUrl' && value && typeof value === 'string') {
        if (!value.match(/^https?:\/\//)) {
          newErrors[key] = 'NextAuth URL must start with http:// or https://';
        }
      }
      
      if (key === 'aiMonthlyBudget' && value && typeof value === 'number') {
        if (value < 0) {
          newErrors[key] = 'Budget must be a positive number';
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setSaveStatus('saving');
    setIsLoading(true);

    try {
      // Filter out empty values to only update what's been changed
      const updates: Partial<SettingsUpdateRequest> = {};
      Object.entries(formData).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          (updates as any)[key] = value;
        }
      });

      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || 'Failed to save settings');
      }

      const updatedSettings: MaskedSettings = await response.json();
      setSettings(updatedSettings);
      setSaveStatus('success');
      
      // Clear form for sensitive fields
      setFormData(prev => ({
        ...prev,
        anthropicKey: '',
        openaiKey: '',
        nextauthSecret: '',
        zoteroApiKey: ''
      }));

      // Auto-hide success message after 3 seconds
      setTimeout(() => {
        setSaveStatus('idle');
      }, 3000);

    } catch (error: any) {
      console.error('Save failed:', error);
      setSaveStatus('error');
      setErrors({ general: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCardToggle = (cardId: string) => {
    setActiveCard(activeCard === cardId ? null : cardId);
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md border border-red-200">
          <div className="flex items-center text-red-600 mb-4">
            <ExclamationTriangleIcon className="h-6 w-6 mr-2" />
            <h1 className="text-xl font-semibold">Settings Error</h1>
          </div>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Settings - Academic Workflow</title>
        <meta name="description" content="Configure your Academic Workflow application settings" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <CogIcon className="h-8 w-8 mr-3" />
              Application Settings
            </h1>
            <p className="mt-2 text-gray-600">
              Configure your API keys, authentication, and application preferences.
            </p>
          </div>

          {/* Global Status Messages */}
          {saveStatus === 'success' && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
              <div className="flex items-center">
                <CheckCircleIcon className="h-5 w-5 text-green-400 mr-2" />
                <span className="text-green-800">Settings saved successfully!</span>
              </div>
            </div>
          )}

          {errors.general && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
              <div className="flex items-center">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mr-2" />
                <span className="text-red-800">{errors.general}</span>
              </div>
            </div>
          )}

          <div className="space-y-6">
            {/* AI Providers Section */}
            <SettingsCard
              title="AI Providers"
              description="Configure your AI API keys for content generation and analysis"
              configured={settings.configured.anthropic || settings.configured.openai}
              required={true}
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Anthropic */}
                <div className="space-y-4">
                  <div className="flex items-center">
                    <KeyIcon className="h-5 w-5 text-blue-500 mr-2" />
                    <h4 className="font-medium text-gray-900">Anthropic Claude</h4>
                    {settings.configured.anthropic && (
                      <CheckCircleIcon className="h-4 w-4 text-green-500 ml-auto" />
                    )}
                  </div>
                  
                  <FormField
                    id="anthropicKey"
                    label="API Key"
                    type="password"
                    value={formData.anthropicKey || ''}
                    onChange={(value) => handleFieldChange('anthropicKey', value)}
                    placeholder={settings.anthropicKey || 'sk-ant-...'}
                    helpText="Primary AI provider for research and analysis"
                    error={errors.anthropicKey}
                  />
                  
                  {formData.anthropicKey && (
                    <TestKeyButton
                      provider="anthropic"
                      apiKey={formData.anthropicKey}
                      onTestComplete={(result) => handleTestResult('anthropicKey', result)}
                    />
                  )}
                </div>

                {/* OpenAI */}
                <div className="space-y-4">
                  <div className="flex items-center">
                    <CloudIcon className="h-5 w-5 text-green-500 mr-2" />
                    <h4 className="font-medium text-gray-900">OpenAI GPT</h4>
                    {settings.configured.openai && (
                      <CheckCircleIcon className="h-4 w-4 text-green-500 ml-auto" />
                    )}
                  </div>
                  
                  <FormField
                    id="openaiKey"
                    label="API Key"
                    type="password"
                    value={formData.openaiKey || ''}
                    onChange={(value) => handleFieldChange('openaiKey', value)}
                    placeholder={settings.openaiKey || 'sk-...'}
                    helpText="Secondary AI provider for writing and review"
                    error={errors.openaiKey}
                  />
                  
                  {formData.openaiKey && (
                    <TestKeyButton
                      provider="openai"
                      apiKey={formData.openaiKey}
                      onTestComplete={(result) => handleTestResult('openaiKey', result)}
                    />
                  )}
                </div>
              </div>

              {/* AI Budget */}
              <div className="pt-4 border-t border-gray-200">
                <FormField
                  id="aiMonthlyBudget"
                  label="Monthly AI Budget (USD)"
                  type="number"
                  value={formData.aiMonthlyBudget || 100}
                  onChange={(value) => handleFieldChange('aiMonthlyBudget', value)}
                  helpText="Set a spending limit for AI API usage"
                  error={errors.aiMonthlyBudget}
                />
              </div>
            </SettingsCard>

            {/* Authentication Section */}
            <SettingsCard
              title="Authentication"
              description="Configure secure authentication for your application"
              configured={settings.configured.auth}
              required={true}
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <FormField
                  id="nextauthSecret"
                  label="NextAuth Secret"
                  type="password"
                  value={formData.nextauthSecret || ''}
                  onChange={(value) => handleFieldChange('nextauthSecret', value)}
                  placeholder={settings.nextauthSecret || 'Secure random string...'}
                  helpText="A secure random string for authentication"
                  error={errors.nextauthSecret}
                />
                
                <FormField
                  id="nextauthUrl"
                  label="Application URL"
                  type="url"
                  value={formData.nextauthUrl || ''}
                  onChange={(value) => handleFieldChange('nextauthUrl', value)}
                  placeholder="http://localhost:3000"
                  helpText="The base URL of your application"
                  error={errors.nextauthUrl}
                />
              </div>
            </SettingsCard>

            {/* Zotero Integration */}
            <SettingsCard
              title="Zotero Integration"
              description="Connect your Zotero library for reference management"
              configured={settings.configured.zotero}
              required={false}
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <FormField
                    id="zoteroApiKey"
                    label="Zotero API Key"
                    type="password"
                    value={formData.zoteroApiKey || ''}
                    onChange={(value) => handleFieldChange('zoteroApiKey', value)}
                    placeholder={settings.zoteroApiKey || 'Your Zotero API key...'}
                    helpText="Get your API key from Zotero settings"
                    error={errors.zoteroApiKey}
                  />
                  
                  {formData.zoteroApiKey && formData.zoteroUserId && (
                    <TestKeyButton
                      provider="zotero"
                      apiKey={formData.zoteroApiKey}
                      userId={formData.zoteroUserId}
                      onTestComplete={(result) => handleTestResult('zoteroApiKey', result)}
                    />
                  )}
                </div>
                
                <FormField
                  id="zoteroUserId"
                  label="User ID"
                  type="text"
                  value={formData.zoteroUserId || ''}
                  onChange={(value) => handleFieldChange('zoteroUserId', value)}
                  helpText="Your Zotero user ID from account settings"
                  error={errors.zoteroUserId}
                />
              </div>
            </SettingsCard>

            {/* Application Features */}
            <SettingsCard
              title="Application Features"
              description="Configure optional features and preferences"
              configured={true}
              required={false}
            >
              <div className="space-y-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.enableAnalytics || false}
                    onChange={(e) => handleFieldChange('enableAnalytics', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Enable usage analytics to help improve the application
                  </span>
                </label>
              </div>
            </SettingsCard>
          </div>

          {/* Save Button */}
          <div className="mt-8 flex justify-end">
            <LoadingButton
              onClick={handleSave}
              loading={isLoading}
              success={saveStatus === 'success'}
              error={saveStatus === 'error'}
              disabled={Object.keys(errors).length > 0}
              size="lg"
              loadingText="Saving Settings..."
              successText="Settings Saved!"
              errorText="Save Failed"
            >
              Save Settings
            </LoadingButton>
          </div>
        </div>
      </div>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  try {
    // Check authentication
    const session = await getServerSession(context.req, context.res, {});
    
    if (!session) {
      return {
        redirect: {
          destination: '/auth/signin',
          permanent: false,
        },
      };
    }

    // Fetch initial settings
    const protocol = context.req.headers['x-forwarded-proto'] || 'http';
    const host = context.req.headers.host;
    const baseUrl = `${protocol}://${host}`;

    const response = await fetch(`${baseUrl}/api/settings`, {
      headers: {
        cookie: context.req.headers.cookie || '',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch settings');
    }

    const settings = await response.json();

    return {
      props: {
        initialSettings: settings,
      },
    };
  } catch (error: any) {
    console.error('Settings page error:', error);
    return {
      props: {
        initialSettings: null,
        error: error.message || 'Failed to load settings',
      },
    };
  }
};