import { portfolioService } from './portfolioService';
import { PortfolioData } from '../types/portfolio';

export interface MarketHours {
  isOpen: boolean;
  nextOpen?: Date;
  nextClose?: Date;
  timezone: string;
}

export interface UpdaterConfig {
  marketHoursInterval: number; // Update interval during market hours (ms)
  afterHoursInterval: number; // Update interval after market hours (ms)
  maxRetries: number;
  retryDelay: number;
  enableLogging: boolean;
}

export interface UpdaterSubscriber {
  id: string;
  callback: (data: PortfolioData) => void;
  onError?: (error: any) => void;
}

/**
 * Real-time Portfolio Data Updater
 * Manages automatic updates of portfolio data with market hours awareness
 */
export class RealTimePortfolioUpdater {
  private subscribers = new Map<string, UpdaterSubscriber>();
  private updateInterval: NodeJS.Timeout | null = null;
  private isRunning = false;
  private lastUpdateTime: Date | null = null;
  private consecutiveErrors = 0;
  private config: UpdaterConfig;

  constructor(config?: Partial<UpdaterConfig>) {
    this.config = {
      marketHoursInterval: 30000, // 30 seconds during market hours
      afterHoursInterval: 300000, // 5 minutes after hours
      maxRetries: 3,
      retryDelay: 5000, // 5 seconds
      enableLogging: process.env.NODE_ENV === 'development',
      ...config,
    };
  }

  /**
   * Start the real-time updater
   */
  start(): void {
    if (this.isRunning) {
      this.log('Updater is already running');
      return;
    }

    this.isRunning = true;
    this.scheduleNextUpdate();
    this.log('Real-time updater started');
  }

  /**
   * Stop the real-time updater
   */
  stop(): void {
    if (this.updateInterval) {
      clearTimeout(this.updateInterval);
      this.updateInterval = null;
    }
    this.isRunning = false;
    this.log('Real-time updater stopped');
  }

  /**
   * Subscribe to portfolio updates
   */
  subscribe(subscriber: UpdaterSubscriber): () => void {
    this.subscribers.set(subscriber.id, subscriber);
    this.log(`Subscriber ${subscriber.id} added. Total subscribers: ${this.subscribers.size}`);

    // Return unsubscribe function
    return () => this.unsubscribe(subscriber.id);
  }

  /**
   * Unsubscribe from portfolio updates
   */
  unsubscribe(subscriberId: string): void {
    const removed = this.subscribers.delete(subscriberId);
    if (removed) {
      this.log(`Subscriber ${subscriberId} removed. Total subscribers: ${this.subscribers.size}`);
    }

    // Stop updater if no subscribers
    if (this.subscribers.size === 0 && this.isRunning) {
      this.stop();
    }
  }

  /**
   * Force an immediate update
   */
  async forceUpdate(userId: string): Promise<void> {
    try {
      await this.fetchAndNotify(userId);
    } catch (error) {
      this.log('Force update failed:', error);
      throw error;
    }
  }

  /**
   * Get current market status
   */
  getMarketStatus(): MarketHours {
    return this.calculateMarketHours();
  }

  /**
   * Get updater statistics
   */
  getStats() {
    return {
      isRunning: this.isRunning,
      subscriberCount: this.subscribers.size,
      lastUpdateTime: this.lastUpdateTime,
      consecutiveErrors: this.consecutiveErrors,
      config: this.config,
    };
  }

  /**
   * Schedule the next update based on market hours
   */
  private scheduleNextUpdate(): void {
    if (!this.isRunning) return;

    const marketStatus = this.calculateMarketHours();
    const interval = marketStatus.isOpen 
      ? this.config.marketHoursInterval 
      : this.config.afterHoursInterval;

    this.updateInterval = setTimeout(() => {
      this.performUpdate();
    }, interval);

    this.log(`Next update scheduled in ${interval / 1000} seconds (market ${marketStatus.isOpen ? 'open' : 'closed'})`);
  }

  /**
   * Perform the actual update
   */
  private async performUpdate(): Promise<void> {
    if (this.subscribers.size === 0) {
      this.stop();
      return;
    }

    // Get user IDs from subscribers (assuming they're stored in subscriber data)
    const userIds = new Set<string>();
    this.subscribers.forEach(subscriber => {
      // Extract user ID from subscriber ID (format: "userId_componentId")
      const userId = subscriber.id.split('_')[0];
      if (userId) userIds.add(userId);
    });

    // Update data for each unique user
    for (const userId of userIds) {
      try {
        await this.fetchAndNotify(userId);
        this.consecutiveErrors = 0; // Reset error count on success
      } catch (error) {
        this.handleUpdateError(error);
      }
    }

    // Schedule next update
    this.scheduleNextUpdate();
  }

