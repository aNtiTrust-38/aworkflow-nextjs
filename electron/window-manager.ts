import { BrowserWindow, app } from 'electron';

export class WindowManager {
  private window: BrowserWindow | null = null;
  private isQuitting = false;

  setup(window: BrowserWindow) {
    this.window = window;
    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    if (!this.window) return;

    // Handle window close button (red button on macOS)
    this.window.on('close', (event) => {
      if (process.platform === 'darwin' && !this.isQuitting) {
        // On macOS, hide the window instead of closing it
        event.preventDefault();
        this.window?.hide();
      }
    });

    // Handle app quit
    app.on('before-quit', () => {
      this.isQuitting = true;
    });

    // Handle window restore from dock/taskbar
    app.on('activate', () => {
      if (this.window?.isVisible() === false) {
        this.window.show();
      }
    });

    // Save window state
    this.window.on('resize', () => {
      this.saveWindowState();
    });

    this.window.on('move', () => {
      this.saveWindowState();
    });

    // Restore window state
    this.restoreWindowState();
  }

  private saveWindowState() {
    if (!this.window) return;

    const bounds = this.window.getBounds();
    const isMaximized = this.window.isMaximized();
    const isFullScreen = this.window.isFullScreen();

    const windowState = {
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      isMaximized,
      isFullScreen
    };

    // Save to app settings
    try {
      const Store = require('electron-store');
      const store = new Store();
      store.set('windowState', windowState);
    } catch (error) {
      console.error('Failed to save window state:', error);
    }
  }

  private restoreWindowState() {
    if (!this.window) return;

    try {
      const Store = require('electron-store');
      const store = new Store();
      const windowState = store.get('windowState');

      if (windowState && typeof windowState === 'object') {
        const state = windowState as any;
        
        // Validate bounds are within screen
        const { screen } = require('electron');
        const displays = screen.getAllDisplays();
        const bounds = {
          x: state.x || 0,
          y: state.y || 0,
          width: state.width || 1400,
          height: state.height || 900
        };

        // Check if window would be visible on any display
        const isVisible = displays.some((display: any) => {
          const area = display.workArea;
          return bounds.x < area.x + area.width &&
                 bounds.x + bounds.width > area.x &&
                 bounds.y < area.y + area.height &&
                 bounds.y + bounds.height > area.y;
        });

        if (isVisible) {
          this.window.setBounds(bounds);
          
          if (state.isMaximized) {
            this.window.maximize();
          }
          
          if (state.isFullScreen) {
            this.window.setFullScreen(true);
          }
        }
      }
    } catch (error) {
      console.error('Failed to restore window state:', error);
    }
  }

  public show() {
    this.window?.show();
  }

  public hide() {
    this.window?.hide();
  }

  public close() {
    this.isQuitting = true;
    this.window?.close();
  }

  public minimize() {
    this.window?.minimize();
  }

  public maximize() {
    if (this.window?.isMaximized()) {
      this.window.unmaximize();
    } else {
      this.window?.maximize();
    }
  }

  public toggleFullScreen() {
    const isFullScreen = this.window?.isFullScreen() || false;
    this.window?.setFullScreen(!isFullScreen);
  }

  public center() {
    this.window?.center();
  }

  public focus() {
    this.window?.focus();
  }

  public isVisible(): boolean {
    return this.window?.isVisible() || false;
  }

  public isMinimized(): boolean {
    return this.window?.isMinimized() || false;
  }

  public isMaximized(): boolean {
    return this.window?.isMaximized() || false;
  }

  public isFullScreen(): boolean {
    return this.window?.isFullScreen() || false;
  }
}