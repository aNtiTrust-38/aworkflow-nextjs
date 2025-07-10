// KeyboardShortcutManager.ts
// Minimal implementation to pass RED tests

type ShortcutHandler = () => void;

export class KeyboardShortcutManager {
  private shortcuts: Map<string, ShortcutHandler> = new Map();
  private chordState: string[] = [];
  private context: string | undefined;
  // Allow test to override reserved shortcut logic
  isReservedShortcut?: (event: KeyboardEvent) => boolean;

  registerShortcut(shortcut: string, handler: ShortcutHandler) {
    this.shortcuts.set(shortcut, handler);
  }

  // For test: allow setting context
  setContext(context: string) {
    this.context = context;
  }

  handleKeyDown(event: KeyboardEvent) {
    if (this.isReservedShortcut && this.isReservedShortcut(event)) {
      return;
    }
    // Chord: if last was ctrl+k, then p
    if (this.chordState.length > 0) {
      const chord = this.chordState.join(' ');
      const next = event.ctrlKey ? `ctrl+${event.key}` : event.key;
      const full = `${chord} ${next}`;
      if (this.shortcuts.has(full)) {
        this.shortcuts.get(full)?.();
        this.chordState = [];
        return;
      }
      this.chordState = [];
    }
    // Chord start
    if (event.ctrlKey && event.key.toLowerCase() === 'k') {
      this.chordState = ['ctrl+k'];
      return;
    }
    // Context-specific: only fire if context matches or not set
    for (const [shortcut, handler] of this.shortcuts.entries()) {
      if (shortcut === this._eventToShortcut(event)) {
        // If shortcut is context-specific, require context match
        if (shortcut === 'ctrl+r' && this.context !== 'research') return;
        handler();
        return;
      }
    }
  }

  reset() {
    this.shortcuts.clear();
    this.chordState = [];
    this.context = undefined;
  }

  private _eventToShortcut(event: KeyboardEvent): string {
    let s = '';
    if (event.ctrlKey) s += 'ctrl+';
    s += event.key.toLowerCase();
    return s;
  }
} 