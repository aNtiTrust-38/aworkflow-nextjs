import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { getUserSettingsStorage } from '../../../lib/user-settings-storage';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, {});
    const userId = session?.user?.id || session?.user?.email;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const storage = getUserSettingsStorage();
    const settings = await storage.getCompleteSettings(userId);
    const data = JSON.stringify(settings);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="settings-backup.json"');
    return res.status(200).send(data);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return res.status(500).json({ error: 'Failed to backup settings', details: errorMessage });
  }
} 