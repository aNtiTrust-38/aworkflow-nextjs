import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SessionProvider } from 'next-auth/react';
import { ApiKeyTester } from '../../components/ApiKeyTester';

// Mock fetch for API calls
global.fetch = vi.fn();

// Mock next/router
vi.mock('next/router', () => ({
  useRouter: () => ({
    push: vi.fn(),
    pathname: '/test'
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

describe('ApiKeyTester Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe('Component Rendering', () => {
    it('should render API key tester with provider options', () => {
      renderWithSession(<ApiKeyTester />);

      expect(screen.getByText('API Key Testing')).toBeInTheDocument();
      expect(screen.getByText('Test your API keys for connectivity and functionality')).toBeInTheDocument();
      
      // Provider selection
      const providerSelect = screen.getByLabelText(/select provider/i) as HTMLSelectElement;
      expect(providerSelect).toBeInTheDocument();
      expect(providerSelect.value).toBe('anthropic');
    });

    it('should show API key input field', () => {
      renderWithSession(<ApiKeyTester />);

      expect(screen.getByLabelText(/api key/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/enter your api key/i)).toBeInTheDocument();
    });

    it('should show test button', () => {
      renderWithSession(<ApiKeyTester />);

      const testButton = screen.getByRole('button', { name: /test api key/i });
      expect(testButton).toBeInTheDocument();
      expect(testButton).toBeDisabled(); // Initially disabled without API key
    });

    it('should show additional fields for Zotero provider', () => {
      renderWithSession(<ApiKeyTester />);

      // Switch to Zotero provider
      const providerSelect = screen.getByLabelText(/select provider/i);
      fireEvent.change(providerSelect, { target: { value: 'zotero' } });

      expect(screen.getByLabelText(/user id/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/enter your zotero user id/i)).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('should validate API key format for Anthropic', () => {
      renderWithSession(<ApiKeyTester />);

      const apiKeyInput = screen.getByLabelText(/api key/i);
      fireEvent.change(apiKeyInput, { target: { value: 'invalid-key' } });
      fireEvent.blur(apiKeyInput);

      expect(screen.getByText(/anthropic api keys must start with sk-ant-/i)).toBeInTheDocument();
    });

    it('should validate API key format for OpenAI', () => {
      renderWithSession(<ApiKeyTester />);

      // Switch to OpenAI provider
      const providerSelect = screen.getByLabelText(/select provider/i);
      fireEvent.change(providerSelect, { target: { value: 'openai' } });

      const apiKeyInput = screen.getByLabelText(/api key/i);
      fireEvent.change(apiKeyInput, { target: { value: 'invalid-key' } });
      fireEvent.blur(apiKeyInput);

      expect(screen.getByText(/openai api keys must start with sk-/i)).toBeInTheDocument();
    });

    it('should require User ID for Zotero testing', () => {
      renderWithSession(<ApiKeyTester />);

      // Switch to Zotero provider
      const providerSelect = screen.getByLabelText(/select provider/i);
      fireEvent.change(providerSelect, { target: { value: 'zotero' } });

      const apiKeyInput = screen.getByLabelText(/api key/i);
      fireEvent.change(apiKeyInput, { target: { value: 'valid-zotero-key' } });

      const testButton = screen.getByRole('button', { name: /test api key/i });
      expect(testButton).toBeDisabled(); // Should be disabled without User ID
    });

    it('should enable test button when valid inputs provided', () => {
      renderWithSession(<ApiKeyTester />);

      const apiKeyInput = screen.getByLabelText(/api key/i);
      fireEvent.change(apiKeyInput, { target: { value: 'sk-ant-valid-key-123' } });

      const testButton = screen.getByRole('button', { name: /test api key/i });
      expect(testButton).not.toBeDisabled();
    });
  });

  describe('API Key Testing', () => {
    it('should test Anthropic API key successfully', async () => {
      // Mock successful API response
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

      renderWithSession(<ApiKeyTester />);

      const apiKeyInput = screen.getByLabelText(/api key/i);
      fireEvent.change(apiKeyInput, { target: { value: 'sk-ant-valid-key-123' } });

      const testButton = screen.getByRole('button', { name: /test api key/i });
      fireEvent.click(testButton);

      // Should show loading state
      expect(screen.getByTestId('button-testing-text')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText(/✓ api key is valid and working/i)).toBeInTheDocument();
        expect(screen.getByText(/anthropic claude/i)).toBeInTheDocument();
        expect(screen.getByText(/status: connected/i)).toBeInTheDocument();
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/test-api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'anthropic',
          apiKey: 'sk-ant-valid-key-123'
        })
      });
    });

    it('should handle invalid API key gracefully', async () => {
      // Mock error API response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          valid: false,
          provider: 'anthropic',
          details: {
            service: 'Anthropic Claude',
            status: 'unauthorized',
            message: 'Invalid API key'
          }
        })
      } as Response);

      renderWithSession(<ApiKeyTester />);

      const apiKeyInput = screen.getByLabelText(/api key/i);
      fireEvent.change(apiKeyInput, { target: { value: 'sk-ant-invalid-key' } });

      const testButton = screen.getByRole('button', { name: /test api key/i });
      fireEvent.click(testButton);

      await waitFor(() => {
        expect(screen.getByText(/✗ invalid api key/i)).toBeInTheDocument();
        expect(screen.getByText(/status: unauthorized/i)).toBeInTheDocument();
      });
    });

    it('should test OpenAI API key successfully', async () => {
      // Mock successful OpenAI API response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          valid: true,
          provider: 'openai',
          details: {
            service: 'OpenAI',
            status: 'connected',
            message: 'API key is valid and working'
          }
        })
      } as Response);

      renderWithSession(<ApiKeyTester />);

      // Switch to OpenAI provider
      const providerSelect = screen.getByLabelText(/select provider/i);
      fireEvent.change(providerSelect, { target: { value: 'openai' } });

      const apiKeyInput = screen.getByLabelText(/api key/i);
      fireEvent.change(apiKeyInput, { target: { value: 'sk-valid-openai-key' } });

      const testButton = screen.getByRole('button', { name: /test api key/i });
      fireEvent.click(testButton);

      await waitFor(() => {
        expect(screen.getByText(/✓ api key is valid and working/i)).toBeInTheDocument();
        expect(screen.getByRole('region', { name: /test results/i })).toHaveTextContent('OpenAI');
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/test-api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'openai',
          apiKey: 'sk-valid-openai-key'
        })
      });
    });

    it('should test Zotero API key with User ID', async () => {
      // Mock successful Zotero API response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          valid: true,
          provider: 'zotero',
          details: {
            service: 'Zotero',
            status: 'connected',
            message: 'Connected to user: Test User'
          }
        })
      } as Response);

      renderWithSession(<ApiKeyTester />);

      // Switch to Zotero provider
      const providerSelect = screen.getByLabelText(/select provider/i);
      fireEvent.change(providerSelect, { target: { value: 'zotero' } });

      const apiKeyInput = screen.getByLabelText(/api key/i);
      fireEvent.change(apiKeyInput, { target: { value: 'valid-zotero-key' } });

      const userIdInput = screen.getByLabelText(/user id/i);
      fireEvent.change(userIdInput, { target: { value: '12345' } });

      const testButton = screen.getByRole('button', { name: /test api key/i });
      fireEvent.click(testButton);

      await waitFor(() => {
        expect(screen.getByText(/✓ connected to user: test user/i)).toBeInTheDocument();
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/test-api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'zotero',
          apiKey: 'valid-zotero-key',
          userId: '12345'
        })
      });
    });

    it('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      renderWithSession(<ApiKeyTester />);

      const apiKeyInput = screen.getByLabelText(/api key/i);
      fireEvent.change(apiKeyInput, { target: { value: 'sk-ant-test-key' } });

      const testButton = screen.getByRole('button', { name: /test api key/i });
      fireEvent.click(testButton);

      await waitFor(() => {
        expect(screen.getByText(/✗ network error/i)).toBeInTheDocument();
        expect(screen.getByText(/status: error/i)).toBeInTheDocument();
      });
    });

    it('should show loading state during testing', async () => {
      mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

      renderWithSession(<ApiKeyTester />);

      const apiKeyInput = screen.getByLabelText(/api key/i);
      fireEvent.change(apiKeyInput, { target: { value: 'sk-ant-test-key' } });

      const testButton = screen.getByRole('button', { name: /test api key/i });
      fireEvent.click(testButton);

      expect(screen.getByTestId('button-testing-text')).toBeInTheDocument();
      expect(testButton).toBeDisabled();
    });
  });

  describe('Real-time Feedback Features', () => {
    it('should show typing indicator when entering API key', () => {
      renderWithSession(<ApiKeyTester />);

      const apiKeyInput = screen.getByLabelText(/api key/i);
      fireEvent.change(apiKeyInput, { target: { value: 'sk-ant-' } });

      expect(screen.getByTestId('typing-indicator')).toBeInTheDocument();
      expect(screen.getByTestId('typing-indicator')).toHaveTextContent('Entering Anthropic API key...');
    });

    it('should show format validation in real-time', async () => {
      renderWithSession(<ApiKeyTester />);

      const apiKeyInput = screen.getByLabelText(/api key/i);
      
      // Start typing invalid format
      fireEvent.change(apiKeyInput, { target: { value: 'invalid' } });
      
      // Wait for typing to finish and validation to appear
      await waitFor(() => {
        expect(screen.getByTestId('realtime-validation')).toBeInTheDocument();
        expect(screen.getByTestId('realtime-validation')).toHaveTextContent('✗ Invalid format');
      });

      // Type valid format
      fireEvent.change(apiKeyInput, { target: { value: 'sk-ant-valid' } });
      await waitFor(() => {
        expect(screen.getByTestId('realtime-validation')).toHaveTextContent('✓ Valid format');
      });
    });

    it('should show progress indicator during testing', async () => {
      let resolvePromise: (value: any) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      mockFetch.mockReturnValueOnce(promise as any);

      renderWithSession(<ApiKeyTester />);

      const apiKeyInput = screen.getByLabelText(/api key/i);
      fireEvent.change(apiKeyInput, { target: { value: 'sk-ant-test-key' } });

      const testButton = screen.getByRole('button', { name: /test api key/i });
      fireEvent.click(testButton);

      // Should show progress bar
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.getByTestId('progress-testing-text')).toBeInTheDocument();

      // Resolve the promise
      resolvePromise!({
        ok: true,
        json: () => Promise.resolve({
          valid: true,
          provider: 'anthropic',
          details: { service: 'Anthropic Claude', status: 'connected', message: 'Success' }
        })
      });

      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      });
    });

    it('should provide detailed status information', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          valid: true,
          provider: 'anthropic',
          details: {
            service: 'Anthropic Claude',
            status: 'connected',
            message: 'API key is valid and working',
            metadata: {
              model: 'claude-3-haiku-20240307',
              rateLimit: '1000 requests/minute',
              credits: '$95.50 remaining'
            }
          }
        })
      } as Response);

      renderWithSession(<ApiKeyTester />);

      const apiKeyInput = screen.getByLabelText(/api key/i);
      fireEvent.change(apiKeyInput, { target: { value: 'sk-ant-test-key' } });

      const testButton = screen.getByRole('button', { name: /test api key/i });
      fireEvent.click(testButton);

      await waitFor(() => {
        expect(screen.getByText(/model: claude-3-haiku-20240307/i)).toBeInTheDocument();
        expect(screen.getByText(/rate limit: 1000 requests\/minute/i)).toBeInTheDocument();
        expect(screen.getByText(/credits: \$95\.50 remaining/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      renderWithSession(<ApiKeyTester />);

      expect(screen.getByLabelText(/select provider/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/api key/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /test api key/i })).toBeInTheDocument();
    });

    it('should support keyboard navigation', () => {
      renderWithSession(<ApiKeyTester />);

      const providerSelect = screen.getByLabelText(/select provider/i);
      const apiKeyInput = screen.getByLabelText(/api key/i);
      const testButton = screen.getByRole('button', { name: /test api key/i });

      expect(providerSelect).toHaveAttribute('tabIndex', '0');
      expect(apiKeyInput).toHaveAttribute('tabIndex', '0');
      expect(testButton).toHaveAttribute('tabIndex', '0');
    });

    it('should announce test results to screen readers', async () => {
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

      renderWithSession(<ApiKeyTester />);

      const apiKeyInput = screen.getByLabelText(/api key/i);
      fireEvent.change(apiKeyInput, { target: { value: 'sk-ant-test-key' } });

      const testButton = screen.getByRole('button', { name: /test api key/i });
      fireEvent.click(testButton);

      await waitFor(() => {
        const resultContainer = screen.getByRole('region', { name: /test results/i });
        expect(resultContainer).toBeInTheDocument();
        expect(resultContainer).toHaveAttribute('aria-live', 'polite');
      });
    });
  });
});