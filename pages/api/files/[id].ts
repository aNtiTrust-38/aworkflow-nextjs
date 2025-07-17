import { NextApiRequest, NextApiResponse } from 'next';
import { sendErrorResponse, createStandardError, ERROR_CODES, HTTP_STATUS } from '@/lib/error-utils';
import { promises as fs } from 'fs';
import path from 'path';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  
  if (!id || typeof id !== 'string') {
    const errorResponse = createStandardError(req, 'File ID is required', ERROR_CODES.VALIDATION_ERROR, HTTP_STATUS.BAD_REQUEST, [], 'anonymous-user', false);
    return sendErrorResponse(res, HTTP_STATUS.BAD_REQUEST, errorResponse);
  }

  switch (req.method) {
    case 'GET':
      return handleGetFile(req, res, id);
    case 'DELETE':
      return handleDeleteFile(req, res, id);
    default:
      const errorResponse = createStandardError(req, 'Method not allowed', 'METHOD_NOT_ALLOWED', 405, [], 'anonymous-user', false);
      return sendErrorResponse(res, 405, errorResponse);
  }
}

async function handleGetFile(req: NextApiRequest, res: NextApiResponse, fileId: string) {
  try {
    // No authentication required in current iteration
    const userId = 'anonymous-user';
    
    // Get Prisma client
    let prisma;
    try {
      const imported = await import('@/lib/prisma');
      prisma = imported.default;
    } catch (error) {
      console.warn('Prisma import failed:', error);
      const errorResponse = createStandardError(req, 'File not found', ERROR_CODES.NOT_FOUND, HTTP_STATUS.NOT_FOUND, [], userId, false);
      return sendErrorResponse(res, HTTP_STATUS.NOT_FOUND, errorResponse);
    }
    
    if (!prisma) {
      const errorResponse = createStandardError(req, 'File not found', ERROR_CODES.NOT_FOUND, HTTP_STATUS.NOT_FOUND, [], userId, false);
      return sendErrorResponse(res, HTTP_STATUS.NOT_FOUND, errorResponse);
    }
    
    // Find file
    const file = await prisma.file.findUnique({
      where: { 
        id: fileId,
        userId // Ensure user owns the file
      },
    });

    if (!file) {
      const errorResponse = createStandardError(req, 'File not found', ERROR_CODES.NOT_FOUND, HTTP_STATUS.NOT_FOUND, [], userId, false);
      return sendErrorResponse(res, HTTP_STATUS.NOT_FOUND, errorResponse);
    }

    return res.status(200).json(file);

  } catch (error) {
    console.error('Get file error:', error);
    const errorResponse = createStandardError(req, 'Failed to retrieve file', ERROR_CODES.INTERNAL_ERROR, HTTP_STATUS.INTERNAL_ERROR, [], 'anonymous-user', false);
    return sendErrorResponse(res, HTTP_STATUS.INTERNAL_ERROR, errorResponse);
  }
}

async function handleDeleteFile(req: NextApiRequest, res: NextApiResponse, fileId: string) {
  try {
    // No authentication required in current iteration
    const userId = 'anonymous-user';
    
    // Get Prisma client
    let prisma;
    try {
      const imported = await import('@/lib/prisma');
      prisma = imported.default;
    } catch (error) {
      console.warn('Prisma import failed:', error);
      const errorResponse = createStandardError(req, 'File not found', ERROR_CODES.NOT_FOUND, HTTP_STATUS.NOT_FOUND, [], userId, false);
      return sendErrorResponse(res, HTTP_STATUS.NOT_FOUND, errorResponse);
    }
    
    if (!prisma) {
      const errorResponse = createStandardError(req, 'File not found', ERROR_CODES.NOT_FOUND, HTTP_STATUS.NOT_FOUND, [], userId, false);
      return sendErrorResponse(res, HTTP_STATUS.NOT_FOUND, errorResponse);
    }
    
    // Find file first to get path for file system cleanup
    const file = await prisma.file.findUnique({
      where: { 
        id: fileId,
        userId // Ensure user owns the file
      },
    });

    if (!file) {
      const errorResponse = createStandardError(req, 'File not found', ERROR_CODES.NOT_FOUND, HTTP_STATUS.NOT_FOUND, [], userId, false);
      return sendErrorResponse(res, HTTP_STATUS.NOT_FOUND, errorResponse);
    }

    // Delete from database
    await prisma.file.delete({
      where: { id: fileId },
    });

    // Delete physical file
    try {
      const fullPath = path.join(process.cwd(), 'public', file.path);
      await fs.unlink(fullPath);
    } catch (error) {
      console.warn('Failed to delete physical file:', error);
      // Continue anyway - database record is deleted
    }

    return res.status(200).json({ success: true, message: 'File deleted successfully' });

  } catch (error) {
    console.error('Delete file error:', error);
    const errorResponse = createStandardError(req, 'Failed to delete file', ERROR_CODES.INTERNAL_ERROR, HTTP_STATUS.INTERNAL_ERROR, [], 'anonymous-user', false);
    return sendErrorResponse(res, HTTP_STATUS.INTERNAL_ERROR, errorResponse);
  }
}