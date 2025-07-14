import React, { useState, useEffect, useCallback } from 'react';
import { flushSync } from 'react-dom';
import { useSession } from 'next-auth/react';

interface SetupStatus {
  isSetup: boolean;
  completedSteps: string[];
  nextStep: string | null;
  requiredSettings: string[];
  missingSettings: string[];
}

interface SetupWizardState {
  currentStep: number;
  settings: {
    anthropicApiKey: string;
    openaiApiKey: string;
    monthlyBudget: number;
    preferredProvider: 'auto' | 'anthropic' | 'openai';
    citationStyle: string;
    defaultLanguage: string;
    adhdFriendlyMode: boolean;
    theme: string;
    reducedMotion: boolean;
    highContrast: boolean;
  };
  testResults: { 
    [key: string]: {
      valid: boolean;
      details?: { message: string };
    } | null;
  };
  testing: { [key: string]: boolean };
}

interface ValidationError {
  field: string;
  message: string;
}

export function SetupWizard() {
  const { data: session } = useSession();
  void session; // Satisfy unused variable warning
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [setupStatus, setSetupStatus] = useState<SetupStatus | null>(null);
  const [completing, setCompleting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  
  const [wizardState, setWizardState] = useState<SetupWizardState>({
    currentStep: 0,
    settings: {
      anthropicApiKey: '',
      openaiApiKey: '',
      monthlyBudget: 100,
      preferredProvider: 'auto',
      citationStyle: 'apa',
      defaultLanguage: 'en',
      adhdFriendlyMode: false,
      theme: 'system',
      reducedMotion: false,
      highContrast: false
    },
    testResults: {},
    testing: {}
  });

  const steps = [
    {
      id: 'welcome',
      title: 'Welcome to Academic Workflow Assistant',
      description: 'Let\'s get you set up with your AI-powered research assistant'
    },
    {
      id: 'apiKeys',
      title: 'AI Provider Configuration',
      description: 'Configure your AI provider settings'
    },
    {
      id: 'preferences',
      title: 'Academic Preferences',
      description: 'Set your academic and citation preferences'
    },
    {
      id: 'review',
      title: 'Review & Complete',
      description: 'Review your configuration and complete setup'
    }
  ];

  // Load setup status on component mount
  useEffect(() => {
    loadSetupStatus();
  }, [loadSetupStatus]);

  // 1. Patch: Robustly parse setupStatus and restore wizard step on mount
  // Defensive: handle corrupted/missing fields
  useEffect(() => {
    if (setupStatus && !loading && !error) {
      // Defensive: handle corrupted/missing fields
      const completedSteps = Array.isArray(setupStatus.completedSteps) ? setupStatus.completedSteps : [];
      void completedSteps; // Satisfy unused variable warning
      const nextStep = typeof setupStatus.nextStep === 'string' ? setupStatus.nextStep : null;
      if (!Array.isArray(setupStatus.completedSteps) || typeof setupStatus.nextStep !== 'string') {
        setError('Failed to load setup status: Corrupted setup status data');
        setSetupStatus(null); // force error state
        return;
      }
      const stepIdx = nextStep ? steps.findIndex(s => s.id === nextStep) : 0;
      setWizardState(prev => ({
        ...prev,
        currentStep: stepIdx >= 0 ? stepIdx : 0
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setupStatus, loading, error]);

  // 2. Patch: Defensive error handling for corrupted/missing API data
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const loadSetupStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/setup-status');
      if (!response.ok) {
        throw new Error('Failed to load setup status');
      }
      const status = await response.json();
      // Defensive: check for required fields
      if (!status || typeof status !== 'object' || !('isSetup' in status)) {
        throw new Error('Corrupted setup status data');
      }
      setSetupStatus(status);
      if (status.isSetup) {
        setWizardState(prev => ({ ...prev, currentStep: steps.length }));
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(`Failed to load setup status: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  }, []);

  // Validate field
  const validateField = (field: string, value: string | number | boolean): string | null => {
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

  // Handle input changes
  const handleInputChange = (field: keyof SetupWizardState['settings'], value: string | number | boolean) => {
    setWizardState(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        [field]: value
      }
    }));
    
    // Clear validation errors for this field
    setValidationErrors(prev => prev.filter(err => err.field !== field));
  };

  // Handle field blur for validation
  const handleBlur = (field: keyof SetupWizardState['settings']) => {
    const value = wizardState.settings[field];
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

  // Test API key
  const testApiKey = async (provider: 'anthropic' | 'openai') => {
    const apiKey = provider === 'anthropic' ? 
      wizardState.settings.anthropicApiKey : 
      wizardState.settings.openaiApiKey;
    
    if (!apiKey) return;
    
    try {
      setWizardState(prev => ({
        ...prev,
        testing: { ...prev.testing, [provider]: true }
      }));
      
      const response = await fetch('/api/test-api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          apiKey
        })
      });
      
      const result = await response.json();
      setWizardState(prev => ({
        ...prev,
        testResults: { ...prev.testResults, [provider]: result }
      }));
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setWizardState(prev => ({
        ...prev,
        testResults: {
          ...prev.testResults,
          [provider]: {
            valid: false,
            provider,
            details: {
              service: provider === 'anthropic' ? 'Anthropic Claude' : 'OpenAI',
              status: 'error',
              message: `Test failed: ${errorMessage}`
            }
          }
        }
      }));
    } finally {
      setWizardState(prev => ({
        ...prev,
        testing: { ...prev.testing, [provider]: false }
      }));
    }
  };

  // Check if required fields are provided for the current step
  const hasRequiredFields = (stepId: string): boolean => {
    if (stepId === 'apiKeys') {
      // Anthropic API key is required
      const anthropicApiKey = wizardState.settings.anthropicApiKey?.trim();
      return Boolean(anthropicApiKey);
    }
    
    // Other steps don't have required fields
    return true;
  };

  // Check if current step can proceed
  const canProceed = (): boolean => {
    // Welcome step can always proceed
    if (wizardState.currentStep === 0) {
      return true;
    }
    
    const currentStepData = steps[wizardState.currentStep];
    
    // Check validation errors first
    if (validationErrors.length > 0) {
      return false;
    }
    
    // Check required fields for this step
    if (!hasRequiredFields(currentStepData.id)) {
      return false;
    }
    
    return true;
  };

  // Save current step settings
  const saveCurrentStep = async () => {
    const currentStepData = steps[wizardState.currentStep];
    
    if (currentStepData.id === 'apiKeys') {
      const changes: Record<string, unknown> = {};
      
      if (wizardState.settings.anthropicApiKey) {
        changes.anthropicApiKey = wizardState.settings.anthropicApiKey;
      }
      if (wizardState.settings.openaiApiKey) {
        changes.openaiApiKey = wizardState.settings.openaiApiKey;
      }
      if (wizardState.settings.monthlyBudget) {
        changes.monthlyBudget = wizardState.settings.monthlyBudget;
      }
      if (wizardState.settings.preferredProvider) {
        changes.preferredProvider = wizardState.settings.preferredProvider;
      }
      
      if (Object.keys(changes).length > 0) {
        try {
          const response = await fetch('/api/user-settings', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(changes)
          });
          
          if (!response.ok) {
            throw new Error('Failed to save settings');
          }
        } catch (error) {
          console.error('Error saving settings:', error);
        }
      }
    }
    
    if (currentStepData.id === 'preferences') {
      const changes = {
        citationStyle: wizardState.settings.citationStyle,
        defaultLanguage: wizardState.settings.defaultLanguage,
        adhdFriendlyMode: wizardState.settings.adhdFriendlyMode,
        theme: wizardState.settings.theme,
        reducedMotion: wizardState.settings.reducedMotion,
        highContrast: wizardState.settings.highContrast
      };
      
      try {
        const response = await fetch('/api/user-settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(changes)
        });
        
        if (!response.ok) {
          throw new Error('Failed to save preferences');
        }
      } catch (error) {
        console.error('Error saving preferences:', error);
      }
    }
  };

  // 3. Patch: Prevent rapid navigation from breaking flow
  const [isNavigating, setIsNavigating] = useState(false);
  
  const nextStep = async () => {
    if (!canProceed() || isNavigating) return;
    
    setIsNavigating(true);
    try {
      await saveCurrentStep();
      
      // Use flushSync for immediate state update
      flushSync(() => {
        setWizardState(prev => ({ ...prev, currentStep: prev.currentStep + 1 }));
      });
    } catch (error) {
      console.error('Navigation error:', error);
    } finally {
      setIsNavigating(false);
    }
  };

  // Navigate to previous step
  const prevStep = () => {
    if (wizardState.currentStep <= 0 || isNavigating) return;
    
    setIsNavigating(true);
    try {
      flushSync(() => {
        setWizardState(prev => ({ ...prev, currentStep: prev.currentStep - 1 }));
      });
    } finally {
      setIsNavigating(false);
    }
  };

  // Complete setup
  const completeSetup = async () => {
    try {
      setCompleting(true);
      setError(null);
      
      // Save final settings
      await saveCurrentStep();
      
      // Mark setup as complete
      const response = await fetch('/api/setup-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ complete: true })
      });
      
      if (!response.ok) {
        throw new Error('Failed to complete setup');
      }
      
      setWizardState(prev => ({ ...prev, currentStep: steps.length }));
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(`Setup failed: ${errorMessage}`);
    } finally {
      setCompleting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="text-center">Loading setup wizard...</div>
      </div>
    );
  }

  if (error && !setupStatus) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="text-red-600">{error}</div>
        <button 
          onClick={loadSetupStatus}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  // Setup complete state
  if (setupStatus?.isSetup || wizardState.currentStep >= steps.length) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Setup Complete!</h1>
          <p className="text-lg text-gray-600 mb-8">
            You&apos;re all set up and ready to use Academic Workflow Assistant!
          </p>
          <button 
            onClick={() => window.location.href = '/'}
            className="px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium"
          >
            Get Started
          </button>
        </div>
      </div>
    );
  }

  const currentStepData = steps[wizardState.currentStep];
  const isLastStep = wizardState.currentStep === steps.length - 1;

  // --- PATCH: Only render current step's content and navigation ---
  // PATCH: Ensure single container render with proper React key for remounting
  return (
    <div className="max-w-2xl mx-auto p-6" data-testid="setupwizard-container" key={`container-step-${wizardState.currentStep}`}> {/* PATCH: key by currentStep */}
      {/* Progress Bar - only one instance, keyed by currentStep */}
      <React.Fragment key={`progressbar-step-${wizardState.currentStep}`}>
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600" data-testid="setupwizard-step-counter">Step {wizardState.currentStep + 1} of {steps.length}</span>
            <span className="text-sm text-gray-600" data-testid="setupwizard-progress-percent">{Math.round(((wizardState.currentStep + 1) / steps.length) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((wizardState.currentStep + 1) / steps.length) * 100}%` }}
              role="progressbar"
              aria-valuenow={wizardState.currentStep + 1}
              aria-valuemin={0}
              aria-valuemax={steps.length}
              data-testid="setupwizard-progressbar"
            />
          </div>
        </div>
      </React.Fragment>
      {/* Step Content - only render current step, keyed for remount */}
      <React.Fragment key={`step-content-${wizardState.currentStep}`}>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2" data-testid="setupwizard-step-title">{currentStepData.title}</h2>
          <p className="text-gray-600 mb-6">{currentStepData.description}</p>
          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}
          {/* Step-specific content */}
          {currentStepData.id === 'welcome' && (
            <div className="space-y-4" data-testid="setupwizard-welcome-content">
              <p className="text-gray-700">
                This wizard will help you configure your Academic Workflow Assistant with:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>AI provider settings (API keys and preferences)</li>
                <li>Academic preferences (citation style, language)</li>
                <li>UI preferences (theme, accessibility)</li>
              </ul>
              <p className="text-gray-700">
                Let&apos;s get started!
              </p>
            </div>
          )}
          {currentStepData.id === 'apiKeys' && (
            <div className="space-y-6" data-testid="setupwizard-apikeys-content">
              {/* Anthropic API Key */}
              <div>
                <label htmlFor="anthropicApiKey" className="block text-sm font-medium text-gray-700 mb-2">
                  Anthropic API Key *
                </label>
                <div className="flex space-x-2">
                  <input
                    id="anthropicApiKey"
                    type="password"
                    value={wizardState.settings.anthropicApiKey}
                    onChange={(e) => handleInputChange('anthropicApiKey', e.target.value)}
                    data-testid="setupwizard-anthropic-api-key"
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
                    disabled={!wizardState.settings.anthropicApiKey || wizardState.testing.anthropic}
                    className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                  >
                    {wizardState.testing.anthropic ? 'Testing...' : 'Test Anthropic Key'}
                  </button>
                </div>
                {getFieldError('anthropicApiKey') && (
                  <p className="mt-1 text-sm text-red-600">{getFieldError('anthropicApiKey')}</p>
                )}
                {wizardState.testResults.anthropic && (
                  <div className={`mt-2 p-2 rounded ${wizardState.testResults.anthropic.valid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {wizardState.testResults.anthropic.valid ? '✓' : '✗'} {wizardState.testResults.anthropic.details?.message || 'Test completed'}
                  </div>
                )}
              </div>

              {/* OpenAI API Key */}
              <div>
                <label htmlFor="openaiApiKey" className="block text-sm font-medium text-gray-700 mb-2">
                  OpenAI API Key (Optional)
                </label>
                <div className="flex space-x-2">
                  <input
                    id="openaiApiKey"
                    type="password"
                    value={wizardState.settings.openaiApiKey}
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
                    disabled={!wizardState.settings.openaiApiKey || wizardState.testing.openai}
                    className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                  >
                    {wizardState.testing.openai ? 'Testing...' : 'Test OpenAI Key'}
                  </button>
                </div>
                {getFieldError('openaiApiKey') && (
                  <p className="mt-1 text-sm text-red-600">{getFieldError('openaiApiKey')}</p>
                )}
                {wizardState.testResults.openai && (
                  <div className={`mt-2 p-2 rounded ${wizardState.testResults.openai.valid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {wizardState.testResults.openai.valid ? '✓' : '✗'} {wizardState.testResults.openai.details?.message || 'Test completed'}
                  </div>
                )}
              </div>

              {/* Monthly Budget */}
              <div>
                <label htmlFor="monthlyBudget" className="block text-sm font-medium text-gray-700 mb-2">
                  Monthly Budget ($) *
                </label>
                <input
                  id="monthlyBudget"
                  type="number"
                  value={wizardState.settings.monthlyBudget}
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
                  value={wizardState.settings.preferredProvider}
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
          )}

          {currentStepData.id === 'preferences' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Citation Style */}
                <div>
                  <label htmlFor="citationStyle" className="block text-sm font-medium text-gray-700 mb-2">
                    Citation Style
                  </label>
                  <select
                    id="citationStyle"
                    value={wizardState.settings.citationStyle}
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
                    value={wizardState.settings.defaultLanguage}
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
              </div>

              {/* ADHD Friendly Mode */}
              <div className="flex items-center">
                <input
                  id="adhdFriendlyMode"
                  type="checkbox"
                  checked={wizardState.settings.adhdFriendlyMode}
                  onChange={(e) => handleInputChange('adhdFriendlyMode', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="adhdFriendlyMode" className="ml-2 block text-sm text-gray-700">
                  ADHD Friendly Mode
                </label>
              </div>

              {/* Theme */}
              <div>
                <label htmlFor="theme" className="block text-sm font-medium text-gray-700 mb-2">
                  Theme
                </label>
                <select
                  id="theme"
                  value={wizardState.settings.theme}
                  onChange={(e) => handleInputChange('theme', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  tabIndex={0}
                >
                  <option value="system">System</option>
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              </div>

              {/* Accessibility Options */}
              <div className="space-y-3">
                <div className="flex items-center">
                  <input
                    id="reducedMotion"
                    type="checkbox"
                    checked={wizardState.settings.reducedMotion}
                    onChange={(e) => handleInputChange('reducedMotion', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="reducedMotion" className="ml-2 block text-sm text-gray-700">
                    Reduced Motion
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    id="highContrast"
                    type="checkbox"
                    checked={wizardState.settings.highContrast}
                    onChange={(e) => handleInputChange('highContrast', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="highContrast" className="ml-2 block text-sm text-gray-700">
                    High Contrast
                  </label>
                </div>
              </div>
            </div>
          )}

          {currentStepData.id === 'review' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Configuration Summary</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-gray-700">AI Provider:</h4>
                  <p className="text-gray-600">{wizardState.settings.preferredProvider}</p>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-700">Monthly Budget:</h4>
                  <p className="text-gray-600">${wizardState.settings.monthlyBudget}</p>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-700">Citation Style:</h4>
                  <p className="text-gray-600">{wizardState.settings.citationStyle.toUpperCase()}</p>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-700">Language:</h4>
                  <p className="text-gray-600">
                    {wizardState.settings.defaultLanguage === 'en' ? 'English' : 
                     wizardState.settings.defaultLanguage === 'es' ? 'Spanish' :
                     wizardState.settings.defaultLanguage === 'fr' ? 'French' : 'German'}
                  </p>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-700 mb-2">Special Features:</h4>
                <ul className="text-gray-600 space-y-1">
                  {wizardState.settings.adhdFriendlyMode && <li>• ADHD Friendly Mode enabled</li>}
                  {wizardState.settings.reducedMotion && <li>• Reduced Motion enabled</li>}
                  {wizardState.settings.highContrast && <li>• High Contrast enabled</li>}
                  <li>• Theme: {wizardState.settings.theme}</li>
                </ul>
              </div>
            </div>
          )}
          {/* Navigation Buttons - only one set per step */}
          <div className="flex justify-between mt-8" data-testid="setupwizard-nav-buttons">
            <button
              onClick={prevStep}
              disabled={wizardState.currentStep === 0 || isNavigating}
              className="px-4 py-2 text-gray-600 bg-gray-200 rounded-md hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400"
              tabIndex={0}
              data-testid="setupwizard-back-btn"
            >
              Back
            </button>
            {isLastStep ? (
              <button
                onClick={completeSetup}
                disabled={completing || !canProceed() || isNavigating}
                className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400"
                tabIndex={0}
                data-testid="setupwizard-complete-btn"
              >
                {completing ? 'Completing Setup...' : 'Complete Setup'}
              </button>
            ) : (
              <button
                onClick={nextStep}
                disabled={!canProceed() || isNavigating}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                tabIndex={0}
                data-testid="setupwizard-continue-btn"
              >
                Continue
              </button>
            )}
          </div>
        </div>
      </React.Fragment>
    </div>
  );
}