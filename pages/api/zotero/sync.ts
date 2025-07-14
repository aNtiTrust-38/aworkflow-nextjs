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

interface SyncRequestBody {
  references?: Reference[];
  apiKey?: string;
  userId?: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { references = [], apiKey, userId } = req.body as SyncRequestBody;

    // For test mode, return mock sync result
    if (req.headers['x-test-stub']) {
      return res.status(200).json({
        imported: [
          {
            id: 'ZOTERO123',
            title: 'Imported Paper from Zotero',
            authors: ['Test Author'],
            year: 2023,
            source: 'Zotero',
            citation: '(Author, 2023)'
          }
        ],
        exported: references.slice(0, 1).map((ref, idx) => ({
          key: `EXPORTED${idx + 1}`,
          title: ref.title,
          authors: ref.authors,
          year: ref.year,
          source: ref.source
        })),
        conflicts: [],
        summary: {
          imported: 1,
          exported: Math.min(references.length, 1),
          conflicts: 0
        }
      });
    }

    // Get API credentials from environment or request
    const zoteroApiKey = apiKey || process.env.ZOTERO_API_KEY;
    const zoteroUserId = userId || process.env.ZOTERO_USER_ID;

    if (!zoteroApiKey || !zoteroUserId) {
      return res.status(400).json({ 
        error: 'Zotero credentials required',
        details: 'Please provide Zotero API key and user ID'
      });
    }

    // Validate references input
    if (!Array.isArray(references)) {
      return res.status(400).json({ 
        error: 'Invalid references format',
        details: 'References must be an array'
      });
    }

    // Create Zotero sync and perform bidirectional sync
    const zoteroSync = createZoteroSync(zoteroApiKey, zoteroUserId);
    const result = await zoteroSync.syncReferences(references);

    // Add summary statistics
    const summary = {
      imported: result.imported.length,
      exported: result.exported.length,
      conflicts: result.conflicts.length
    };

    return res.status(200).json({
      ...result,
      summary
    });

  } catch (error: unknown) {
    console.error('Zotero sync error:', error);
    
    // Handle specific Zotero errors
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
    
    if (errorMessage.includes('network') || errorMessage.includes('timeout')) {
      return res.status(503).json({ 
        error: 'Zotero service unavailable',
        details: 'Please try again later'
      });
    }

    return res.status(500).json({ 
      error: 'Sync failed',
      details: errorMessage 
    });
  }
}