import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FormField, TestKeyButton, SettingsCard, LoadingButton } from '../components/forms';
import { ApiKeyTestResult } from '../types/settings';

// Mock Heroicons
vi.mock('@heroicons/react/24/outline', () => ({
  EyeIcon: () => <div data-testid="eye-icon">EyeIcon</div>,
  EyeSlashIcon: () => <div data-testid="eye-slash-icon">EyeSlashIcon</div>,
  CheckCircleIcon: () => <div data-testid="check-circle-icon">CheckCircleIcon</div>,
  XCircleIcon: () => <div data-testid="x-circle-icon">XCircleIcon</div>,
  ClockIcon: () => <div data-testid="clock-icon">ClockIcon</div>,
  ExclamationTriangleIcon: () => <div data-testid="exclamation-triangle-icon">ExclamationTriangleIcon</div>,
  CheckIcon: () => <div data-testid="check-icon">CheckIcon</div>,
  XMarkIcon: () => <div data-testid="x-mark-icon">XMarkIcon</div>
}));

// Mock fetch
global.fetch = vi.fn();

describe('FormField Component', () => {
  it('renders basic text field correctly', () => {
    const handleChange = vi.fn();
    
    render(
      <FormField
        id="test-field"
        label="Test Field"
        value=""
        onChange={handleChange}
      />
    );

    expect(screen.getByLabelText('Test Field')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('handles password field with toggle visibility', async () => {
    const handleChange = vi.fn();
    
    render(
      <FormField
        id="password-field"
        label="Password"
        type="password"
        value="secret123"
        onChange={handleChange}
        showTogglePassword={true}
      />
    );

    const passwordInput = screen.getByLabelText('Password');
    expect(passwordInput).toHaveAttribute('type', 'password');

    // Find and click the toggle button
    const toggleButton = screen.getByRole('button', { name: /show password/i });
    fireEvent.click(toggleButton);

    await waitFor(() => {
      expect(passwordInput).toHaveAttribute('type', 'text');
    });
  });

  it('displays error messages', () => {
    const handleChange = vi.fn();
    
    render(
      <FormField
        id="error-field"
        label="Error Field"
        value=""
        onChange={handleChange}
        error="This field is required"
      />
    );

    expect(screen.getByText('This field is required')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('shows required indicator', () => {
    const handleChange = vi.fn();
    
    render(
      <FormField
        id="required-field"
        label="Required Field"
        value=""
        onChange={handleChange}
        required={true}
      />
    );

    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('displays help text', () => {
    const handleChange = vi.fn();
    
    render(
      <FormField
        id="help-field"
        label="Help Field"
        value=""
        onChange={handleChange}
        helpText="This is helpful information"
      />
    );

    expect(screen.getByText('This is helpful information')).toBeInTheDocument();
  });

  it('handles number input correctly', () => {
    const handleChange = vi.fn();
    
    render(
      <FormField
        id="number-field"
        label="Number Field"
        type="number"
        value={42}
        onChange={handleChange}
      />
    );

    const input = screen.getByLabelText('Number Field');
    fireEvent.change(input, { target: { value: '100' } });
    
    expect(handleChange).toHaveBeenCalledWith(100);
  });
});

describe('TestKeyButton Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders test button correctly', () => {
    render(
      <TestKeyButton
        provider="anthropic"
        apiKey="sk-ant-test123"
      />
    );

    expect(screen.getByRole('button', { name: /test anthropic api key/i })).toBeInTheDocument();
    expect(screen.getByText('Test Connection')).toBeInTheDocument();
  });

  it('shows loading state during test', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ valid: true, details: { service: 'Anthropic', status: 'connected' } })
    } as Response);

    render(
      <TestKeyButton
        provider="anthropic"
        apiKey="sk-ant-test123"
      />
    );

    const button = screen.getByRole('button', { name: /test anthropic api key/i });
    fireEvent.click(button);

    expect(screen.getByText('Testing...')).toBeInTheDocument();
    expect(screen.getByTestId('clock-icon')).toBeInTheDocument();
  });

  it('handles successful test result', async () => {
    const mockFetch = vi.mocked(fetch);
    const testResult: ApiKeyTestResult = {
      valid: true,
      details: {
        service: 'Anthropic',
        status: 'connected',
        message: 'API key is valid'
      }
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => testResult
    } as Response);

    const onTestComplete = vi.fn();
    
    render(
      <TestKeyButton
        provider="anthropic"
        apiKey="sk-ant-test123"
        onTestComplete={onTestComplete}
      />
    );

    const button = screen.getByRole('button', { name: /test anthropic api key/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Valid')).toBeInTheDocument();
      expect(screen.getByTestId('check-circle-icon')).toBeInTheDocument();
      expect(onTestComplete).toHaveBeenCalledWith(testResult);
    });
  });

  it('handles failed test result', async () => {
    const mockFetch = vi.mocked(fetch);
    const testResult: ApiKeyTestResult = {
      valid: false,
      error: 'Invalid API key',
      details: {
        service: 'Anthropic',
        status: 'unauthorized',
        message: 'API key is invalid'
      }
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => testResult
    } as Response);

    render(
      <TestKeyButton
        provider="anthropic"
        apiKey="sk-ant-test123"
      />
    );

    const button = screen.getByRole('button', { name: /test anthropic api key/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Invalid')).toBeInTheDocument();
      expect(screen.getByTestId('x-circle-icon')).toBeInTheDocument();
    });
  });

  it('validates required fields before testing', async () => {
    const onTestComplete = vi.fn();
    
    render(
      <TestKeyButton
        provider="anthropic"
        apiKey=""
        onTestComplete={onTestComplete}
      />
    );

    const button = screen.getByRole('button', { name: /test anthropic api key/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(onTestComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          valid: false,
          error: 'API key is required'
        })
      );
    });
  });

  it('validates Zotero userId requirement', async () => {
    const onTestComplete = vi.fn();
    
    render(
      <TestKeyButton
        provider="zotero"
        apiKey="test-key"
        onTestComplete={onTestComplete}
      />
    );

    const button = screen.getByRole('button', { name: /test zotero api key/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(onTestComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          valid: false,
          error: 'User ID is required for Zotero'
        })
      );
    });
  });
});

