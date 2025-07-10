import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as CommandHistory from '../lib/command-history';

describe('CommandHistory', () => {
  beforeEach(() => {
    // Reset history before each test (to be implemented)
    if (CommandHistory.clearHistory) CommandHistory.clearHistory();
    // Clear localStorage for isolation
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.clear();
    }
  });

  afterEach(() => {
    // Clean up localStorage after each test
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.clear();
    }
  });

  it('should track command usage and return most recent commands', () => {
    // Add usage for several commands
    CommandHistory.addCommandUsage('export-pdf');
    CommandHistory.addCommandUsage('next-step');
    CommandHistory.addCommandUsage('export-pdf');
    CommandHistory.addCommandUsage('reset-workflow');
    CommandHistory.addCommandUsage('next-step');
    // Get recent commands (should be sorted by recency)
    const recent = CommandHistory.getRecentCommands();
    expect(recent[0]).toBe('next-step');
    expect(recent[1]).toBe('reset-workflow');
    expect(recent[2]).toBe('export-pdf');
  });

  it('should track command usage frequency', () => {
    CommandHistory.addCommandUsage('export-pdf');
    CommandHistory.addCommandUsage('export-pdf');
    CommandHistory.addCommandUsage('next-step');
    const freq = CommandHistory.getCommandFrequency();
    expect(freq['export-pdf']).toBe(2);
    expect(freq['next-step']).toBe(1);
  });

  it('should persist command history to localStorage', () => {
    CommandHistory.addCommandUsage('export-pdf');
    CommandHistory.addCommandUsage('next-step');
    // Simulate reload: clear in-memory, reload from localStorage
    if (CommandHistory._simulateReload) CommandHistory._simulateReload();
    const recent = CommandHistory.getRecentCommands();
    expect(recent[0]).toBe('next-step');
    expect(recent[1]).toBe('export-pdf');
  });
}); 