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
    // Clear all mocks to prevent contamination between tests
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up any mounted components
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
    // Note: Each test in this block will handle its own rendering

    it('should show progress indicators for all steps', async () => {
      // Setup initial state - welcome step
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
        expect(screen.getByTestId('setupwizard-step-counter')).toBeInTheDocument();
        expect(screen.getByTestId('setupwizard-progressbar')).toBeInTheDocument();
      });
    });

    it('should navigate to next step on continue', async () => {
      // Setup initial state - welcome step
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
        expect(screen.getByText('Step 1 of 4')).toBeInTheDocument();
      });

      // Mock successful settings save when navigation occurs
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true })
      } as Response);

      const continueButton = screen.getByTestId('setupwizard-continue-btn');
      fireEvent.click(continueButton);

      await waitFor(() => {
        expect(screen.getByText('AI Provider Configuration')).toBeInTheDocument();
        expect(screen.getByText('Step 2 of 4')).toBeInTheDocument();
      });
    });

    it('should navigate to previous step on back', async () => {
      // Setup initial state - welcome step
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
      });

      // Mock successful settings save for navigation to step 2
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true })
      } as Response);

      // First navigate to step 2
      const continueButton = screen.getByTestId('setupwizard-continue-btn');
      fireEvent.click(continueButton);

      await waitFor(() => {
        expect(screen.getByText('AI Provider Configuration')).toBeInTheDocument();
        expect(screen.getByText('Step 2 of 4')).toBeInTheDocument();
      });

      // Then navigate back
      const backButton = screen.getByRole('button', { name: /back/i });
      fireEvent.click(backButton);

      await waitFor(() => {
        expect(screen.getByText('Welcome to Academic Workflow Assistant')).toBeInTheDocument();
        expect(screen.getByText('Step 1 of 4')).toBeInTheDocument();
      });
    });

    it('should disable back button on first step', async () => {
      // Setup initial state - welcome step
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
        const backButton = screen.getByRole('button', { name: /back/i });
        expect(backButton).toBeDisabled();
      });
    });

    it('should show finish button on last step', async () => {
      // Setup initial state - welcome step
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
      });

      // Mock successful settings save for each navigation step
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ success: true }) } as Response)  // Step 1 to 2
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ success: true }) } as Response)  // Step 2 to 3
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ success: true }) } as Response); // Step 3 to 4

      const continueButton = screen.getByTestId('setupwizard-continue-btn');
      
      // Step 1 to 2
      fireEvent.click(continueButton);
      await waitFor(() => screen.getByText('AI Provider Configuration'));
      
      // Provide required API key before navigating
      const anthropicInput = screen.getByTestId('setupwizard-anthropic-api-key');
      fireEvent.change(anthropicInput, { target: { value: 'sk-ant-valid-key' } });
      
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
      // Clear all mocks to prevent contamination
      vi.clearAllMocks();
      
      // Setup initial welcome step
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
      await waitFor(() => screen.getByTestId('setupwizard-step-title'));
      
      // Mock successful navigation and navigate to API keys step
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true })
      } as Response);
      
      const continueButton = screen.getByTestId('setupwizard-continue-btn');
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

      await waitFor(() => screen.getByRole('heading', { name: /AI Provider Configuration/i }));

      const anthropicInput = screen.getByLabelText(/anthropic api key/i);
      fireEvent.change(anthropicInput, { target: { value: 'sk-ant-valid-key' } });

      const testButton = screen.getByRole('button', { name: /test anthropic key/i });
      fireEvent.click(testButton);

      await waitFor(() => {
        expect(screen.getByText(/api key is valid and working/i)).toBeInTheDocument();
      });
    });

    it('should prevent navigation without required fields', async () => {
      const continueButton = screen.getByTestId('setupwizard-continue-btn');
      
      // Should be disabled without required API key
      expect(continueButton).toBeDisabled();
    });

    it('should enable navigation when requirements met', async () => {
      const anthropicInput = screen.getByLabelText(/anthropic api key/i);
      const budgetInput = screen.getByLabelText(/monthly budget/i);
      
      fireEvent.change(anthropicInput, { target: { value: 'sk-ant-valid-key' } });
      fireEvent.change(budgetInput, { target: { value: '100' } });

      const continueButton = screen.getByTestId('setupwizard-continue-btn');
      expect(continueButton).not.toBeDisabled();
    });
  });

  describe('Academic Preferences Step', () => {
    beforeEach(async () => {
      // Clear all mocks to prevent contamination
      vi.clearAllMocks();
      
      // Setup initial welcome step
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
      await waitFor(() => screen.getByTestId('setupwizard-step-title'));
      
      // Navigate to preferences step through API keys
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ success: true }) } as Response)  // Step 1 to 2
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ success: true }) } as Response); // Step 2 to 3
      
      const continueButton = screen.getByTestId('setupwizard-continue-btn');
      
      // Step 1 to 2 (API keys)
      fireEvent.click(continueButton);
      await waitFor(() => screen.getByText('AI Provider Configuration'));
      
      // Provide required API key before navigating to step 3
      const anthropicInput = screen.getByTestId('setupwizard-anthropic-api-key');
      fireEvent.change(anthropicInput, { target: { value: 'sk-ant-valid-key' } });
      
      // Step 2 to 3 (preferences)
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
      const continueButton = screen.getByTestId('setupwizard-continue-btn');
      expect(continueButton).not.toBeDisabled();
    });
  });

  describe('Review & Complete Step', () => {
    beforeEach(async () => {
      // Clear all mocks to prevent contamination
      vi.clearAllMocks();
      
      // Setup initial welcome step
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
      await waitFor(() => screen.getByTestId('setupwizard-step-title'));
      
      // Navigate to review step through all steps
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ success: true }) } as Response)  // Step 1 to 2
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ success: true }) } as Response)  // Step 2 to 3
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ success: true }) } as Response); // Step 3 to 4
      
      const continueButton = screen.getByTestId('setupwizard-continue-btn');
      
      // Step 1 to 2 (API keys)
      fireEvent.click(continueButton);
      await waitFor(() => screen.getByText('AI Provider Configuration'));
      
      // Provide required API key before navigating
      const anthropicInput = screen.getByTestId('setupwizard-anthropic-api-key');
      fireEvent.change(anthropicInput, { target: { value: 'sk-ant-valid-key' } });
      
      // Step 2 to 3 (preferences)
      fireEvent.click(continueButton);
      await waitFor(() => screen.getByText('Academic Preferences'));
      
      // Step 3 to 4 (review)
      fireEvent.click(continueButton);
      await waitFor(() => screen.getByText('Review & Complete'));
    });

    it('should display configuration summary', async () => {
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /Configuration Summary/i })).toBeInTheDocument();
        expect(screen.getByText(/AI Provider:/i)).toBeInTheDocument();
        expect(screen.getByText(/Monthly Budget:/i)).toBeInTheDocument();
        expect(screen.getByText(/Citation Style:/i)).toBeInTheDocument();
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
      // Step 1: Welcome
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
        expect(screen.getByTestId('setupwizard-progressbar')).toBeInTheDocument();
        expect(screen.getByTestId('setupwizard-continue-btn')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
      });
    });

    it('should support keyboard navigation', async () => {
      // Step 1: Welcome
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
        const buttons = screen.getAllByRole('button');
        buttons.forEach(button => {
          expect(button).toHaveAttribute('tabIndex', '0');
        });
      });
    });
  });

  describe('Data Persistence', () => {
    it('should save progress between steps', async () => {
      // Clear all mocks
      vi.clearAllMocks();
      
      // Setup initial welcome step
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          isSetup: false,
          completedSteps: [],
          nextStep: 'welcome',
          requiredSettings: ['anthropicApiKey'],
          missingSettings: ['anthropicApiKey']
        })
      } as Response);

      renderWithSession(<SetupWizard />);
      await waitFor(() => screen.getByTestId('setupwizard-step-title'));

      // Mock successful navigation to API keys step
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true })
      } as Response);

      // Navigate to API keys step
      const continueButton = screen.getByTestId('setupwizard-continue-btn');
      fireEvent.click(continueButton);
      await waitFor(() => screen.getByText('AI Provider Configuration'));

      // Fill in API key
      const anthropicInput = screen.getByTestId('setupwizard-anthropic-api-key');
      fireEvent.change(anthropicInput, { target: { value: 'sk-ant-test-key' } });

      // Mock successful settings save for next navigation
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, message: 'Settings saved' })
      } as Response);

      // Navigate to next step (should save automatically)
      fireEvent.click(continueButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/user-settings',
          expect.objectContaining({
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: expect.stringContaining('"anthropicApiKey":"sk-ant-test-key"')
          })
        );
      });
    });
  });
});

