import type { NextApiRequest, NextApiResponse } from 'next';
import { createZoteroSync } from '../../../lib/zotero';

interface ImportRequestBody {
  apiKey?: string;
  userId?: string;
  limit?: number;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { apiKey, userId, limit = 100 } = req.body as ImportRequestBody;

    // For test mode, return mock imported references
    if (req.headers['x-test-stub']) {
      return res.status(200).json({
        references: [
          {
            id: 'ZOTERO001',
            title: 'Sample Academic Paper',
            authors: ['Dr. Jane Smith', 'Prof. John Doe'],
            year: 2023,
            source: 'Zotero',
            citation: '(Smith & Doe, 2023)',
            doi: '10.1000/sample'
          },
          {
            id: 'ZOTERO002', 
            title: 'Another Research Study',
            authors: ['Dr. Alice Johnson'],
            year: 2022,
            source: 'Zotero',
            citation: '(Johnson, 2022)'
          }
        ],
        count: 2,
        hasMore: false
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

    // Validate limit
    if (typeof limit !== 'number' || limit < 1 || limit > 500) {
      return res.status(400).json({ 
        error: 'Invalid limit',
        details: 'Limit must be between 1 and 500'
      });
    }

    // Import references from Zotero
    const zoteroSync = createZoteroSync(zoteroApiKey, zoteroUserId);
    const references = await zoteroSync.importFromZotero();

    // Apply limit if specified
    const limitedReferences = references.slice(0, limit);
    const hasMore = references.length > limit;

    return res.status(200).json({
      references: limitedReferences,
      count: limitedReferences.length,
      totalCount: references.length,
      hasMore
    });

  } catch (error: any) {
    console.error('Zotero import error:', error);
    
    // Handle specific errors
    if (error.message?.includes('API key')) {
      return res.status(401).json({ 
        error: 'Invalid Zotero credentials',
        details: error.message 
      });
    }
    
    if (error.message?.includes('rate limit')) {
      return res.status(429).json({ 
        error: 'Rate limit exceeded',
        details: 'Please wait before making another request'
      });
    }
    
    return res.status(500).json({ 
      error: 'Import failed',
      details: error.message 
    });
  }
}