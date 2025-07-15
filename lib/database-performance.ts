import { NextApiRequest, NextApiResponse } from 'next';

// Performance tracking state
let queryMetrics = {
  queryCount: 0,
  totalQueryTime: 0,
  cacheHits: 0,
  cacheRequests: 0
};

// Simple in-memory cache (in production, use Redis or similar)
const queryCache = new Map<string, { data: any; timestamp: number; ttl: number }>();

// Cache TTL in milliseconds
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export interface PerformanceHeaders {
  'x-query-time': string;
  'x-db-queries': string;
  'x-cache-hit': string;
  'x-cache-key'?: string;
  'x-query-complexity'?: string;
  'x-hierarchy-depth'?: string;
  'x-processing-mode'?: string;
  'x-chunk-size'?: string;
}

export function startQueryTimer(): () => number {
  const startTime = Date.now();
  return () => Date.now() - startTime;
}

export function recordQuery(queryTime: number): void {
  queryMetrics.queryCount++;
  queryMetrics.totalQueryTime += queryTime;
}

export function getCacheKey(endpoint: string, query: any, userId?: string): string {
  const key = `${endpoint}:${userId || 'anonymous'}:${JSON.stringify(query)}`;
  return Buffer.from(key).toString('base64').substring(0, 32);
}

export function getFromCache(key: string): any | null {
  queryMetrics.cacheRequests++;
  
  const cached = queryCache.get(key);
  if (!cached) {
    return null;
  }
  
  // Check if cache entry has expired
  if (Date.now() - cached.timestamp > cached.ttl) {
    queryCache.delete(key);
    return null;
  }
  
  queryMetrics.cacheHits++;
  return cached.data;
}

export function setCache(key: string, data: any, ttl: number = CACHE_TTL): void {
  queryCache.set(key, {
    data,
    timestamp: Date.now(),
    ttl
  });
}

export function addPerformanceHeaders(
  res: NextApiResponse,
  queryTime: number,
  queryCount: number = 1,
  cacheHit: boolean = false,
  cacheKey?: string,
  additionalHeaders?: Partial<PerformanceHeaders>
): void {
  const headers: PerformanceHeaders = {
    'x-query-time': `${queryTime}ms`,
    'x-db-queries': queryCount.toString(),
    'x-cache-hit': cacheHit.toString(),
    ...additionalHeaders
  };
  
  if (cacheKey) {
    headers['x-cache-key'] = cacheKey;
  }
  
  Object.entries(headers).forEach(([key, value]) => {
    if (value !== undefined) {
      res.setHeader(key, value);
    }
  });
}

export function withPerformanceMonitoring(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const stopTimer = startQueryTimer();
    let queryCount = 0;
    let cacheHit = false;
    let cacheKey: string | undefined;
    
    // Wrap response to track when it's sent
    const originalJson = res.json;
    res.json = function(data: any) {
      const queryTime = stopTimer();
      addPerformanceHeaders(res, queryTime, queryCount, cacheHit, cacheKey);
      return originalJson.call(this, data);
    };
    
    // Add helper functions to request for tracking
    (req as any).recordQuery = () => {
      queryCount++;
    };
    
    (req as any).setCacheInfo = (hit: boolean, key?: string) => {
      cacheHit = hit;
      cacheKey = key;
    };
    
    await handler(req, res);
  };
}

export function clearCache(): void {
  queryCache.clear();
}

export function getMetrics() {
  return {
    ...queryMetrics,
    cacheHitRatio: queryMetrics.cacheRequests > 0 
      ? (queryMetrics.cacheHits / queryMetrics.cacheRequests * 100).toFixed(2) + '%'
      : '0%'
  };
}