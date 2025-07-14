const { app, BrowserWindow, shell, ipcMain, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const { autoUpdater } = require('electron-updater');

// Keep a global reference of the window object
let mainWindow;
let nextServer;
let serverPort = 3000;

// Get user data directory for database
const userDataPath = app.getPath('userData');
const databasePath = path.join(userDataPath, 'database.db');

// Ensure user data directory exists
if (!fs.existsSync(userDataPath)) {
  fs.mkdirSync(userDataPath, { recursive: true });
}

// Find available port
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

// Start Next.js server
async function startNextServer() {
  serverPort = await findAvailablePort(3000);
  
  const nextPath = path.join(__dirname, '../.next/standalone/server.js');
  const publicPath = path.join(__dirname, '../public');
  const staticPath = path.join(__dirname, '../.next/static');
  
  const env = {
    ...process.env,
    PORT: serverPort,
    HOSTNAME: 'localhost',
    DATABASE_URL: `file:${databasePath}`,
    NODE_ENV: 'production',
    NEXT_PUBLIC_APP_URL: `http://localhost:${serverPort}`
  };
  
  nextServer = spawn('node', [nextPath], {
    env,
    cwd: path.dirname(nextPath),
    stdio: 'inherit'
  });
  
  nextServer.on('error', (err) => {
    console.error('Failed to start Next.js server:', err);
  });
  
  nextServer.on('close', (code) => {
    console.log(`Next.js server exited with code ${code}`);
  });
  
  // Wait for server to be ready
  await new Promise((resolve) => {
    setTimeout(resolve, 3000);
  });
}

// Create the main window
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js')
    },
    titleBarStyle: 'hiddenInset',
    show: false,
    icon: path.join(__dirname, '../build/icon.icns')
  });

  // Load the Next.js app
  mainWindow.loadURL(`http://localhost:${serverPort}`);

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
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

  // Security: prevent navigation to external websites
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith(`http://localhost:${serverPort}`)) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });
}

// App event handlers
app.whenReady().then(async () => {
  await startNextServer();
  createWindow();
  
  // Auto-updater
  autoUpdater.checkForUpdatesAndNotify();
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (nextServer) {
    nextServer.kill();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (nextServer) {
    nextServer.kill();
  }
});

// Security: prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
    shell.openExternal(navigationUrl);
  });
});

// IPC handlers
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('get-user-data-path', () => {
  return userDataPath;
});

ipcMain.handle('show-save-dialog', async (event, options) => {
  const result = await dialog.showSaveDialog(mainWindow, options);
  return result;
});

ipcMain.handle('show-open-dialog', async (event, options) => {
  const result = await dialog.showOpenDialog(mainWindow, options);
  return result;
});

// Auto-updater events
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