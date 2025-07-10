import { app, BrowserWindow, dialog, shell, ipcMain, Menu } from 'electron';
import { join } from 'path';
import { spawn, ChildProcess } from 'child_process';
import { promises as fs } from 'fs';
import { startServer } from './server';
import { createMenu } from './menu';
import { WindowManager } from './window-manager';

// Check if API keys are configured
async function checkAPIConfiguration(): Promise<boolean> {
  try {
    const userDataPath = app.getPath('userData');
    const configFile = join(userDataPath, 'config.json');
    const config = JSON.parse(await fs.readFile(configFile, 'utf-8'));
    return !!(config.anthropicApiKey || config.openaiApiKey);
  } catch {
    return false;
  }
}

// Load API configuration
async function loadAPIConfiguration() {
  try {
    const userDataPath = app.getPath('userData');
    const configFile = join(userDataPath, 'config.json');
    const config = JSON.parse(await fs.readFile(configFile, 'utf-8'));
    
    if (config.anthropicApiKey) {
      process.env.ANTHROPIC_API_KEY = config.anthropicApiKey;
    }
    if (config.openaiApiKey) {
      process.env.OPENAI_API_KEY = config.openaiApiKey;
    }
    if (config.monthlyBudget) {
      process.env.AI_MONTHLY_BUDGET = config.monthlyBudget.toString();
    }
  } catch {
    // No config file exists, will show setup
  }
}

