import { NextApiRequest, NextApiResponse } from 'next';
import { getSettingsStorage } from '../../lib/settings-storage';
import { SetupStatus, SETTING_KEYS } from '../../types/settings';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== 'GET') {
      res.setHeader('Allow', ['GET']);
      return res.status(405).json({ 
        error: `Method ${req.method} not allowed`
      });
    }

    const storage = getSettingsStorage();

    try {
      // Check if basic setup is complete
      const isSetup = await storage.isSetup();

      // Get current settings to check what's configured
      const maskedSettings = await storage.getMaskedSettings();

      // Define required settings for basic functionality
      const requiredSettings = [
        SETTING_KEYS.ANTHROPIC_API_KEY,
        SETTING_KEYS.NEXTAUTH_SECRET,
        SETTING_KEYS.NEXTAUTH_URL
      ];

      // Determine which settings are missing
      const missingSettings: string[] = [];
      const completedSteps: string[] = [];

      if (!maskedSettings.configured.anthropic) {
        missingSettings.push(SETTING_KEYS.ANTHROPIC_API_KEY);
      } else {
        completedSteps.push('anthropic_setup');
      }

      if (!maskedSettings.configured.auth) {
        missingSettings.push(SETTING_KEYS.NEXTAUTH_SECRET);
        missingSettings.push(SETTING_KEYS.NEXTAUTH_URL);
      } else {
        completedSteps.push('auth_setup');
      }

      // Optional but recommended settings
      if (maskedSettings.configured.openai) {
        completedSteps.push('openai_setup');
      }

      if (maskedSettings.configured.zotero) {
        completedSteps.push('zotero_setup');
      }

      if (maskedSettings.configured.database) {
        completedSteps.push('database_setup');
      }

      // Determine next step based on what's missing
      let nextStep: string | undefined;
      if (!maskedSettings.configured.anthropic) {
        nextStep = 'anthropic_setup';
      } else if (!maskedSettings.configured.auth) {
        nextStep = 'auth_setup';
      } else if (!maskedSettings.configured.openai) {
        nextStep = 'openai_setup';
      } else if (!maskedSettings.configured.zotero) {
        nextStep = 'zotero_setup';
      }

      const setupStatus: SetupStatus = {
        isSetup,
        completedSteps,
        nextStep,
        requiredSettings: requiredSettings,
        missingSettings
      };

      return res.status(200).json(setupStatus);

    } catch (error: any) {
      console.error('Failed to get setup status:', error);
      return res.status(500).json({
        error: 'Failed to retrieve setup status',
        details: error.message
      });
    }

  } catch (error: any) {
    console.error('Setup status API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
}