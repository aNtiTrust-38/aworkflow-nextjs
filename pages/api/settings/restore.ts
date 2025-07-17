import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { getUserSettingsStorage } from '../../../lib/user-settings-storage';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Check authentication first
    const session = await getServerSession(req, res, {});
    const userId = session?.user?.id || session?.user?.email;
    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        code: 'AUTH_REQUIRED',
        timestamp: new Date().toISOString(),
        context: {
          method: req.method || 'UNKNOWN',
          endpoint: req.url || 'UNKNOWN'
        }
      });
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
    const storage = getUserSettingsStorage();
    const settings = req.body;
    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ error: 'Invalid settings file' });
    }
    await storage.storeCompleteSettings(userId, settings);
    return res.status(200).json({ success: true });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return res.status(500).json({ error: 'Failed to restore settings', details: errorMessage });
  }
} 