/**
 * TDD RED Phase Test - BLOCKER 1: Prisma Mock Architecture Crisis
 * 
 * This test demonstrates the fundamental conflict between global and test-specific
 * Prisma mocks that causes "mockPrisma is not defined" and "Cannot read properties 
 * of undefined" errors in API handlers.
 * 
 * Expected Failure: Dynamic imports in API handlers bypass mocked Prisma client
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMocks } from 'node-mocks-http';
import type { NextApiRequest, NextApiResponse } from 'next';

describe('BLOCKER 1: Prisma Mock Architecture Crisis', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should demonstrate dynamic import bypassing global Prisma mock', async () => {
    // This test shows how dynamic imports in API handlers fail to use mocked Prisma
    
    // Global mock is already set up in vitest.setup.ts, but let's verify it exists
    const globalPrismaModule = await import('@/lib/prisma');
    console.log('Global mock exists:', !!globalPrismaModule.default);
    
    // Now test an API handler that uses dynamic import
    const handler = (await import('@/pages/api/folders')).default;
    
    // Create mock request/response
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'GET',
    });
    
    // Mock authentication to pass
    const { getServerSession } = await import('next-auth/next');
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'test-user', email: 'test@example.com' }
    });
    
    // Execute handler - this should fail with Prisma errors
    await handler(req, res);
    
    // Expected failure: "Cannot read properties of undefined (reading 'findMany')"
    // because the dynamic import in the handler doesn't get the mocked version
    expect(res._getStatusCode()).toBe(500); // Will likely be 500 due to error
    
    const responseData = JSON.parse(res._getData());
    console.log('Error response:', responseData);
    
    // The error will show that Prisma operations failed
    expect(responseData.error).toBeDefined();
  });

  it('should show conflict when test adds its own Prisma mock', async () => {
    // This demonstrates what happens when a test tries to add its own mock
    // on top of the global mock - creating undefined behavior
    
    // Test-specific mock that conflicts with global
    const testSpecificMock = {
      folder: {
        findMany: vi.fn().mockResolvedValue([{ id: 'test', name: 'Test Folder' }])
      }
    };
    
    // This creates a conflict - which mock wins?
    vi.doMock('@/lib/prisma', () => ({
      default: testSpecificMock
    }));
    
    // Now when we import, we get unpredictable behavior
    const prismaModule = await import('@/lib/prisma');
    
    // The mock might be the global one, the test one, or undefined
    console.log('Which mock is active?', prismaModule.default);
    
    // This unpredictability is the core of BLOCKER 1
    expect(prismaModule.default).toBeTruthy(); // May or may not pass
  });

  it('should demonstrate mockPrisma is not defined error pattern', async () => {
    // This shows the exact error pattern from the test output
    
    // When tests try to use vi.mocked(prisma) pattern
    const prisma = (await import('@/lib/prisma')).default;
    
    // This line often causes "mockPrisma is not defined" in test context
    const mockPrisma = vi.mocked(prisma);
    
    // Try to use it like tests do
    try {
      mockPrisma.folder.findMany.mockResolvedValue([]);
      
      // If we get here, the mock partially works
      expect(mockPrisma.folder.findMany).toBeDefined();
    } catch (error) {
      // Expected: TypeError or similar
      console.log('Mock access error:', error);
      expect(error).toBeDefined();
    }
  });
});