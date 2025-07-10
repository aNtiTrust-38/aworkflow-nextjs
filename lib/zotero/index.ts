export { ZoteroClient } from './client';
export { ZoteroAPISync } from './sync';
export * from './types';

// Import for local use
import { ZoteroClient } from './client';
import { ZoteroAPISync } from './sync';

// Factory function to create a configured Zotero sync
export function createZoteroSync(apiKey?: string, userId?: string) {
  if (!apiKey || !userId) {
    throw new Error('Zotero API key and user ID are required');
  }
  
  const client = new ZoteroClient(apiKey, userId);
  return new ZoteroAPISync(client);
}