import { ZoteroClient } from './client';
import { ZoteroItem, AppReference, ZoteroSyncResult, ConflictItem } from './types';

export class ZoteroAPISync {
  private client: ZoteroClient;

  constructor(client: ZoteroClient) {
    this.client = client;
  }

  async syncReferences(appReferences: AppReference[]): Promise<ZoteroSyncResult> {
    const result: ZoteroSyncResult = {
      imported: [],
      exported: [],
      conflicts: []
    };

    try {
      if (!this.client.isConfigured()) {
        throw new Error('Zotero client not configured');
      }

      // Get existing items from Zotero
      const zoteroItems = await this.client.getItems();
      
      // Convert Zotero items to app format for importing
      result.imported = zoteroItems.map(item => this.client.convertToAppFormat(item));

      // Process app references for export to Zotero
      const validAppRefs = this.validateReferences(appReferences);
      
      for (const appRef of validAppRefs) {
        const conflict = this.checkForConflicts(appRef, zoteroItems);
        
        if (conflict) {
          result.conflicts.push(conflict);
        } else {
          // No conflict, create new item in Zotero
          try {
            const created = await this.client.createItem(appRef);
            result.exported.push({
              key: created.key,
              title: appRef.title,
              authors: appRef.authors,
              year: appRef.year,
              source: appRef.source,
              doi: appRef.doi,
              abstract: appRef.abstract,
              itemType: 'journalArticle'
            });
          } catch (error: any) {
            console.warn(`Failed to export reference "${appRef.title}":`, error.message);
          }
        }
      }

    } catch (error: any) {
      result.error = `${error.message} - operating in offline mode`;
    }

    return result;
  }

  validateReferences(references: any[]): AppReference[] {
    return references.filter(ref => {
      return ref.title && 
             ref.title.trim() !== '' &&
             Array.isArray(ref.authors) && 
             ref.authors.length > 0 &&
             ref.year && 
             ref.year > 1800 && 
             ref.year <= new Date().getFullYear() + 5;
    });
  }

  private checkForConflicts(appRef: AppReference, zoteroItems: ZoteroItem[]): ConflictItem | null {
    for (const zoteroItem of zoteroItems) {
      // Check for title and author match
      if (this.similarTitles(appRef.title, zoteroItem.title) && 
          this.similarAuthors(appRef.authors, zoteroItem.authors)) {
        
        // Same paper, check for differences
        if (appRef.year !== zoteroItem.year) {
          return {
            appReference: appRef,
            zoteroItem,
            reason: 'Different year'
          };
        }
        
        if (appRef.source !== zoteroItem.source) {
          return {
            appReference: appRef,
            zoteroItem,
            reason: 'Different source'
          };
        }
        
        // DOI mismatch
        if (appRef.doi && zoteroItem.doi && appRef.doi !== zoteroItem.doi) {
          return {
            appReference: appRef,
            zoteroItem,
            reason: 'Different DOI'
          };
        }
      }
    }
    
    return null;
  }

  private similarTitles(title1: string, title2: string): boolean {
    const normalize = (str: string) => str.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    const norm1 = normalize(title1);
    const norm2 = normalize(title2);
    
    // Simple similarity check - could be enhanced with fuzzy matching
    return norm1 === norm2 || 
           norm1.includes(norm2) || 
           norm2.includes(norm1) ||
           this.levenshteinDistance(norm1, norm2) < Math.max(norm1.length, norm2.length) * 0.2;
  }

  private similarAuthors(authors1: string[], authors2: string[]): boolean {
    if (authors1.length === 0 && authors2.length === 0) return true;
    if (authors1.length === 0 || authors2.length === 0) return false;
    
    // Check if any authors match
    for (const author1 of authors1) {
      for (const author2 of authors2) {
        if (this.similarNames(author1, author2)) {
          return true;
        }
      }
    }
    
    return false;
  }

  private similarNames(name1: string, name2: string): boolean {
    const normalize = (name: string) => name.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .trim();
    
    const norm1 = normalize(name1);
    const norm2 = normalize(name2);
    
    // Check exact match
    if (norm1 === norm2) return true;
    
    // Check if one is contained in the other (handles initials vs full names)
    if (norm1.includes(norm2) || norm2.includes(norm1)) return true;
    
    // Check last name match (common case)
    const lastName1 = norm1.split(' ').pop() || '';
    const lastName2 = norm2.split(' ').pop() || '';
    
    return lastName1 === lastName2 && lastName1.length > 2;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const substitution = matrix[j - 1][i - 1] + (str1[i - 1] === str2[j - 1] ? 0 : 1);
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,     // deletion
          matrix[j - 1][i] + 1,     // insertion
          substitution              // substitution
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  async resolveConflict(conflict: ConflictItem, resolution: 'use_app' | 'use_zotero' | 'merge'): Promise<void> {
    switch (resolution) {
      case 'use_app':
        // Update Zotero item with app data
        await this.client.updateItem(conflict.zoteroItem.key, conflict.appReference);
        break;
        
      case 'use_zotero':
        // Keep Zotero data as-is, no action needed
        break;
        
      case 'merge':
        // Intelligent merge of both sources
        const merged = this.mergeReferences(conflict.appReference, conflict.zoteroItem);
        await this.client.updateItem(conflict.zoteroItem.key, merged);
        break;
    }
  }

  private mergeReferences(appRef: AppReference, zoteroItem: ZoteroItem): AppReference {
    return {
      title: appRef.title || zoteroItem.title,
      authors: appRef.authors.length > 0 ? appRef.authors : zoteroItem.authors,
      year: appRef.year || zoteroItem.year,
      source: zoteroItem.source || appRef.source, // Prefer Zotero source
      citation: appRef.citation,
      doi: zoteroItem.doi || appRef.doi, // Prefer Zotero DOI
      abstract: zoteroItem.abstract || appRef.abstract, // Prefer Zotero abstract
      url: zoteroItem.url || appRef.url
    };
  }

  async exportToZotero(references: AppReference[]): Promise<ZoteroItem[]> {
    const validRefs = this.validateReferences(references);
    const exported: ZoteroItem[] = [];
    
    for (const ref of validRefs) {
      try {
        const created = await this.client.createItem(ref);
        exported.push({
          key: created.key,
          title: ref.title,
          authors: ref.authors,
          year: ref.year,
          source: ref.source,
          doi: ref.doi,
          abstract: ref.abstract,
          itemType: 'journalArticle'
        });
      } catch (error: any) {
        console.warn(`Failed to export reference "${ref.title}":`, error.message);
      }
    }
    
    return exported;
  }

  async importFromZotero(): Promise<AppReference[]> {
    try {
      const zoteroItems = await this.client.getItems();
      return zoteroItems.map(item => this.client.convertToAppFormat(item));
    } catch (error: any) {
      console.error('Failed to import from Zotero:', error.message);
      return [];
    }
  }
}