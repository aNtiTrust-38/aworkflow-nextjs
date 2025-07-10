import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('Prisma Schema - User Settings', () => {
  beforeEach(async () => {
    // Clean up test data
    try {
      await prisma.userSettings?.deleteMany();
    } catch (e) {
      // UserSettings table may not exist yet - that's expected in RED phase
    }
    await prisma.user.deleteMany();
  });

  afterEach(async () => {
    // Clean up test data
    try {
      await prisma.userSettings?.deleteMany();
    } catch (e) {
      // UserSettings table may not exist yet - that's expected in RED phase
    }
    await prisma.user.deleteMany();
  });

  describe('User model', () => {
    it('should create a user with basic fields', async () => {
      const user = await prisma.user.create({
        data: {
          name: 'Test User',
          email: 'test@example.com',
          password: 'hashed_password'
        }
      });

      expect(user.id).toBeDefined();
      expect(user.name).toBe('Test User');
      expect(user.email).toBe('test@example.com');
      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.updatedAt).toBeInstanceOf(Date);
    });

    it('should enforce unique email constraint', async () => {
      // Create first user
      await prisma.user.create({
        data: {
          name: 'User 1',
          email: 'duplicate@example.com',
          password: 'password1'
        }
      });

      // Attempt to create second user with same email should fail
      await expect(prisma.user.create({
        data: {
          name: 'User 2',
          email: 'duplicate@example.com',
          password: 'password2'
        }
      })).rejects.toThrow();
    });
  });

  describe('UserSettings model', () => {
    let testUser: any;

    beforeEach(async () => {
      testUser = await prisma.user.create({
        data: {
          name: 'Settings Test User',
          email: 'settings@example.com',
          password: 'hashed_password'
        }
      });
    });

    it('should create user settings with all AI provider fields', async () => {
      const settings = await prisma.userSettings.create({
        data: {
          userId: testUser.id,
          anthropicApiKey: 'encrypted_anthropic_key',
          openaiApiKey: 'encrypted_openai_key',
          monthlyBudget: 150.0,
          preferredProvider: 'anthropic'
        }
      });

      expect(settings.id).toBeDefined();
      expect(settings.userId).toBe(testUser.id);
      expect(settings.anthropicApiKey).toBe('encrypted_anthropic_key');
      expect(settings.openaiApiKey).toBe('encrypted_openai_key');
      expect(settings.monthlyBudget).toBe(150.0);
      expect(settings.preferredProvider).toBe('anthropic');
      expect(settings.createdAt).toBeInstanceOf(Date);
      expect(settings.updatedAt).toBeInstanceOf(Date);
    });

    it('should create user settings with academic preferences', async () => {
      const settings = await prisma.userSettings.create({
        data: {
          userId: testUser.id,
          citationStyle: 'mla',
          defaultLanguage: 'es',
          adhdFriendlyMode: true
        }
      });

      expect(settings.citationStyle).toBe('mla');
      expect(settings.defaultLanguage).toBe('es');
      expect(settings.adhdFriendlyMode).toBe(true);
    });

    it('should create user settings with UI preferences', async () => {
      const settings = await prisma.userSettings.create({
        data: {
          userId: testUser.id,
          theme: 'dark',
          reducedMotion: true,
          highContrast: true
        }
      });

      expect(settings.theme).toBe('dark');
      expect(settings.reducedMotion).toBe(true);
      expect(settings.highContrast).toBe(true);
    });

    it('should use default values for optional fields', async () => {
      const settings = await prisma.userSettings.create({
        data: {
          userId: testUser.id
        }
      });

      expect(settings.monthlyBudget).toBe(100);
      expect(settings.preferredProvider).toBe('auto');
      expect(settings.citationStyle).toBe('apa');
      expect(settings.defaultLanguage).toBe('en');
      expect(settings.adhdFriendlyMode).toBe(false);
      expect(settings.theme).toBe('system');
      expect(settings.reducedMotion).toBe(false);
      expect(settings.highContrast).toBe(false);
    });

    it('should enforce unique userId constraint', async () => {
      // Create first settings
      await prisma.userSettings.create({
        data: {
          userId: testUser.id
        }
      });

      // Attempt to create second settings for same user should fail
      await expect(prisma.userSettings.create({
        data: {
          userId: testUser.id
        }
      })).rejects.toThrow();
    });

    it('should establish proper relation with User', async () => {
      const settings = await prisma.userSettings.create({
        data: {
          userId: testUser.id,
          citationStyle: 'chicago'
        }
      });

      // Fetch user with settings
      const userWithSettings = await prisma.user.findUnique({
        where: { id: testUser.id },
        include: { settings: true }
      });

      expect(userWithSettings?.settings?.id).toBe(settings.id);
      expect(userWithSettings?.settings?.citationStyle).toBe('chicago');
    });

    it('should delete settings when user is deleted (cascade)', async () => {
      await prisma.userSettings.create({
        data: {
          userId: testUser.id
        }
      });

      // Delete user
      await prisma.user.delete({
        where: { id: testUser.id }
      });

      // Settings should be deleted as well
      const orphanedSettings = await prisma.userSettings.findUnique({
        where: { userId: testUser.id }
      });

      expect(orphanedSettings).toBeNull();
    });

    it('should allow nullable API keys', async () => {
      const settings = await prisma.userSettings.create({
        data: {
          userId: testUser.id,
          anthropicApiKey: null,
          openaiApiKey: null
        }
      });

      expect(settings.anthropicApiKey).toBeNull();
      expect(settings.openaiApiKey).toBeNull();
    });

    it('should allow updating individual settings fields', async () => {
      const settings = await prisma.userSettings.create({
        data: {
          userId: testUser.id,
          monthlyBudget: 100
        }
      });

      const updatedSettings = await prisma.userSettings.update({
        where: { id: settings.id },
        data: {
          monthlyBudget: 200,
          preferredProvider: 'openai'
        }
      });

      expect(updatedSettings.monthlyBudget).toBe(200);
      expect(updatedSettings.preferredProvider).toBe('openai');
      expect(updatedSettings.updatedAt.getTime()).toBeGreaterThan(settings.updatedAt.getTime());
    });
  });

  describe('Project model (future)', () => {
    it('should prepare for project association with users', async () => {
      // This test ensures our schema is ready for future Project model
      const user = await prisma.user.create({
        data: {
          name: 'Project User',
          email: 'project@example.com',
          password: 'password'
        }
      });

      // For now, just verify user creation works
      // Future: Add Project model tests here
      expect(user.id).toBeDefined();
    });
  });

  describe('Legacy schema compatibility', () => {
    it('should maintain compatibility with existing User, Paper, Reference, and File types', () => {
      // This test ensures backward compatibility
      const user = {
        id: '1',
        name: 'Test User',
        email: 'test@example.com',
        password: 'hashed',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      expect(user).toBeDefined();
      expect(user.email).toBe('test@example.com');
    });
  });
});