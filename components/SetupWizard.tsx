import React, { useState, useEffect } from 'react';
import { 
  CheckCircleIcon, 
  ExclamationTriangleIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  CogIcon,
  KeyIcon,
  ShieldCheckIcon,
  CloudIcon
} from '@heroicons/react/24/outline';
import { FormField, TestKeyButton, LoadingButton } from './forms';
import { 
  SetupWizardStep, 
  SetupStatus, 
  SettingsUpdateRequest,
  ApiKeyTestResult 
} from '../types/settings';
import { generateNextAuthSecret } from '../lib/crypto';

interface SetupWizardProps {
  onComplete: () => void;
  className?: string;
}

const SETUP_STEPS: SetupWizardStep[] = [
  {
    id: 'anthropic_setup',
    title: 'AI Provider Setup',
    description: 'Configure your primary AI provider for research and analysis',
    required: true,
    completed: false,
    fields: [
      {
        key: 'anthropicKey',
        label: 'Anthropic API Key',
        type: 'password',
        placeholder: 'sk-ant-...',
        helpText: 'Get your API key from https://console.anthropic.com/',
        required: true,
        validation: {
          pattern: '^sk-ant-',
          minLength: 10
        }
      }
    ]
  },
  {
    id: 'auth_setup',
    title: 'Authentication Setup',
    description: 'Configure secure authentication for your application',
    required: true,
    completed: false,
    fields: [
      {
        key: 'nextauthSecret',
        label: 'NextAuth Secret',
        type: 'password',
        helpText: 'A secure random string for authentication (will be generated if empty)',
        required: true,
        validation: {
          minLength: 32
        }
      },
      {
        key: 'nextauthUrl',
        label: 'NextAuth URL',
        type: 'url',
        placeholder: 'http://localhost:3000',
        helpText: 'The base URL of your application',
        required: true,
        validation: {
          pattern: '^https?://'
        }
      }
    ]
  },
  {
    id: 'openai_setup',
    title: 'Additional AI Provider',
    description: 'Optionally configure OpenAI for enhanced capabilities',
    required: false,
    completed: false,
    fields: [
      {
        key: 'openaiKey',
        label: 'OpenAI API Key',
        type: 'password',
        placeholder: 'sk-...',
        helpText: 'Get your API key from https://platform.openai.com/api-keys',
        required: false,
        validation: {
          pattern: '^sk-',
          minLength: 10
        }
      },
      {
        key: 'aiMonthlyBudget',
        label: 'Monthly AI Budget (USD)',
        type: 'number',
        placeholder: '100',
        helpText: 'Set a spending limit for AI API usage',
        required: false,
        validation: {
          minLength: 1
        }
      }
    ]
  },
  {
    id: 'zotero_setup',
    title: 'Zotero Integration',
    description: 'Connect your Zotero library for reference management',
    required: false,
    completed: false,
    fields: [
      {
        key: 'zoteroApiKey',
        label: 'Zotero API Key',
        type: 'password',
        helpText: 'Get your API key from https://www.zotero.org/settings/keys',
        required: false
      },
      {
        key: 'zoteroUserId',
        label: 'Zotero User ID',
        type: 'text',
        helpText: 'Your Zotero user ID (found in account settings)',
        required: false
      }
    ]
  }
];

