import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SessionProvider } from 'next-auth/react';
import { SettingsDashboard } from '../../components/SettingsDashboard';

// Mock fetch for API calls
global.fetch = vi.fn();

// Mock next/router
vi.mock('next/router', () => ({
  useRouter: () => ({
    push: vi.fn(),
    pathname: '/settings'
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

describe('SettingsDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render settings dashboard with all sections', async () => {
      // Mock successful settings fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          anthropicApiKey: null,
          openaiApiKey: null,
          monthlyBudget: 100,
          preferredProvider: 'auto',
          citationStyle: 'apa',
          defaultLanguage: 'en',
          adhdFriendlyMode: false,
          theme: 'system',
          reducedMotion: false,
          highContrast: false
        })
      } as Response);

      renderWithSession(<SettingsDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Settings Dashboard')).toBeInTheDocument();
        expect(screen.getByText('AI Provider Settings')).toBeInTheDocument();
        expect(screen.getByText('Academic Preferences')).toBeInTheDocument();
        expect(screen.getByText('UI Preferences')).toBeInTheDocument();
      });
    });

    it('should display loading state initially', () => {
      mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

      renderWithSession(<SettingsDashboard />);

      expect(screen.getByText('Loading settings...')).toBeInTheDocument();
    });

    it('should handle API error gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      renderWithSession(<SettingsDashboard />);

      await waitFor(() => {
        expect(screen.getByText(/failed to load settings/i)).toBeInTheDocument();
      });
    });
  });

  describe('AI Provider Settings', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          anthropicApiKey: 'sk-ant-existing',
          openaiApiKey: null,
          monthlyBudget: 200,
          preferredProvider: 'anthropic',
          citationStyle: 'apa',
          defaultLanguage: 'en',
          adhdFriendlyMode: false,
          theme: 'system',
          reducedMotion: false,
          highContrast: false
        })
      } as Response);

      renderWithSession(<SettingsDashboard />);
      await waitFor(() => screen.getByText('Settings Dashboard'));
    });

    it('should display existing API keys as masked', async () => {
      await waitFor(() => {
        const anthropicInput = screen.getByLabelText(/anthropic api key/i);
        expect(anthropicInput).toHaveValue('sk-ant•••••••g');
      });
    });

    it('should allow updating API keys', async () => {
      const anthropicInput = screen.getByLabelText(/anthropic api key/i);
      
      fireEvent.change(anthropicInput, { target: { value: 'sk-ant-new-key' } });
      
      expect(anthropicInput).toHaveValue('sk-ant-new-key');
    });

    it('should validate API key format', async () => {
      const anthropicInput = screen.getByLabelText(/anthropic api key/i);
      
      fireEvent.change(anthropicInput, { target: { value: 'invalid-key' } });
      fireEvent.blur(anthropicInput);
      
      await waitFor(() => {
        expect(screen.getByText(/api key must start with sk-ant/i)).toBeInTheDocument();
      });
    });

    it('should update monthly budget', async () => {
      const budgetInput = screen.getByLabelText(/monthly budget/i);
      
      fireEvent.change(budgetInput, { target: { value: '300' } });
      
      expect(budgetInput).toHaveValue(300);
    });

    it('should validate budget is positive number', async () => {
      const budgetInput = screen.getByLabelText(/monthly budget/i);
      
      fireEvent.change(budgetInput, { target: { value: '-50' } });
      fireEvent.blur(budgetInput);
      
      await waitFor(() => {
        expect(screen.getByText(/budget must be positive/i)).toBeInTheDocument();
      });
    });

    it('should change preferred provider', async () => {
      const providerSelect = screen.getByLabelText(/preferred provider/i);
      
      fireEvent.change(providerSelect, { target: { value: 'openai' } });
      
      expect(providerSelect).toHaveValue('openai');
    });
  });

  describe('Academic Preferences', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          anthropicApiKey: null,
          openaiApiKey: null,
          monthlyBudget: 100,
          preferredProvider: 'auto',
          citationStyle: 'mla',
          defaultLanguage: 'es',
          adhdFriendlyMode: true,
          theme: 'system',
          reducedMotion: false,
          highContrast: false
        })
      } as Response);

      renderWithSession(<SettingsDashboard />);
      await waitFor(() => screen.getByText('Settings Dashboard'));
    });

    it('should display current academic preferences', async () => {
      await waitFor(() => {
        expect(screen.getByDisplayValue('mla')).toBeInTheDocument();
        expect(screen.getByDisplayValue('es')).toBeInTheDocument();
        expect(screen.getByRole('checkbox', { name: /adhd friendly mode/i })).toBeChecked();
      });
    });

    it('should update citation style', async () => {
      const citationSelect = screen.getByLabelText(/citation style/i);
      
      fireEvent.change(citationSelect, { target: { value: 'chicago' } });
      
      expect(citationSelect).toHaveValue('chicago');
    });

    it('should update default language', async () => {
      const languageSelect = screen.getByLabelText(/default language/i);
      
      fireEvent.change(languageSelect, { target: { value: 'fr' } });
      
      expect(languageSelect).toHaveValue('fr');
    });

    it('should toggle ADHD friendly mode', async () => {
      const adhdCheckbox = screen.getByRole('checkbox', { name: /adhd friendly mode/i });
      
      fireEvent.click(adhdCheckbox);
      
      expect(adhdCheckbox).not.toBeChecked();
    });
  });

  describe('UI Preferences', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          anthropicApiKey: null,
          openaiApiKey: null,
          monthlyBudget: 100,
          preferredProvider: 'auto',
          citationStyle: 'apa',
          defaultLanguage: 'en',
          adhdFriendlyMode: false,
          theme: 'dark',
          reducedMotion: true,
          highContrast: false
        })
      } as Response);

      renderWithSession(<SettingsDashboard />);
      await waitFor(() => screen.getByText('Settings Dashboard'));
    });

    it('should display current UI preferences', async () => {
      await waitFor(() => {
        expect(screen.getByDisplayValue('dark')).toBeInTheDocument();
        expect(screen.getByRole('checkbox', { name: /reduced motion/i })).toBeChecked();
        expect(screen.getByRole('checkbox', { name: /high contrast/i })).not.toBeChecked();
      });
    });

    it('should update theme selection', async () => {
      const themeSelect = screen.getByLabelText(/theme/i);
      
      fireEvent.change(themeSelect, { target: { value: 'light' } });
      
      expect(themeSelect).toHaveValue('light');
    });

    it('should toggle accessibility options', async () => {
      const motionCheckbox = screen.getByRole('checkbox', { name: /reduced motion/i });
      const contrastCheckbox = screen.getByRole('checkbox', { name: /high contrast/i });
      
      fireEvent.click(motionCheckbox);
      fireEvent.click(contrastCheckbox);
      
      expect(motionCheckbox).not.toBeChecked();
      expect(contrastCheckbox).toBeChecked();
    });
  });

  describe('Form Submission', () => {
    beforeEach(async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            anthropicApiKey: null,
            openaiApiKey: null,
            monthlyBudget: 100,
            preferredProvider: 'auto',
            citationStyle: 'apa',
            defaultLanguage: 'en',
            adhdFriendlyMode: false,
            theme: 'system',
            reducedMotion: false,
            highContrast: false
          })
        } as Response);

      renderWithSession(<SettingsDashboard />);
      await waitFor(() => screen.getByText('Settings Dashboard'));
    });

    it('should save settings successfully', async () => {
      // Mock successful save
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          anthropicApiKey: 'sk-ant-updated',
          openaiApiKey: null,
          monthlyBudget: 150,
          preferredProvider: 'anthropic',
          citationStyle: 'apa',
          defaultLanguage: 'en',
          adhdFriendlyMode: false,
          theme: 'system',
          reducedMotion: false,
          highContrast: false
        })
      } as Response);

      // Make changes
      const anthropicInput = screen.getByLabelText(/anthropic api key/i);
      const budgetInput = screen.getByLabelText(/monthly budget/i);
      
      fireEvent.change(anthropicInput, { target: { value: 'sk-ant-updated' } });
      fireEvent.change(budgetInput, { target: { value: '150' } });

      // Submit form
      const saveButton = screen.getByRole('button', { name: /save settings/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/settings saved successfully/i)).toBeInTheDocument();
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/user-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          anthropicApiKey: 'sk-ant-updated',
          monthlyBudget: 150
        })
      });
    });

    it('should handle save errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Save failed'));

      const saveButton = screen.getByRole('button', { name: /save settings/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to save settings/i)).toBeInTheDocument();
      });
    });

    it('should show loading state during save', async () => {
      mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

      const saveButton = screen.getByRole('button', { name: /save settings/i });
      fireEvent.click(saveButton);

      expect(screen.getByText(/saving/i)).toBeInTheDocument();
      expect(saveButton).toBeDisabled();
    });

    it('should only submit changed fields', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({})
      } as Response);

      // Only change citation style
      const citationSelect = screen.getByLabelText(/citation style/i);
      fireEvent.change(citationSelect, { target: { value: 'mla' } });

      const saveButton = screen.getByRole('button', { name: /save settings/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/user-settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            citationStyle: 'mla'
          })
        });
      });
    });
  });

  describe('Test API Keys Integration', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          anthropicApiKey: null,
          openaiApiKey: null,
          monthlyBudget: 100,
          preferredProvider: 'auto',
          citationStyle: 'apa',
          defaultLanguage: 'en',
          adhdFriendlyMode: false,
          theme: 'system',
          reducedMotion: false,
          highContrast: false
        })
      } as Response);

      renderWithSession(<SettingsDashboard />);
      await waitFor(() => screen.getByText('Settings Dashboard'));
    });

    it('should show test buttons for API keys', async () => {
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /test anthropic key/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /test openai key/i })).toBeInTheDocument();
      });
    });

    it('should disable test button when no API key provided', async () => {
      const testButton = screen.getByRole('button', { name: /test anthropic key/i });
      expect(testButton).toBeDisabled();
    });

    it('should enable test button when API key is provided', async () => {
      const anthropicInput = screen.getByLabelText(/anthropic api key/i);
      fireEvent.change(anthropicInput, { target: { value: 'sk-ant-test-key' } });

      const testButton = screen.getByRole('button', { name: /test anthropic key/i });
      expect(testButton).not.toBeDisabled();
    });

    it('should test API key and show results', async () => {
      // Mock successful test
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
      fireEvent.change(anthropicInput, { target: { value: 'sk-ant-test-key' } });

      const testButton = screen.getByRole('button', { name: /test anthropic key/i });
      fireEvent.click(testButton);

      await waitFor(() => {
        expect(screen.getByText(/api key is valid and working/i)).toBeInTheDocument();
        expect(screen.getByText(/✓/)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({})
      } as Response);

      renderWithSession(<SettingsDashboard />);

      await waitFor(() => {
        expect(screen.getByLabelText(/anthropic api key/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/monthly budget/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/citation style/i)).toBeInTheDocument();
      });
    });

    it('should support keyboard navigation', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({})
      } as Response);

      renderWithSession(<SettingsDashboard />);

      await waitFor(() => {
        const inputs = screen.getAllByRole('textbox');
        inputs.forEach(input => {
          expect(input).toHaveAttribute('tabIndex', '0');
        });
      });
    });
  });
});

