import { NextApiRequest, NextApiResponse } from 'next';
import { validateAuth } from '@/lib/auth-utils';
import { getSetupStatus, updateSetupStatus } from '../../lib/settings-storage';
import { SetupStatus } from '../../types/settings';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Check authentication using standardized auth utilities
    const session = await validateAuth(req, res);
    if (!session) {
      return; // validateAuth already sent the response
    }

    const userId = session.user.id;

    if (req.method === 'GET') {
      const setupStatus = await getSetupStatus(userId);
      
      if (!setupStatus) {
        // Return default setup status
        const defaultStatus: SetupStatus = {
          isSetup: false,
          completedSteps: [],
          currentStep: 0
        };
        return res.status(200).json(defaultStatus);
      }
      
      return res.status(200).json(setupStatus);
    }

    if (req.method === 'POST') {
      const { complete, currentStep, completedSteps } = req.body;
      
      const newStatus: SetupStatus = {
        isSetup: complete || false,
        completedSteps: completedSteps || [],
        currentStep: currentStep
      };
      
      await updateSetupStatus(userId, newStatus);
      
      return res.status(200).json(newStatus);
    }

    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ 
      error: `Method ${req.method} not allowed`
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Setup status API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: errorMessage
    });
  }
}