  /**
   * Fetch data and notify subscribers
   */
  private async fetchAndNotify(userId: string): Promise<void> {
    try {
      const portfolioData = await portfolioService.fetchLivePortfolio(userId);
      this.lastUpdateTime = new Date();

      // Notify all subscribers for this user
      this.subscribers.forEach(subscriber => {
        if (subscriber.id.startsWith(userId)) {
          try {
            subscriber.callback(portfolioData);
          } catch (error) {
            this.log(`Error in subscriber callback ${subscriber.id}:`, error);
            subscriber.onError?.(error);
          }
        }
      });

      this.log(`Portfolio data updated for user ${userId}`);
    } catch (error) {
      this.log(`Failed to fetch portfolio data for user ${userId}:`, error);
      
      // Notify subscribers of error
      this.subscribers.forEach(subscriber => {
        if (subscriber.id.startsWith(userId)) {
          subscriber.onError?.(error);
        }
      });

      throw error;
    }
  }

  /**
   * Handle update errors with retry logic
   */
  private handleUpdateError(error: any): void {
    this.consecutiveErrors++;
    this.log(`Update error (${this.consecutiveErrors}/${this.config.maxRetries}):`, error);

    if (this.consecutiveErrors >= this.config.maxRetries) {
      this.log('Max retries reached, stopping updater');
      this.stop();
      
      // Notify all subscribers of critical error
      this.subscribers.forEach(subscriber => {
        subscriber.onError?.(new Error('Real-time updates stopped due to repeated failures'));
      });
    }
  }

  /**
   * Calculate current market hours status
   */
  private calculateMarketHours(): MarketHours {
    const now = new Date();
    const day = now.getDay(); // 0 = Sunday, 6 = Saturday
    const hour = now.getHours();
    const minute = now.getMinutes();
    const currentTime = hour * 60 + minute; // Minutes since midnight

    // Market is closed on weekends
    if (day === 0 || day === 6) {
      return {
        isOpen: false,
        nextOpen: this.getNextMarketOpen(now),
        timezone: 'EST',
      };
    }

    // Market hours: 9:30 AM - 4:00 PM EST (simplified)
    const marketOpen = 9 * 60 + 30; // 9:30 AM in minutes
    const marketClose = 16 * 60; // 4:00 PM in minutes

    const isOpen = currentTime >= marketOpen && currentTime < marketClose;

    return {
      isOpen,
      nextOpen: isOpen ? undefined : this.getNextMarketOpen(now),
      nextClose: isOpen ? this.getNextMarketClose(now) : undefined,
      timezone: 'EST',
    };
  }

  /**
   * Get next market open time
   */
  private getNextMarketOpen(from: Date): Date {
    const next = new Date(from);
    next.setHours(9, 30, 0, 0); // 9:30 AM

    // If it's already past market open today, move to next business day
    if (from.getHours() > 9 || (from.getHours() === 9 && from.getMinutes() >= 30)) {
      next.setDate(next.getDate() + 1);
    }

    // Skip weekends
    while (next.getDay() === 0 || next.getDay() === 6) {
      next.setDate(next.getDate() + 1);
    }

    return next;
  }

  /**
   * Get next market close time
   */
  private getNextMarketClose(from: Date): Date {
    const next = new Date(from);
    next.setHours(16, 0, 0, 0); // 4:00 PM
    return next;
  }

  /**
   * Log messages if logging is enabled
   */
  private log(message: string, ...args: any[]): void {
    if (this.config.enableLogging) {
      console.log(`[RealTimeUpdater] ${message}`, ...args);
    }
  }
}

// Singleton instance
export const realTimeUpdater = new RealTimePortfolioUpdater();

// Utility functions
export const marketUtils = {
  /**
   * Check if market is currently open
   */
  isMarketOpen(): boolean {
    return realTimeUpdater.getMarketStatus().isOpen;
  },

  /**
   * Get time until next market event (open/close)
   */
  getTimeUntilNextMarketEvent(): { event: 'open' | 'close'; timeMs: number } | null {
    const status = realTimeUpdater.getMarketStatus();
    const now = new Date();

    if (status.isOpen && status.nextClose) {
      return {
        event: 'close',
        timeMs: status.nextClose.getTime() - now.getTime(),
      };
    }

    if (!status.isOpen && status.nextOpen) {
      return {
        event: 'open',
        timeMs: status.nextOpen.getTime() - now.getTime(),
      };
    }

    return null;
  },

  /**
   * Format time until next market event
   */
  formatTimeUntilMarketEvent(): string {
    const nextEvent = this.getTimeUntilNextMarketEvent();
    if (!nextEvent) return 'Unknown';

    const hours = Math.floor(nextEvent.timeMs / (1000 * 60 * 60));
    const minutes = Math.floor((nextEvent.timeMs % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m until market ${nextEvent.event}s`;
    }
    return `${minutes}m until market ${nextEvent.event}s`;
  },
};