import { vi } from 'vitest';

// Basic environment setup
// Use Object.assign to avoid TypeScript readonly error
Object.assign(process.env, { NODE_ENV: 'test' });

// Mock Prisma Client with only essential methods
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
    file: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    $disconnect: vi.fn(),
    $connect: vi.fn(),
  };
  return { default: mockPrisma, mockPrisma };
});

// Don't mock global fetch as it interferes with next-test-api-route-handler
// global.fetch = vi.fn();

// Mock AI providers to prevent "No AI providers available" errors
vi.mock('@/lib/ai-providers/router', () => {
  const mockRouter = {
    generateContent: vi.fn().mockResolvedValue('Mock AI response'),
    generateWithFailover: vi.fn().mockResolvedValue({
      content: 'Mock AI response',
      usage: { tokens: 100, cost: 0.01 },
      provider: 'mock'
    }),
    getProviders: vi.fn().mockReturnValue(['mock-provider']),
    isAvailable: vi.fn().mockReturnValue(true)
  };
  
  return {
    AIRouter: vi.fn().mockImplementation(() => mockRouter),
    default: mockRouter
  };
});

// Mock file system operations  
vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  mkdir: vi.fn(),
  access: vi.fn(),
  stat: vi.fn(),
  unlink: vi.fn()
}));

// Mock console to reduce noise in tests
global.console = {
  ...global.console,
  warn: vi.fn(),
  error: vi.fn(),
};

export { vi };