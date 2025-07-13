interface CacheEntry<T> {
  data: T;
  timestamp: number;
  hits: number;
}

interface CacheConfig {
  maxAge?: number; // milliseconds
  maxSize?: number; // number of entries
  enableCompression?: boolean;
}

class ResponseCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private config: Required<CacheConfig>;

  constructor(config: CacheConfig = {}) {
    this.config = {
      maxAge: config.maxAge ?? 5 * 60 * 1000, // 5 minutes default
      maxSize: config.maxSize ?? 100, // 100 entries default
      enableCompression: config.enableCompression ?? false
    };
  }

  private generateKey(prompt: string, type: string, metadata?: any): string {
    const baseKey = `${type}-${prompt.substring(0, 100)}`;
    if (metadata?.workflowStep) {
      return `${baseKey}-${metadata.workflowStep}`;
    }
    return baseKey;
  }

  private isValid(entry: CacheEntry<T>): boolean {
    return Date.now() - entry.timestamp < this.config.maxAge;
  }

  private evictOldest(): void {
    if (this.cache.size <= this.config.maxSize) return;

    let oldestKey = '';
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  set(prompt: string, type: string, data: T, metadata?: any): void {
    const key = this.generateKey(prompt, type, metadata);
    
    this.cache.set(key, {
      data: this.config.enableCompression ? this.compress(data) : data,
      timestamp: Date.now(),
      hits: 0
    });

    this.evictOldest();
  }

  get(prompt: string, type: string, metadata?: any): T | null {
    const key = this.generateKey(prompt, type, metadata);
    const entry = this.cache.get(key);

    if (!entry || !this.isValid(entry)) {
      if (entry) {
        this.cache.delete(key);
      }
      return null;
    }

    entry.hits++;
    return this.config.enableCompression ? this.decompress(entry.data) : entry.data;
  }

  has(prompt: string, type: string, metadata?: any): boolean {
    const key = this.generateKey(prompt, type, metadata);
    const entry = this.cache.get(key);
    return entry ? this.isValid(entry) : false;
  }

  delete(prompt: string, type: string, metadata?: any): boolean {
    const key = this.generateKey(prompt, type, metadata);
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache) {
      if (now - entry.timestamp > this.config.maxAge) {
        this.cache.delete(key);
      }
    }
  }

  getStats() {
    const now = Date.now();
    let validEntries = 0;
    let totalHits = 0;
    let avgAge = 0;

    for (const entry of this.cache.values()) {
      if (this.isValid(entry)) {
        validEntries++;
        totalHits += entry.hits;
        avgAge += now - entry.timestamp;
      }
    }

    return {
      totalEntries: this.cache.size,
      validEntries,
      totalHits,
      avgAge: validEntries > 0 ? avgAge / validEntries : 0,
      hitRate: totalHits / Math.max(validEntries, 1),
      memoryUsage: this.estimateMemoryUsage()
    };
  }

  private compress(data: T): T {
    // Simple compression - in real implementation, use actual compression
    if (typeof data === 'string') {
      return data as T;
    }
    return data;
  }

  private decompress(data: T): T {
    // Simple decompression - in real implementation, use actual decompression
    return data;
  }

  private estimateMemoryUsage(): number {
    let totalSize = 0;
    for (const [key, entry] of this.cache) {
      totalSize += key.length * 2; // UTF-16 characters
      totalSize += JSON.stringify(entry.data).length * 2;
      totalSize += 32; // timestamp + hits + overhead
    }
    return totalSize;
  }

  // Prefetch similar responses based on patterns
  prefetch(patterns: Array<{ prompt: string; type: string; metadata?: any }>): void {
    // This would integrate with the AI router to prefetch likely next requests
    patterns.forEach(pattern => {
      const key = this.generateKey(pattern.prompt, pattern.type, pattern.metadata);
      if (!this.cache.has(key)) {
        // Mark for prefetching (actual implementation would trigger AI call)
        console.log(`Marking for prefetch: ${key}`);
      }
    });
  }
}

// Create instances for different types of responses
export const aiResponseCache = new ResponseCache<any>({
  maxAge: 10 * 60 * 1000, // 10 minutes for AI responses
  maxSize: 50,
  enableCompression: false
});

export const userDataCache = new ResponseCache<any>({
  maxAge: 30 * 60 * 1000, // 30 minutes for user data
  maxSize: 20,
  enableCompression: true
});

export const staticDataCache = new ResponseCache<any>({
  maxAge: 60 * 60 * 1000, // 1 hour for static data
  maxSize: 100,
  enableCompression: true
});

// Auto-cleanup every 5 minutes
setInterval(() => {
  aiResponseCache.cleanup();
  userDataCache.cleanup();
  staticDataCache.cleanup();
}, 5 * 60 * 1000);