// Create setup window
async function createSetupWindow(): Promise<void> {
  const setupWindow = new BrowserWindow({
    width: 600,
    height: 500,
    show: false,
    modal: true,
    parent: mainWindow || undefined,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: join(__dirname, 'preload.js')
    }
  });

  // Load setup page
  const setupHtml = `
    <html>
    <head>
      <title>Academic Workflow Setup</title>
      <style>
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
          margin: 0; padding: 40px; background: #f5f5f5; color: #333;
        }
        .container { 
          max-width: 500px; margin: 0 auto; background: white; 
          padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 { color: #2563eb; margin-bottom: 20px; }
        .form-group { margin-bottom: 20px; }
        label { display: block; margin-bottom: 8px; font-weight: 500; }
        input[type="text"], input[type="password"] { 
          width: 100%; padding: 12px; border: 1px solid #ddd; 
          border-radius: 4px; font-size: 14px; box-sizing: border-box;
        }
        button { 
          background: #2563eb; color: white; border: none; 
          padding: 12px 24px; border-radius: 4px; cursor: pointer; 
          font-size: 14px; margin-right: 10px;
        }
        button:hover { background: #1d4ed8; }
        button.secondary { background: #6b7280; }
        button.secondary:hover { background: #4b5563; }
        .help-text { font-size: 12px; color: #666; margin-top: 4px; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>📚 Academic Workflow Setup</h1>
        <p>Welcome! Please configure your AI provider settings to get started.</p>
        
        <form id="setupForm">
          <div class="form-group">
            <label for="anthropicKey">Anthropic API Key (Claude)</label>
            <input type="password" id="anthropicKey" placeholder="sk-ant-api03-...">
            <div class="help-text">Get your key from <a href="https://console.anthropic.com" target="_blank">console.anthropic.com</a></div>
          </div>
          
          <div class="form-group">
            <label for="openaiKey">OpenAI API Key (Optional)</label>
            <input type="password" id="openaiKey" placeholder="sk-...">
            <div class="help-text">Get your key from <a href="https://platform.openai.com/api-keys" target="_blank">platform.openai.com</a></div>
          </div>
          
          <div class="form-group">
            <label for="budget">Monthly Budget (USD)</label>
            <input type="text" id="budget" value="100" placeholder="100">
            <div class="help-text">Spending limit to help manage costs</div>
          </div>
          
          <button type="submit">Save & Continue</button>
          <button type="button" class="secondary" onclick="window.electronAPI.closeSetup()">Skip Setup</button>
        </form>
      </div>
      
      <script>
        document.getElementById('setupForm').addEventListener('submit', async (e) => {
          e.preventDefault();
          
          const config = {
            anthropicApiKey: document.getElementById('anthropicKey').value,
            openaiApiKey: document.getElementById('openaiKey').value,
            monthlyBudget: parseFloat(document.getElementById('budget').value) || 100
          };
          
          if (!config.anthropicApiKey && !config.openaiApiKey) {
            alert('Please enter at least one API key to continue.');
            return;
          }
          
          await window.electronAPI.saveConfig(config);
          window.electronAPI.closeSetup();
        });
      </script>
    </body>
    </html>
  `;

  await setupWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(setupHtml)}`);
  
  setupWindow.once('ready-to-show', () => {
    setupWindow.show();
  });
}

// Auto-updater - disable for now to avoid packaging issues
let autoUpdater: any = null;
console.log('Auto-updater disabled to prevent packaging issues');

// Keep a global reference of the window object
let mainWindow: BrowserWindow | null = null;
let serverProcess: any = null;
let serverPort = 3000;
let windowManager: WindowManager;

const isDevelopment = process.env.NODE_ENV === 'development';
const isPackaged = app.isPackaged;

// Configure auto-updater
if (isPackaged && autoUpdater) {
  autoUpdater.checkForUpdatesAndNotify();
}

// Ensure single instance
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    // Someone tried to run a second instance, focus our window instead
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  const net = require('net');
  
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(startPort, () => {
      const port = (server.address() as any).port;
      server.close(() => resolve(port));
    });
    server.on('error', () => {
      resolve(findAvailablePort(startPort + 1));
    });
  });
}

async function initializeDatabase() {
  try {
    // Ensure database directory exists
    const userDataPath = app.getPath('userData');
    const dbPath = join(userDataPath, 'database');
    await fs.mkdir(dbPath, { recursive: true });
    
    // Set database URL for packaged app
    const dbFile = join(dbPath, 'app.db');
    process.env.DATABASE_URL = `file:${dbFile}`;
    
    console.log('Database path:', dbFile);
    console.log('User data path:', userDataPath);
    
    // For packaged apps, skip Prisma and just create a simple SQLite file
    if (isPackaged) {
      console.log('Packaged app: Using simple SQLite initialization');
      // Create an empty database file if it doesn't exist
      try {
        await fs.access(dbFile);
        console.log('Database file already exists');
      } catch {
        // Create empty file
        await fs.writeFile(dbFile, '');
        console.log('Created empty database file');
      }
      return true;
    }
    
    // For development, try to use Prisma
    try {
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      
      // Simple connection test
      await prisma.$connect();
      await prisma.$disconnect();
      
      console.log('Prisma database initialized successfully');
      return true;
    } catch (prismaError) {
      if (prismaError instanceof Error) {
        console.log('Prisma not available, using simple SQLite:', prismaError.message);
      } else {
        console.log('Prisma not available, using simple SQLite:', String(prismaError));
      }
      // Fallback to simple file creation
      await fs.writeFile(dbFile, '');
      return true;
    }
  } catch (error) {
    console.error('Database initialization failed:', error);
    // Don't fail the app, just log the error
    console.log('Continuing without database...');
    return true; // Return true to not block app startup
  }
}

async function startNextjsServer() {
  try {
    serverPort = await findAvailablePort(3000);
    
    if (isDevelopment) {
      // In development, just connect to existing dev server
      console.log('Development mode: connecting to dev server');
      return `http://localhost:${serverPort}`;
    }
    
    // In production, start embedded server
    const serverUrl = await startServer(serverPort);
    console.log(`Next.js server started on ${serverUrl}`);
    return serverUrl;
  } catch (error) {
    console.error('Failed to start Next.js server:', error);
    throw error;
  }
}

async function createWindow() {
  // Initialize window manager
  windowManager = new WindowManager();
  
  // Load API configuration first
  await loadAPIConfiguration();
  
  // Check if API keys are configured
  const hasAPIConfig = await checkAPIConfiguration();
  
  if (!hasAPIConfig) {
    // Show setup window instead of main window
    await createSetupWindow();
    return;
  }
  
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    show: false, // Don't show until ready
    icon: join(__dirname, '../build/assets/icon.png'),
    titleBarStyle: 'hiddenInset', // Native macOS style
    vibrancy: 'under-window', // macOS visual effect
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: join(__dirname, 'preload.js'),
      webSecurity: true,
      allowRunningInsecureContent: false,
      experimentalFeatures: false
    }
  });

  // Initialize database (non-blocking)
  const dbInitialized = await initializeDatabase();
  if (!dbInitialized) {
    console.log('Database initialization had issues, but continuing...');
    // Don't quit the app, just log the issue
  }

  // Start Next.js server
  try {
    const serverUrl = await startNextjsServer();
    
    // Load the application
    await mainWindow.loadURL(serverUrl);
    
    // Check if this is first run
    const isFirstRun = await checkFirstRun();
    if (isFirstRun) {
      // Navigate to setup page
      mainWindow.webContents.executeJavaScript(`
        window.location.href = '/setup';
      `);
    }
    
  } catch (error) {
    console.error('Failed to load application:', error);
    dialog.showErrorBox(
      'Application Error',
      'Failed to start the Academic Workflow application. Please try restarting the app.'
    );
    app.quit();
    return;
  }

  // Set up window manager
  windowManager.setup(mainWindow);
  
  // Create application menu
  const menu = createMenu(mainWindow);
  Menu.setApplicationMenu(menu);

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    if (mainWindow) {
      mainWindow.show();
      
      // Focus window on launch
      if (isDevelopment) {
        mainWindow.webContents.openDevTools();
      }
    }
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Prevent navigation away from app
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    if (parsedUrl.origin !== `http://localhost:${serverPort}`) {
      event.preventDefault();
    }
  });
}

