import { describe, it, expect } from 'vitest';
import CredentialsProvider from 'next-auth/providers/credentials';

const provider = CredentialsProvider({
  name: 'Credentials',
  credentials: {
    email: { label: 'Email', type: 'email', placeholder: 'test@example.com' },
    password: { label: 'Password', type: 'password' },
  },
  async authorize(credentials) {
    if (
      credentials?.email === 'test@example.com' &&
      credentials?.password === 'password123'
    ) {
      return {
        id: '1',
        name: 'Test User',
        email: 'test@example.com',
      };
    }
    return null;
  },
});

describe('NextAuth.js CredentialsProvider', () => {
  it('should allow login with valid credentials', async () => {
    const session = await provider.options.authorize({
      email: 'test@example.com',
      password: 'password123',
    });
    expect(session).toBeDefined();
    expect(session?.email).toBe('test@example.com');
  });

  it('should reject login with invalid credentials', async () => {
    const session = await provider.options.authorize({
      email: 'wrong@example.com',
      password: 'wrong',
    });
    expect(session).toBeNull();
  });
}); 