import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SessionProvider } from 'next-auth/react';
import { SetupWizard } from '../../components/SetupWizard';

// Mock fetch for API calls
global.fetch = vi.fn();

// Mock next/router
vi.mock('next/router', () => ({
  useRouter: () => ({
    push: vi.fn(),
    pathname: '/setup'
  })
}));

const mockFetch = vi.mocked(fetch);

// Mock session data
const mockSession = {
  user: {
    id: 'user123',
    email: 'test@example.com',
    name: 'Test User'
  },
  expires: '2024-12-31'
};

const renderWithSession = (component: React.ReactElement) => {
  return render(
    <SessionProvider session={mockSession}>
      {component}
    </SessionProvider>
  );
};

describe('SetupWizard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe('Component Rendering', () => {
    it('should render setup wizard with welcome step', async () => {
      // Mock setup status fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          isSetup: false,
          completedSteps: [],
          nextStep: 'welcome',
          requiredSettings: ['anthropicApiKey', 'monthlyBudget'],
          missingSettings: ['anthropicApiKey', 'monthlyBudget']
        })
      } as Response);

      renderWithSession(<SetupWizard />);

      await waitFor(() => {
        expect(screen.getByText('Welcome to Academic Workflow Assistant')).toBeInTheDocument();
        expect(screen.getByText(/Let\'s get you set up/)).toBeInTheDocument();
      });
    });

    it('should display loading state initially', () => {
      mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

      renderWithSession(<SetupWizard />);

      expect(screen.getByText('Loading setup wizard...')).toBeInTheDocument();
    });

    it('should handle API error gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Setup status fetch failed'));

      renderWithSession(<SetupWizard />);

      await waitFor(() => {
        expect(screen.getByText(/failed to load setup status/i)).toBeInTheDocument();
      });
    });

    it('should redirect when setup is complete', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          isSetup: true,
          completedSteps: ['welcome', 'apiKeys', 'preferences'],
          nextStep: null,
          requiredSettings: [],
          missingSettings: []
        })
      } as Response);

      renderWithSession(<SetupWizard />);

      await waitFor(() => {
        expect(screen.getByText('Setup Complete!')).toBeInTheDocument();
        expect(screen.getByText(/You\'re all set up/)).toBeInTheDocument();
      });
    });
  });

  describe('Step Navigation', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          isSetup: false,
          completedSteps: [],
          nextStep: 'welcome',
          requiredSettings: ['anthropicApiKey', 'monthlyBudget'],
          missingSettings: ['anthropicApiKey', 'monthlyBudget']
        })
      } as Response);

      renderWithSession(<SetupWizard />);
      await waitFor(() => screen.getByText('Welcome to Academic Workflow Assistant'));
    });

    it('should show progress indicators for all steps', async () => {
      await waitFor(() => {
        const stepIndicator = screen.getByText(/Step \d+ of \d+/);
        expect(stepIndicator).toBeInTheDocument();
        expect(screen.getByRole('progressbar')).toBeInTheDocument();
      });
    });

    it('should navigate to next step on continue', async () => {
      const continueButton = screen.getByRole('button', { name: /continue/i });
      fireEvent.click(continueButton);

      await waitFor(() => {
        expect(screen.getByText('AI Provider Configuration')).toBeInTheDocument();
        expect(screen.getByText(/Step 2 of \d+/)).toBeInTheDocument();
      });
    });

    it('should navigate to previous step on back', async () => {
      // First navigate to step 2
      const continueButton = screen.getByRole('button', { name: /continue/i });
      fireEvent.click(continueButton);

      await waitFor(() => {
        expect(screen.getByText('AI Provider Configuration')).toBeInTheDocument();
      });

      // Then navigate back
      const backButton = screen.getByRole('button', { name: /back/i });
      fireEvent.click(backButton);

      await waitFor(() => {
        expect(screen.getByText('Welcome to Academic Workflow Assistant')).toBeInTheDocument();
      });
    });

    it('should disable back button on first step', async () => {
      await waitFor(() => {
        const backButton = screen.getByRole('button', { name: /back/i });
        expect(backButton).toBeDisabled();
      });
    });

    it('should show finish button on last step', async () => {
      // Navigate to last step
      const continueButton = screen.getByRole('button', { name: /continue/i });
      
      // Step 1 to 2
      fireEvent.click(continueButton);
      await waitFor(() => screen.getByText('AI Provider Configuration'));
      
      // Step 2 to 3
      fireEvent.click(continueButton);
      await waitFor(() => screen.getByText('Academic Preferences'));
      
      // Step 3 to 4
      fireEvent.click(continueButton);
      await waitFor(() => {
        expect(screen.getByText('Review & Complete')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /complete setup/i })).toBeInTheDocument();
      });
    });
  });

  describe('API Keys Configuration Step', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          isSetup: false,
          completedSteps: [],
          nextStep: 'apiKeys',
          requiredSettings: ['anthropicApiKey'],
          missingSettings: ['anthropicApiKey']
        })
      } as Response);

      renderWithSession(<SetupWizard />);
      await waitFor(() => screen.getByText('Welcome to Academic Workflow Assistant'));
      
      // Navigate to API keys step
      const continueButton = screen.getByRole('button', { name: /continue/i });
      fireEvent.click(continueButton);
      await waitFor(() => screen.getByText('AI Provider Configuration'));
    });

    it('should display API key input fields', async () => {
      await waitFor(() => {
        expect(screen.getByLabelText(/anthropic api key/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/openai api key/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/monthly budget/i)).toBeInTheDocument();
      });
    });

    it('should validate API key format', async () => {
      const anthropicInput = screen.getByLabelText(/anthropic api key/i);
      
      fireEvent.change(anthropicInput, { target: { value: 'invalid-key' } });
      fireEvent.blur(anthropicInput);
      
      await waitFor(() => {
        expect(screen.getByText(/api key must start with sk-ant/i)).toBeInTheDocument();
      });
    });

    it('should test API keys when valid', async () => {
      // Mock successful API key test
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          valid: true,
          provider: 'anthropic',
          details: {
            service: 'Anthropic Claude',
            status: 'connected',
            message: 'API key is valid and working'
          }
        })
      } as Response);

      const anthropicInput = screen.getByLabelText(/anthropic api key/i);
      fireEvent.change(anthropicInput, { target: { value: 'sk-ant-valid-key' } });

      const testButton = screen.getByRole('button', { name: /test anthropic key/i });
      fireEvent.click(testButton);

      await waitFor(() => {
        expect(screen.getByText(/api key is valid and working/i)).toBeInTheDocument();
      });
    });

    it('should prevent navigation without required fields', async () => {
      const continueButton = screen.getByRole('button', { name: /continue/i });
      
      // Should be disabled without required API key
      expect(continueButton).toBeDisabled();
    });

    it('should enable navigation when requirements met', async () => {
      const anthropicInput = screen.getByLabelText(/anthropic api key/i);
      const budgetInput = screen.getByLabelText(/monthly budget/i);
      
      fireEvent.change(anthropicInput, { target: { value: 'sk-ant-valid-key' } });
      fireEvent.change(budgetInput, { target: { value: '100' } });

      const continueButton = screen.getByRole('button', { name: /continue/i });
      expect(continueButton).not.toBeDisabled();
    });
  });

  describe('Academic Preferences Step', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          isSetup: false,
          completedSteps: ['welcome', 'apiKeys'],
          nextStep: 'preferences',
          requiredSettings: [],
          missingSettings: []
        })
      } as Response);

      renderWithSession(<SetupWizard />);
      await waitFor(() => screen.getByText('Welcome to Academic Workflow Assistant'));
      
      // Navigate to preferences step
      const continueButton = screen.getByRole('button', { name: /continue/i });
      fireEvent.click(continueButton);
      await waitFor(() => screen.getByText('AI Provider Configuration'));
      
      fireEvent.click(continueButton);
      await waitFor(() => screen.getByText('Academic Preferences'));
    });

    it('should display preference settings', async () => {
      await waitFor(() => {
        expect(screen.getByLabelText(/citation style/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/default language/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/adhd friendly mode/i)).toBeInTheDocument();
      });
    });

    it('should update citation style selection', async () => {
      const citationSelect = screen.getByLabelText(/citation style/i);
      fireEvent.change(citationSelect, { target: { value: 'mla' } });
      
      expect(citationSelect).toHaveValue('mla');
    });

    it('should toggle ADHD friendly mode', async () => {
      const adhdCheckbox = screen.getByLabelText(/adhd friendly mode/i);
      fireEvent.click(adhdCheckbox);
      
      expect(adhdCheckbox).toBeChecked();
    });

    it('should allow navigation with default preferences', async () => {
      const continueButton = screen.getByRole('button', { name: /continue/i });
      expect(continueButton).not.toBeDisabled();
    });
  });

  describe('Review & Complete Step', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          isSetup: false,
          completedSteps: ['welcome', 'apiKeys', 'preferences'],
          nextStep: 'review',
          requiredSettings: [],
          missingSettings: []
        })
      } as Response);

      renderWithSession(<SetupWizard />);
      await waitFor(() => screen.getByText('Welcome to Academic Workflow Assistant'));
      
      // Navigate to review step
      const continueButton = screen.getByRole('button', { name: /continue/i });
      fireEvent.click(continueButton);
      await waitFor(() => screen.getByText('AI Provider Configuration'));
      
      fireEvent.click(continueButton);
      await waitFor(() => screen.getByText('Academic Preferences'));
      
      fireEvent.click(continueButton);
      await waitFor(() => screen.getByText('Review & Complete'));
    });

    it('should display configuration summary', async () => {
      await waitFor(() => {
        expect(screen.getByText('Configuration Summary')).toBeInTheDocument();
        expect(screen.getByText(/AI Provider:/)).toBeInTheDocument();
        expect(screen.getByText(/Monthly Budget:/)).toBeInTheDocument();
        expect(screen.getByText(/Citation Style:/)).toBeInTheDocument();
      });
    });

    it('should complete setup successfully', async () => {
      // Mock successful setup completion
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          message: 'Setup completed successfully'
        })
      } as Response);

      const completeButton = screen.getByRole('button', { name: /complete setup/i });
      fireEvent.click(completeButton);

      await waitFor(() => {
        expect(screen.getByText('Setup Complete!')).toBeInTheDocument();
        expect(screen.getByText(/You\'re all set up/)).toBeInTheDocument();
      });
    });

    it('should handle setup completion errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Setup failed'));

      const completeButton = screen.getByRole('button', { name: /complete setup/i });
      fireEvent.click(completeButton);

      await waitFor(() => {
        expect(screen.getByText(/setup failed/i)).toBeInTheDocument();
      });
    });

    it('should show loading state during setup', async () => {
      mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

      const completeButton = screen.getByRole('button', { name: /complete setup/i });
      fireEvent.click(completeButton);

      expect(screen.getByText(/completing setup/i)).toBeInTheDocument();
      expect(completeButton).toBeDisabled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          isSetup: false,
          completedSteps: [],
          nextStep: 'welcome',
          requiredSettings: [],
          missingSettings: []
        })
      } as Response);

      renderWithSession(<SetupWizard />);

      await waitFor(() => {
        expect(screen.getByRole('progressbar')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /continue/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
      });
    });

    it('should support keyboard navigation', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          isSetup: false,
          completedSteps: [],
          nextStep: 'welcome',
          requiredSettings: [],
          missingSettings: []
        })
      } as Response);

      renderWithSession(<SetupWizard />);

      await waitFor(() => {
        const buttons = screen.getAllByRole('button');
        buttons.forEach(button => {
          expect(button).toHaveAttribute('tabIndex', '0');
        });
      });
    });
  });

  describe('Data Persistence', () => {
    it('should save progress between steps', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            isSetup: false,
            completedSteps: [],
            nextStep: 'welcome',
            requiredSettings: ['anthropicApiKey'],
            missingSettings: ['anthropicApiKey']
          })
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            message: 'Settings saved'
          })
        } as Response);

      renderWithSession(<SetupWizard />);
      await waitFor(() => screen.getByText('Welcome to Academic Workflow Assistant'));

      // Navigate to API keys step
      const continueButton = screen.getByRole('button', { name: /continue/i });
      fireEvent.click(continueButton);
      await waitFor(() => screen.getByText('AI Provider Configuration'));

      // Fill in API key
      const anthropicInput = screen.getByLabelText(/anthropic api key/i);
      fireEvent.change(anthropicInput, { target: { value: 'sk-ant-test-key' } });

      // Navigate to next step (should save automatically)
      fireEvent.click(continueButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/user-settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            anthropicApiKey: 'sk-ant-test-key'
          })
        });
      });
    });
  });
});