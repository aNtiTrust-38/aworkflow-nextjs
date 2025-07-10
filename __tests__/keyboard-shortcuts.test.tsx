import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import { KeyboardShortcutManager } from '../components/CommandPalette/KeyboardShortcutManager';
import CommandPalette from '../components/CommandPalette';

describe('KeyboardShortcutManager', () => {
  let manager: KeyboardShortcutManager;

  beforeEach(() => {
    manager = new KeyboardShortcutManager();
    manager.reset();
  });

  it('should register and trigger a global shortcut', () => {
    const handler = vi.fn();
    manager.registerShortcut('ctrl+1', handler);
    const event = new KeyboardEvent('keydown', { ctrlKey: true, key: '1' });
    manager.handleKeyDown(event);
    expect(handler).toHaveBeenCalled();
  });

  it('should handle chord combinations (Ctrl+K, then P)', () => {
    const handler = vi.fn();
    manager.registerShortcut('ctrl+k p', handler); // chord: ctrl+k, then p
    // Simulate chord sequence
    manager.handleKeyDown(new KeyboardEvent('keydown', { ctrlKey: true, key: 'k' }));
    manager.handleKeyDown(new KeyboardEvent('keydown', { key: 'p' }));
    expect(handler).toHaveBeenCalled();
  });

  it('should support context-specific shortcuts', () => {
    const handler = vi.fn();
    // Context support will be added in implementation
    manager.registerShortcut('ctrl+r', handler);
    // Should not trigger if context is not set
    manager.handleKeyDown(new KeyboardEvent('keydown', { ctrlKey: true, key: 'r' }));
    expect(handler).not.toHaveBeenCalled();
    // Set context and try again
    manager.setContext?.('research');
    manager.handleKeyDown(new KeyboardEvent('keydown', { ctrlKey: true, key: 'r' }));
    expect(handler).toHaveBeenCalled();
  });

  it('should prevent conflicts with browser shortcuts', () => {
    const handler = vi.fn();
    manager.registerShortcut('ctrl+t', handler);
    // Simulate Ctrl+T (should NOT trigger handler if reserved)
    manager.isReservedShortcut = () => true;
    manager.handleKeyDown(new KeyboardEvent('keydown', { ctrlKey: true, key: 't' }));
    expect(handler).not.toHaveBeenCalled();
  });
});

describe('KeyboardShortcutManager integration with CommandPalette', () => {
  it('should trigger onNavigate when Ctrl+1 is pressed', async () => {
    const onNavigate = vi.fn();
    const onClose = vi.fn();
    const onAction = vi.fn();
    render(
      <CommandPalette
        isOpen={true}
        onClose={onClose}
        currentStep={2}
        onNavigate={onNavigate}
        onAction={onAction}
      />
    );
    // Simulate Ctrl+1
    document.dispatchEvent(new KeyboardEvent('keydown', { ctrlKey: true, key: '1' }));
    // Allow React effects to process
    await Promise.resolve();
    expect(onNavigate).toHaveBeenCalledWith(1);
  });
}); 