import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SetupWizard } from '../components/SetupWizard';
import { SetupStatus } from '../types/settings';

// Mock the crypto module
vi.mock('../lib/crypto', () => ({
  generateNextAuthSecret: () => 'generated-secret-12345678901234567890123456789012'
}));

// Mock Heroicons
vi.mock('@heroicons/react/24/outline', () => ({
  CheckCircleIcon: () => <div data-testid="check-circle-icon">CheckCircleIcon</div>,
  ExclamationTriangleIcon: () => <div data-testid="exclamation-triangle-icon">ExclamationTriangleIcon</div>,
  ChevronRightIcon: () => <div data-testid="chevron-right-icon">ChevronRightIcon</div>,
  ChevronLeftIcon: () => <div data-testid="chevron-left-icon">ChevronLeftIcon</div>,
  CogIcon: () => <div data-testid="cog-icon">CogIcon</div>,
  KeyIcon: () => <div data-testid="key-icon">KeyIcon</div>,
  ShieldCheckIcon: () => <div data-testid="shield-check-icon">ShieldCheckIcon</div>,
  CloudIcon: () => <div data-testid="cloud-icon">CloudIcon</div>,
  EyeIcon: () => <div data-testid="eye-icon">EyeIcon</div>,
  EyeSlashIcon: () => <div data-testid="eye-slash-icon">EyeSlashIcon</div>,
  ClockIcon: () => <div data-testid="clock-icon">ClockIcon</div>,
  XCircleIcon: () => <div data-testid="x-circle-icon">XCircleIcon</div>
}));

// Mock form components
vi.mock('../components/forms', () => ({
  FormField: ({ id, label, value, onChange, error, required }: any) => (
    <div data-testid={`form-field-${id}`}>
      <label htmlFor={id}>
        {label} {required && '*'}
      </label>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        data-testid={`input-${id}`}
      />
      {error && <div data-testid={`error-${id}`}>{error}</div>}
    </div>
  ),
  TestKeyButton: ({ provider, apiKey, onTestComplete }: any) => (
    <button
      data-testid={`test-${provider}`}
      onClick={() => onTestComplete?.({ valid: true, details: { service: provider, status: 'connected' } })}
    >
      Test {provider}
    </button>
  ),
  LoadingButton: ({ children, onClick, loading, disabled }: any) => (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      data-testid="loading-button"
    >
      {loading ? 'Loading...' : children}
    </button>
  )
}));

// Mock fetch
global.fetch = vi.fn();

