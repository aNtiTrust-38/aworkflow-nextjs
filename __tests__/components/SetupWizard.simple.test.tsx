import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
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

describe('SetupWizard Core Functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render welcome step with basic elements', async () => {
    // Mock setup status fetch
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

    await waitFor(() => {
      expect(screen.getByText('Welcome to Academic Workflow Assistant')).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /continue/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /back/i })).toBeDisabled();
    });
  });

  it('should handle loading state', () => {
    mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

    renderWithSession(<SetupWizard />);

    expect(screen.getByText('Loading setup wizard...')).toBeInTheDocument();
  });

  it('should display setup complete when already configured', async () => {
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

  it('should handle API errors gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    renderWithSession(<SetupWizard />);

    await waitFor(() => {
      expect(screen.getByText(/failed to load setup status/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });
  });
});