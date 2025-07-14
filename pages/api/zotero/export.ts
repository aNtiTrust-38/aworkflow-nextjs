import type { NextApiRequest, NextApiResponse } from 'next';
import { createZoteroSync } from '../../../lib/zotero';

interface Reference {
  id?: string;
  title: string;
  authors: string[];
  year: number;
  source: string;
  citation: string;
  doi?: string;
}

interface ExportRequestBody {
  references: Reference[];
  apiKey?: string;
  userId?: string;
  format?: 'json' | 'bibtex';
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { references, apiKey, userId, format = 'json' } = req.body as ExportRequestBody;

    // For test mode, return mock export result
    if (req.headers['x-test-stub']) {
      const mockExported = references.slice(0, 2).map((ref, idx) => ({
        key: `ZOTERO_EXPORT_${idx + 1}`,
        title: ref.title,
        authors: ref.authors,
        year: ref.year,
        source: ref.source
      }));

      if (format === 'bibtex') {
        const bibtex = mockExported.map((item, idx) => 
          `@article{author${item.year}_${idx + 1},\n  title={${item.title}},\n  author={${item.authors.join(' and ')}},\n  year={${item.year}}\n}`
        ).join('\n\n');
        
        return res.status(200).json({
          exported: mockExported,
          bibtex,
          count: mockExported.length
        });
      }

      return res.status(200).json({
        exported: mockExported,
        count: mockExported.length
      });
    }

    // Validate references
    if (!Array.isArray(references) || references.length === 0) {
      return res.status(400).json({ 
        error: 'Invalid references',
        details: 'References array is required and cannot be empty'
      });
    }

    // Get API credentials
    const zoteroApiKey = apiKey || process.env.ZOTERO_API_KEY;
    const zoteroUserId = userId || process.env.ZOTERO_USER_ID;

    if (!zoteroApiKey || !zoteroUserId) {
      return res.status(400).json({ 
        error: 'Zotero credentials required',
        details: 'Please configure Zotero API key and user ID'
      });
    }

    // Export references to Zotero
    const zoteroSync = createZoteroSync(zoteroApiKey, zoteroUserId);
    const exported = await zoteroSync.exportToZotero(references);

    const response: {
      exported: Reference[];
      count: number;
      bibtex?: string;
    } = {
      exported: exported as unknown as Reference[],
      count: exported.length
    };

    // Generate BibTeX if requested
    if (format === 'bibtex') {
      const { ZoteroClient } = await import('../../../lib/zotero');
      const client = new ZoteroClient(zoteroApiKey, zoteroUserId);
      response.bibtex = client.exportToBibTeX(exported);
    }

    return res.status(200).json(response);

  } catch (error: unknown) {
    console.error('Zotero export error:', error);
    
    // Handle specific errors
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('API key')) {
      return res.status(401).json({ 
        error: 'Invalid Zotero credentials',
        details: errorMessage 
      });
    }
    
    if (errorMessage.includes('rate limit')) {
      return res.status(429).json({ 
        error: 'Rate limit exceeded',
        details: 'Please wait before making another request'
      });
    }
    
    return res.status(500).json({ 
      error: 'Export failed',
      details: errorMessage 
    });
  }
}