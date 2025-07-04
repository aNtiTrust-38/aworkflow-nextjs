import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ZoteroClient } from '../lib/zotero/client';
import { ZoteroAPISync } from '../lib/zotero/sync';

// Mock fetch for testing
global.fetch = vi.fn();

describe('Zotero Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ZoteroClient', () => {
    it('should create instance with valid API key and user ID', () => {
      const client = new ZoteroClient('test-api-key', 'test-user-id');
      expect(client).toBeDefined();
      expect(client.isConfigured()).toBe(true);
    });

    it('should throw error with invalid configuration', () => {
      expect(() => new ZoteroClient('', 'test-user-id')).toThrow('Zotero API key is required');
      expect(() => new ZoteroClient('test-key', '')).toThrow('Zotero user ID is required');
    });

    it('should fetch items from Zotero library', async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve([
          {
            key: 'ABCD1234',
            data: {
              title: 'Test Paper',
              creators: [{ firstName: 'John', lastName: 'Doe', creatorType: 'author' }],
              date: '2023',
              itemType: 'journalArticle',
              publicationTitle: 'Test Journal',
              DOI: '10.1000/test'
            }
          }
        ])
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      const client = new ZoteroClient('test-key', 'user123');
      const items = await client.getItems();

      expect(items).toHaveLength(1);
      expect(items[0].title).toBe('Test Paper');
      expect(items[0].authors).toEqual(['John Doe']);
      expect(items[0].year).toBe(2023);
      expect(items[0].doi).toBe('10.1000/test');
    });

    it('should handle API errors gracefully', async () => {
      const mockResponse = {
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        text: () => Promise.resolve('Invalid API key')
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      const client = new ZoteroClient('invalid-key', 'user123');
      
      await expect(client.getItems()).rejects.toThrow('Zotero API Error (403): Invalid API key');
    });

    it('should create new item in Zotero library', async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve([
          {
            key: 'NEWITEM123',
            data: { title: 'New Paper' }
          }
        ])
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      const client = new ZoteroClient('test-key', 'user123');
      const newItem = {
        title: 'New Paper',
        authors: ['Jane Smith'],
        year: 2024,
        source: 'Academic Workflow',
        itemType: 'journalArticle'
      };

      const result = await client.createItem(newItem);
      
      expect(result.key).toBe('NEWITEM123');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('https://api.zotero.org/users/user123/items'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Zotero-API-Key': 'test-key',
            'Content-Type': 'application/json'
          })
        })
      );
    });

    it('should export items to BibTeX format', () => {
      const items = [
        {
          key: 'ITEM1',
          title: 'Test Paper',
          authors: ['John Doe'],
          year: 2023,
          source: 'Test Journal',
          doi: '10.1000/test',
          itemType: 'journalArticle'
        }
      ];

      const client = new ZoteroClient('test-key', 'user123');
      const bibtex = client.exportToBibTeX(items);

      expect(bibtex).toContain('@article{doe2023');
      expect(bibtex).toContain('title={Test Paper}');
      expect(bibtex).toContain('author={John Doe}');
      expect(bibtex).toContain('year={2023}');
      expect(bibtex).toContain('doi={10.1000/test}');
    });

    it('should handle rate limiting with backoff', async () => {
      let callCount = 0;
      (global.fetch as any).mockImplementation(() => {
        callCount++;
        if (callCount <= 2) {
          return Promise.resolve({
            ok: false,
            status: 429,
            statusText: 'Too Many Requests',
            headers: { get: () => '1' } // Short retry delay for testing
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([])
        });
      });

      const client = new ZoteroClient('test-key', 'user123');
      const items = await client.getItems();

      expect(callCount).toBe(3);
      expect(items).toEqual([]);
    }, 10000);
  });

  describe('ZoteroAPISync', () => {
    it('should sync references bidirectionally', async () => {
      const mockZoteroItems = [
        {
          key: 'ZOTERO1',
          title: 'Existing Paper',
          authors: ['Alice Smith'],
          year: 2022,
          source: 'Journal 1',
          itemType: 'journalArticle'
        }
      ];

      const mockAppReferences = [
        {
          title: 'New Paper',
          authors: ['Bob Jones'],
          year: 2024,
          source: 'Academic Workflow',
          citation: '(Jones, 2024)'
        }
      ];

      const mockClient = {
        getItems: vi.fn().mockResolvedValue(mockZoteroItems),
        createItem: vi.fn().mockResolvedValue({ key: 'NEWZOTERO1' }),
        isConfigured: vi.fn().mockReturnValue(true),
        convertToAppFormat: vi.fn((item) => ({
          id: item.key,
          title: item.title,
          authors: item.authors,
          year: item.year,
          source: 'Zotero',
          citation: `(${item.authors[0]?.split(' ').pop()}, ${item.year})`
        }))
      };

      const sync = new ZoteroAPISync(mockClient as any);
      const result = await sync.syncReferences(mockAppReferences);

      expect(result.imported).toHaveLength(1);
      expect(result.exported).toHaveLength(1);
      expect(result.conflicts).toHaveLength(0);
      expect(mockClient.createItem).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'New Paper',
          authors: ['Bob Jones']
        })
      );
    });

    it('should detect and handle conflicts', async () => {
      const mockZoteroItems = [
        {
          key: 'ZOTERO1',
          title: 'Conflicting Paper',
          authors: ['John Doe'],
          year: 2023,
          source: 'Journal A',
          itemType: 'journalArticle'
        }
      ];

      const mockAppReferences = [
        {
          title: 'Conflicting Paper',
          authors: ['John Doe'],
          year: 2023,
          source: 'Journal B', // Different source
          citation: '(Doe, 2023)'
        }
      ];

      const mockClient = {
        getItems: vi.fn().mockResolvedValue(mockZoteroItems),
        createItem: vi.fn(),
        isConfigured: vi.fn().mockReturnValue(true),
        convertToAppFormat: vi.fn((item) => ({
          id: item.key,
          title: item.title,
          authors: item.authors,
          year: item.year,
          source: 'Zotero',
          citation: `(${item.authors[0]?.split(' ').pop()}, ${item.year})`
        }))
      };

      const sync = new ZoteroAPISync(mockClient as any);
      const result = await sync.syncReferences(mockAppReferences);

      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0].reason).toBe('Different source');
      expect(mockClient.createItem).not.toHaveBeenCalled();
    });

    it('should handle offline mode gracefully', async () => {
      const mockClient = {
        getItems: vi.fn().mockRejectedValue(new Error('Network error')),
        createItem: vi.fn(),
        isConfigured: vi.fn().mockReturnValue(true)
      };

      const sync = new ZoteroAPISync(mockClient as any);
      const result = await sync.syncReferences([]);

      expect(result.error).toBe('Network error - operating in offline mode');
      expect(result.imported).toHaveLength(0);
      expect(result.exported).toHaveLength(0);
    });

    it('should validate reference metadata before sync', () => {
      const invalidReferences = [
        { title: '', authors: [], year: 0 }, // Invalid
        { title: 'Valid Paper', authors: ['John Doe'], year: 2023 } // Valid
      ];

      const mockClient = {
        isConfigured: vi.fn().mockReturnValue(true)
      };

      const sync = new ZoteroAPISync(mockClient as any);
      const validRefs = sync.validateReferences(invalidReferences);

      expect(validRefs).toHaveLength(1);
      expect(validRefs[0].title).toBe('Valid Paper');
    });
  });

  describe('Integration with Academic Workflow', () => {
    it('should convert Zotero items to app reference format', () => {
      const zoteroItem = {
        key: 'ZOTERO123',
        title: 'Research Paper',
        authors: ['Dr. Jane Smith', 'Prof. John Doe'],
        year: 2023,
        source: 'Nature',
        doi: '10.1038/nature12345',
        itemType: 'journalArticle'
      };

      const mockClient = new ZoteroClient('test-key', 'user123');
      const appReference = mockClient.convertToAppFormat(zoteroItem);

      expect(appReference).toEqual({
        id: 'ZOTERO123',
        title: 'Research Paper',
        authors: ['Dr. Jane Smith', 'Prof. John Doe'],
        year: 2023,
        source: 'Zotero',
        citation: '(Smith & Doe, 2023)',
        doi: '10.1038/nature12345'
      });
    });

    it('should convert app references to Zotero format', () => {
      const appReference = {
        title: 'App Generated Paper',
        authors: ['AI Assistant'],
        year: 2024,
        source: 'Academic Workflow',
        citation: '(Assistant, 2024)'
      };

      const mockClient = new ZoteroClient('test-key', 'user123');
      const zoteroFormat = mockClient.convertFromAppFormat(appReference);

      expect(zoteroFormat).toEqual({
        itemType: 'journalArticle',
        title: 'App Generated Paper',
        creators: [{ firstName: 'AI', lastName: 'Assistant', creatorType: 'author' }],
        date: '2024',
        publicationTitle: 'Academic Workflow',
        DOI: '',
        url: '',
        abstractNote: '',
        extra: 'Generated by Academic Workflow application'
      });
    });
  });
});