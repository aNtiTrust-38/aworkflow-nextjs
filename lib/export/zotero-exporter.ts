interface ZoteroConfig {
  apiKey: string;
  userId: string;
  baseUrl?: string;
}

interface ZoteroItem {
  type: 'article' | 'book' | 'website' | 'report' | 'thesis' | 'conference';
  title: string;
  author: string;
  year?: string;
  journal?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  publisher?: string;
  location?: string;
  url?: string;
  doi?: string;
  isbn?: string;
  abstract?: string;
  tags?: string[];
  collections?: string[];
  customFields?: Record<string, any>;
}

interface ZoteroExportData {
  title: string;
  bibliography: ZoteroItem[];
  collections?: CollectionConfig[];
  metadata?: {
    projectName?: string;
    description?: string;
    tags?: string[];
  };
}

interface CollectionConfig {
  name: string;
  description?: string;
  parent?: string;
  items?: string[]; // Item IDs
}

interface ExportOptions {
  collectionName?: string;
  createNewCollection?: boolean;
  tagItems?: string[];
  includeNotes?: boolean;
  includeAttachments?: boolean;
  deduplicateItems?: boolean;
  mergeStrategy?: 'skip' | 'overwrite' | 'merge';
}

interface BulkImportOptions {
  deduplicateItems: boolean;
  mergeStrategy: 'skip' | 'overwrite' | 'merge';
  batchSize: number;
  onProgress?: (progress: BulkImportProgress) => void;
}

interface SyncOptions {
  direction: 'import' | 'export' | 'bidirectional';
  conflictResolution: 'manual' | 'local' | 'remote';
  includeAttachments: boolean;
  includeNotes: boolean;
  dryRun?: boolean;
}

interface ExportResult {
  success: boolean;
  collectionId?: string;
  itemsCreated: number;
  itemsUpdated?: number;
  itemsSkipped?: number;
  errors?: string[];
  warnings?: string[];
}

interface BulkImportResult {
  itemsProcessed: number;
  itemsCreated: number;
  itemsUpdated: number;
  itemsSkipped: number;
  duplicatesFound: number;
  errors: string[];
  processingTime: number;
}

interface BulkImportProgress {
  processed: number;
  total: number;
  currentItem: string;
  stage: 'validating' | 'deduplicating' | 'uploading' | 'finalizing';
}

interface SyncResult {
  success: boolean;
  itemsSynced: number;
  itemsCreated: number;
  itemsUpdated: number;
  itemsDeleted: number;
  conflicts: SyncConflict[];
  errors: string[];
}

interface SyncConflict {
  itemId: string;
  field: string;
  localValue: any;
  remoteValue: any;
  resolution?: 'local' | 'remote' | 'manual';
}

export class ZoteroExporter {
  private config: ZoteroConfig;
  private cache = new Map<string, any>();

  constructor(config: ZoteroConfig) {
    this.config = {
      baseUrl: 'https://api.zotero.org',
      ...config
    };
  }

