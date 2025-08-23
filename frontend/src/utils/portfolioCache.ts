import { CacheEntry, PortfolioCacheConfig } from '../types/portfolio';

/**
 * Portfolio Cache Manager
 * Handles caching of portfolio data to reduce API calls and improve performance
 */
export class PortfolioCache {
  private cache = new Map<string, CacheEntry<any>>();
  private config: PortfolioCacheConfig;

  constructor(config?: Partial<PortfolioCacheConfig>) {
    this.config = {
      portfolioTTL: 5 * 60 * 1000, // 5 minutes
      performanceTTL: 2 * 60 * 1000, // 2 minutes
      holdingsTTL: 30 * 1000, // 30 seconds
      maxCacheSize: 100,
      ...config,
    };
  }

  /**
   * Get cached data if it exists and is not expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if entry has expired
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Set data in cache with appropriate TTL based on data type
   */
  set<T>(key: string, data: T, customTTL?: number): void {
    // Determine TTL based on key type
    let ttl = customTTL;
    if (!ttl) {
      if (key.includes('portfolio')) {
        ttl = this.config.portfolioTTL;
      } else if (key.includes('performance')) {
        ttl = this.config.performanceTTL;
      } else if (key.includes('holdings')) {
        ttl = this.config.holdingsTTL;
      } else {
        ttl = this.config.portfolioTTL; // Default
      }
    }

    // Clean up cache if it's getting too large
    if (this.cache.size >= this.config.maxCacheSize) {
      this.cleanup();
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      expiry: Date.now() + ttl,
    };

    this.cache.set(key, entry);
  }

  /**
   * Remove specific entry from cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Clean up expired entries and oldest entries if cache is full
   */
  private cleanup(): void {
    const now = Date.now();
    const entries = Array.from(this.cache.entries());

    // Remove expired entries
    entries.forEach(([key, entry]) => {
      if (now > entry.expiry) {
        this.cache.delete(key);
      }
    });

    // If still too large, remove oldest entries
    if (this.cache.size >= this.config.maxCacheSize) {
      const sortedEntries = entries
        .filter(([key]) => this.cache.has(key)) // Only include non-expired entries
        .sort(([, a], [, b]) => a.timestamp - b.timestamp);

      const entriesToRemove = sortedEntries.slice(0, Math.floor(this.config.maxCacheSize * 0.2));
      entriesToRemove.forEach(([key]) => this.cache.delete(key));
    }
  }

  /**
   * Get cache statistics for debugging
   */
  getStats() {
    const now = Date.now();
    const entries = Array.from(this.cache.entries());
    const expired = entries.filter(([, entry]) => now > entry.expiry).length;
    const valid = entries.length - expired;

    return {
      totalEntries: entries.length,
      validEntries: valid,
      expiredEntries: expired,
      cacheHitRate: this.getCacheHitRate(),
      memoryUsage: this.getMemoryUsage(),
    };
  }

  private getCacheHitRate(): number {
    // This would need to be tracked separately in a real implementation
    return 0; // Placeholder
  }

  private getMemoryUsage(): number {
    // Rough estimate of memory usage
    return JSON.stringify(Array.from(this.cache.entries())).length;
  }

  /**
   * Invalidate cache entries by pattern
   */
  invalidatePattern(pattern: string): void {
    const keys = Array.from(this.cache.keys());
    keys.forEach(key => {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    });
  }

  /**
   * Check if data is fresh enough to skip API call
   */
  isFresh(key: string, maxAge: number): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    const age = Date.now() - entry.timestamp;
    return age < maxAge;
  }
}

// Create singleton instance
export const portfolioCache = new PortfolioCache();

// Cache key generators
export const cacheKeys = {
  portfolio: (userId: string) => `portfolio:${userId}`,
  holdings: (userId: string) => `holdings:${userId}`,
  performance: (userId: string, timeRange: string) => `performance:${userId}:${timeRange}`,
  allocation: (userId: string) => `allocation:${userId}`,
  history: (userId: string, timeRange: string) => `history:${userId}:${timeRange}`,
  analysis: (userId: string) => `analysis:${userId}`,
  summary: (userId: string) => `summary:${userId}`,
};