describe('SettingsCard Component', () => {
  it('renders card with basic props', () => {
    render(
      <SettingsCard
        title="Test Card"
        description="Test description"
        configured={false}
      >
        <div>Card content</div>
      </SettingsCard>
    );

    expect(screen.getByText('Test Card')).toBeInTheDocument();
    expect(screen.getByText('Test description')).toBeInTheDocument();
    expect(screen.getByText('Card content')).toBeInTheDocument();
  });

  it('shows configured status correctly', () => {
    render(
      <SettingsCard
        title="Configured Card"
        configured={true}
      >
        <div>Content</div>
      </SettingsCard>
    );

    expect(screen.getByText('Configured')).toBeInTheDocument();
    expect(screen.getByTestId('check-circle-icon')).toBeInTheDocument();
  });

  it('shows required status for unconfigured required cards', () => {
    render(
      <SettingsCard
        title="Required Card"
        configured={false}
        required={true}
      >
        <div>Content</div>
      </SettingsCard>
    );

    expect(screen.getByText('Required')).toBeInTheDocument();
    expect(screen.getByText('*')).toBeInTheDocument();
    expect(screen.getByTestId('exclamation-triangle-icon')).toBeInTheDocument();
  });

  it('shows warning footer for required unconfigured cards', () => {
    render(
      <SettingsCard
        title="Required Card"
        configured={false}
        required={true}
      >
        <div>Content</div>
      </SettingsCard>
    );

    expect(screen.getByText(/this configuration is required/i)).toBeInTheDocument();
  });

  it('shows optional status for non-required cards', () => {
    render(
      <SettingsCard
        title="Optional Card"
        configured={false}
        required={false}
      >
        <div>Content</div>
      </SettingsCard>
    );

    expect(screen.getByText('Optional')).toBeInTheDocument();
  });
});

describe('LoadingButton Component', () => {
  it('renders normal button state', () => {
    const handleClick = vi.fn();
    
    render(
      <LoadingButton onClick={handleClick}>
        Click Me
      </LoadingButton>
    );

    expect(screen.getByRole('button', { name: 'Click Me' })).toBeInTheDocument();
  });

  it('shows loading state correctly', () => {
    render(
      <LoadingButton loading={true} loadingText="Saving...">
        Save
      </LoadingButton>
    );

    expect(screen.getByText('Saving...')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('shows success state correctly', () => {
    render(
      <LoadingButton success={true} successText="Saved!">
        Save
      </LoadingButton>
    );

    expect(screen.getByText('Saved!')).toBeInTheDocument();
    expect(screen.getByTestId('check-icon')).toBeInTheDocument();
  });

  it('shows error state correctly', () => {
    render(
      <LoadingButton error={true} errorText="Failed">
        Save
      </LoadingButton>
    );

    expect(screen.getByText('Failed')).toBeInTheDocument();
    expect(screen.getByTestId('x-mark-icon')).toBeInTheDocument();
  });

  it('applies different variants correctly', () => {
    const { rerender } = render(
      <LoadingButton variant="primary">Primary</LoadingButton>
    );
    
    let button = screen.getByRole('button');
    expect(button).toHaveClass('bg-blue-600');

    rerender(
      <LoadingButton variant="secondary">Secondary</LoadingButton>
    );
    
    button = screen.getByRole('button');
    expect(button).toHaveClass('bg-white');

    rerender(
      <LoadingButton variant="danger">Danger</LoadingButton>
    );
    
    button = screen.getByRole('button');
    expect(button).toHaveClass('bg-red-600');
  });

  it('applies different sizes correctly', () => {
    const { rerender } = render(
      <LoadingButton size="sm">Small</LoadingButton>
    );
    
    let button = screen.getByRole('button');
    expect(button).toHaveClass('px-3', 'py-1.5', 'text-sm');

    rerender(
      <LoadingButton size="lg">Large</LoadingButton>
    );
    
    button = screen.getByRole('button');
    expect(button).toHaveClass('px-6', 'py-3', 'text-base');
  });

  it('handles click events when not disabled', () => {
    const handleClick = vi.fn();
    
    render(
      <LoadingButton onClick={handleClick}>
        Click Me
      </LoadingButton>
    );

    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('does not handle click events when disabled', () => {
    const handleClick = vi.fn();
    
    render(
      <LoadingButton onClick={handleClick} disabled={true}>
        Click Me
      </LoadingButton>
    );

    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).not.toHaveBeenCalled();
  });
});