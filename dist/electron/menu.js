"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMenu = createMenu;
const electron_1 = require("electron");
function createMenu(mainWindow) {
    const isMac = process.platform === 'darwin';
    const isDevelopment = process.env.NODE_ENV === 'development';
    const template = [
        // App Menu (macOS only)
        ...(isMac ? [{
                label: electron_1.app.getName(),
                submenu: [
                    {
                        label: 'About Academic Workflow',
                        click: () => {
                            electron_1.dialog.showMessageBox(mainWindow, {
                                type: 'info',
                                title: 'About Academic Workflow',
                                message: 'Academic Workflow',
                                detail: `Version ${electron_1.app.getVersion()}\n\nAI-Powered Academic Research and Writing Assistant\n\nDesigned for academic researchers to streamline their writing process while maintaining academic integrity.`,
                                buttons: ['OK']
                            });
                        }
                    },
                    { type: 'separator' },
                    {
                        label: 'Preferences...',
                        accelerator: 'Cmd+,',
                        click: () => {
                            mainWindow.webContents.executeJavaScript(`
              window.location.href = '/settings';
            `);
                        }
                    },
                    { type: 'separator' },
                    {
                        label: 'Services',
                        role: 'services',
                        submenu: []
                    },
                    { type: 'separator' },
                    {
                        label: 'Hide Academic Workflow',
                        accelerator: 'Cmd+H',
                        role: 'hide'
                    },
                    {
                        label: 'Hide Others',
                        accelerator: 'Cmd+Alt+H',
                        role: 'hideothers'
                    },
                    {
                        label: 'Show All',
                        role: 'unhide'
                    },
                    { type: 'separator' },
                    {
                        label: 'Quit Academic Workflow',
                        accelerator: 'Cmd+Q',
                        click: () => {
                            electron_1.app.quit();
                        }
                    }
                ]
            }] : []),
        // File Menu
        {
            label: 'File',
            submenu: [
                {
                    label: 'New Project',
                    accelerator: 'CmdOrCtrl+N',
                    click: () => {
                        mainWindow.webContents.executeJavaScript(`
              window.location.href = '/';
            `);
                    }
                },
                { type: 'separator' },
                {
                    label: 'Export PDF...',
                    accelerator: 'CmdOrCtrl+E',
                    click: () => {
                        mainWindow.webContents.executeJavaScript(`
              // Trigger PDF export if available
              if (window.triggerPDFExport) {
                window.triggerPDFExport();
              } else {
                alert('Please complete your workflow to enable PDF export');
              }
            `);
                    }
                },
                {
                    label: 'Export Word Document...',
                    accelerator: 'CmdOrCtrl+Shift+E',
                    click: () => {
                        mainWindow.webContents.executeJavaScript(`
              // Trigger Word export if available
              if (window.triggerWordExport) {
                window.triggerWordExport();
              } else {
                alert('Please complete your workflow to enable Word export');
              }
            `);
                    }
                },
                { type: 'separator' },
                ...(isMac ? [] : [
                    {
                        label: 'Exit',
                        accelerator: 'Ctrl+Q',
                        click: () => {
                            electron_1.app.quit();
                        }
                    }
                ])
            ]
        },
        // Edit Menu
        {
            label: 'Edit',
            submenu: [
                {
                    label: 'Undo',
                    accelerator: 'CmdOrCtrl+Z',
                    role: 'undo'
                },
                {
                    label: 'Redo',
                    accelerator: 'Shift+CmdOrCtrl+Z',
                    role: 'redo'
                },
                { type: 'separator' },
                {
                    label: 'Cut',
                    accelerator: 'CmdOrCtrl+X',
                    role: 'cut'
                },
                {
                    label: 'Copy',
                    accelerator: 'CmdOrCtrl+C',
                    role: 'copy'
                },
                {
                    label: 'Paste',
                    accelerator: 'CmdOrCtrl+V',
                    role: 'paste'
                },
                ...(isMac ? [
                    {
                        label: 'Paste and Match Style',
                        accelerator: 'Cmd+Shift+V',
                        role: 'pasteandmatchstyle'
                    },
                    {
                        label: 'Delete',
                        role: 'delete'
                    },
                    {
                        label: 'Select All',
                        accelerator: 'Cmd+A',
                        role: 'selectall'
                    },
                    { type: 'separator' },
                    {
                        label: 'Speech',
                        submenu: [
                            {
                                label: 'Start Speaking',
                                role: 'startspeaking'
                            },
                            {
                                label: 'Stop Speaking',
                                role: 'stopspeaking'
                            }
                        ]
                    }
                ] : [
                    { type: 'separator' },
                    {
                        label: 'Select All',
                        accelerator: 'Ctrl+A',
                        role: 'selectall'
                    }
                ])
            ]
        },
        // View Menu
        {
            label: 'View',
            submenu: [
                {
                    label: 'Reload',
                    accelerator: 'CmdOrCtrl+R',
                    click: () => {
                        mainWindow.reload();
                    }
                },
                {
                    label: 'Force Reload',
                    accelerator: 'CmdOrCtrl+Shift+R',
                    click: () => {
                        mainWindow.webContents.reloadIgnoringCache();
                    }
                },
                ...(isDevelopment ? [
                    {
                        label: 'Toggle Developer Tools',
                        accelerator: isMac ? 'Alt+Cmd+I' : 'Ctrl+Shift+I',
                        click: () => {
                            mainWindow.webContents.toggleDevTools();
                        }
                    }
                ] : []),
                { type: 'separator' },
                {
                    label: 'Actual Size',
                    accelerator: 'CmdOrCtrl+0',
                    role: 'resetzoom'
                },
                {
                    label: 'Zoom In',
                    accelerator: 'CmdOrCtrl+Plus',
                    role: 'zoomin'
                },
                {
                    label: 'Zoom Out',
                    accelerator: 'CmdOrCtrl+-',
                    role: 'zoomout'
                },
                { type: 'separator' },
                {
                    label: 'Toggle Fullscreen',
                    accelerator: isMac ? 'Ctrl+Cmd+F' : 'F11',
                    role: 'togglefullscreen'
                }
            ]
        },
        // Window Menu
        {
            label: 'Window',
            submenu: [
                {
                    label: 'Minimize',
                    accelerator: 'CmdOrCtrl+M',
                    role: 'minimize'
                },
                {
                    label: 'Close',
                    accelerator: 'CmdOrCtrl+W',
                    role: 'close'
                },
                ...(isMac ? [
                    { type: 'separator' },
                    {
                        label: 'Bring All to Front',
                        role: 'front'
                    }
                ] : [])
            ]
        },
        // Help Menu
        {
            label: 'Help',
            submenu: [
                {
                    label: 'Academic Workflow Documentation',
                    click: async () => {
                        await electron_1.shell.openExternal('https://github.com/your-repo/academic-workflow#readme');
                    }
                },
                {
                    label: 'Getting Started Guide',
                    click: () => {
                        mainWindow.webContents.executeJavaScript(`
              window.location.href = '/setup';
            `);
                    }
                },
                { type: 'separator' },
                {
                    label: 'Report an Issue',
                    click: async () => {
                        await electron_1.shell.openExternal('https://github.com/your-repo/academic-workflow/issues');
                    }
                },
                {
                    label: 'Check for Updates...',
                    click: () => {
                        // Trigger update check
                        const { autoUpdater } = require('electron-updater');
                        autoUpdater.checkForUpdatesAndNotify();
                    }
                },
                ...(isMac ? [] : [
                    { type: 'separator' },
                    {
                        label: 'About Academic Workflow',
                        click: () => {
                            electron_1.dialog.showMessageBox(mainWindow, {
                                type: 'info',
                                title: 'About Academic Workflow',
                                message: 'Academic Workflow',
                                detail: `Version ${electron_1.app.getVersion()}\n\nAI-Powered Academic Research and Writing Assistant\n\nDesigned for academic researchers to streamline their writing process while maintaining academic integrity.`,
                                buttons: ['OK']
                            });
                        }
                    }
                ])
            ]
        }
    ];
    return electron_1.Menu.buildFromTemplate(template);
}
