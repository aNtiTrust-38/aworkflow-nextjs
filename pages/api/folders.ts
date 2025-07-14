import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
  
  let currentParentId = targetParentId;
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
    // Check authentication
    const session = await getSession({ req });
    if (!session?.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
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
          console.error('Failed to fetch folders:', error);
          return res.status(500).json({ error: 'Failed to fetch folders' });
        }

      case 'POST':
        try {
          const { name, parentId } = req.body;

          // Validate input
          const nameError = validateFolderName(name);
          if (nameError) {
            return res.status(400).json({ error: nameError });
          }

          // Check if parent folder exists (if parentId provided)
          if (parentId) {
            const parentFolder = await prisma.folder.findUnique({
              where: { id: parentId },
              select: { path: true },
            });

            if (!parentFolder) {
              return res.status(404).json({ error: 'Parent folder not found' });
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
            return res.status(409).json({ error: 'Folder with this name already exists' });
          }
          
          return res.status(500).json({ error: 'Failed to create folder' });
        }

      case 'PUT':
        try {
          const { id } = req.query;
          const { name, parentId } = req.body;

          if (!id) {
            return res.status(400).json({ error: 'Folder ID is required' });
          }

          // Check if folder exists and user owns it
          const existingFolder = await prisma.folder.findUnique({
            where: { id: id as string },
            select: { userId: true },
          });

          if (!existingFolder) {
            return res.status(404).json({ error: 'Folder not found' });
          }

          if (existingFolder.userId !== userId) {
            return res.status(403).json({ error: 'Access denied' });
          }

          // Validate name if provided
          if (name) {
            const nameError = validateFolderName(name);
            if (nameError) {
              return res.status(400).json({ error: nameError });
            }
          }

          // Check for circular reference if moving folder
          if (parentId && parentId !== id) {
            const isCircular = await checkCircularReference(id as string, parentId);
            if (isCircular) {
              return res.status(400).json({ error: 'Cannot create circular folder structure' });
            }
          }

          // Prevent moving folder to itself
          if (parentId === id) {
            return res.status(400).json({ error: 'Cannot move folder to itself' });
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
          console.error('Failed to update folder:', error);
          
          if (error.message === 'Parent folder not found') {
            return res.status(404).json({ error: 'Parent folder not found' });
          }
          
          return res.status(500).json({ error: 'Failed to update folder' });
        }

      case 'DELETE':
        try {
          const { id } = req.query;
          const { force } = req.query;

          if (!id) {
            return res.status(400).json({ error: 'Folder ID is required' });
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
            return res.status(404).json({ error: 'Folder not found' });
          }

          if (folder.userId !== userId) {
            return res.status(403).json({ error: 'Access denied' });
          }

          // Check if folder has files or subfolders
          if (folder.files.length > 0 && force !== 'true') {
            return res.status(400).json({
              error: 'Cannot delete folder with files. Use force=true to delete with files.',
              fileCount: folder.files.length,
            });
          }

          if (folder.children.length > 0 && force !== 'true') {
            return res.status(400).json({
              error: 'Cannot delete folder with subfolders. Use force=true to delete with subfolders.',
              subfolderCount: folder.children.length,
            });
          }

          // Delete folder (cascade will handle files and subfolders)
          await prisma.folder.delete({
            where: { id: id as string },
          });

          return res.status(200).json({ success: true });
        } catch (error) {
          console.error('Failed to delete folder:', error);
          return res.status(500).json({ error: 'Failed to delete folder' });
        }

      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}