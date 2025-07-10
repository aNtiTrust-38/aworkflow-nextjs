import React, { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { 
  RocketLaunchIcon, 
  CheckCircleIcon,
  ExclamationTriangleIcon 
} from '@heroicons/react/24/outline';
import { SetupWizard } from '../components/SetupWizard';
import { SetupStatus } from '../types/settings';

interface SetupPageProps {
  initialStatus: SetupStatus | null;
  error?: string;
}

export default function SetupPage({ initialStatus, error }: SetupPageProps) {
  const router = useRouter();
  const [setupStatus, setSetupStatus] = useState<SetupStatus | null>(initialStatus);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // If already set up, redirect to main app
    if (setupStatus?.isSetup) {
      router.push('/');
    }
  }, [setupStatus, router]);

  const handleSetupComplete = async () => {
    setIsLoading(true);
    
    try {
      // Verify setup is complete
      const response = await fetch('/api/setup-status');
      const status: SetupStatus = await response.json();
      
      if (status.isSetup) {
        // Redirect to main application
        router.push('/?setup=complete');
      } else {
        // Something went wrong, show error
        console.error('Setup appears incomplete after completion');
      }
    } catch (error) {
      console.error('Failed to verify setup completion:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // If there's an error, show error page
  if (error) {
    return (
      <>
        <Head>
          <title>Setup Error - Academic Workflow</title>
        </Head>
        
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="bg-white p-8 rounded-lg shadow-lg border border-red-200 max-w-md w-full">
            <div className="flex items-center text-red-600 mb-4">
              <ExclamationTriangleIcon className="h-8 w-8 mr-3" />
              <h1 className="text-xl font-semibold">Setup Error</h1>
            </div>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => router.reload()}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Try Again
            </button>
          </div>
        </div>
      </>
    );
  }

  // If already set up, show completion state while redirecting
  if (setupStatus?.isSetup) {
    return (
      <>
        <Head>
          <title>Setup Complete - Academic Workflow</title>
        </Head>
        
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="bg-white p-8 rounded-lg shadow-lg border border-green-200 max-w-md w-full text-center">
            <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Setup Complete!</h1>
            <p className="text-gray-600 mb-6">
              Your Academic Workflow application is ready to use.
            </p>
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-sm text-gray-500 mt-2">Redirecting...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Setup - Academic Workflow</title>
        <meta name="description" content="Set up your Academic Workflow application" />
        <meta name="robots" content="noindex" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center">
              <RocketLaunchIcon className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Welcome to Academic Workflow
                </h1>
                <p className="text-gray-600">
                  Let's get your application configured and ready to use
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Setup Content */}
        <div className="py-12 px-4 sm:px-6 lg:px-8">
          {/* Welcome Section */}
          <div className="max-w-4xl mx-auto mb-12 text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Quick Setup Guide
            </h2>
            <p className="text-lg text-gray-600 mb-8">
              We'll help you configure your API keys and preferences in just a few steps.
              This should take about 5 minutes.
            </p>
            
            {/* Setup Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <span className="text-xl font-bold text-blue-600">1</span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">AI Provider</h3>
                <p className="text-sm text-gray-600">
                  Configure your primary AI provider for content generation
                </p>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <span className="text-xl font-bold text-blue-600">2</span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Authentication</h3>
                <p className="text-sm text-gray-600">
                  Set up secure authentication for your application
                </p>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <span className="text-xl font-bold text-green-600">3</span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Additional AI</h3>
                <p className="text-sm text-gray-600">
                  Optionally add more AI providers for enhanced capabilities
                </p>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <span className="text-xl font-bold text-green-600">4</span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Integrations</h3>
                <p className="text-sm text-gray-600">
                  Connect external services like Zotero for enhanced workflow
                </p>
              </div>
            </div>
          </div>

          {/* Setup Wizard */}
          <SetupWizard 
            onComplete={handleSetupComplete}
            className="mb-12"
          />

          {/* Help Section */}
          <div className="max-w-4xl mx-auto">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-3">
                Need Help Getting API Keys?
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="font-medium text-blue-900 mb-2">Anthropic Claude</h4>
                  <p className="text-blue-800 mb-1">
                    1. Visit <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer" className="underline">console.anthropic.com</a>
                  </p>
                  <p className="text-blue-800 mb-1">2. Sign up or log in</p>
                  <p className="text-blue-800">3. Generate a new API key</p>
                </div>
                <div>
                  <h4 className="font-medium text-blue-900 mb-2">OpenAI GPT (Optional)</h4>
                  <p className="text-blue-800 mb-1">
                    1. Visit <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="underline">platform.openai.com</a>
                  </p>
                  <p className="text-blue-800 mb-1">2. Sign up or log in</p>
                  <p className="text-blue-800">3. Create a new secret key</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Loading Overlay */}
        {isLoading && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-3"></div>
                <span className="text-gray-900">Completing setup...</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  try {
    // Check setup status
    const protocol = context.req.headers['x-forwarded-proto'] || 'http';
    const host = context.req.headers.host;
    const baseUrl = `${protocol}://${host}`;

    const response = await fetch(`${baseUrl}/api/setup-status`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch setup status');
    }

    const status: SetupStatus = await response.json();

    return {
      props: {
        initialStatus: status,
      },
    };
  } catch (error: any) {
    console.error('Setup page error:', error);
    return {
      props: {
        initialStatus: null,
        error: error.message || 'Failed to load setup status',
      },
    };
  }
};