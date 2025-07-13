import '@testing-library/jest-dom/vitest';
import { configure } from '@testing-library/react';
import { vi } from 'vitest';

// Configure for React 19 compatibility
configure({
  asyncUtilTimeout: 5000,
  computedStyleSupportsPseudoElements: true
});

// Mock problematic React 19 features and browser APIs
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver for components that might use it
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock ResizeObserver for layout-related tests
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock getComputedStyle for jsdom compatibility
Object.defineProperty(window, 'getComputedStyle', {
  value: vi.fn().mockImplementation(() => ({
    getPropertyValue: vi.fn().mockImplementation((prop: string) => {
      // Return appropriate values for common CSS properties
      const defaults: Record<string, string> = {
        'display': 'block',
        'visibility': 'visible',
        'opacity': '1',
        'font-size': '16px',
        'font-family': 'Arial',
        'color': 'rgb(0, 0, 0)',
        'background-color': 'rgb(255, 255, 255)',
        'width': '100px',
        'height': '100px',
        'position': 'static',
        'overflow': 'visible'
      };
      return defaults[prop] || '';
    }),
    display: 'block',
    visibility: 'visible',
    opacity: '1',
    fontSize: '16px',
    fontFamily: 'Arial',
    color: 'rgb(0, 0, 0)',
    backgroundColor: 'rgb(255, 255, 255)',
    width: '100px',
    height: '100px',
    // Add any other CSS properties that tests might need
  })),
  writable: true,
});

// Suppress console errors during tests unless explicitly testing error handling
const originalError = console.error;
beforeEach(() => {
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' && 
      (args[0].includes('Warning:') || args[0].includes('act('))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterEach(() => {
  console.error = originalError;
});
