import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../pages/api/auth/[...nextauth]';

export interface StandardAuthError {
  error: string;
  code: string;
  timestamp: string;
  context?: {
    method: string;
    endpoint: string;
  };
}

export async function validateAuth(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session?.user?.id) {
    const authError: StandardAuthError = {
      error: 'Unauthorized',
      code: 'AUTH_REQUIRED',
      timestamp: new Date().toISOString(),
      context: {
        method: req.method || 'UNKNOWN',
        endpoint: req.url || 'UNKNOWN'
      }
    };
    
    res.status(401).json(authError);
    return null;
  }
  
  return session;
}

export function createStandardAuthError(req: NextApiRequest): StandardAuthError {
  return {
    error: 'Unauthorized',
    code: 'AUTH_REQUIRED',
    timestamp: new Date().toISOString(),
    context: {
      method: req.method || 'UNKNOWN',
      endpoint: req.url || 'UNKNOWN'
    }
  };
}