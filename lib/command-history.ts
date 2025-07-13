export interface CommandHistoryEntry {
  id: string;
  command: string;
  timestamp: Date;
  context?: string;
  result?: string;
}

class CommandHistory {
  private history: CommandHistoryEntry[] = [];
  private maxEntries = 100;

  addCommand(command: string, context?: string, result?: string): void {
    const entry: CommandHistoryEntry = {
      id: Date.now().toString(),
      command,
      timestamp: new Date(),
      context,
      result,
    };

    this.history.unshift(entry);

    // Keep only the most recent entries
    if (this.history.length > this.maxEntries) {
      this.history = this.history.slice(0, this.maxEntries);
    }
  }

  getHistory(): CommandHistoryEntry[] {
    return [...this.history];
  }

  getRecentCommands(limit: number = 10): CommandHistoryEntry[] {
    return this.history.slice(0, limit);
  }

  searchHistory(query: string): CommandHistoryEntry[] {
    const lowerQuery = query.toLowerCase();
    return this.history.filter(entry =>
      entry.command.toLowerCase().includes(lowerQuery) ||
      entry.context?.toLowerCase().includes(lowerQuery)
    );
  }

  clearHistory(): void {
    this.history = [];
  }
}

// Global instance
const commandHistory = new CommandHistory();

// Export individual functions for easier testing and usage
export const getRecentCommands = (limit: number = 10): string[] => {
  return commandHistory.getRecentCommands(limit).map(entry => entry.command);
};

export const addCommandUsage = (command: string, context?: string, result?: string): void => {
  commandHistory.addCommand(command, context, result);
};

export const searchHistory = (query: string): CommandHistoryEntry[] => {
  return commandHistory.searchHistory(query);
};

export const clearHistory = (): void => {
  commandHistory.clearHistory();
};

export const getHistory = (): CommandHistoryEntry[] => {
  return commandHistory.getHistory();
};

export default commandHistory;