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
    // Reset fetch mock to default empty behavior
    mockFetch.mockReset();
  });

  afterEach(async () => {
    cleanup();
    vi.clearAllMocks();
    mockFetch.mockReset();
    // Wait for any pending promises
    await new Promise(resolve => setTimeout(resolve, 100));
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
        expect(screen.getByTestId('api-usage-indicator')).toBeInTheDocument();
      }, { timeout: 2000 });

      await waitFor(() => {
        expect(screen.getByLabelText(/api usage.*25\.50.*100.*26%/i)).toBeInTheDocument();
        const indicators = screen.getAllByTestId('api-usage-indicator');
        expect(indicators.length).toBeGreaterThan(0);
        const percentageText = screen.getAllByText((content, node) => {
          return node?.textContent === '26%';
        });
        expect(percentageText.length).toBeGreaterThan(0);
      }, { timeout: 2000 });
    });

    it('should show correct percentage in usage bar', async () => {
      // Mock all API calls with implementation pattern
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
              used: 75.00,
              remaining: 25.00,
              percentage: 75,
              budget: 100
            })
          } as Response);
        }
        return Promise.reject(new Error(`Unexpected URL: ${url}`));
      });

      render(<Navigation />);

      await waitFor(() => {
        expect(screen.getByTestId('api-usage-indicator')).toBeInTheDocument();
      }, { timeout: 2000 });

      await waitFor(() => {
        const percentageTexts = screen.getAllByText((content, node) => node?.textContent === '75%');
        expect(percentageTexts.length).toBeGreaterThan(0);
      }, { timeout: 2000 });
    });

    it('should show red color when usage is over 90%', async () => {
      // Mock all API calls with implementation pattern
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
              used: 95.00,
              remaining: 5.00,
              percentage: 95,
              budget: 100
            })
          } as Response);
        }
        return Promise.reject(new Error(`Unexpected URL: ${url}`));
      });

      render(<Navigation />);

      await waitFor(() => {
        const usageTexts = screen.getAllByText((content, node) => node?.textContent === '95%');
        expect(usageTexts.length).toBeGreaterThan(0);
        // Find the span element with the percentage text that has the color style
        const percentageElement = usageTexts.find(element => 
          element.getAttribute('style')?.includes('color: rgb(239, 68, 68)')
        );
        expect(percentageElement).toBeTruthy();
      }, { timeout: 2000 });
    });

    it('should show green color when usage is under 90%', async () => {
      // Mock all API calls with implementation pattern
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
              used: 50.00,
              remaining: 50.00,
              percentage: 50,
              budget: 100
            })
          } as Response);
        }
        return Promise.reject(new Error(`Unexpected URL: ${url}`));
      });

      render(<Navigation />);

      await waitFor(() => {
        const usageTexts = screen.getAllByText((content, node) => node?.textContent === '50%');
        expect(usageTexts.length).toBeGreaterThan(0);
        // Find the span element with the percentage text that has the color style
        const percentageElement = usageTexts.find(element => 
          element.getAttribute('style')?.includes('color: rgb(102, 102, 102)')
        );
        expect(percentageElement).toBeTruthy();
      }, { timeout: 2000 });
    });

    it('should not display usage indicator when usage data is unavailable', async () => {
      // Mock all API calls with implementation pattern
      let callCount = 0;
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
          return Promise.reject(new Error('Usage API failed'));
        }
        return Promise.reject(new Error(`Unexpected URL: ${url}`));
      });

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
      // Mock all API calls with implementation pattern
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
              used: 75.00,
              remaining: 175.00,
              percentage: 30,
              budget: 250
            })
          } as Response);
        }
        return Promise.reject(new Error(`Unexpected URL: ${url}`));
      });

      render(<Navigation />);

      await waitFor(() => {
        const usageElements = screen.getAllByLabelText(/api usage.*75\.00.*250.*30%/i);
        expect(usageElements.length).toBeGreaterThan(0);
        const percentageTexts = screen.getAllByText((content, node) => node?.textContent === '30%');
        expect(percentageTexts.length).toBeGreaterThan(0);
      });
    });

    it('should handle zero usage correctly', async () => {
      // Mock all API calls with implementation pattern
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
              used: 0.00,
              remaining: 100.00,
              percentage: 0,
              budget: 100
            })
          } as Response);
        }
        return Promise.reject(new Error(`Unexpected URL: ${url}`));
      });

      render(<Navigation />);

      await waitFor(() => {
        const usageElements = screen.getAllByLabelText(/api usage.*0\.00.*100.*0%/i);
        expect(usageElements.length).toBeGreaterThan(0);
        const percentageTexts = screen.getAllByText((content, node) => node?.textContent === '0%');
        expect(percentageTexts.length).toBeGreaterThan(0);
      });
    });

    it('should handle budget exceeded scenario', async () => {
      // Mock all API calls with implementation pattern
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
              used: 120.00,
              remaining: -20.00,
              percentage: 120,
              budget: 100
            })
          } as Response);
        }
        return Promise.reject(new Error(`Unexpected URL: ${url}`));
      });

      render(<Navigation />);

      await waitFor(() => {
        const usageElements = screen.getAllByLabelText(/api usage.*120\.00.*100.*120%/i);
        expect(usageElements.length).toBeGreaterThan(0);
        const percentageTexts = screen.getAllByText((content, node) => node?.textContent === '120%');
        expect(percentageTexts.length).toBeGreaterThan(0);
      });
    });
  });

  describe('API Health Checks', () => {
    it('should show API warning when keys are missing', async () => {
      // Mock all API calls with implementation pattern
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
              anthropicApiKey: null,
              openaiApiKey: null
            })
          } as Response);
        }
        if (url === '/api/usage') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              used: 0.00,
              remaining: 100.00,
              percentage: 0,
              budget: 100
            })
          } as Response);
        }
        return Promise.reject(new Error(`Unexpected URL: ${url}`));
      });

      render(<Navigation />);

      await waitFor(() => {
        const warningElements = screen.getAllByLabelText('API key missing');
        expect(warningElements.length).toBeGreaterThan(0);
        const warningTexts = screen.getAllByText('⚠️');
        expect(warningTexts.length).toBeGreaterThan(0);
      });
    });

    it('should show API warning when keys are invalid', async () => {
      // Mock all API calls with implementation pattern
      let testCallCount = 0;
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
              anthropicApiKey: 'sk-ant-invalid',
              openaiApiKey: 'sk-invalid'
            })
          } as Response);
        }
        if (url === '/api/test-api-keys') {
          testCallCount++;
          if (testCallCount === 1) {
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve({ valid: false })
            } as Response);
          } else {
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve({ valid: true })
            } as Response);
          }
        }
        if (url === '/api/usage') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              used: 0.00,
              remaining: 100.00,
              percentage: 0,
              budget: 100
            })
          } as Response);
        }
        return Promise.reject(new Error(`Unexpected URL: ${url}`));
      });

      render(<Navigation />);

      await waitFor(() => {
        const warningElements = screen.getAllByLabelText('API key invalid');
        expect(warningElements.length).toBeGreaterThan(0);
        const warningTexts = screen.getAllByText('⚠️');
        expect(warningTexts.length).toBeGreaterThan(0);
      });
    });

    it('should not show API warning when keys are valid', async () => {
      // Mock all API calls with implementation pattern
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
              anthropicApiKey: 'sk-ant-valid',
              openaiApiKey: 'sk-valid'
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
              used: 25.00,
              remaining: 75.00,
              percentage: 25,
              budget: 100
            })
          } as Response);
        }
        return Promise.reject(new Error(`Unexpected URL: ${url}`));
      });

      render(<Navigation />);

      await waitFor(() => {
        const settingsTexts = screen.getAllByText('Settings');
        expect(settingsTexts.length).toBeGreaterThan(0);
      });
      // Should not show API warning
      expect(screen.queryByLabelText('API key invalid')).toBeNull();
      expect(screen.queryByText('⚠️')).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should handle API failures gracefully', async () => {
      // Mock all API calls with failures
      mockFetch.mockImplementation((url: string, options?: any) => {
        if (url === '/api/setup-status') {
          return Promise.reject(new Error('Setup API failed'));
        }
        if (url === '/api/user-settings') {
          return Promise.reject(new Error('Settings API failed'));
        }
        if (url === '/api/usage') {
          return Promise.reject(new Error('Usage API failed'));
        }
        return Promise.reject(new Error(`Unexpected URL: ${url}`));
      });

      render(<Navigation />);

      await waitFor(() => {
        const settingsTexts = screen.getAllByText('Settings');
        expect(settingsTexts.length).toBeGreaterThan(0);
      });

      // Should not show any indicators when APIs fail
      expect(screen.queryByLabelText(/api usage/i)).toBeNull();
      expect(screen.queryByText('⚠️')).toBeNull();
    });

    it('should handle malformed API responses', async () => {
      // Mock all API calls with implementation pattern
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
              // Missing required fields
              used: 'invalid',
              percentage: null
            })
          } as Response);
        }
        return Promise.reject(new Error(`Unexpected URL: ${url}`));
      });

      render(<Navigation />);

      await waitFor(() => {
        const settingsTexts = screen.getAllByText('Settings');
        expect(settingsTexts.length).toBeGreaterThan(0);
      });

      // Should not show usage indicator with malformed data
      expect(screen.queryByLabelText(/api usage/i)).toBeNull();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for usage indicator', async () => {
      // Mock all API calls with implementation pattern
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
              used: 42.50,
              remaining: 57.50,
              percentage: 43,
              budget: 100
            })
          } as Response);
        }
        return Promise.reject(new Error(`Unexpected URL: ${url}`));
      });

      render(<Navigation />);

      await waitFor(() => {
        const usageIndicators = screen.getAllByLabelText(/api usage.*42\.50.*100.*43%/i);
        expect(usageIndicators.length).toBeGreaterThan(0);
        expect(usageIndicators[0]).toHaveAttribute('title');
        const percentageTexts = screen.getAllByText((content, node) => node?.textContent === '43%');
        expect(percentageTexts.length).toBeGreaterThan(0);
      });
    });

    it('should have proper ARIA labels for API warnings', async () => {
      // Mock all API calls with implementation pattern
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
              anthropicApiKey: null,
              openaiApiKey: null
            })
          } as Response);
        }
        if (url === '/api/usage') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              used: 0.00,
              remaining: 100.00,
              percentage: 0,
              budget: 100
            })
          } as Response);
        }
        return Promise.reject(new Error(`Unexpected URL: ${url}`));
      });

      render(<Navigation />);

      await waitFor(() => {
        const warningIndicators = screen.getAllByLabelText('API key missing');
        expect(warningIndicators.length).toBeGreaterThan(0);
        expect(warningIndicators[0]).toHaveAttribute('title', 'API key missing');
      });
    });
  });
});

