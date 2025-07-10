import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { getSettingsStorage } from '../../lib/settings-storage';
import { SettingsUpdateRequest, MaskedSettings } from '../../types/settings';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Check authentication
    const session = await getServerSession(req, res, {});
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const storage = getSettingsStorage();

    switch (req.method) {
      case 'GET':
        try {
          const maskedSettings: MaskedSettings = await storage.getMaskedSettings();
          return res.status(200).json(maskedSettings);
        } catch (error: any) {
          console.error('Failed to get settings:', error);
          return res.status(500).json({ 
            error: 'Failed to retrieve settings',
            details: error.message 
          });
        }

      case 'POST':
      case 'PUT':
        try {
          const updates: SettingsUpdateRequest = req.body;
          
          if (!updates || typeof updates !== 'object') {
            return res.status(400).json({ 
              error: 'Invalid request body',
              details: 'Request body must be an object with settings to update'
            });
          }

          // Validate required fields if they're being set
          const errors: string[] = [];
          
          if (updates.anthropicKey !== undefined && (!updates.anthropicKey || updates.anthropicKey.trim() === '')) {
            errors.push('Anthropic API key cannot be empty');
          }
          
          if (updates.nextauthSecret !== undefined && (!updates.nextauthSecret || updates.nextauthSecret.trim() === '')) {
            errors.push('NextAuth secret cannot be empty');
          }
          
          if (updates.nextauthUrl !== undefined && (!updates.nextauthUrl || updates.nextauthUrl.trim() === '')) {
            errors.push('NextAuth URL cannot be empty');
          }

          if (updates.aiMonthlyBudget !== undefined && (isNaN(updates.aiMonthlyBudget) || updates.aiMonthlyBudget < 0)) {
            errors.push('AI monthly budget must be a positive number');
          }

          if (errors.length > 0) {
            return res.status(400).json({ 
              error: 'Validation failed',
              details: errors
            });
          }

          // Update settings
          const userId = session.user?.email || 'unknown';
          await storage.updateSettings(updates, userId);

          // Return updated masked settings
          const updatedSettings = await storage.getMaskedSettings();
          return res.status(200).json(updatedSettings);

        } catch (error: any) {
          console.error('Failed to update settings:', error);
          return res.status(500).json({ 
            error: 'Failed to update settings',
            details: error.message
          });
        }

      case 'DELETE':
        try {
          const { key } = req.query;
          
          if (!key || typeof key !== 'string') {
            return res.status(400).json({ 
              error: 'Missing required parameter: key'
            });
          }

          const userId = session.user?.email || 'unknown';
          await storage.deleteSetting(key, userId);

          return res.status(200).json({ 
            success: true,
            message: `Setting ${key} deleted successfully`
          });

        } catch (error: any) {
          console.error('Failed to delete setting:', error);
          return res.status(500).json({ 
            error: 'Failed to delete setting',
            details: error.message
          });
        }

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        return res.status(405).json({ 
          error: `Method ${req.method} not allowed`
        });
    }
  } catch (error: any) {
    console.error('Settings API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message
    });
  }
}