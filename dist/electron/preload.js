"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    // App information
    getAppVersion: () => electron_1.ipcRenderer.invoke('get-app-version'),
    getAppPath: (name) => electron_1.ipcRenderer.invoke('get-app-path', name),
    // File dialogs
    showSaveDialog: (options) => electron_1.ipcRenderer.invoke('show-save-dialog', options),
    showOpenDialog: (options) => electron_1.ipcRenderer.invoke('show-open-dialog', options),
    // Setup configuration
    saveConfig: (config) => electron_1.ipcRenderer.invoke('save-config', config),
    closeSetup: () => electron_1.ipcRenderer.invoke('close-setup'),
    // Platform detection
    platform: process.platform,
    // Development mode detection
    isDevelopment: process.env.NODE_ENV === 'development',
    // App events
    onAppReady: (callback) => {
        electron_1.ipcRenderer.on('app-ready', callback);
    },
    onUpdateAvailable: (callback) => {
        electron_1.ipcRenderer.on('update-available', (event, info) => callback(info));
    },
    onUpdateDownloaded: (callback) => {
        electron_1.ipcRenderer.on('update-downloaded', (event, info) => callback(info));
    }
});
