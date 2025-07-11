import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Navigation from '../../components/Navigation';

// Mock fetch for API calls
global.fetch = vi.fn();
const mockFetch = vi.mocked(fetch);

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: () => '/settings'
}));

describe('Navigation Usage Indicator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  afterEach(() => {
    cleanup();
  });

  describe('Usage Display', () => {
    it('should display usage indicator when usage data is available', async () => {
      // Mock setup status
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ isSetup: true })
      } as Response);

      // Mock user settings
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          anthropicApiKey: 'sk-ant-test',
          openaiApiKey: 'sk-test'
        })
      } as Response);

      // Mock API key tests
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ valid: true })
      } as Response);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ valid: true })
      } as Response);

      // Mock usage data
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          used: 25.50,
          remaining: 74.50,
          percentage: 25.5,
          budget: 100
        })
      } as Response);

      render(<Navigation />);

      await waitFor(() => {
        expect(screen.getByLabelText(/api usage.*25\.50.*100.*25%/i)).toBeInTheDocument();
      });
    });

    it('should show correct percentage in usage bar', async () => {
      // Mock setup status
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ isSetup: true })
      } as Response);

      // Mock user settings
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          anthropicApiKey: 'sk-ant-test',
          openaiApiKey: 'sk-test'
        })
      } as Response);

      // Mock API key tests
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ valid: true })
      } as Response);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ valid: true })
      } as Response);

      // Mock usage data with 75% usage
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          used: 75.00,
          remaining: 25.00,
          percentage: 75.0,
          budget: 100
        })
      } as Response);

      render(<Navigation />);

      await waitFor(() => {
        const usageText = screen.getByText('75%');
        expect(usageText).toBeInTheDocument();
      });
    });

    it('should show red color when usage is over 80%', async () => {
      // Mock setup status
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ isSetup: true })
      } as Response);

      // Mock user settings
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          anthropicApiKey: 'sk-ant-test',
          openaiApiKey: 'sk-test'
        })
      } as Response);

      // Mock API key tests
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ valid: true })
      } as Response);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ valid: true })
      } as Response);

      // Mock usage data with 85% usage (over 80%)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          used: 85.00,
          remaining: 15.00,
          percentage: 85.0,
          budget: 100
        })
      } as Response);

      render(<Navigation />);

      await waitFor(() => {
        const usageText = screen.getByText('85%');
        expect(usageText).toBeInTheDocument();
        expect(usageText).toHaveStyle({ color: '#ef4444' });
      });
    });

    it('should show green color when usage is under 80%', async () => {
      // Mock setup status
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ isSetup: true })
      } as Response);

      // Mock user settings
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          anthropicApiKey: 'sk-ant-test',
          openaiApiKey: 'sk-test'
        })
      } as Response);

      // Mock API key tests
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ valid: true })
      } as Response);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ valid: true })
      } as Response);

      // Mock usage data with 50% usage (under 80%)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          used: 50.00,
          remaining: 50.00,
          percentage: 50.0,
          budget: 100
        })
      } as Response);

      render(<Navigation />);

      await waitFor(() => {
        const usageText = screen.getByText('50%');
        expect(usageText).toBeInTheDocument();
        expect(usageText).toHaveStyle({ color: '#666' });
      });
    });

    it('should not display usage indicator when usage data is unavailable', async () => {
      // Mock setup status
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ isSetup: true })
      } as Response);

      // Mock user settings
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          anthropicApiKey: 'sk-ant-test',
          openaiApiKey: 'sk-test'
        })
      } as Response);

      // Mock API key tests
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ valid: true })
      } as Response);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ valid: true })
      } as Response);

      // Mock usage API failure
      mockFetch.mockRejectedValueOnce(new Error('Usage API failed'));

      render(<Navigation />);

      await waitFor(() => {
        expect(screen.getByText('Settings')).toBeInTheDocument();
      });

      // Should not show usage indicator
      expect(screen.queryByLabelText(/api usage/i)).not.toBeInTheDocument();
    });
  });

  describe('Budget Status', () => {
    it('should handle different budget amounts correctly', async () => {
      // Mock setup status
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ isSetup: true })
      } as Response);

      // Mock user settings
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          anthropicApiKey: 'sk-ant-test',
          openaiApiKey: 'sk-test'
        })
      } as Response);

      // Mock API key tests
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ valid: true })
      } as Response);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ valid: true })
      } as Response);

      // Mock usage data with custom budget
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          used: 75.00,
          remaining: 175.00,
          percentage: 30.0,
          budget: 250
        })
      } as Response);

      render(<Navigation />);

      await waitFor(() => {
        expect(screen.getByLabelText(/api usage.*75\.00.*250.*30%/i)).toBeInTheDocument();
      });
    });

    it('should handle zero usage correctly', async () => {
      // Mock setup status
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ isSetup: true })
      } as Response);

      // Mock user settings
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          anthropicApiKey: 'sk-ant-test',
          openaiApiKey: 'sk-test'
        })
      } as Response);

      // Mock API key tests
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ valid: true })
      } as Response);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ valid: true })
      } as Response);

      // Mock usage data with zero usage
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          used: 0.00,
          remaining: 100.00,
          percentage: 0.0,
          budget: 100
        })
      } as Response);

      render(<Navigation />);

      await waitFor(() => {
        expect(screen.getByLabelText(/api usage.*0\.00.*100.*0%/i)).toBeInTheDocument();
        expect(screen.getByText('0%')).toBeInTheDocument();
      });
    });

    it('should handle budget exceeded scenario', async () => {
      // Mock setup status
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ isSetup: true })
      } as Response);

      // Mock user settings
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          anthropicApiKey: 'sk-ant-test',
          openaiApiKey: 'sk-test'
        })
      } as Response);

      // Mock API key tests
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ valid: true })
      } as Response);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ valid: true })
      } as Response);

      // Mock usage data with budget exceeded
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          used: 120.00,
          remaining: -20.00,
          percentage: 120.0,
          budget: 100
        })
      } as Response);

      render(<Navigation />);

      await waitFor(() => {
        expect(screen.getByLabelText(/api usage.*120\.00.*100.*120%/i)).toBeInTheDocument();
        expect(screen.getByText('120%')).toBeInTheDocument();
      });
    });
  });

  describe('API Health Checks', () => {
    it('should show API warning when keys are missing', async () => {
      // Mock setup status
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ isSetup: true })
      } as Response);

      // Mock user settings with missing keys
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          anthropicApiKey: null,
          openaiApiKey: null
        })
      } as Response);

      // Mock usage data
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          used: 0.00,
          remaining: 100.00,
          percentage: 0.0,
          budget: 100
        })
      } as Response);

      render(<Navigation />);

      await waitFor(() => {
        expect(screen.getByLabelText('API key missing')).toBeInTheDocument();
        expect(screen.getByText('⚠️')).toBeInTheDocument();
      });
    });

    it('should show API warning when keys are invalid', async () => {
      // Mock setup status
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ isSetup: true })
      } as Response);

      // Mock user settings with keys
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          anthropicApiKey: 'sk-ant-invalid',
          openaiApiKey: 'sk-invalid'
        })
      } as Response);

      // Mock API key tests - invalid results
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ valid: false })
      } as Response);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ valid: true })
      } as Response);

      // Mock usage data
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          used: 0.00,
          remaining: 100.00,
          percentage: 0.0,
          budget: 100
        })
      } as Response);

      render(<Navigation />);

      await waitFor(() => {
        expect(screen.getByLabelText('API key invalid')).toBeInTheDocument();
        expect(screen.getByText('⚠️')).toBeInTheDocument();
      });
    });

    it('should not show API warning when keys are valid', async () => {
      // Mock setup status
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ isSetup: true })
      } as Response);

      // Mock user settings with valid keys
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          anthropicApiKey: 'sk-ant-valid',
          openaiApiKey: 'sk-valid'
        })
      } as Response);

      // Mock API key tests - valid results
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ valid: true })
      } as Response);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ valid: true })
      } as Response);

      // Mock usage data
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          used: 25.00,
          remaining: 75.00,
          percentage: 25.0,
          budget: 100
        })
      } as Response);

      render(<Navigation />);

      await waitFor(() => {
        expect(screen.getByText('Settings')).toBeInTheDocument();
      });

      // Should not show API warning
      expect(screen.queryByText('⚠️')).not.toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle API failures gracefully', async () => {
      // Mock setup status failure
      mockFetch.mockRejectedValueOnce(new Error('Setup API failed'));

      // Mock user settings failure
      mockFetch.mockRejectedValueOnce(new Error('Settings API failed'));

      // Mock usage failure
      mockFetch.mockRejectedValueOnce(new Error('Usage API failed'));

      render(<Navigation />);

      await waitFor(() => {
        expect(screen.getByText('Settings')).toBeInTheDocument();
      });

      // Should not show any indicators when APIs fail
      expect(screen.queryByLabelText(/api usage/i)).not.toBeInTheDocument();
      expect(screen.queryByText('⚠️')).not.toBeInTheDocument();
    });

    it('should handle malformed API responses', async () => {
      // Mock setup status
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ isSetup: true })
      } as Response);

      // Mock user settings
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          anthropicApiKey: 'sk-ant-test',
          openaiApiKey: 'sk-test'
        })
      } as Response);

      // Mock API key tests
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ valid: true })
      } as Response);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ valid: true })
      } as Response);

      // Mock malformed usage data
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          // Missing required fields
          used: 'invalid',
          percentage: null
        })
      } as Response);

      render(<Navigation />);

      await waitFor(() => {
        expect(screen.getByText('Settings')).toBeInTheDocument();
      });

      // Should not show usage indicator with malformed data
      expect(screen.queryByLabelText(/api usage/i)).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for usage indicator', async () => {
      // Mock setup status
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ isSetup: true })
      } as Response);

      // Mock user settings
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          anthropicApiKey: 'sk-ant-test',
          openaiApiKey: 'sk-test'
        })
      } as Response);

      // Mock API key tests
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ valid: true })
      } as Response);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ valid: true })
      } as Response);

      // Mock usage data
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          used: 42.50,
          remaining: 57.50,
          percentage: 42.5,
          budget: 100
        })
      } as Response);

      render(<Navigation />);

      await waitFor(() => {
        const usageIndicator = screen.getByLabelText(/api usage.*42\.50.*100.*42%/i);
        expect(usageIndicator).toBeInTheDocument();
        expect(usageIndicator).toHaveAttribute('title');
      });
    });

    it('should have proper ARIA labels for API warnings', async () => {
      // Mock setup status
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ isSetup: true })
      } as Response);

      // Mock user settings with missing keys
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          anthropicApiKey: null,
          openaiApiKey: 'sk-test'
        })
      } as Response);

      // Mock usage data
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          used: 0.00,
          remaining: 100.00,
          percentage: 0.0,
          budget: 100
        })
      } as Response);

      render(<Navigation />);

      await waitFor(() => {
        const warningIndicator = screen.getByLabelText('API key missing');
        expect(warningIndicator).toBeInTheDocument();
        expect(warningIndicator).toHaveAttribute('title', 'API key missing');
      });
    });
  });
}); 