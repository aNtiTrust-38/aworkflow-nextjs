import { NextApiRequest, NextApiResponse } from 'next';
import { handleApiError, sendErrorResponse, createStandardError, sendValidationError, ValidationError, HTTP_STATUS, ERROR_CODES } from '@/lib/error-utils';

// Helper function to validate folder name
function validateFolderName(name: string): string | null {
  if (!name || name.trim().length === 0) {
    return 'Folder name is required';
  }
  
  if (name.length > 255) {
    return 'Folder name must be less than 255 characters';
  }
  
  // Check for invalid characters
  const invalidChars = /[<>:"/\\|?*]/;
  if (invalidChars.test(name)) {
    return 'Folder name contains invalid characters';
  }
  
  return null;
}

// Helper function to generate safe path from folder name
function generateSafePath(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-')         // Replace spaces with hyphens
    .replace(/-+/g, '-')          // Replace multiple hyphens with single
    .replace(/^-|-$/g, '');       // Remove leading/trailing hyphens
}

// Helper function to build full path
async function buildFullPath(parentId: string | null, folderName: string): Promise<string> {
  if (!parentId) {
    return `/${generateSafePath(folderName)}`;
  }
  
  const { default: prisma } = await import('@/lib/prisma');
  const parentFolder = await prisma.folder.findUnique({
    where: { id: parentId },
    select: { path: true },
  });
  
  if (!parentFolder) {
    throw new Error('Parent folder not found');
  }
  
  return `${parentFolder.path}/${generateSafePath(folderName)}`;
}

// Helper function to check for circular references
async function checkCircularReference(folderId: string, targetParentId: string): Promise<boolean> {
  if (folderId === targetParentId) {
    return true;
  }
  
  const { default: prisma } = await import('@/lib/prisma');
  let currentParentId: string | null = targetParentId;
  while (currentParentId) {
    if (currentParentId === folderId) {
      return true;
    }
    
    const parent: { parentId: string | null } | null = await prisma.folder.findUnique({
      where: { id: currentParentId },
      select: { parentId: true },
    });
    
    if (!parent) break;
    currentParentId = parent.parentId;
  }
  
  return false;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  
  if (!id || typeof id !== 'string') {
    const errorResponse = createStandardError(req, 'Folder ID is required', ERROR_CODES.VALIDATION_ERROR, HTTP_STATUS.BAD_REQUEST, [], 'anonymous-user', false);
    return sendErrorResponse(res, HTTP_STATUS.BAD_REQUEST, errorResponse);
  }

  const userId = 'anonymous-user'; // Default user for no-auth mode

  try {
    switch (req.method) {
      case 'PUT':
        return handleUpdateFolder(req, res, id, userId);
      case 'DELETE':
        return handleDeleteFolder(req, res, id, userId);
      default:
        const errorResponse = createStandardError(req, 'Method not allowed', 'METHOD_NOT_ALLOWED', 405, [], userId, false);
        return sendErrorResponse(res, 405, errorResponse);
    }
  } catch (error) {
    return handleApiError(req, res, error, userId);
  }
}

async function handleUpdateFolder(req: NextApiRequest, res: NextApiResponse, folderId: string, userId: string) {
  try {
    const { name, parentId } = req.body;

    // Check if folder exists and user owns it
    const { default: prisma } = await import('@/lib/prisma');
    const existingFolder = await prisma.folder.findUnique({
      where: { id: folderId },
      select: { userId: true, name: true },
    });

    if (!existingFolder) {
      const errorResponse = createStandardError(req, 'Folder not found', ERROR_CODES.NOT_FOUND, HTTP_STATUS.NOT_FOUND, [], userId, false);
      return sendErrorResponse(res, HTTP_STATUS.NOT_FOUND, errorResponse);
    }

    if (existingFolder.userId !== userId) {
      const errorResponse = createStandardError(req, 'Access denied', ERROR_CODES.FORBIDDEN, HTTP_STATUS.FORBIDDEN, [], userId, false);
      return sendErrorResponse(res, HTTP_STATUS.FORBIDDEN, errorResponse);
    }

    // Validate name if provided
    if (name) {
      const nameError = validateFolderName(name);
      if (nameError) {
        const validationErrors: ValidationError[] = [{
          field: 'name',
          message: nameError,
          value: name
        }];
        return sendValidationError(req, res, validationErrors, userId);
      }
    }

    // Check for circular reference if moving folder
    if (parentId && parentId !== folderId) {
      const isCircular = await checkCircularReference(folderId, parentId);
      if (isCircular) {
        const validationErrors: ValidationError[] = [{
          field: 'parentId',
          message: 'Cannot create circular folder structure',
          value: parentId
        }];
        return sendValidationError(req, res, validationErrors, userId);
      }
    }

    // Prevent moving folder to itself
    if (parentId === folderId) {
      const validationErrors: ValidationError[] = [{
        field: 'parentId',
        message: 'Cannot move folder to itself',
        value: parentId
      }];
      return sendValidationError(req, res, validationErrors, userId);
    }

    // Build update data
    const updateData: any = {};
    
    if (name) {
      updateData.name = name.trim();
      updateData.path = await buildFullPath(parentId, name.trim());
    }
    
    if (parentId !== undefined) {
      updateData.parentId = parentId || null;
      if (!name) {
        // If only moving (not renaming), keep existing name
        updateData.path = await buildFullPath(parentId, existingFolder.name);
      }
    }

    // Update folder
    const folder = await prisma.folder.update({
      where: { id: folderId },
      data: updateData,
      include: {
        children: {
          include: {
            children: true,
            files: true,
          },
        },
        files: true,
      },
    });

    // Calculate file count recursively
    function calculateFileCount(folder: any): number {
      let count = folder.files?.length || 0;
      if (folder.children) {
        count += folder.children.reduce((sum: number, child: any) => sum + calculateFileCount(child), 0);
      }
      return count;
    }

    return res.status(200).json({
      ...folder,
      fileCount: calculateFileCount(folder),
    });
  } catch (error: any) {
    if (error.message === 'Parent folder not found') {
      const errorResponse = createStandardError(req, 'Parent folder not found', ERROR_CODES.NOT_FOUND, HTTP_STATUS.NOT_FOUND, undefined, userId);
      return sendErrorResponse(res, HTTP_STATUS.NOT_FOUND, errorResponse);
    }
    
    return handleApiError(req, res, error, userId);
  }
}

async function handleDeleteFolder(req: NextApiRequest, res: NextApiResponse, folderId: string, userId: string) {
  try {
    const { force } = req.query;

    // Check if folder exists and user owns it
    const { default: prisma } = await import('@/lib/prisma');
    const folder = await prisma.folder.findUnique({
      where: { id: folderId },
      include: {
        children: true,
        files: true,
      },
    });

    if (!folder) {
      const errorResponse = createStandardError(req, 'Folder not found', ERROR_CODES.NOT_FOUND, HTTP_STATUS.NOT_FOUND, [], userId, false);
      return sendErrorResponse(res, HTTP_STATUS.NOT_FOUND, errorResponse);
    }

    if (folder.userId !== userId) {
      const errorResponse = createStandardError(req, 'Access denied', ERROR_CODES.FORBIDDEN, HTTP_STATUS.FORBIDDEN, [], userId, false);
      return sendErrorResponse(res, HTTP_STATUS.FORBIDDEN, errorResponse);
    }

    // Check if folder has files or subfolders
    if (folder.files.length > 0 && force !== 'true') {
      const validationErrors: ValidationError[] = [{
        field: 'force',
        message: 'Cannot delete folder with files. Use force=true to delete with files.',
        value: { fileCount: folder.files.length }
      }];
      return sendValidationError(req, res, validationErrors, userId);
    }

    if (folder.children.length > 0 && force !== 'true') {
      const validationErrors: ValidationError[] = [{
        field: 'force',
        message: 'Cannot delete folder with subfolders. Use force=true to delete with subfolders.',
        value: { subfolderCount: folder.children.length }
      }];
      return sendValidationError(req, res, validationErrors, userId);
    }

    // Delete folder (cascade will handle files and subfolders)
    await prisma.folder.delete({
      where: { id: folderId },
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    return handleApiError(req, res, error, userId);
  }
}