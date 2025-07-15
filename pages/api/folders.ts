import { NextApiRequest, NextApiResponse } from 'next';
import { validateAuth } from '@/lib/auth-utils';
import { handleApiError, sendErrorResponse, createStandardError, sendValidationError, ValidationError, HTTP_STATUS, ERROR_CODES } from '@/lib/error-utils';
import prisma from '@/lib/prisma';

// Helper function to generate safe path from folder name
function generateSafePath(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-')         // Replace spaces with hyphens
    .replace(/-+/g, '-')          // Replace multiple hyphens with single
    .replace(/^-|-$/g, '');       // Remove leading/trailing hyphens
}

// Helper function to calculate file count recursively
function calculateFileCount(folder: any): number {
  let count = folder.files?.length || 0;
  if (folder.children) {
    count += folder.children.reduce((sum: number, child: any) => sum + calculateFileCount(child), 0);
  }
  return count;
}

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

// Helper function to build full path
async function buildFullPath(parentId: string | null, folderName: string): Promise<string> {
  if (!parentId) {
    return `/${generateSafePath(folderName)}`;
  }
  
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
  
  let currentParentId: string | null = targetParentId;
  while (currentParentId) {
    if (currentParentId === folderId) {
      return true;
    }
    
    const parent = await prisma.folder.findUnique({
      where: { id: currentParentId },
      select: { parentId: true },
    });
    
    if (!parent) break;
    currentParentId = parent.parentId;
  }
  
  return false;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Check authentication using standardized auth utilities
    const session = await validateAuth(req, res);
    if (!session) {
      return; // validateAuth already sent the response
    }

    const userId = session.user.id;

    switch (req.method) {
      case 'GET':
        try {
          const { parentId } = req.query;
          
          const whereClause: any = { userId };
          if (parentId) {
            whereClause.parentId = parentId as string;
          }

          const folders = await prisma.folder.findMany({
            where: whereClause,
            include: {
              children: {
                include: {
                  children: true,
                  files: true,
                },
              },
              files: true,
            },
            orderBy: { createdAt: 'desc' },
          });

          // Add file count to each folder
          const foldersWithCount = folders.map(folder => ({
            ...folder,
            fileCount: calculateFileCount(folder),
          }));

          return res.status(200).json({ folders: foldersWithCount });
        } catch (error) {
          return handleApiError(req, res, error, userId);
        }

      case 'POST':
        try {
          const { name, parentId } = req.body;

          // Validate input
          const nameError = validateFolderName(name);
          if (nameError) {
            const validationErrors: ValidationError[] = [{
              field: 'name',
              message: nameError,
              value: name
            }];
            return sendValidationError(req, res, validationErrors, userId);
          }

          // Check if parent folder exists (if parentId provided)
          if (parentId) {
            const parentFolder = await prisma.folder.findUnique({
              where: { id: parentId },
              select: { path: true },
            });

            if (!parentFolder) {
              const errorResponse = createStandardError(req, 'Parent folder not found', ERROR_CODES.NOT_FOUND, HTTP_STATUS.NOT_FOUND, undefined, userId);
              return sendErrorResponse(res, HTTP_STATUS.NOT_FOUND, errorResponse);
            }
          }

          // Build full path
          const fullPath = await buildFullPath(parentId, name);

          // Create folder
          const folder = await prisma.folder.create({
            data: {
              name: name.trim(),
              path: fullPath,
              userId,
              parentId: parentId || null,
            },
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

          return res.status(201).json({
            ...folder,
            fileCount: calculateFileCount(folder),
          });
        } catch (error: any) {
          console.error('Failed to create folder:', error);
          
          // Handle unique constraint violation
          if (error.code === 'P2002' && error.meta?.target?.includes('name')) {
            const errorResponse = createStandardError(req, 'Folder with this name already exists', ERROR_CODES.CONFLICT, HTTP_STATUS.CONFLICT, undefined, userId);
            return sendErrorResponse(res, HTTP_STATUS.CONFLICT, errorResponse);
          }
          
          return handleApiError(req, res, error, userId);
        }

      case 'PUT':
        try {
          const { id } = req.query;
          const { name, parentId } = req.body;

          if (!id) {
            const validationErrors: ValidationError[] = [{
              field: 'id',
              message: 'Folder ID is required',
              value: id
            }];
            return sendValidationError(req, res, validationErrors, userId);
          }

          // Check if folder exists and user owns it
          const existingFolder = await prisma.folder.findUnique({
            where: { id: id as string },
            select: { userId: true },
          });

          if (!existingFolder) {
            const errorResponse = createStandardError(req, 'Folder not found', ERROR_CODES.NOT_FOUND, HTTP_STATUS.NOT_FOUND, undefined, userId);
            return sendErrorResponse(res, HTTP_STATUS.NOT_FOUND, errorResponse);
          }

          if (existingFolder.userId !== userId) {
            const errorResponse = createStandardError(req, 'Access denied', ERROR_CODES.FORBIDDEN, HTTP_STATUS.FORBIDDEN, undefined, userId);
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
          if (parentId && parentId !== id) {
            const isCircular = await checkCircularReference(id as string, parentId);
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
          if (parentId === id) {
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
              const currentFolder = await prisma.folder.findUnique({
                where: { id: id as string },
                select: { name: true },
              });
              updateData.path = await buildFullPath(parentId, currentFolder!.name);
            }
          }

          // Update folder
          const folder = await prisma.folder.update({
            where: { id: id as string },
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

      case 'DELETE':
        try {
          const { id } = req.query;
          const { force } = req.query;

          if (!id) {
            const validationErrors: ValidationError[] = [{
              field: 'id',
              message: 'Folder ID is required',
              value: id
            }];
            return sendValidationError(req, res, validationErrors, userId);
          }

          // Check if folder exists and user owns it
          const folder = await prisma.folder.findUnique({
            where: { id: id as string },
            include: {
              children: true,
              files: true,
            },
          });

          if (!folder) {
            const errorResponse = createStandardError(req, 'Folder not found', ERROR_CODES.NOT_FOUND, HTTP_STATUS.NOT_FOUND, undefined, userId);
            return sendErrorResponse(res, HTTP_STATUS.NOT_FOUND, errorResponse);
          }

          if (folder.userId !== userId) {
            const errorResponse = createStandardError(req, 'Access denied', ERROR_CODES.FORBIDDEN, HTTP_STATUS.FORBIDDEN, undefined, userId);
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
            where: { id: id as string },
          });

          return res.status(200).json({ success: true });
        } catch (error) {
          return handleApiError(req, res, error, userId);
        }

      default:
        const errorResponse = createStandardError(req, 'Method not allowed', 'METHOD_NOT_ALLOWED', HTTP_STATUS.NOT_FOUND, undefined, userId);
        return sendErrorResponse(res, 405, errorResponse);
    }
  } catch (error) {
    // userId might not be available here if authentication failed
    return handleApiError(req, res, error);
  }
}