async function checkFirstRun(): Promise<boolean> {
  try {
    const userDataPath = app.getPath('userData');
    const firstRunFile = join(userDataPath, '.first-run-complete');
    
    try {
      await fs.access(firstRunFile);
      return false; // File exists, not first run
    } catch {
      // File doesn't exist, this is first run
      await fs.writeFile(firstRunFile, new Date().toISOString());
      return true;
    }
  } catch (error) {
    console.error('Error checking first run:', error);
    return false;
  }
}

// App event handlers
app.whenReady().then(async () => {
  // Set app user model ID for Windows (future compatibility)
  if (process.platform === 'win32') {
    app.setAppUserModelId('com.yourcompany.academic-workflow');
  }
  
  await createWindow();
  
  // macOS app should re-create window when dock icon is clicked
  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createWindow();
    }
  });
});

// Quit when all windows are closed
app.on('window-all-closed', () => {
  // On macOS, apps typically stay active until explicitly quit
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  // Clean up server process
  if (serverProcess) {
    serverProcess.kill();
  }
});

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
});

// IPC handlers
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('get-app-path', (event, name: string) => {
  return app.getPath(name as any);
});

ipcMain.handle('show-save-dialog', async (event, options) => {
  if (mainWindow) {
    const result = await dialog.showSaveDialog(mainWindow, options);
    return result;
  }
  return { canceled: true };
});

ipcMain.handle('show-open-dialog', async (event, options) => {
  if (mainWindow) {
    const result = await dialog.showOpenDialog(mainWindow, options);
    return result;
  }
  return { canceled: true };
});

// Setup configuration handlers
ipcMain.handle('save-config', async (event, config) => {
  try {
    const userDataPath = app.getPath('userData');
    const configFile = join(userDataPath, 'config.json');
    await fs.writeFile(configFile, JSON.stringify(config, null, 2));
    
    // Update environment variables
    if (config.anthropicApiKey) {
      process.env.ANTHROPIC_API_KEY = config.anthropicApiKey;
    }
    if (config.openaiApiKey) {
      process.env.OPENAI_API_KEY = config.openaiApiKey;
    }
    if (config.monthlyBudget) {
      process.env.AI_MONTHLY_BUDGET = config.monthlyBudget.toString();
    }
    
    console.log('Configuration saved successfully');
  } catch (error) {
    console.error('Failed to save configuration:', error);
    throw error;
  }
});

ipcMain.handle('close-setup', async () => {
  // Close all windows and create main window
  BrowserWindow.getAllWindows().forEach(window => window.close());
  await createWindow();
});

// Auto-updater events (only if auto-updater is available)
if (autoUpdater) {
  autoUpdater.on('checking-for-update', () => {
    console.log('Checking for update...');
  });

  autoUpdater.on('update-available', (info: any) => {
    console.log('Update available.');
  });

  autoUpdater.on('update-not-available', (info: any) => {
    console.log('Update not available.');
  });

  autoUpdater.on('error', (err: any) => {
    console.log('Error in auto-updater. ' + err);
  });

  autoUpdater.on('download-progress', (progressObj: any) => {
    let log_message = "Download speed: " + progressObj.bytesPerSecond;
    log_message = log_message + ' - Downloaded ' + progressObj.percent + '%';
    log_message = log_message + ' (' + progressObj.transferred + "/" + progressObj.total + ')';
    console.log(log_message);
  });

  autoUpdater.on('update-downloaded', (info: any) => {
    console.log('Update downloaded');
    autoUpdater.quitAndInstall();
  });
}

export { mainWindow, serverPort };