describe('Backup & Restore UI', () => {
  beforeEach(async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        anthropicApiKey: null,
        openaiApiKey: null,
        monthlyBudget: 100,
        preferredProvider: 'auto',
        citationStyle: 'apa',
        defaultLanguage: 'en',
        adhdFriendlyMode: false,
        theme: 'system',
        reducedMotion: false,
        highContrast: false
      })
    } as Response);
    renderWithSession(<SettingsDashboard />);
    await waitFor(() => screen.getByText('Settings Dashboard'));
  });

  afterEach(() => {
    cleanup();
  });

  it('should trigger settings backup and show success message', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      blob: () => Promise.resolve(new Blob([JSON.stringify({ test: 'data' })], { type: 'application/json' }))
    } as Response);

    const backupButton = screen.getByRole('button', { name: /backup settings/i });
    fireEvent.click(backupButton);

    await waitFor(() => {
      expect(screen.getByText(/settings backup downloaded/i)).toBeInTheDocument();
    });
  });

  it('should upload a settings file and restore settings via API', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true })
    } as Response);

    const file = new File([JSON.stringify({ test: 'restored' })], 'settings-backup.json', { type: 'application/json' });
    // Patch .text() method for the test
    Object.defineProperty(file, 'text', {
      value: () => Promise.resolve(JSON.stringify({ test: 'restored' })),
    });
    // Use getAllByLabelText to avoid ambiguity
    const inputs = screen.getAllByLabelText(/restore settings from file/i);
    // Pick the first file input
    const input = inputs.find(i => (i as HTMLInputElement).type === 'file') as HTMLInputElement | undefined;
    expect(input).toBeDefined();
    fireEvent.change(input!, { target: { files: [file] } });

    // Use a flexible matcher for the success message
    await screen.findByText((content) => content.includes('Settings restored successfully'));
  });
});