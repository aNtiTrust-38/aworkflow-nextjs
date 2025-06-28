import { describe, it, expect } from 'vitest';
import type { User, Paper, Reference, File } from '@prisma/client';

describe('Prisma schema types', () => {
  it('should allow assignment of User, Paper, Reference, and File types', () => {
    // This test will pass if the types exist and can be assigned
    const user: User = {
      id: '1',
      name: 'Test User',
      email: 'test@example.com',
      password: 'hashed',
      papers: [],
      files: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const paper: Paper = {
      id: '1',
      userId: '1',
      title: 'Test Paper',
      outline: null,
      content: null,
      status: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const reference: Reference = {
      id: '1',
      paperId: '1',
      title: 'Test Reference',
      authors: 'Author',
      source: 'Source',
      url: 'http://example.com',
      citation: 'Citation',
      addedAt: new Date(),
    };
    const file: File = {
      id: '1',
      paperId: null,
      userId: '1',
      filename: 'file.pdf',
      type: 'pdf',
      path: '/files/file.pdf',
      uploadedAt: new Date(),
    };
    expect(user).toBeDefined();
    expect(paper).toBeDefined();
    expect(reference).toBeDefined();
    expect(file).toBeDefined();
  });
}); 