describe('SetupWizard Edge Cases (TDD RED Phase)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should resume at correct step after partial completion (user leaves and returns)', async () => {
    // Simulate API returning partial completion
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
    await waitFor(() => {
      // Should resume at preferences step
      expect(screen.getByText('Academic Preferences')).toBeInTheDocument();
      expect(screen.getByText('Step 3 of 4')).toBeInTheDocument();
    });
  });

  it('should handle corrupted/missing settings from API', async () => {
    // Simulate API returning corrupted data
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        isSetup: false,
        completedSteps: null, // corrupted
        nextStep: undefined, // missing
        requiredSettings: undefined,
        missingSettings: undefined
      })
    } as Response);

    renderWithSession(<SetupWizard />);
    await waitFor(() => {
      expect(screen.getByText(/failed to load setup status/i)).toBeInTheDocument();
    });
  });

  it('should navigate steps sequentially without skipping (TDD RED)', async () => {
    // Mock setup status for starting at welcome step
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        isSetup: false,
        completedSteps: [],
        nextStep: 'welcome',
        requiredSettings: ['anthropicApiKey'],
        missingSettings: ['anthropicApiKey']
      })
    } as Response);

    renderWithSession(<SetupWizard />);
    
    // Wait for welcome step to render
    await waitFor(() => {
      expect(screen.getByText('Welcome to Academic Workflow Assistant')).toBeInTheDocument();
      expect(screen.getByText('Step 1 of 4')).toBeInTheDocument();
    });

    // Click continue button and wait for step 2
    const continueButton = screen.getByTestId('setupwizard-continue-btn');
    fireEvent.click(continueButton);

    // Should navigate to step 2 - API Provider Configuration
    await waitFor(() => {
      expect(screen.getByText('AI Provider Configuration')).toBeInTheDocument();
      expect(screen.getByText('Step 2 of 4')).toBeInTheDocument();
    }, { timeout: 1000 });

    // Add API key to allow navigation past step 2
    const anthropicApiKeyInput = screen.getByTestId('setupwizard-anthropic-api-key');
    fireEvent.change(anthropicApiKeyInput, { target: { value: 'sk-ant-test-key-123' } });

    // Wait for API key to be set and button to be enabled
    await waitFor(() => {
      expect(screen.getByTestId('setupwizard-continue-btn')).not.toBeDisabled();
    });

    // Click continue again to navigate to step 3
    const continueButton2 = screen.getByTestId('setupwizard-continue-btn');
    fireEvent.click(continueButton2);

    // Should navigate to step 3 - Academic Preferences
    await waitFor(() => {
      expect(screen.getByText('Academic Preferences')).toBeInTheDocument();
      expect(screen.getByText('Step 3 of 4')).toBeInTheDocument();
    }, { timeout: 1000 });

    // Should NOT skip to final step (step 4)
    expect(screen.queryByText('Review & Complete')).not.toBeInTheDocument();
  });

  it('should handle rapid navigation between steps (simulate fast user)', async () => {
    // Simulate normal setup
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        isSetup: false,
        completedSteps: [],
        nextStep: 'welcome',
        requiredSettings: ['anthropicApiKey'],
        missingSettings: ['anthropicApiKey']
      })
    } as Response);

    renderWithSession(<SetupWizard />);
    await waitFor(() => screen.getByText((content, node) => !!node && !!node.textContent && node.textContent.includes('Welcome to Academic Workflow Assistant')));

    // Rapidly click continue multiple times
    const continueButtons = screen.getAllByTestId('setupwizard-continue-btn');
    fireEvent.click(continueButtons[0]);
    fireEvent.click(continueButtons[0]);
    fireEvent.click(continueButtons[0]);
    // Should not crash or skip steps
    await waitFor(() => {
      expect(screen.getAllByRole('heading').find(h => /AI Provider Configuration/i.test(h.textContent || ''))).toBeInTheDocument();
    });
  });

  it('should have correct ARIA attributes and support keyboard navigation (accessibility)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        isSetup: false,
        completedSteps: [],
        nextStep: 'welcome',
        requiredSettings: ['anthropicApiKey'],
        missingSettings: ['anthropicApiKey']
      })
    } as Response);

    renderWithSession(<SetupWizard />);
    await waitFor(() => screen.getAllByTestId('setupwizard-progressbar'));
    // Check ARIA attributes
    const progressbars = screen.getAllByTestId('setupwizard-progressbar');
    expect(progressbars[0]).toHaveAttribute('aria-valuenow');
    // Simulate keyboard navigation
    const continueButtons = screen.getAllByTestId('setupwizard-continue-btn');
    continueButtons[0].focus();
    expect(document.activeElement).toBe(continueButtons[0]);
    // Simulate pressing Enter
    fireEvent.keyDown(continueButtons[0], { key: 'Enter', code: 'Enter' });
    // Should still be accessible and not crash
    expect(continueButtons[0]).toBeInTheDocument();
  });
});