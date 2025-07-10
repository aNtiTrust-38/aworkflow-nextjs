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

describe('ApiKeyTester Core Functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('should render basic API key tester interface', () => {
    renderWithSession(<ApiKeyTester />);

    expect(screen.getByText('API Key Testing')).toBeInTheDocument();
    expect(screen.getByText('Test your API keys for connectivity and functionality')).toBeInTheDocument();
    expect(screen.getByLabelText(/select provider/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/api key/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /test api key/i })).toBeInTheDocument();
  });

  it('should show test button disabled initially', () => {
    renderWithSession(<ApiKeyTester />);

    const testButton = screen.getByRole('button', { name: /test api key/i });
    expect(testButton).toBeDisabled();
  });

  it('should enable test button with valid API key', () => {
    renderWithSession(<ApiKeyTester />);

    const apiKeyInput = screen.getByLabelText(/api key/i);
    fireEvent.change(apiKeyInput, { target: { value: 'sk-ant-valid-key-123' } });

    const testButton = screen.getByRole('button', { name: /test api key/i });
    expect(testButton).not.toBeDisabled();
  });

  it('should test API key successfully', async () => {
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
    expect(screen.getAllByText(/testing.../i)[0]).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/api key is valid and working/i)).toBeInTheDocument();
      expect(screen.getByText(/anthropic claude/i)).toBeInTheDocument();
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

  it('should show real-time validation feedback', async () => {
    renderWithSession(<ApiKeyTester />);

    const apiKeyInput = screen.getByLabelText(/api key/i);
    
    // Start typing
    fireEvent.change(apiKeyInput, { target: { value: 'sk-ant-' } });
    
    // Should show typing indicator
    expect(screen.getByText(/entering anthropic api key.../i)).toBeInTheDocument();

    // Wait for validation to complete
    await waitFor(() => {
      expect(screen.getByText(/✓ valid format/i)).toBeInTheDocument();
    }, { timeout: 1000 });
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
    });
  });

  it('should support different providers', () => {
    renderWithSession(<ApiKeyTester />);

    const providerSelect = screen.getByLabelText(/select provider/i);
    
    // Switch to OpenAI
    fireEvent.change(providerSelect, { target: { value: 'openai' } });
    expect(providerSelect).toHaveValue('openai');

    // Switch to Zotero
    fireEvent.change(providerSelect, { target: { value: 'zotero' } });
    expect(providerSelect).toHaveValue('zotero');
    
    // Should show User ID field for Zotero
    expect(screen.getByLabelText(/user id/i)).toBeInTheDocument();
  });
});