  async exportToCollection(data: ZoteroExportData, options: ExportOptions = {}): Promise<ExportResult> {
    try {
      const result: ExportResult = {
        success: false,
        itemsCreated: 0,
        errors: [],
        warnings: []
      };

      // Create or find collection
      let collectionId: string | undefined;
      if (options.collectionName) {
        if (options.createNewCollection) {
          collectionId = await this.createCollection(options.collectionName);
        } else {
          collectionId = await this.findCollection(options.collectionName);
        }
        result.collectionId = collectionId;
      }

      // Process items
      for (const item of data.bibliography) {
        try {
          const existingItem = options.deduplicateItems ? await this.findDuplicateItem(item) : null;
          
          if (existingItem) {
            if (options.mergeStrategy === 'skip') {
              result.itemsSkipped = (result.itemsSkipped || 0) + 1;
              continue;
            }
          }

          const zoteroItem = this.convertToZoteroFormat(item, options);
          const itemId = await this.createItem(zoteroItem);
          
          if (collectionId) {
            await this.addItemToCollection(itemId, collectionId);
          }
          
          result.itemsCreated++;
        } catch (error) {
          result.errors?.push(`Failed to create item "${item.title}": ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      result.success = (result.errors?.length || 0) === 0;
      return result;
      
    } catch (error) {
      return {
        success: false,
        itemsCreated: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  async bulkImport(data: { items: ZoteroItem[] }, options: BulkImportOptions): Promise<BulkImportResult> {
    const startTime = Date.now();
    
    // Reset processed items for each bulk import
    this.processedItems.clear();
    
    const result: BulkImportResult = {
      itemsProcessed: 0,
      itemsCreated: 0,
      itemsUpdated: 0,
      itemsSkipped: 0,
      duplicatesFound: 0,
      errors: [],
      processingTime: 0
    };

    try {
      // Process in batches
      const batches = this.createBatches(data.items, options.batchSize);
      
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        
        for (const item of batch) {
          options.onProgress?.({
            processed: result.itemsProcessed,
            total: data.items.length,
            currentItem: item.title,
            stage: 'validating'
          });

          try {
            // Validate item
            if (!this.validateItem(item)) {
              result.errors.push(`Invalid item: ${item.title}`);
              result.itemsProcessed++;
              continue;
            }

            // Check for duplicates
            if (options.deduplicateItems) {
              options.onProgress?.({
                processed: result.itemsProcessed,
                total: data.items.length,
                currentItem: item.title,
                stage: 'deduplicating'
              });

              const duplicate = await this.findDuplicateItem(item);
              if (duplicate) {
                result.duplicatesFound++;
                
                if (options.mergeStrategy === 'skip') {
                  result.itemsSkipped++;
                  result.itemsProcessed++;
                  continue;
                } else if (options.mergeStrategy === 'overwrite') {
                  // Update existing item
                  result.itemsUpdated++;
                  result.itemsProcessed++;
                  continue;
                }
              }
            }

            // Create item (only if not skipped)
            options.onProgress?.({
              processed: result.itemsProcessed,
              total: data.items.length,
              currentItem: item.title,
              stage: 'uploading'
            });

            const zoteroItem = this.convertToZoteroFormat(item);
            await this.createItem(zoteroItem);
            result.itemsCreated++;

          } catch (error) {
            result.errors.push(`Failed to process "${item.title}": ${error instanceof Error ? error.message : 'Unknown error'}`);
          }

          result.itemsProcessed++;
        }
      }

      options.onProgress?.({
        processed: result.itemsProcessed,
        total: data.items.length,
        currentItem: '',
        stage: 'finalizing'
      });

    } catch (error) {
      result.errors.push(`Bulk import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    result.processingTime = Date.now() - startTime;
    return result;
  }

  async sync(options: SyncOptions): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      itemsSynced: 0,
      itemsCreated: 0,
      itemsUpdated: 0,
      itemsDeleted: 0,
      conflicts: [],
      errors: []
    };

    try {
      if (options.direction === 'import' || options.direction === 'bidirectional') {
        await this.importFromZotero(result, options);
      }

      if (options.direction === 'export' || options.direction === 'bidirectional') {
        await this.exportToZotero(result, options);
      }

      result.itemsSynced = result.itemsCreated + result.itemsUpdated;
      result.success = result.errors.length === 0;

    } catch (error) {
      result.errors.push(`Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return result;
  }

  async exportItem(item: ZoteroItem, options: { includeCustomFields?: boolean; mapCustomFields?: Record<string, string> } = {}): Promise<{ itemId: string; customFieldsMapped: number }> {
    const zoteroItem = this.convertToZoteroFormat(item, options);
    const itemId = await this.createItem(zoteroItem);
    
    let customFieldsMapped = 0;
    if (options.includeCustomFields && item.customFields && options.mapCustomFields) {
      customFieldsMapped = await this.mapCustomFields(itemId, item.customFields, options.mapCustomFields);
    }

    return { itemId, customFieldsMapped };
  }

  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  private validateItem(item: ZoteroItem): boolean {
    return !!(item.title && item.title.trim() && item.type);
  }

  private async createCollection(name: string): Promise<string> {
    // Mock collection creation
    const collectionId = `collection_${Date.now()}`;
    await new Promise(resolve => setTimeout(resolve, 200));
    return collectionId;
  }

  private async findCollection(name: string): Promise<string | undefined> {
    // Mock collection search
    await new Promise(resolve => setTimeout(resolve, 100));
    return Math.random() > 0.5 ? `existing_collection_${name}` : undefined;
  }

  private processedItems = new Set<string>();

  private async findDuplicateItem(item: ZoteroItem): Promise<string | null> {
    // Mock duplicate detection based on title and author
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // For testing: detect duplicate if we've already processed this exact item
    const hash = this.createItemHash(item);
    if (this.processedItems.has(hash)) {
      return `duplicate_${hash}`;
    }
    
    this.processedItems.add(hash);
    return null;
  }

  private createItemHash(item: ZoteroItem): string {
    const key = `${item.title}_${item.author}_${item.year || ''}`;
    return key.replace(/\s+/g, '_').toLowerCase();
  }

  private convertToZoteroFormat(item: ZoteroItem, options: any = {}): any {
    const zoteroItem: any = {
      itemType: this.mapItemType(item.type),
      title: item.title,
      creators: this.parseAuthors(item.author),
      date: item.year || '',
      url: item.url || '',
      DOI: item.doi || '',
      abstractNote: item.abstract || ''
    };

    // Add type-specific fields
    switch (item.type) {
      case 'article':
        zoteroItem.publicationTitle = item.journal || '';
        zoteroItem.volume = item.volume || '';
        zoteroItem.issue = item.issue || '';
        zoteroItem.pages = item.pages || '';
        break;
      case 'book':
        zoteroItem.publisher = item.publisher || '';
        zoteroItem.place = item.location || '';
        zoteroItem.ISBN = item.isbn || '';
        break;
      case 'website':
        zoteroItem.websiteTitle = item.journal || '';
        break;
    }

    // Add tags
    if (item.tags || options.tagItems) {
      zoteroItem.tags = [
        ...(item.tags || []).map((tag: string) => ({ tag })),
        ...(options.tagItems || []).map((tag: string) => ({ tag }))
      ];
    }

    return zoteroItem;
  }

  private mapItemType(type: string): string {
    const typeMap: Record<string, string> = {
      'article': 'journalArticle',
      'book': 'book',
      'website': 'webpage',
      'report': 'report',
      'thesis': 'thesis',
      'conference': 'conferencePaper'
    };
    return typeMap[type] || 'document';
  }

  private parseAuthors(authorString: string): any[] {
    // Simple author parsing - in real implementation, use proper name parsing
    const authors = authorString.split(/[,&]|and/).map(author => author.trim());
    return authors.map(author => {
      const parts = author.split(' ');
      const lastName = parts.pop() || '';
      const firstName = parts.join(' ');
      return {
        creatorType: 'author',
        firstName,
        lastName
      };
    });
  }

  private async createItem(item: any): Promise<string> {
    // Mock item creation
    await new Promise(resolve => setTimeout(resolve, 100));
    return `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async addItemToCollection(itemId: string, collectionId: string): Promise<void> {
    // Mock adding item to collection
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  private async mapCustomFields(itemId: string, customFields: Record<string, any>, fieldMap: Record<string, string>): Promise<number> {
    let mapped = 0;
    
    for (const [customField, value] of Object.entries(customFields)) {
      const zoteroField = fieldMap[customField];
      if (zoteroField) {
        await this.updateItemField(itemId, zoteroField, value);
        mapped++;
      }
    }
    
    return mapped;
  }

  private async updateItemField(itemId: string, field: string, value: any): Promise<void> {
    // Mock field update
    await new Promise(resolve => setTimeout(resolve, 25));
  }

  private async importFromZotero(result: SyncResult, options: SyncOptions): Promise<void> {
    // Mock import from Zotero
    const mockItems = 5;
    for (let i = 0; i < mockItems; i++) {
      await new Promise(resolve => setTimeout(resolve, 100));
      result.itemsCreated++;
    }
  }

  private async exportToZotero(result: SyncResult, options: SyncOptions): Promise<void> {
    // Mock export to Zotero
    const mockItems = 3;
    for (let i = 0; i < mockItems; i++) {
      await new Promise(resolve => setTimeout(resolve, 100));
      result.itemsUpdated++;
    }
  }

  // Advanced features
  async getLibraryStats(): Promise<LibraryStats> {
    // Mock library statistics
    return {
      totalItems: 1247,
      itemsByType: {
        'journalArticle': 450,
        'book': 320,
        'webpage': 180,
        'report': 125,
        'thesis': 85,
        'conferencePaper': 87
      },
      collections: 15,
      tags: 234,
      lastSync: new Date(),
      storageUsed: '2.3 GB',
      storageLimit: '10 GB'
    };
  }

  async searchLibrary(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    // Mock library search
    const mockResults: SearchResult[] = [
      {
        itemId: 'item1',
        title: 'Matching Research Paper',
        author: 'Smith, J.',
        year: '2023',
        type: 'journalArticle',
        relevance: 0.95
      },
      {
        itemId: 'item2',
        title: 'Another Relevant Source',
        author: 'Johnson, A.',
        year: '2022',
        type: 'book',
        relevance: 0.87
      }
    ];

    return mockResults.filter(result => result.relevance > (options.minRelevance || 0.5));
  }

  async createBackup(options: BackupOptions = {}): Promise<BackupResult> {
    // Mock backup creation
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    return {
      success: true,
      backupId: `backup_${Date.now()}`,
      itemsBackedUp: 1247,
      collectionsBackedUp: 15,
      size: '156 MB',
      location: options.location || 'local',
      timestamp: new Date()
    };
  }
}

interface LibraryStats {
  totalItems: number;
  itemsByType: Record<string, number>;
  collections: number;
  tags: number;
  lastSync: Date;
  storageUsed: string;
  storageLimit: string;
}

interface SearchOptions {
  itemType?: string;
  collection?: string;
  tag?: string;
  minRelevance?: number;
  limit?: number;
}

interface SearchResult {
  itemId: string;
  title: string;
  author: string;
  year: string;
  type: string;
  relevance: number;
}

interface BackupOptions {
  includeAttachments?: boolean;
  includeNotes?: boolean;
  location?: 'local' | 'cloud';
  encryption?: boolean;
}

interface BackupResult {
  success: boolean;
  backupId: string;
  itemsBackedUp: number;
  collectionsBackedUp: number;
  size: string;
  location: string;
  timestamp: Date;
}