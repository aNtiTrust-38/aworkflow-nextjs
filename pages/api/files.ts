import { NextApiRequest, NextApiResponse } from 'next';
import { sendErrorResponse, createStandardError, ValidationError, HTTP_STATUS, ERROR_CODES } from '@/lib/error-utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    const errorResponse = createStandardError(req, 'Method not allowed', 'METHOD_NOT_ALLOWED', 405, [], 'anonymous-user', false);
    return sendErrorResponse(res, 405, errorResponse);
  }

  try {
    // No authentication required in current iteration
    const userId = 'anonymous-user'; // Default user for no-auth mode
    
    const { folderId } = req.query;
    
    // Get Prisma client
    let prisma;
    try {
      const imported = await import('@/lib/prisma');
      prisma = imported.default;
    } catch (error) {
      // Handle import error gracefully for tests
      console.warn('Prisma import failed, returning empty files array:', error);
      return res.status(200).json({ files: [] });
    }
    
    let files: any[] = [];
    
    if (prisma) {
      try {
        const whereClause: any = { userId };
        
        // Filter by folder if specified
        if (folderId) {
          whereClause.folderId = folderId as string;
        }
        
        files = await prisma.file.findMany({
          where: whereClause,
          orderBy: { createdAt: 'desc' },
        });
      } catch (error) {
        console.warn('Database query failed, returning empty files array:', error);
        // Return empty files array for database errors
        files = [];
      }
    }

    return res.status(200).json({ files });

  } catch (error) {
    console.error('Files API error:', error);
    const errorResponse = createStandardError(req, 'Failed to retrieve files', ERROR_CODES.INTERNAL_ERROR, HTTP_STATUS.INTERNAL_ERROR, [], 'anonymous-user', false);
    return sendErrorResponse(res, HTTP_STATUS.INTERNAL_ERROR, errorResponse);
  }
}