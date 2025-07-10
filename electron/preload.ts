import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // App information
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getAppPath: (name: string) => ipcRenderer.invoke('get-app-path', name),
  
  // File dialogs
  showSaveDialog: (options: any) => ipcRenderer.invoke('show-save-dialog', options),
  showOpenDialog: (options: any) => ipcRenderer.invoke('show-open-dialog', options),
  
  // Setup configuration
  saveConfig: (config: any) => ipcRenderer.invoke('save-config', config),
  closeSetup: () => ipcRenderer.invoke('close-setup'),
  
  // Platform detection
  platform: process.platform,
  
  // Development mode detection
  isDevelopment: process.env.NODE_ENV === 'development',
  
  // App events
  onAppReady: (callback: () => void) => {
    ipcRenderer.on('app-ready', callback);
  },
  
  onUpdateAvailable: (callback: (info: any) => void) => {
    ipcRenderer.on('update-available', (event, info) => callback(info));
  },
  
  onUpdateDownloaded: (callback: (info: any) => void) => {
    ipcRenderer.on('update-downloaded', (event, info) => callback(info));
  }
});

// Declare the global type for TypeScript
declare global {
  interface Window {
    electronAPI: {
      getAppVersion: () => Promise<string>;
      getAppPath: (name: string) => Promise<string>;
      showSaveDialog: (options: any) => Promise<any>;
      showOpenDialog: (options: any) => Promise<any>;
      saveConfig: (config: any) => Promise<void>;
      closeSetup: () => Promise<void>;
      platform: string;
      isDevelopment: boolean;
      onAppReady: (callback: () => void) => void;
      onUpdateAvailable: (callback: (info: any) => void) => void;
      onUpdateDownloaded: (callback: (info: any) => void) => void;
    };
  }
}