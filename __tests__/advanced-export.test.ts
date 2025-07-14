import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExportTemplateManager } from '../lib/export/template-manager';
import { PDFExporter } from '../lib/export/pdf-exporter';
import { WordExporter } from '../lib/export/word-exporter';
import { ZoteroExporter } from '../lib/export/zotero-exporter';

// Mock file operations
vi.mock('fs/promises', () => ({
  writeFile: vi.fn().mockResolvedValue(undefined),
  readFile: vi.fn().mockResolvedValue('{}'),
  mkdir: vi.fn().mockResolvedValue(undefined)
}));

describe('Advanced Export Features', () => {
  let templateManager: ExportTemplateManager;

  beforeEach(() => {
    vi.clearAllMocks();
    templateManager = new ExportTemplateManager();
  });

  describe('Custom Export Templates', () => {
    it('should create a custom template with metadata', () => {
      const template = templateManager.createTemplate({
        id: 'apa-research-paper',
        name: 'APA Research Paper',
        description: 'Standard APA format for academic research papers',
        format: 'pdf',
        settings: {
          fontSize: 12,
          fontFamily: 'Times New Roman',
          margins: { top: 1, bottom: 1, left: 1, right: 1 },
          spacing: 'double',
          citationStyle: 'APA',
          includePageNumbers: true,
          includeCoverPage: true,
          includeReferences: true,
          includeAppendices: false
        },
        sections: [
          { id: 'cover', name: 'Cover Page', required: true, template: 'apa-cover' },
          { id: 'abstract', name: 'Abstract', required: false, template: 'apa-abstract' },
          { id: 'content', name: 'Main Content', required: true, template: 'apa-body' },
          { id: 'references', name: 'References', required: true, template: 'apa-references' }
        ]
      });

      expect(template.id).toBe('apa-research-paper');
      expect(template.sections).toHaveLength(4);
      expect(template.settings.citationStyle).toBe('APA');
    });

    it('should validate template configuration', () => {
      expect(() => {
        templateManager.createTemplate({
          id: '',
          name: 'Invalid Template',
          format: 'pdf',
          sections: []
        });
      }).toThrow('Template ID is required');

      expect(() => {
        templateManager.createTemplate({
          id: 'valid-id',
          name: '',
          format: 'pdf',
          sections: []
        });
      }).toThrow('Template name is required');
    });

    it('should support multiple export formats', () => {
      const pdfTemplate = templateManager.createTemplate({
        id: 'pdf-template',
        name: 'PDF Template',
        format: 'pdf',
        sections: [{ id: 'content', name: 'Content', required: true }]
      });

      const wordTemplate = templateManager.createTemplate({
        id: 'word-template',
        name: 'Word Template',
        format: 'docx',
        sections: [{ id: 'content', name: 'Content', required: true }]
      });

      expect(pdfTemplate.format).toBe('pdf');
      expect(wordTemplate.format).toBe('docx');
    });

    it('should manage template library', () => {
      const template1 = templateManager.createTemplate({
        id: 'template-1',
        name: 'Template 1',
        format: 'pdf',
        sections: []
      });

      const template2 = templateManager.createTemplate({
        id: 'template-2',
        name: 'Template 2',
        format: 'docx',
        sections: []
      });

      const templates = templateManager.getTemplates();
      expect(templates).toHaveLength(2);
      expect(templates[0].id).toBe('template-1');
      expect(templates[1].id).toBe('template-2');

      const retrieved = templateManager.getTemplate('template-1');
      expect(retrieved?.name).toBe('Template 1');
    });

    it('should clone and modify templates', () => {
      const original = templateManager.createTemplate({
        id: 'original',
        name: 'Original Template',
        format: 'pdf',
        settings: { fontSize: 12 },
        sections: []
      });

      const cloned = templateManager.cloneTemplate('original', {
        id: 'modified',
        name: 'Modified Template',
        settings: { fontSize: 14 }
      });

      expect(cloned?.id).toBe('modified');
      expect(cloned?.name).toBe('Modified Template');
      expect(cloned?.settings.fontSize).toBe(14);
      expect(original.settings.fontSize).toBe(12); // Original unchanged
    });
  });

  describe('Enhanced PDF Export', () => {
    let pdfExporter: PDFExporter;

    beforeEach(() => {
      pdfExporter = new PDFExporter();
    });

    it('should export with custom styling', async () => {
      const mockData = {
        title: 'Research Paper',
        content: 'This is the main content.',
        citations: [
          { id: '1', text: 'Smith, J. (2023). Research methods.' }
        ]
      };

      const template = {
        id: 'custom-pdf',
        format: 'pdf' as const,
        settings: {
          fontSize: 11,
          fontFamily: 'Helvetica',
          margins: { top: 1.2, bottom: 1.2, left: 1, right: 1 },
          spacing: 'single' as 'single' | 'double' | number,
          includePageNumbers: true,
          headerText: 'Research Paper - {title}',
          footerText: 'Page {page} of {totalPages}'
        }
      };

      const result = await pdfExporter.export(mockData, template);

      expect(result.format).toBe('pdf');
      expect(result.filename).toMatch(/\.pdf$/);
      expect(result.size).toBeGreaterThan(0);
      expect(result.metadata.pageCount).toBeGreaterThan(0);
    });

    it('should handle complex document structure', async () => {
      const complexData = {
        title: 'Complex Research Paper',
        subtitle: 'A Comprehensive Study',
        author: 'John Doe',
        content: 'This is a comprehensive research paper examining various aspects of the subject matter.',
        sections: [
          {
            title: 'Introduction',
            content: 'This section introduces the topic.',
            subsections: [
              { title: 'Background', content: 'Background information.' },
              { title: 'Problem Statement', content: 'The problem statement.' }
            ]
          },
          {
            title: 'Methodology',
            content: 'This section describes the methodology.',
            figures: [
              { caption: 'Figure 1: Research Flow', url: 'data:image/png;base64,iVBOR...' }
            ]
          }
        ],
        appendices: [
          { title: 'Appendix A', content: 'Additional data.' }
        ]
      };

      const template = {
        id: 'complex-pdf',
        format: 'pdf' as const,
        settings: {
          includeTableOfContents: true,
          includeFiguresList: true,
          numberSections: true,
          numberSubsections: true
        }
      };

      const result = await pdfExporter.export(complexData, template);

      expect(result.metadata.sections).toBe(2);
      expect(result.metadata.subsections).toBe(2);
      expect(result.metadata.figures).toBe(1);
      expect(result.metadata.appendices).toBe(1);
    });

    it('should generate proper citations and bibliography', async () => {
      const dataWithCitations = {
        title: 'Citation Test',
        content: 'According to Smith (2023), research shows that [cite:smith2023]. Additionally, Jones et al. (2022) found [cite:jones2022].',
        bibliography: [
          {
            id: 'smith2023',
            type: 'article' as 'article' | 'book' | 'website' | 'report',
            title: 'Research Methods in Modern Science',
            author: 'Smith, J.',
            year: '2023',
            journal: 'Science Journal',
            volume: '45',
            pages: '123-145'
          },
          {
            id: 'jones2022',
            type: 'book' as 'article' | 'book' | 'website' | 'report',
            title: 'Advanced Research Techniques',
            author: 'Jones, A., Brown, B., & Wilson, C.',
            year: '2022',
            publisher: 'Academic Press',
            location: 'New York'
          }
        ]
      };

      const template = {
        id: 'citation-pdf',
        format: 'pdf' as const,
        settings: {
          citationStyle: 'APA',
          includeReferences: true,
          inTextCitations: true
        }
      };

      const result = await pdfExporter.export(dataWithCitations, template);

      expect(result.metadata.citations).toBe(2);
      expect(result.metadata.bibliographyEntries).toBe(2);
    });
  });

  describe('Enhanced Word Export', () => {
    let wordExporter: WordExporter;

    beforeEach(() => {
      wordExporter = new WordExporter();
    });

    it('should export with track changes enabled', async () => {
      const mockData = {
        title: 'Word Document',
        content: 'This is content with changes.',
        revisions: [
          { type: 'insert' as 'insert' | 'delete' | 'format', text: 'new text', author: 'John Doe', timestamp: Date.now() },
          { type: 'delete' as 'insert' | 'delete' | 'format', text: 'old text', author: 'Jane Smith', timestamp: Date.now() - 1000 }
        ]
      };

      const template = {
        id: 'tracked-word',
        format: 'docx' as const,
        settings: {
          trackChanges: true,
          showComments: true,
          acceptAllChanges: false
        }
      };

      const result = await wordExporter.export(mockData, template);

      expect(result.format).toBe('docx');
      expect(result.metadata.hasTrackChanges).toBe(true);
      expect(result.metadata.revisions).toBe(2);
    });

    it('should support custom styles and formatting', async () => {
      const styledData = {
        title: 'Styled Document',
        content: 'This document has custom styling.',
        styles: {
          heading1: { fontSize: 16, bold: true, color: '333333' },
          heading2: { fontSize: 14, bold: true, color: '666666' },
          body: { fontSize: 12, fontFamily: 'Calibri', lineSpacing: 1.5 }
        }
      };

      const template = {
        id: 'styled-word',
        format: 'docx' as const,
        settings: {
          customStyles: true,
          styleDefinitions: styledData.styles
        }
      };

      const result = await wordExporter.export(styledData, template);

      expect(result.metadata.customStyles).toBe(true);
      expect(result.metadata.styleCount).toBe(3);
    });

    it('should handle tables and figures', async () => {
      const dataWithElements = {
        title: 'Document with Elements',
        content: 'This document contains tables and figures.',
        tables: [
          {
            caption: 'Table 1: Research Results',
            headers: ['Category', 'Value', 'Percentage'],
            rows: [
              ['A', '10', '25%'],
              ['B', '15', '37.5%'],
              ['C', '15', '37.5%']
            ]
          }
        ],
        figures: [
          {
            caption: 'Figure 1: Data Visualization',
            src: 'data:image/png;base64,iVBOR...',
            width: 400,
            height: 300
          }
        ]
      };

      const template = {
        id: 'elements-word',
        format: 'docx' as const,
        settings: {
          includeTableCaptions: true,
          includeFigureCaptions: true,
          numberTables: true,
          numberFigures: true
        }
      };

      const result = await wordExporter.export(dataWithElements, template);

      expect(result.metadata.tables).toBe(1);
      expect(result.metadata.figures).toBe(1);
    });
  });

  describe('Enhanced Zotero Integration', () => {
    let zoteroExporter: ZoteroExporter;

    beforeEach(() => {
      zoteroExporter = new ZoteroExporter({
        apiKey: 'test-api-key',
        userId: 'test-user-id'
      });
    });

    it('should export to custom Zotero collection', async () => {
      const mockData = {
        title: 'Research Project',
        bibliography: [
          {
            id: 'ref1',
            type: 'article' as 'article' | 'book' | 'website' | 'report' | 'thesis' | 'conference',
            title: 'Important Research',
            author: 'Smith, J.',
            year: '2023'
          }
        ]
      };

      const exportOptions = {
        collectionName: 'My Research Project',
        createNewCollection: true,
        tagItems: ['research', 'important'],
        includeNotes: true
      };

      const result = await zoteroExporter.exportToCollection(mockData, exportOptions);

      expect(result.collectionId).toBeDefined();
      expect(result.itemsCreated).toBe(1);
      expect(result.success).toBe(true);
    });

    it('should handle bulk import with deduplication', async () => {
      const bulkData = {
        items: [
          { type: 'article' as 'article' | 'book' | 'website' | 'report' | 'thesis' | 'conference', title: 'Article 1', author: 'Author 1' },
          { type: 'book' as 'article' | 'book' | 'website' | 'report' | 'thesis' | 'conference', title: 'Book 1', author: 'Author 2' },
          { type: 'article' as 'article' | 'book' | 'website' | 'report' | 'thesis' | 'conference', title: 'Article 1', author: 'Author 1' } // Duplicate
        ]
      };

      const importOptions = {
        deduplicateItems: true,
        mergeStrategy: 'skip' as const,
        batchSize: 10
      };

      const result = await zoteroExporter.bulkImport(bulkData, importOptions);

      expect(result.itemsProcessed).toBe(3);
      expect(result.itemsCreated).toBe(2); // One duplicate skipped
      expect(result.duplicatesFound).toBe(1);
    });

    it('should sync with existing Zotero library', async () => {
      const syncOptions = {
        direction: 'bidirectional' as const,
        conflictResolution: 'manual' as const,
        includeAttachments: true,
        includeNotes: true
      };

      const result = await zoteroExporter.sync(syncOptions);

      expect(result.itemsSynced).toBeGreaterThanOrEqual(0);
      expect(result.conflicts).toBeDefined();
      expect(result.success).toBe(true);
    });

    it('should export with custom metadata fields', async () => {
      const itemWithMetadata = {
        type: 'article' as 'article' | 'book' | 'website' | 'report' | 'thesis' | 'conference',
        title: 'Custom Metadata Test',
        author: 'Test Author',
        customFields: {
          projectPhase: 'Phase 4',
          priority: 'high',
          keywords: ['AI', 'export', 'automation']
        }
      };

      const result = await zoteroExporter.exportItem(itemWithMetadata, {
        includeCustomFields: true,
        mapCustomFields: {
          projectPhase: 'extra',
          priority: 'tags',
          keywords: 'tags'
        }
      });

      expect(result.itemId).toBeDefined();
      expect(result.customFieldsMapped).toBe(3);
    });
  });

  describe('Export Workflow Integration', () => {
    it('should execute multi-format export workflow', async () => {
      const workflowData = {
        title: 'Research Paper',
        content: 'Main content',
        citations: []
      };

      const workflow = templateManager.createExportWorkflow({
        id: 'multi-format-export',
        name: 'Multi-Format Export',
        steps: [
          { format: 'pdf', template: 'apa-research-paper', enabled: true },
          { format: 'docx', template: 'word-standard', enabled: true },
          { format: 'zotero', template: 'zotero-standard', collection: 'Research Collection', enabled: false }
        ],
        outputDirectory: './exports',
        filenamePattern: '{title}_{format}_{timestamp}'
      });

      const results = await templateManager.executeWorkflow(workflow, workflowData);

      expect(results.completed).toBe(2); // PDF and DOCX enabled
      expect(results.skipped).toBe(1); // Zotero disabled
      expect(results.files).toHaveLength(2);
      expect(results.errors).toHaveLength(0);
    });

    it('should handle export queue and batching', async () => {
      const exportQueue = templateManager.createExportQueue({
        maxConcurrent: 2,
        retryAttempts: 3,
        retryDelay: 1000
      });

      const jobs = [
        { id: 'job1', data: { title: 'Document 1' }, template: 'template1' },
        { id: 'job2', data: { title: 'Document 2' }, template: 'template2' },
        { id: 'job3', data: { title: 'Document 3' }, template: 'template3' }
      ];

      jobs.forEach(job => exportQueue.add(job));

      const results = await exportQueue.process();

      expect(results.completed).toBe(3);
      expect(results.failed).toBe(0);
      expect(results.processingTime).toBeGreaterThan(0);
    });

    it('should provide export progress tracking', async () => {
      const progressCallback = vi.fn();
      
      const exportTask = templateManager.createExportTask({
        data: { title: 'Progress Test' },
        template: 'pdf-template',
        onProgress: progressCallback
      });

      await exportTask.execute();

      expect(progressCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          stage: expect.any(String),
          progress: expect.any(Number),
          message: expect.any(String)
        })
      );

      // Verify progress was reported at different stages
      const calls = progressCallback.mock.calls;
      expect(calls.length).toBeGreaterThan(1);
      expect(calls[0][0].progress).toBeLessThan(calls[calls.length - 1][0].progress);
    });
  });
});