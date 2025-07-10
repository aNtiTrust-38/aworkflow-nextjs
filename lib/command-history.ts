// Command history tracking utilities for TDD.

let history: string[] = [];
let frequency: Record<string, number> = {};
const HISTORY_KEY = 'commandHistory';
const FREQ_KEY = 'commandFrequency';

function saveToStorage() {
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    window.localStorage.setItem(FREQ_KEY, JSON.stringify(frequency));
  }
}

function loadFromStorage() {
  if (typeof window !== 'undefined' && window.localStorage) {
    const h = window.localStorage.getItem(HISTORY_KEY);
    const f = window.localStorage.getItem(FREQ_KEY);
    history = h ? JSON.parse(h) : [];
    frequency = f ? JSON.parse(f) : {};
  }
}

export function addCommandUsage(commandId: string): void {
  history = history.filter(cmd => cmd !== commandId);
  history.unshift(commandId);
  if (history.length > 10) history = history.slice(0, 10);
  frequency[commandId] = (frequency[commandId] || 0) + 1;
  saveToStorage();
}

export function getRecentCommands(): string[] {
  return [...history];
}

export function getCommandFrequency(): Record<string, number> {
  return { ...frequency };
}

export function clearHistory(): void {
  history = [];
  frequency = {};
  saveToStorage();
}

// For test: simulate reload by clearing in-memory and reloading from localStorage
export function _simulateReload(): void {
  history = [];
  frequency = {};
  loadFromStorage();
} 