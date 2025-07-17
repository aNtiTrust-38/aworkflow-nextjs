import { NextApiRequest, NextApiResponse } from 'next';
import { getUserSettingsStorage } from '../../lib/user-settings-storage';

interface UserSettingsUpdateRequest {
  anthropicApiKey?: string | null;
  openaiApiKey?: string | null;
  monthlyBudget?: number;
  preferredProvider?: 'auto' | 'anthropic' | 'openai';
  citationStyle?: string;
  defaultLanguage?: string;
  adhdFriendlyMode?: boolean;
  theme?: string;
  reducedMotion?: boolean;
  highContrast?: boolean;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // No authentication required in current iteration
    const userId = 'anonymous-user'; // Default user for no-auth mode
    const storage = getUserSettingsStorage();

    switch (req.method) {
      case 'GET':
        try {
          const settings = await storage.getCompleteSettings(userId);
          return res.status(200).json(settings);
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
          console.error('Failed to get user settings:', error);
          return res.status(500).json({ 
            error: 'Failed to retrieve user settings',
            details: errorMessage 
          });
        }

      case 'PUT':
        try {
          const updates: UserSettingsUpdateRequest = req.body;
          
          if (!updates || typeof updates !== 'object') {
            return res.status(400).json({ 
              error: 'Invalid request body',
              details: 'Request body must be an object with settings to update'
            });
          }

          // Validate updates
          const errors: string[] = [];
          
          // API key validation
          if (updates.anthropicApiKey !== undefined && updates.anthropicApiKey !== null) {
            if (typeof updates.anthropicApiKey !== 'string' || updates.anthropicApiKey.trim() === '') {
              errors.push('Anthropic API key must be a non-empty string or null');
            }
          }
          
          if (updates.openaiApiKey !== undefined && updates.openaiApiKey !== null) {
            if (typeof updates.openaiApiKey !== 'string' || updates.openaiApiKey.trim() === '') {
              errors.push('OpenAI API key must be a non-empty string or null');
            }
          }

          // Budget validation
          if (updates.monthlyBudget !== undefined) {
            if (typeof updates.monthlyBudget !== 'number' || updates.monthlyBudget < 0) {
              errors.push('Monthly budget must be a positive number');
            }
          }

          // Provider validation
          if (updates.preferredProvider !== undefined) {
            if (!['auto', 'anthropic', 'openai'].includes(updates.preferredProvider)) {
              errors.push('Preferred provider must be "auto", "anthropic", or "openai"');
            }
          }

          // Citation style validation
          if (updates.citationStyle !== undefined) {
            if (typeof updates.citationStyle !== 'string' || updates.citationStyle.trim() === '') {
              errors.push('Citation style must be a non-empty string');
            }
          }

          // Language validation
          if (updates.defaultLanguage !== undefined) {
            if (typeof updates.defaultLanguage !== 'string' || updates.defaultLanguage.trim() === '') {
              errors.push('Default language must be a non-empty string');
            }
          }

          // Theme validation
          if (updates.theme !== undefined) {
            if (typeof updates.theme !== 'string' || updates.theme.trim() === '') {
              errors.push('Theme must be a non-empty string');
            }
          }

          // Boolean field validation
          if (updates.adhdFriendlyMode !== undefined && typeof updates.adhdFriendlyMode !== 'boolean') {
            errors.push('ADHD friendly mode must be a boolean');
          }
          
          if (updates.reducedMotion !== undefined && typeof updates.reducedMotion !== 'boolean') {
            errors.push('Reduced motion must be a boolean');
          }
          
          if (updates.highContrast !== undefined && typeof updates.highContrast !== 'boolean') {
            errors.push('High contrast must be a boolean');
          }

          if (errors.length > 0) {
            return res.status(400).json({ 
              error: 'Validation failed',
              details: errors
            });
          }

          // Update settings
          await storage.storeCompleteSettings(userId, updates);

          // Return updated settings
          const updatedSettings = await storage.getCompleteSettings(userId);
          return res.status(200).json(updatedSettings);

        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
          console.error('Failed to update user settings:', error);
          return res.status(500).json({ 
            error: 'Failed to update user settings',
            details: errorMessage
          });
        }

      case 'DELETE':
        try {
          await storage.deleteUserSettings(userId);

          return res.status(200).json({ 
            success: true,
            message: 'User settings deleted successfully'
          });

        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
          console.error('Failed to delete user settings:', error);
          return res.status(500).json({ 
            error: 'Failed to delete user settings',
            details: errorMessage
          });
        }

      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
        return res.status(405).json({ 
          error: `Method ${req.method} not allowed`
        });
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('User settings API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: errorMessage
    });
  }
}