export function SetupWizard({ onComplete, className = '' }: SetupWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<Partial<SettingsUpdateRequest>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [testResults, setTestResults] = useState<Record<string, ApiKeyTestResult>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [setupStatus, setSetupStatus] = useState<SetupStatus | null>(null);

  // Load initial setup status
  useEffect(() => {
    loadSetupStatus();
  }, []);

  const loadSetupStatus = async () => {
    try {
      const response = await fetch('/api/setup-status');
      const status: SetupStatus = await response.json();
      setSetupStatus(status);
      
      // Update step completion based on current status
      SETUP_STEPS.forEach(step => {
        step.completed = status.completedSteps.includes(step.id);
      });
    } catch (error) {
      console.error('Failed to load setup status:', error);
    }
  };

  const validateField = (key: string, value: any, field: any): string | null => {
    if (field.required && (!value || value.toString().trim() === '')) {
      return `${field.label} is required`;
    }

    if (value && field.validation) {
      if (field.validation.pattern && !new RegExp(field.validation.pattern).test(value)) {
        return `${field.label} format is invalid`;
      }
      if (field.validation.minLength && value.toString().length < field.validation.minLength) {
        return `${field.label} must be at least ${field.validation.minLength} characters`;
      }
      if (field.validation.maxLength && value.toString().length > field.validation.maxLength) {
        return `${field.label} must be no more than ${field.validation.maxLength} characters`;
      }
    }

    return null;
  };

  const handleFieldChange = (key: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    
    // Clear error when user starts typing
    if (errors[key]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[key];
        return newErrors;
      });
    }
  };

  const handleTestResult = (key: string, result: ApiKeyTestResult) => {
    setTestResults(prev => ({ ...prev, [key]: result }));
  };

  const validateCurrentStep = (): boolean => {
    const step = SETUP_STEPS[currentStep];
    const newErrors: Record<string, string> = {};
    
    step.fields.forEach(field => {
      const value = formData[field.key];
      const error = validateField(field.key, value, field);
      if (error) {
        newErrors[field.key] = error;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = async () => {
    if (!validateCurrentStep()) {
      return;
    }

    // Auto-generate NextAuth secret if not provided
    if (currentStep === 1 && !formData.nextauthSecret) {
      setFormData(prev => ({ 
        ...prev, 
        nextauthSecret: generateNextAuthSecret() 
      }));
    }

    if (currentStep < SETUP_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      await handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || 'Failed to save settings');
      }

      onComplete();
    } catch (error: any) {
      console.error('Setup completion failed:', error);
      setErrors({ general: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const getStepIcon = (step: SetupWizardStep, index: number) => {
    if (step.completed) {
      return <CheckCircleIcon className="h-6 w-6 text-green-500" />;
    }
    if (index === currentStep) {
      switch (step.id) {
        case 'anthropic_setup':
          return <KeyIcon className="h-6 w-6 text-blue-500" />;
        case 'auth_setup':
          return <ShieldCheckIcon className="h-6 w-6 text-blue-500" />;
        case 'openai_setup':
          return <CloudIcon className="h-6 w-6 text-blue-500" />;
        case 'zotero_setup':
          return <CogIcon className="h-6 w-6 text-blue-500" />;
        default:
          return <div className="h-6 w-6 rounded-full bg-blue-500 text-white text-sm flex items-center justify-center">{index + 1}</div>;
      }
    }
    if (step.required) {
      return <ExclamationTriangleIcon className="h-6 w-6 text-yellow-500" />;
    }
    return <div className="h-6 w-6 rounded-full bg-gray-300 text-gray-600 text-sm flex items-center justify-center">{index + 1}</div>;
  };

  const currentStepData = SETUP_STEPS[currentStep];
  const isLastStep = currentStep === SETUP_STEPS.length - 1;

  return (
    <div className={`max-w-4xl mx-auto ${className}`}>
      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {SETUP_STEPS.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className="flex flex-col items-center">
                {getStepIcon(step, index)}
                <span className={`mt-2 text-sm font-medium ${
                  index === currentStep ? 'text-blue-600' : 
                  step.completed ? 'text-green-600' : 'text-gray-500'
                }`}>
                  {step.title}
                </span>
              </div>
              {index < SETUP_STEPS.length - 1 && (
                <div className={`mx-4 h-0.5 w-16 ${
                  step.completed ? 'bg-green-500' : 'bg-gray-300'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Current Step Content */}
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {currentStepData.title}
            {currentStepData.required && <span className="text-red-500 ml-1">*</span>}
          </h2>
          <p className="text-gray-600">{currentStepData.description}</p>
        </div>

        {/* Form Fields */}
        <div className="space-y-6 mb-8">
          {currentStepData.fields.map(field => (
            <div key={field.key} className="space-y-4">
              <FormField
                id={field.key}
                label={field.label}
                type={field.type}
                value={
                  typeof formData[field.key] === 'boolean' 
                    ? String(formData[field.key]) 
                    : String(formData[field.key] || '')
                }
                onChange={(value) => handleFieldChange(field.key, value)}
                placeholder={field.placeholder}
                helpText={field.helpText}
                error={errors[field.key]}
                required={field.required}
              />
              
              {/* Test button for API keys */}
              {(field.key === 'anthropicKey' || field.key === 'openaiKey' || field.key === 'zoteroApiKey') && 
               formData[field.key] && (
                <TestKeyButton
                  provider={field.key.replace('Key', '') as any}
                  apiKey={formData[field.key] as string}
                  userId={field.key === 'zoteroApiKey' ? formData.zoteroUserId as string : undefined}
                  onTestComplete={(result) => handleTestResult(field.key, result)}
                />
              )}
            </div>
          ))}
        </div>

        {/* Error Display */}
        {errors.general && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-center">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mr-2" />
              <span className="text-red-800">{errors.general}</span>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between">
          <button
            type="button"
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className={`
              inline-flex items-center px-4 py-2 text-sm font-medium rounded-md border
              ${currentStep === 0 
                ? 'border-gray-300 text-gray-400 cursor-not-allowed' 
                : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500'
              }
            `}
          >
            <ChevronLeftIcon className="h-4 w-4 mr-1" />
            Previous
          </button>

          <LoadingButton
            onClick={handleNext}
            loading={isLoading}
            disabled={Object.keys(errors).length > 0}
            loadingText={isLastStep ? 'Completing Setup...' : 'Saving...'}
          >
            {isLastStep ? 'Complete Setup' : 'Next'}
            {!isLastStep && <ChevronRightIcon className="h-4 w-4 ml-1" />}
          </LoadingButton>
        </div>
      </div>
    </div>
  );
}