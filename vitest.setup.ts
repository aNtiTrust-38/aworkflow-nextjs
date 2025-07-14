import { vi, beforeEach, afterEach } from 'vitest';

// Mock Prisma Client before other imports
vi.mock('@/lib/prisma', () => {
  const mockPrisma = {
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    folder: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    paper: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    userSettings: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
    },
    $disconnect: vi.fn(),
  };
  return { default: mockPrisma };
});

// Mock next-auth
vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn(),
}));

// Mock file system operations
vi.mock('fs', () => ({
  promises: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    unlink: vi.fn(),
    mkdir: vi.fn(),
  },
}));

// Mock path module for consistent results
vi.mock('path', async () => {
  const actual = await vi.importActual('path');
  return {
    ...actual,
    join: vi.fn((...args) => args.join('/')),
    extname: vi.fn((path) => {
      const match = path.match(/\.([^.]+)$/);
      return match ? match[0] : '';
    }),
  };
});

// CRITICAL: Override getComputedStyle BEFORE importing testing library
// This prevents dom-accessibility-api from using jsdom's broken implementation

// Create a simple function that returns property values
const getPropertyValueMock = (prop: string) => {
  // Return appropriate values for common CSS properties needed by accessibility queries
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
    'overflow': 'visible',
    'text-transform': 'none',
    'white-space': 'normal',
    'clip': 'auto',
    'clip-path': 'none'
  };
  return defaults[prop] || '';
};

const createMockComputedStyle = () => ({
  getPropertyValue: getPropertyValueMock,
  // Direct property access for legacy compatibility
  display: 'block',
  visibility: 'visible',
  opacity: '1',
  fontSize: '16px',
  fontFamily: 'Arial',
  color: 'rgb(0, 0, 0)',
  backgroundColor: 'rgb(255, 255, 255)',
  width: '100px',
  height: '100px',
  position: 'static',
  overflow: 'visible'
});

// Create a getComputedStyle function that always returns a consistent object
const mockGetComputedStyle = (element?: Element, pseudoElement?: string) => {
  return createMockComputedStyle();
};

// Immediately override getComputedStyle before any other imports
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'getComputedStyle', {
    value: mockGetComputedStyle,
    writable: true,
    configurable: true,
  });
}

if (typeof global !== 'undefined') {
  (global as any).getComputedStyle = mockGetComputedStyle;
}

// Now safe to import testing library
import '@testing-library/jest-dom/vitest';
import { configure } from '@testing-library/react';
import { configure as configureDom } from '@testing-library/dom';

// Configure Testing Library for jsdom limitations
configure({
  asyncUtilTimeout: 5000,
  computedStyleSupportsPseudoElements: false // Set to false since jsdom doesn't support pseudo-elements
});

// Configure DOM testing library specifically for accessibility
configureDom({
  computedStyleSupportsPseudoElements: false,
  asyncUtilTimeout: 5000
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
const mockIntersectionObserver = vi.fn().mockImplementation((callback, options) => {
  const mockObserver = {
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
    root: null,
    rootMargin: '0px',
    thresholds: [0],
    callback,  // Store the callback for potential use
    options,   // Store the options for potential use
  };
  
  return mockObserver;
});

// Set up IntersectionObserver globally
Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  configurable: true,
  value: mockIntersectionObserver,
});

Object.defineProperty(global, 'IntersectionObserver', {
  writable: true,
  configurable: true,
  value: mockIntersectionObserver,
});

// Also stub globally for vitest
vi.stubGlobal('IntersectionObserver', mockIntersectionObserver);

// Mock ResizeObserver for layout-related tests
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Additional stub to ensure vitest manages the mock properly
vi.stubGlobal('getComputedStyle', mockGetComputedStyle);

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
  
  // Vitest's unstubAllGlobals will handle cleanup automatically
  // No manual restoration needed to avoid read-only property errors
});
