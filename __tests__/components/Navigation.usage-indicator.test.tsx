import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Navigation from '../../components/Navigation';

// Fix for TypeScript global
declare const global: any;

// Mock fetch for API calls
const mockFetch = vi.mocked(global.fetch = vi.fn());

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: () => '/settings'
}));

describe('Navigation Usage Indicator', () => {
  beforeEach(async () => {
    cleanup();
    vi.clearAllMocks();
  });

  afterEach(async () => {
    cleanup();
    vi.clearAllMocks();
    // Wait for any pending promises
    await new Promise(resolve => setTimeout(resolve, 0));
  });

  describe('Usage Display', () => {
    it('should render basic navigation', async () => {
      render(<Navigation />);
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    it('should display usage indicator when usage data is available', async () => {
      // Setup mock responses using mockImplementation for more control
      mockFetch.mockImplementation((url: string, options?: any) => {
        if (url === '/api/setup-status') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ isSetup: true })
          } as Response);
        }
        if (url === '/api/user-settings') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              anthropicApiKey: 'sk-ant-test',
              openaiApiKey: 'sk-test'
            })
          } as Response);
        }
        if (url === '/api/test-api-keys') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ valid: true })
          } as Response);
        }
        if (url === '/api/usage') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              used: 25.50,
              remaining: 74.50,
              percentage: 26,
              budget: 100
            })
          } as Response);
        }
        return Promise.reject(new Error(`Unexpected URL: ${url}`));
      });

      render(<Navigation />);

      await waitFor(() => {
        expect(screen.getByLabelText(/api usage.*25\.50.*100.*26%/i)).toBeInTheDocument();
        // Percent is split into two spans, so use a function matcher
        expect(screen.getByText((content, node) => {
          return node?.textContent === '26%';
        })).toBeInTheDocument();
      }, { timeout: 10000 });
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
          percentage: 75,
          budget: 100
        })
      } as Response);

      render(<Navigation />);

      await waitFor(() => {
        expect(screen.getByText((content, node) => node?.textContent === '75%')).toBeInTheDocument();
      });
    });

    it('should show red color when usage is over 90%', async () => {
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

      // Mock usage data with 95% usage (over 90%)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          used: 95.00,
          remaining: 5.00,
          percentage: 95,
          budget: 100
        })
      } as Response);

      render(<Navigation />);

      await waitFor(() => {
        const usageText = screen.getByText((content, node) => node?.textContent === '95%');
        expect(usageText).toBeInTheDocument();
        expect(usageText).toHaveStyle({ color: '#ef4444' });
      });
    });

    it('should show green color when usage is under 90%', async () => {
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

      // Mock usage data with 50% usage (under 90%)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          used: 50.00,
          remaining: 50.00,
          percentage: 50,
          budget: 100
        })
      } as Response);

      render(<Navigation />);

      await waitFor(() => {
        const usageText = screen.getByText((content, node) => node?.textContent === '50%');
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
      expect(screen.queryByLabelText(/api usage/i)).toBeNull();
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
          percentage: 30,
          budget: 250
        })
      } as Response);

      render(<Navigation />);

      await waitFor(() => {
        expect(screen.getByLabelText(/api usage.*75\.00.*250.*30%/i)).toBeInTheDocument();
        expect(screen.getByText((content, node) => node?.textContent === '30%')).toBeInTheDocument();
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
          percentage: 0,
          budget: 100
        })
      } as Response);

      render(<Navigation />);

      await waitFor(() => {
        expect(screen.getByLabelText(/api usage.*0\.00.*100.*0%/i)).toBeInTheDocument();
        expect(screen.getByText((content, node) => node?.textContent === '0%')).toBeInTheDocument();
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
          percentage: 120,
          budget: 100
        })
      } as Response);

      render(<Navigation />);

      await waitFor(() => {
        expect(screen.getByLabelText(/api usage.*120\.00.*100.*120%/i)).toBeInTheDocument();
        expect(screen.getByText((content, node) => node?.textContent === '120%')).toBeInTheDocument();
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
          percentage: 0,
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
          percentage: 0,
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
          percentage: 25,
          budget: 100
        })
      } as Response);

      render(<Navigation />);

      await waitFor(() => {
        expect(screen.getByText('Settings')).toBeInTheDocument();
      });
      // Should not show API warning
      expect(screen.queryByLabelText('API key invalid')).toBeNull();
      expect(screen.queryByText('⚠️')).toBeNull();
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
      expect(screen.queryByLabelText(/api usage/i)).toBeNull();
      expect(screen.queryByText('⚠️')).toBeNull();
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
      expect(screen.queryByLabelText(/api usage/i)).toBeNull();
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
          percentage: 43,
          budget: 100
        })
      } as Response);

      render(<Navigation />);

      await waitFor(() => {
        const usageIndicator = screen.getByLabelText(/api usage.*42\.50.*100.*43%/i);
        expect(usageIndicator).toBeInTheDocument();
        expect(usageIndicator).toHaveAttribute('title');
        expect(screen.getByText((content, node) => node?.textContent === '43%')).toBeInTheDocument();
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
          percentage: 0,
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

describe('Navigation Usage Indicator - Expansion', () => {
  it('should show an accessible label for the usage bar', async () => {
    // Mock all fetches for a normal usage scenario
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ isSetup: true }) } as Response);
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ anthropicApiKey: 'sk', openaiApiKey: 'sk' }) } as Response);
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ valid: true }) } as Response);
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ valid: true }) } as Response);
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ used: 10, remaining: 90, percentage: 10, budget: 100 }) } as Response);
    render(<Navigation />);
    await waitFor(() => {
      expect(screen.getByLabelText(/api usage/i)).toBeInTheDocument();
    });
  });

  it('should display a warning when usage exceeds 90%', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ isSetup: true }) } as Response);
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ anthropicApiKey: 'sk', openaiApiKey: 'sk' }) } as Response);
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ valid: true }) } as Response);
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ valid: true }) } as Response);
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ used: 95, remaining: 5, percentage: 95, budget: 100 }) } as Response);
    render(<Navigation />);
    await waitFor(() => {
      expect(screen.getByText('95%')).toHaveStyle({ color: '#ef4444' });
      expect(screen.getByTitle(/api usage/i)).toBeInTheDocument();
    });
  });

  it('should render a tooltip with budget details on hover', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ isSetup: true }) } as Response);
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ anthropicApiKey: 'sk', openaiApiKey: 'sk' }) } as Response);
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ valid: true }) } as Response);
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ valid: true }) } as Response);
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ used: 50, remaining: 50, percentage: 50, budget: 100 }) } as Response);
    render(<Navigation />);
    await waitFor(() => {
      const usageEl = screen.getByLabelText(/api usage/i);
      expect(usageEl).toHaveAttribute('title', expect.stringMatching(/\$50.*100.*50%/i));
    });
  });

  it('should handle missing usage gracefully with fallback UI', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ isSetup: true }) } as Response);
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ anthropicApiKey: 'sk', openaiApiKey: 'sk' }) } as Response);
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ valid: true }) } as Response);
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ valid: true }) } as Response);
    mockFetch.mockRejectedValueOnce(new Error('Usage API failed'));
    render(<Navigation />);
    await waitFor(() => {
      expect(screen.getByText('Settings')).toBeInTheDocument();
      // Should not throw or crash
    });
  });
}); 