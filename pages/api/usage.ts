import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { getUserSettingsStorage } from '../../lib/user-settings-storage';
import { getAIRouter } from '../../lib/ai-providers/router';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, {});
    // Use user.id if present, else fallback to user.email
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
    const storage = getUserSettingsStorage();
    const settings = await storage.getCompleteSettings(userId);
    const budget = settings.monthlyBudget || 100;
    // Get AIRouter instance for this user (assume getAIRouter() is user-aware)
    const router = getAIRouter();
    const { used, remaining, percentage } = router.getBudgetStatus();
    return res.status(200).json({ used, remaining, percentage, budget });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return res.status(500).json({ error: 'Failed to retrieve usage', details: errorMessage });
  }
} 