import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface UserSettings {
  anthropicApiKey: string | null;
  openaiApiKey: string | null;
  monthlyBudget: number;
  preferredProvider: 'auto' | 'anthropic' | 'openai';
  citationStyle: string;
  defaultLanguage: string;
  adhdFriendlyMode: boolean;
  theme: string;
  reducedMotion: boolean;
  highContrast: boolean;
}

interface TestResult {
  valid: boolean;
  provider: string;
  details: {
    service: string;
    status: string;
    message?: string;
  };
}

interface ValidationError {
  field: string;
  message: string;
}

export function SettingsDashboard() {
  const { data: session } = useSession();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [originalSettings, setOriginalSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [testResults, setTestResults] = useState<{ [key: string]: TestResult }>({});
  const [testing, setTesting] = useState<{ [key: string]: boolean }>({});

  // Load settings on component mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/user-settings');
      if (!response.ok) {
        throw new Error('Failed to load settings');
      }
      
      const data = await response.json();
      setSettings(data);
      setOriginalSettings(data);
    } catch (err: any) {
      setError(`Failed to load settings: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Mask sensitive API keys for display
  const maskApiKey = (key: string | null): string => {
    if (!key) return '';
    if (key.length <= 8) return '••••••••';
    return `${key.substring(0, 6)}•••••••${key.slice(-4)}`;
  };

  // Check if input value is masked
  const isMaskedValue = (value: string): boolean => {
    return value.includes('•');
  };

  // Handle input changes
  const handleInputChange = (field: keyof UserSettings, value: any) => {
    if (!settings) return;
    
    // Don't update if the value is just the masked display
    if (typeof value === 'string' && isMaskedValue(value) && settings[field]) {
      return;
    }
    
    setSettings({
      ...settings,
      [field]: value
    });
    
    // Clear validation errors for this field
    setValidationErrors(prev => prev.filter(err => err.field !== field));
    
    // Clear success message when editing
    setSuccessMessage(null);
  };

  // Validate form fields
  const validateField = (field: keyof UserSettings, value: any): string | null => {
    switch (field) {
      case 'anthropicApiKey':
        if (value && typeof value === 'string' && value.trim() !== '' && !value.startsWith('sk-ant-')) {
          return 'API key must start with sk-ant-';
        }
        break;
      case 'openaiApiKey':
        if (value && typeof value === 'string' && value.trim() !== '' && !value.startsWith('sk-')) {
          return 'API key must start with sk-';
        }
        break;
      case 'monthlyBudget':
        if (typeof value === 'number' && value < 0) {
          return 'Budget must be positive';
        }
        break;
    }
    return null;
  };

  // Handle field blur for validation
  const handleBlur = (field: keyof UserSettings) => {
    if (!settings) return;
    
    const value = settings[field];
    const error = validateField(field, value);
    
    if (error) {
      setValidationErrors(prev => [
        ...prev.filter(err => err.field !== field),
        { field, message: error }
      ]);
    }
  };

  // Get validation error for field
  const getFieldError = (field: string): string | null => {
    const error = validationErrors.find(err => err.field === field);
    return error ? error.message : null;
  };

  // Get changed fields only
  const getChangedFields = (): Partial<UserSettings> => {
    if (!settings || !originalSettings) return {};
    
    const changes: Partial<UserSettings> = {};
    
    Object.keys(settings).forEach(key => {
      const field = key as keyof UserSettings;
      if (settings[field] !== originalSettings[field]) {
        changes[field] = settings[field];
      }
    });
    
    return changes;
  };

  // Test API key
  const testApiKey = async (provider: 'anthropic' | 'openai') => {
    if (!settings) return;
    
    const apiKey = provider === 'anthropic' ? settings.anthropicApiKey : settings.openaiApiKey;
    if (!apiKey) return;
    
    try {
      setTesting(prev => ({ ...prev, [provider]: true }));
      
      const response = await fetch('/api/test-api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          apiKey
        })
      });
      
      const result = await response.json();
      setTestResults(prev => ({ ...prev, [provider]: result }));
    } catch (error: any) {
      setTestResults(prev => ({
        ...prev,
        [provider]: {
          valid: false,
          provider,
          details: {
            service: provider === 'anthropic' ? 'Anthropic Claude' : 'OpenAI',
            status: 'error',
            message: `Test failed: ${error.message}`
          }
        }
      }));
    } finally {
      setTesting(prev => ({ ...prev, [provider]: false }));
    }
  };

  // Save settings
  const saveSettings = async () => {
    if (!settings) return;
    
    // Validate all fields
    const errors: ValidationError[] = [];
    Object.keys(settings).forEach(key => {
      const field = key as keyof UserSettings;
      const error = validateField(field, settings[field]);
      if (error) {
        errors.push({ field, message: error });
      }
    });
    
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }
    
    const changes = getChangedFields();
    if (Object.keys(changes).length === 0) {
      setSuccessMessage('No changes to save');
      return;
    }
    
    try {
      setSaving(true);
      setError(null);
      
      const response = await fetch('/api/user-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(changes)
      });
      
      if (!response.ok) {
        throw new Error('Failed to save settings');
      }
      
      const updatedSettings = await response.json();
      setSettings(updatedSettings);
      setOriginalSettings(updatedSettings);
      setSuccessMessage('Settings saved successfully');
      
      // Clear test results when settings change
      setTestResults({});
    } catch (err: any) {
      setError(`Failed to save settings: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center">Loading settings...</div>
      </div>
    );
  }

  if (error && !settings) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-red-600">{error}</div>
        <button 
          onClick={loadSettings}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Settings Dashboard</h1>
      
      {/* Success/Error Messages */}
      {successMessage && (
        <div className="mb-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
          {successMessage}
        </div>
      )}
      
      {error && (
        <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}
      
      <div className="space-y-8">
        {/* AI Provider Settings */}
        <section className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">AI Provider Settings</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Anthropic API Key */}
            <div>
              <label htmlFor="anthropicApiKey" className="block text-sm font-medium text-gray-700 mb-2">
                Anthropic API Key
              </label>
              <div className="flex space-x-2">
                <input
                  id="anthropicApiKey"
                  type="password"
                  value={settings?.anthropicApiKey ? maskApiKey(settings.anthropicApiKey) : ''}
                  onChange={(e) => handleInputChange('anthropicApiKey', e.target.value)}
                  onBlur={() => handleBlur('anthropicApiKey')}
                  className={`flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    getFieldError('anthropicApiKey') ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="sk-ant-..."
                  tabIndex={0}
                />
                <button
                  type="button"
                  onClick={() => testApiKey('anthropic')}
                  disabled={!settings?.anthropicApiKey || testing.anthropic}
                  className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {testing.anthropic ? 'Testing...' : 'Test Anthropic Key'}
                </button>
              </div>
              {getFieldError('anthropicApiKey') && (
                <p className="mt-1 text-sm text-red-600">{getFieldError('anthropicApiKey')}</p>
              )}
              {testResults.anthropic && (
                <div className={`mt-2 p-2 rounded ${testResults.anthropic.valid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {testResults.anthropic.valid ? '✓' : '✗'} {testResults.anthropic.details.message}
                </div>
              )}
            </div>
            
            {/* OpenAI API Key */}
            <div>
              <label htmlFor="openaiApiKey" className="block text-sm font-medium text-gray-700 mb-2">
                OpenAI API Key
              </label>
              <div className="flex space-x-2">
                <input
                  id="openaiApiKey"
                  type="password"
                  value={settings?.openaiApiKey ? maskApiKey(settings.openaiApiKey) : ''}
                  onChange={(e) => handleInputChange('openaiApiKey', e.target.value)}
                  onBlur={() => handleBlur('openaiApiKey')}
                  className={`flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    getFieldError('openaiApiKey') ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="sk-..."
                  tabIndex={0}
                />
                <button
                  type="button"
                  onClick={() => testApiKey('openai')}
                  disabled={!settings?.openaiApiKey || testing.openai}
                  className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {testing.openai ? 'Testing...' : 'Test OpenAI Key'}
                </button>
              </div>
              {getFieldError('openaiApiKey') && (
                <p className="mt-1 text-sm text-red-600">{getFieldError('openaiApiKey')}</p>
              )}
              {testResults.openai && (
                <div className={`mt-2 p-2 rounded ${testResults.openai.valid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {testResults.openai.valid ? '✓' : '✗'} {testResults.openai.details.message}
                </div>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            {/* Monthly Budget */}
            <div>
              <label htmlFor="monthlyBudget" className="block text-sm font-medium text-gray-700 mb-2">
                Monthly Budget ($)
              </label>
              <input
                id="monthlyBudget"
                type="number"
                value={settings?.monthlyBudget || 0}
                onChange={(e) => handleInputChange('monthlyBudget', parseFloat(e.target.value))}
                onBlur={() => handleBlur('monthlyBudget')}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  getFieldError('monthlyBudget') ? 'border-red-500' : 'border-gray-300'
                }`}
                min="0"
                step="0.01"
                tabIndex={0}
              />
              {getFieldError('monthlyBudget') && (
                <p className="mt-1 text-sm text-red-600">{getFieldError('monthlyBudget')}</p>
              )}
            </div>
            
            {/* Preferred Provider */}
            <div>
              <label htmlFor="preferredProvider" className="block text-sm font-medium text-gray-700 mb-2">
                Preferred Provider
              </label>
              <select
                id="preferredProvider"
                value={settings?.preferredProvider || 'auto'}
                onChange={(e) => handleInputChange('preferredProvider', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                tabIndex={0}
              >
                <option value="auto">Auto</option>
                <option value="anthropic">Anthropic</option>
                <option value="openai">OpenAI</option>
              </select>
            </div>
          </div>
        </section>
        
        {/* Academic Preferences */}
        <section className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Academic Preferences</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Citation Style */}
            <div>
              <label htmlFor="citationStyle" className="block text-sm font-medium text-gray-700 mb-2">
                Citation Style
              </label>
              <select
                id="citationStyle"
                value={settings?.citationStyle || 'apa'}
                onChange={(e) => handleInputChange('citationStyle', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                tabIndex={0}
              >
                <option value="apa">APA</option>
                <option value="mla">MLA</option>
                <option value="chicago">Chicago</option>
                <option value="harvard">Harvard</option>
              </select>
            </div>
            
            {/* Default Language */}
            <div>
              <label htmlFor="defaultLanguage" className="block text-sm font-medium text-gray-700 mb-2">
                Default Language
              </label>
              <select
                id="defaultLanguage"
                value={settings?.defaultLanguage || 'en'}
                onChange={(e) => handleInputChange('defaultLanguage', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                tabIndex={0}
              >
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
              </select>
            </div>
            
            {/* ADHD Friendly Mode */}
            <div className="flex items-center">
              <input
                id="adhdFriendlyMode"
                type="checkbox"
                checked={settings?.adhdFriendlyMode || false}
                onChange={(e) => handleInputChange('adhdFriendlyMode', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="adhdFriendlyMode" className="ml-2 block text-sm text-gray-700">
                ADHD Friendly Mode
              </label>
            </div>
          </div>
        </section>
        
        {/* UI Preferences */}
        <section className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">UI Preferences</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Theme */}
            <div>
              <label htmlFor="theme" className="block text-sm font-medium text-gray-700 mb-2">
                Theme
              </label>
              <select
                id="theme"
                value={settings?.theme || 'system'}
                onChange={(e) => handleInputChange('theme', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                tabIndex={0}
              >
                <option value="system">System</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </div>
            
            {/* Reduced Motion */}
            <div className="flex items-center">
              <input
                id="reducedMotion"
                type="checkbox"
                checked={settings?.reducedMotion || false}
                onChange={(e) => handleInputChange('reducedMotion', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="reducedMotion" className="ml-2 block text-sm text-gray-700">
                Reduced Motion
              </label>
            </div>
            
            {/* High Contrast */}
            <div className="flex items-center">
              <input
                id="highContrast"
                type="checkbox"
                checked={settings?.highContrast || false}
                onChange={(e) => handleInputChange('highContrast', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="highContrast" className="ml-2 block text-sm text-gray-700">
                High Contrast
              </label>
            </div>
          </div>
        </section>
        
        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={saveSettings}
            disabled={saving || validationErrors.length > 0}
            className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 font-medium"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}