import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs';

/**
 * Desktop-specific database configuration
 * Handles database setup for Electron environment
 */
export class DesktopDatabaseConfig {
  private static instance: PrismaClient | null = null;
  
  /**
   * Get database path for desktop application
   * Uses user data directory for persistent storage
   */
  public static async getDatabasePath(): Promise<string> {
    if (typeof window !== 'undefined' && window.electronAPI) {
      // In Electron renderer process
      const userDataPath = await window.electronAPI.getUserDataPath();
      return path.join(userDataPath, 'database.db');
    } else {
      // Fallback for development
      return path.join(process.cwd(), 'dev.db');
    }
  }
  
  /**
   * Get Prisma client configured for desktop environment
   */
  public static async getPrismaClient(): Promise<PrismaClient> {
    if (!this.instance) {
      const databasePath = await this.getDatabasePath();
      const databaseDir = path.dirname(databasePath);
      
      // Ensure database directory exists
      if (!fs.existsSync(databaseDir)) {
        fs.mkdirSync(databaseDir, { recursive: true });
      }
      
      this.instance = new PrismaClient({
        datasources: {
          db: {
            url: `file:${databasePath}`
          }
        }
      });
      
      // Run migrations on first startup
      await this.runMigrations();
    }
    
    return this.instance;
  }
  
  /**
   * Run database migrations
   */
  private static async runMigrations(): Promise<void> {
    if (!this.instance) return;
    
    try {
      // In a real implementation, you would run Prisma migrations here
      // For now, we'll just ensure the database is connected
      await this.instance.$connect();
      console.log('Desktop database connected successfully');
    } catch (error) {
      console.error('Desktop database connection failed:', error);
      throw error;
    }
  }
  
  /**
   * Close database connection
   */
  public static async disconnect(): Promise<void> {
    if (this.instance) {
      await this.instance.$disconnect();
      this.instance = null;
    }
  }
  
  /**
   * Check if running in desktop environment
   */
  public static isDesktopEnvironment(): boolean {
    return typeof window !== 'undefined' && window.electronAPI?.isElectron === true;
  }
}

// Type definitions for Electron API
interface ElectronDialogOptions {
  title?: string;
  defaultPath?: string;
  buttonLabel?: string;
  filters?: Array<{
    name: string;
    extensions: string[];
  }>;
  properties?: Array<'openFile' | 'openDirectory' | 'multiSelections' | 'showHiddenFiles' | 'createDirectory' | 'promptToCreate' | 'noResolveAliases' | 'treatPackageAsDirectory' | 'dontAddToRecent'>;
}

interface ElectronDialogResult {
  canceled: boolean;
  filePaths?: string[];
  filePath?: string;
}

declare global {
  interface Window {
    electronAPI?: {
      getAppVersion: () => Promise<string>;
      getUserDataPath: () => Promise<string>;
      showSaveDialog: (options: ElectronDialogOptions) => Promise<ElectronDialogResult>;
      showOpenDialog: (options: ElectronDialogOptions) => Promise<ElectronDialogResult>;
      platform: string;
      isElectron: boolean;
      nodeVersion: string;
      chromeVersion: string;
      electronVersion: string;
    };
  }
}