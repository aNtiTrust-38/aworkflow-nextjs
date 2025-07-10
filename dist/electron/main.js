"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.serverPort = exports.mainWindow = void 0;
const electron_1 = require("electron");
const path_1 = require("path");
const fs_1 = require("fs");
const server_1 = require("./server");
const menu_1 = require("./menu");
const window_manager_1 = require("./window-manager");
// Check if API keys are configured
async function checkAPIConfiguration() {
    try {
        const userDataPath = electron_1.app.getPath('userData');
        const configFile = (0, path_1.join)(userDataPath, 'config.json');
        const config = JSON.parse(await fs_1.promises.readFile(configFile, 'utf-8'));
        return !!(config.anthropicApiKey || config.openaiApiKey);
    }
    catch {
        return false;
    }
}
// Load API configuration
async function loadAPIConfiguration() {
    try {
        const userDataPath = electron_1.app.getPath('userData');
        const configFile = (0, path_1.join)(userDataPath, 'config.json');
        const config = JSON.parse(await fs_1.promises.readFile(configFile, 'utf-8'));
        if (config.anthropicApiKey) {
            process.env.ANTHROPIC_API_KEY = config.anthropicApiKey;
        }
        if (config.openaiApiKey) {
            process.env.OPENAI_API_KEY = config.openaiApiKey;
        }
        if (config.monthlyBudget) {
            process.env.AI_MONTHLY_BUDGET = config.monthlyBudget.toString();
        }
    }
    catch {
        // No config file exists, will show setup
    }
}
// Create setup window
async function createSetupWindow() {
    const setupWindow = new electron_1.BrowserWindow({
        width: 600,
        height: 500,
        show: false,
        modal: true,
        parent: mainWindow || undefined,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: (0, path_1.join)(__dirname, 'preload.js')
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
// Load environment variables for packaged app
if (electron_1.app.isPackaged) {
    process.env.NODE_ENV = 'production';
}
// Auto-updater - disable for now to avoid packaging issues
let autoUpdater = null;
console.log('Auto-updater disabled to prevent packaging issues');
// Keep a global reference of the window object
let mainWindow = null;
exports.mainWindow = mainWindow;
let serverProcess = null;
let serverPort = 3000;
exports.serverPort = serverPort;
let windowManager;
const isDevelopment = process.env.NODE_ENV === 'development';
const isPackaged = electron_1.app.isPackaged;
// Configure auto-updater
if (isPackaged && autoUpdater) {
    autoUpdater.checkForUpdatesAndNotify();
}
// Ensure single instance
const gotTheLock = electron_1.app.requestSingleInstanceLock();
if (!gotTheLock) {
    electron_1.app.quit();
}
else {
    electron_1.app.on('second-instance', () => {
        // Someone tried to run a second instance, focus our window instead
        if (mainWindow) {
            if (mainWindow.isMinimized())
                mainWindow.restore();
            mainWindow.focus();
        }
    });
}
async function findAvailablePort(startPort = 3000) {
    const net = require('net');
    return new Promise((resolve) => {
        const server = net.createServer();
        server.listen(startPort, () => {
            const port = server.address().port;
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
        const userDataPath = electron_1.app.getPath('userData');
        const dbPath = (0, path_1.join)(userDataPath, 'database');
        await fs_1.promises.mkdir(dbPath, { recursive: true });
        // Set database URL for packaged app
        const dbFile = (0, path_1.join)(dbPath, 'app.db');
        process.env.DATABASE_URL = `file:${dbFile}`;
        console.log('Database path:', dbFile);
        console.log('User data path:', userDataPath);
        // For packaged apps, skip Prisma and just create a simple SQLite file
        if (isPackaged) {
            console.log('Packaged app: Using simple SQLite initialization');
            // Create an empty database file if it doesn't exist
            try {
                await fs_1.promises.access(dbFile);
                console.log('Database file already exists');
            }
            catch {
                // Create empty file
                await fs_1.promises.writeFile(dbFile, '');
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
        }
        catch (prismaError) {
            console.log('Prisma not available, using simple SQLite:', prismaError.message);
            // Fallback to simple file creation
            await fs_1.promises.writeFile(dbFile, '');
            return true;
        }
    }
    catch (error) {
        console.error('Database initialization failed:', error);
        // Don't fail the app, just log the error
        console.log('Continuing without database...');
        return true; // Return true to not block app startup
    }
}
async function startNextjsServer() {
    try {
        exports.serverPort = serverPort = await findAvailablePort(3000);
        if (isDevelopment) {
            // In development, just connect to existing dev server
            console.log('Development mode: connecting to dev server');
            return `http://localhost:${serverPort}`;
        }
        // In production, start embedded server
        const serverUrl = await (0, server_1.startServer)(serverPort);
        console.log(`Next.js server started on ${serverUrl}`);
        return serverUrl;
    }
    catch (error) {
        console.error('Failed to start Next.js server:', error);
        throw error;
    }
}
async function createWindow() {
    // Initialize window manager
    windowManager = new window_manager_1.WindowManager();
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
    exports.mainWindow = mainWindow = new electron_1.BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1000,
        minHeight: 700,
        show: false, // Don't show until ready
        icon: (0, path_1.join)(__dirname, '../build/assets/icon.png'),
        titleBarStyle: 'hiddenInset', // Native macOS style
        vibrancy: 'under-window', // macOS visual effect
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: (0, path_1.join)(__dirname, 'preload.js'),
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
    }
    catch (error) {
        console.error('Failed to load application:', error);
        electron_1.dialog.showErrorBox('Application Error', 'Failed to start the Academic Workflow application. Please try restarting the app.');
        electron_1.app.quit();
        return;
    }
    // Set up window manager
    windowManager.setup(mainWindow);
    // Create application menu
    const menu = (0, menu_1.createMenu)(mainWindow);
    electron_1.Menu.setApplicationMenu(menu);
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
        exports.mainWindow = mainWindow = null;
    });
    // Handle external links
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        electron_1.shell.openExternal(url);
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
async function checkFirstRun() {
    try {
        const userDataPath = electron_1.app.getPath('userData');
        const firstRunFile = (0, path_1.join)(userDataPath, '.first-run-complete');
        try {
            await fs_1.promises.access(firstRunFile);
            return false; // File exists, not first run
        }
        catch {
            // File doesn't exist, this is first run
            await fs_1.promises.writeFile(firstRunFile, new Date().toISOString());
            return true;
        }
    }
    catch (error) {
        console.error('Error checking first run:', error);
        return false;
    }
}
// App event handlers
electron_1.app.whenReady().then(async () => {
    // Set app user model ID for Windows (future compatibility)
    if (process.platform === 'win32') {
        electron_1.app.setAppUserModelId('com.yourcompany.academic-workflow');
    }
    await createWindow();
    // macOS app should re-create window when dock icon is clicked
    electron_1.app.on('activate', async () => {
        if (electron_1.BrowserWindow.getAllWindows().length === 0) {
            await createWindow();
        }
    });
});
// Quit when all windows are closed
electron_1.app.on('window-all-closed', () => {
    // On macOS, apps typically stay active until explicitly quit
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
electron_1.app.on('before-quit', () => {
    // Clean up server process
    if (serverProcess) {
        serverProcess.kill();
    }
});
// Security: Prevent new window creation
electron_1.app.on('web-contents-created', (event, contents) => {
    contents.setWindowOpenHandler(({ url }) => {
        electron_1.shell.openExternal(url);
        return { action: 'deny' };
    });
});
// IPC handlers
electron_1.ipcMain.handle('get-app-version', () => {
    return electron_1.app.getVersion();
});
electron_1.ipcMain.handle('get-app-path', (event, name) => {
    return electron_1.app.getPath(name);
});
electron_1.ipcMain.handle('show-save-dialog', async (event, options) => {
    if (mainWindow) {
        const result = await electron_1.dialog.showSaveDialog(mainWindow, options);
        return result;
    }
    return { canceled: true };
});
electron_1.ipcMain.handle('show-open-dialog', async (event, options) => {
    if (mainWindow) {
        const result = await electron_1.dialog.showOpenDialog(mainWindow, options);
        return result;
    }
    return { canceled: true };
});
// Setup configuration handlers
electron_1.ipcMain.handle('save-config', async (event, config) => {
    try {
        const userDataPath = electron_1.app.getPath('userData');
        const configFile = (0, path_1.join)(userDataPath, 'config.json');
        await fs_1.promises.writeFile(configFile, JSON.stringify(config, null, 2));
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
    }
    catch (error) {
        console.error('Failed to save configuration:', error);
        throw error;
    }
});
electron_1.ipcMain.handle('close-setup', async () => {
    // Close all windows and create main window
    electron_1.BrowserWindow.getAllWindows().forEach(window => window.close());
    await createWindow();
});
// Auto-updater events (only if auto-updater is available)
if (autoUpdater) {
    autoUpdater.on('checking-for-update', () => {
        console.log('Checking for update...');
    });
    autoUpdater.on('update-available', (info) => {
        console.log('Update available.');
    });
    autoUpdater.on('update-not-available', (info) => {
        console.log('Update not available.');
    });
    autoUpdater.on('error', (err) => {
        console.log('Error in auto-updater. ' + err);
    });
    autoUpdater.on('download-progress', (progressObj) => {
        let log_message = "Download speed: " + progressObj.bytesPerSecond;
        log_message = log_message + ' - Downloaded ' + progressObj.percent + '%';
        log_message = log_message + ' (' + progressObj.transferred + "/" + progressObj.total + ')';
        console.log(log_message);
    });
    autoUpdater.on('update-downloaded', (info) => {
        console.log('Update downloaded');
        autoUpdater.quitAndInstall();
    });
}