describe('SetupWizard Component', () => {
  const mockOnComplete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock setup status API call
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        isSetup: false,
        completedSteps: [],
        requiredSettings: ['anthropic_api_key', 'nextauth_secret'],
        missingSettings: ['anthropic_api_key', 'nextauth_secret']
      } as SetupStatus)
    } as Response);
  });

  it('renders setup wizard with first step', async () => {
    render(<SetupWizard onComplete={mockOnComplete} />);

    await waitFor(() => {
      expect(screen.getByText('AI Provider Setup')).toBeInTheDocument();
      expect(screen.getByTestId('form-field-anthropicKey')).toBeInTheDocument();
    });
  });

  it('shows step progress indicators', async () => {
    render(<SetupWizard onComplete={mockOnComplete} />);

    await waitFor(() => {
      expect(screen.getByText('AI Provider Setup')).toBeInTheDocument();
      expect(screen.getByText('Authentication Setup')).toBeInTheDocument();
      expect(screen.getByText('Additional AI Provider')).toBeInTheDocument();
      expect(screen.getByText('Zotero Integration')).toBeInTheDocument();
    });
  });

  it('validates required fields before proceeding', async () => {
    render(<SetupWizard onComplete={mockOnComplete} />);

    await waitFor(() => {
      expect(screen.getByText('AI Provider Setup')).toBeInTheDocument();
    });

    // Try to proceed without filling required field
    const nextButton = screen.getByTestId('loading-button');
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(screen.getByTestId('error-anthropicKey')).toBeInTheDocument();
    });
  });

  it('allows proceeding when required fields are filled', async () => {
    render(<SetupWizard onComplete={mockOnComplete} />);

    await waitFor(() => {
      expect(screen.getByText('AI Provider Setup')).toBeInTheDocument();
    });

    // Fill in the required field
    const anthropicKeyInput = screen.getByTestId('input-anthropicKey');
    fireEvent.change(anthropicKeyInput, { target: { value: 'sk-ant-test123' } });

    // Proceed to next step
    const nextButton = screen.getByTestId('loading-button');
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(screen.getByText('Authentication Setup')).toBeInTheDocument();
    });
  });

  it('auto-generates NextAuth secret when proceeding from auth step', async () => {
    render(<SetupWizard onComplete={mockOnComplete} />);

    // Navigate to auth step
    await waitFor(() => {
      expect(screen.getByText('AI Provider Setup')).toBeInTheDocument();
    });

    const anthropicKeyInput = screen.getByTestId('input-anthropicKey');
    fireEvent.change(anthropicKeyInput, { target: { value: 'sk-ant-test123' } });

    fireEvent.click(screen.getByTestId('loading-button'));

    await waitFor(() => {
      expect(screen.getByText('Authentication Setup')).toBeInTheDocument();
    });

    // Fill NextAuth URL and proceed (secret should be auto-generated)
    const nextauthUrlInput = screen.getByTestId('input-nextauthUrl');
    fireEvent.change(nextauthUrlInput, { target: { value: 'http://localhost:3000' } });

    fireEvent.click(screen.getByTestId('loading-button'));

    await waitFor(() => {
      expect(screen.getByText('Additional AI Provider')).toBeInTheDocument();
    });
  });

  it('allows navigation between steps', async () => {
    render(<SetupWizard onComplete={mockOnComplete} />);

    // Navigate forward
    await waitFor(() => {
      expect(screen.getByText('AI Provider Setup')).toBeInTheDocument();
    });

    const anthropicKeyInput = screen.getByTestId('input-anthropicKey');
    fireEvent.change(anthropicKeyInput, { target: { value: 'sk-ant-test123' } });

    fireEvent.click(screen.getByTestId('loading-button'));

    await waitFor(() => {
      expect(screen.getByText('Authentication Setup')).toBeInTheDocument();
    });

    // Navigate backward
    const previousButton = screen.getByRole('button', { name: /previous/i });
    fireEvent.click(previousButton);

    await waitFor(() => {
      expect(screen.getByText('AI Provider Setup')).toBeInTheDocument();
    });
  });

  it('disables previous button on first step', async () => {
    render(<SetupWizard onComplete={mockOnComplete} />);

    await waitFor(() => {
      expect(screen.getByText('AI Provider Setup')).toBeInTheDocument();
    });

    const previousButton = screen.getByRole('button', { name: /previous/i });
    expect(previousButton).toBeDisabled();
  });

  it('handles API key testing', async () => {
    render(<SetupWizard onComplete={mockOnComplete} />);

    await waitFor(() => {
      expect(screen.getByText('AI Provider Setup')).toBeInTheDocument();
    });

    // Fill in API key
    const anthropicKeyInput = screen.getByTestId('input-anthropicKey');
    fireEvent.change(anthropicKeyInput, { target: { value: 'sk-ant-test123' } });

    // Test should be available
    await waitFor(() => {
      expect(screen.getByTestId('test-anthropic')).toBeInTheDocument();
    });

    // Click test button
    fireEvent.click(screen.getByTestId('test-anthropic'));

    // Test result should be recorded
    expect(screen.getByTestId('test-anthropic')).toBeInTheDocument();
  });

  it('completes setup on final step', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true })
    } as Response);

    render(<SetupWizard onComplete={mockOnComplete} />);

    // Navigate through all steps quickly
    await waitFor(() => {
      expect(screen.getByText('AI Provider Setup')).toBeInTheDocument();
    });

    // Fill first step
    fireEvent.change(screen.getByTestId('input-anthropicKey'), { 
      target: { value: 'sk-ant-test123' } 
    });
    fireEvent.click(screen.getByTestId('loading-button'));

    // Fill second step
    await waitFor(() => {
      expect(screen.getByText('Authentication Setup')).toBeInTheDocument();
    });
    fireEvent.change(screen.getByTestId('input-nextauthUrl'), { 
      target: { value: 'http://localhost:3000' } 
    });
    fireEvent.click(screen.getByTestId('loading-button'));

    // Skip third step
    await waitFor(() => {
      expect(screen.getByText('Additional AI Provider')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('loading-button'));

    // Complete final step
    await waitFor(() => {
      expect(screen.getByText('Zotero Integration')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('loading-button'));

    await waitFor(() => {
      expect(mockOnComplete).toHaveBeenCalled();
    });
  });

  it('handles setup completion errors', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    render(<SetupWizard onComplete={mockOnComplete} />);

    // Navigate to final step and try to complete
    await waitFor(() => {
      expect(screen.getByText('AI Provider Setup')).toBeInTheDocument();
    });

    // Quick navigation through steps
    fireEvent.change(screen.getByTestId('input-anthropicKey'), { 
      target: { value: 'sk-ant-test123' } 
    });
    fireEvent.click(screen.getByTestId('loading-button'));

    await waitFor(() => {
      fireEvent.change(screen.getByTestId('input-nextauthUrl'), { 
        target: { value: 'http://localhost:3000' } 
      });
      fireEvent.click(screen.getByTestId('loading-button'));
    });

    await waitFor(() => {
      fireEvent.click(screen.getByTestId('loading-button'));
    });

    await waitFor(() => {
      fireEvent.click(screen.getByTestId('loading-button'));
    });

    // Should show error but not call onComplete
    await waitFor(() => {
      expect(mockOnComplete).not.toHaveBeenCalled();
    });
  });

  it('validates field formats correctly', async () => {
    render(<SetupWizard onComplete={mockOnComplete} />);

    await waitFor(() => {
      expect(screen.getByText('AI Provider Setup')).toBeInTheDocument();
    });

    // Enter invalid Anthropic key format
    const anthropicKeyInput = screen.getByTestId('input-anthropicKey');
    fireEvent.change(anthropicKeyInput, { target: { value: 'invalid-key' } });

    fireEvent.click(screen.getByTestId('loading-button'));

    await waitFor(() => {
      expect(screen.getByTestId('error-anthropicKey')).toBeInTheDocument();
    });
  });

  it('handles optional fields correctly', async () => {
    render(<SetupWizard onComplete={mockOnComplete} />);

    // Navigate to optional step (OpenAI)
    await waitFor(() => {
      expect(screen.getByText('AI Provider Setup')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByTestId('input-anthropicKey'), { 
      target: { value: 'sk-ant-test123' } 
    });
    fireEvent.click(screen.getByTestId('loading-button'));

    await waitFor(() => {
      fireEvent.change(screen.getByTestId('input-nextauthUrl'), { 
        target: { value: 'http://localhost:3000' } 
      });
      fireEvent.click(screen.getByTestId('loading-button'));
    });

    await waitFor(() => {
      expect(screen.getByText('Additional AI Provider')).toBeInTheDocument();
    });

    // Should be able to proceed without filling optional fields
    fireEvent.click(screen.getByTestId('loading-button'));

    await waitFor(() => {
      expect(screen.getByText('Zotero Integration')).toBeInTheDocument();
    });
  });
});