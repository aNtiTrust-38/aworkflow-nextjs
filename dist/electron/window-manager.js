"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WindowManager = void 0;
const electron_1 = require("electron");
class WindowManager {
    constructor() {
        this.window = null;
        this.isQuitting = false;
    }
    setup(window) {
        this.window = window;
        this.setupEventHandlers();
    }
    setupEventHandlers() {
        if (!this.window)
            return;
        // Handle window close button (red button on macOS)
        this.window.on('close', (event) => {
            if (process.platform === 'darwin' && !this.isQuitting) {
                // On macOS, hide the window instead of closing it
                event.preventDefault();
                this.window?.hide();
            }
        });
        // Handle app quit
        electron_1.app.on('before-quit', () => {
            this.isQuitting = true;
        });
        // Handle window restore from dock/taskbar
        electron_1.app.on('activate', () => {
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
    saveWindowState() {
        if (!this.window)
            return;
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
        }
        catch (error) {
            console.error('Failed to save window state:', error);
        }
    }
    restoreWindowState() {
        if (!this.window)
            return;
        try {
            const Store = require('electron-store');
            const store = new Store();
            const windowState = store.get('windowState');
            if (windowState && typeof windowState === 'object') {
                const state = windowState;
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
                const isVisible = displays.some((display) => {
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
        }
        catch (error) {
            console.error('Failed to restore window state:', error);
        }
    }
    show() {
        this.window?.show();
    }
    hide() {
        this.window?.hide();
    }
    close() {
        this.isQuitting = true;
        this.window?.close();
    }
    minimize() {
        this.window?.minimize();
    }
    maximize() {
        if (this.window?.isMaximized()) {
            this.window.unmaximize();
        }
        else {
            this.window?.maximize();
        }
    }
    toggleFullScreen() {
        const isFullScreen = this.window?.isFullScreen() || false;
        this.window?.setFullScreen(!isFullScreen);
    }
    center() {
        this.window?.center();
    }
    focus() {
        this.window?.focus();
    }
    isVisible() {
        return this.window?.isVisible() || false;
    }
    isMinimized() {
        return this.window?.isMinimized() || false;
    }
    isMaximized() {
        return this.window?.isMaximized() || false;
    }
    isFullScreen() {
        return this.window?.isFullScreen() || false;
    }
}
exports.WindowManager = WindowManager;