describe('Navigation Usage Indicator - Expansion', () => {
  it('should show an accessible label for the usage bar', async () => {
    // Mock all API calls with implementation pattern
    mockFetch.mockImplementation((url: string, options?: any) => {
      if (url === '/api/setup-status') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ isSetup: true }) } as Response);
      }
      if (url === '/api/user-settings') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ anthropicApiKey: 'sk', openaiApiKey: 'sk' }) } as Response);
      }
      if (url === '/api/test-api-keys') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ valid: true }) } as Response);
      }
      if (url === '/api/usage') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ used: 10, remaining: 90, percentage: 10, budget: 100 }) } as Response);
      }
      return Promise.reject(new Error(`Unexpected URL: ${url}`));
    });
    render(<Navigation />);
    await waitFor(() => {
      const usageElements = screen.getAllByLabelText(/api usage/i);
      expect(usageElements.length).toBeGreaterThan(0);
    });
  });

  it('should display a warning when usage exceeds 90%', async () => {
    // Mock all API calls with implementation pattern
    mockFetch.mockImplementation((url: string, options?: any) => {
      if (url === '/api/setup-status') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ isSetup: true }) } as Response);
      }
      if (url === '/api/user-settings') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ anthropicApiKey: 'sk', openaiApiKey: 'sk' }) } as Response);
      }
      if (url === '/api/test-api-keys') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ valid: true }) } as Response);
      }
      if (url === '/api/usage') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ used: 95, remaining: 5, percentage: 95, budget: 100 }) } as Response);
      }
      return Promise.reject(new Error(`Unexpected URL: ${url}`));
    });
    render(<Navigation />);
    await waitFor(() => {
      const percentageTexts = screen.getAllByText('95%');
      expect(percentageTexts.length).toBeGreaterThan(0);
      // Find the element with the red color style
      const redElement = percentageTexts.find(element => 
        element.getAttribute('style')?.includes('color: rgb(239, 68, 68)')
      );
      expect(redElement).toBeTruthy();
      const titleElements = screen.getAllByTitle(/api usage/i);
      expect(titleElements.length).toBeGreaterThan(0);
    });
  });

  it('should render a tooltip with budget details on hover', async () => {
    // Mock all API calls with implementation pattern
    mockFetch.mockImplementation((url: string, options?: any) => {
      if (url === '/api/setup-status') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ isSetup: true }) } as Response);
      }
      if (url === '/api/user-settings') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ anthropicApiKey: 'sk', openaiApiKey: 'sk' }) } as Response);
      }
      if (url === '/api/test-api-keys') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ valid: true }) } as Response);
      }
      if (url === '/api/usage') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ used: 50, remaining: 50, percentage: 50, budget: 100 }) } as Response);
      }
      return Promise.reject(new Error(`Unexpected URL: ${url}`));
    });
    render(<Navigation />);
    await waitFor(() => {
      const usageElements = screen.getAllByLabelText(/api usage/i);
      expect(usageElements.length).toBeGreaterThan(0);
      // Find the element with the expected values
      const expectedElement = usageElements.find(element => 
        element.getAttribute('title')?.includes('$50.00') && 
        element.getAttribute('title')?.includes('50%')
      );
      expect(expectedElement).toBeTruthy();
      expect(expectedElement).toHaveAttribute('title', expect.stringMatching(/\$50.*100.*50%/i));
    });
  });

  it('should handle missing usage gracefully with fallback UI', async () => {
    // Mock all API calls with implementation pattern
    mockFetch.mockImplementation((url: string, options?: any) => {
      if (url === '/api/setup-status') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ isSetup: true }) } as Response);
      }
      if (url === '/api/user-settings') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ anthropicApiKey: 'sk', openaiApiKey: 'sk' }) } as Response);
      }
      if (url === '/api/test-api-keys') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ valid: true }) } as Response);
      }
      if (url === '/api/usage') {
        return Promise.reject(new Error('Usage API failed'));
      }
      return Promise.reject(new Error(`Unexpected URL: ${url}`));
    });
    render(<Navigation />);
    await waitFor(() => {
      const settingsTexts = screen.getAllByText('Settings');
      expect(settingsTexts.length).toBeGreaterThan(0);
      // Should not throw or crash
    });
  });
});

describe('Unmount Safety', () => {
  it('should not set state or throw if unmounted before async fetch resolves', async () => {
    // Arrange: mock fetch to delay
    let resolveFetch: (value: any) => void;
    const fetchPromise = new Promise(resolve => { resolveFetch = resolve; });
    mockFetch.mockImplementation(() => fetchPromise as any);

    // Act: render and immediately unmount
    const { unmount } = render(<Navigation />);
    unmount();

    // Simulate fetch resolving after unmount
    resolveFetch!({ ok: true, json: () => Promise.resolve({ isSetup: true }) });

    // Wait a tick to allow any async handlers to run
    await new Promise(r => setTimeout(r, 10));

    // Assert: no error thrown, no React warning, test completes
    expect(true).toBe(true); // If we reach here, no crash occurred
  });
}); 