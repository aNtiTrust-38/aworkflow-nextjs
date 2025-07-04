export { ZoteroClient } from './client';
export { ZoteroAPISync } from './sync';
export * from './types';

// Factory function to create a configured Zotero sync
export function createZoteroSync(apiKey?: string, userId?: string) {
  if (!apiKey || !userId) {
    throw new Error('Zotero API key and user ID are required');
  }
  
  const client = new ZoteroClient(apiKey, userId);
  return new ZoteroAPISync(client);
}