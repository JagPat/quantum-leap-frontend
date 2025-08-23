/**
 * Market Hours Utilities
 * Provides functions for determining market status and trading hours
 */

export interface MarketSchedule {
  open: { hour: number; minute: number };
  close: { hour: number; minute: number };
  timezone: string;
}

export interface Holiday {
  date: string; // YYYY-MM-DD format
  name: string;
  type: 'full' | 'early'; // full closure or early closure
  earlyCloseTime?: { hour: number; minute: number };
}

// US Stock Market Schedule (Eastern Time)
export const US_MARKET_SCHEDULE: MarketSchedule = {
  open: { hour: 9, minute: 30 },
  close: { hour: 16, minute: 0 },
  timezone: 'America/New_York',
};

// US Market Holidays (2024-2025)
export const US_MARKET_HOLIDAYS: Holiday[] = [
  { date: '2024-01-01', name: "New Year's Day", type: 'full' },
  { date: '2024-01-15', name: 'Martin Luther King Jr. Day', type: 'full' },
  { date: '2024-02-19', name: "Presidents' Day", type: 'full' },
  { date: '2024-03-29', name: 'Good Friday', type: 'full' },
  { date: '2024-05-27', name: 'Memorial Day', type: 'full' },
  { date: '2024-06-19', name: 'Juneteenth', type: 'full' },
  { date: '2024-07-04', name: 'Independence Day', type: 'full' },
  { date: '2024-09-02', name: 'Labor Day', type: 'full' },
  { date: '2024-11-28', name: 'Thanksgiving Day', type: 'full' },
  { date: '2024-11-29', name: 'Day after Thanksgiving', type: 'early', earlyCloseTime: { hour: 13, minute: 0 } },
  { date: '2024-12-24', name: 'Christmas Eve', type: 'early', earlyCloseTime: { hour: 13, minute: 0 } },
  { date: '2024-12-25', name: 'Christmas Day', type: 'full' },
  { date: '2025-01-01', name: "New Year's Day", type: 'full' },
  { date: '2025-01-20', name: 'Martin Luther King Jr. Day', type: 'full' },
  { date: '2025-02-17', name: "Presidents' Day", type: 'full' },
  { date: '2025-04-18', name: 'Good Friday', type: 'full' },
  { date: '2025-05-26', name: 'Memorial Day', type: 'full' },
  { date: '2025-06-19', name: 'Juneteenth', type: 'full' },
  { date: '2025-07-04', name: 'Independence Day', type: 'full' },
  { date: '2025-09-01', name: 'Labor Day', type: 'full' },
  { date: '2025-11-27', name: 'Thanksgiving Day', type: 'full' },
  { date: '2025-11-28', name: 'Day after Thanksgiving', type: 'early', earlyCloseTime: { hour: 13, minute: 0 } },
  { date: '2025-12-24', name: 'Christmas Eve', type: 'early', earlyCloseTime: { hour: 13, minute: 0 } },
  { date: '2025-12-25', name: 'Christmas Day', type: 'full' },
];

/**
 * Check if a given date is a market holiday
 */
export function isMarketHoliday(date: Date): Holiday | null {
  const dateString = date.toISOString().split('T')[0];
  return US_MARKET_HOLIDAYS.find(holiday => holiday.date === dateString) || null;
}

/**
 * Check if the market is currently open
 */
export function isMarketOpen(date: Date = new Date()): boolean {
  // Convert to Eastern Time
  const easternTime = new Date(date.toLocaleString("en-US", { timeZone: "America/New_York" }));
  
  const day = easternTime.getDay(); // 0 = Sunday, 6 = Saturday
  const hour = easternTime.getHours();
  const minute = easternTime.getMinutes();
  const currentTime = hour * 60 + minute; // Minutes since midnight

  // Market is closed on weekends
  if (day === 0 || day === 6) {
    return false;
  }

  // Check for holidays
  const holiday = isMarketHoliday(easternTime);
  if (holiday) {
    if (holiday.type === 'full') {
      return false;
    }
    // Early close day
    if (holiday.earlyCloseTime) {
      const earlyCloseTime = holiday.earlyCloseTime.hour * 60 + holiday.earlyCloseTime.minute;
      const marketOpen = US_MARKET_SCHEDULE.open.hour * 60 + US_MARKET_SCHEDULE.open.minute;
      return currentTime >= marketOpen && currentTime < earlyCloseTime;
    }
  }

  // Regular market hours
  const marketOpen = US_MARKET_SCHEDULE.open.hour * 60 + US_MARKET_SCHEDULE.open.minute;
  const marketClose = US_MARKET_SCHEDULE.close.hour * 60 + US_MARKET_SCHEDULE.close.minute;

  return currentTime >= marketOpen && currentTime < marketClose;
}

/**
 * Get the next market open time
 */
export function getNextMarketOpen(from: Date = new Date()): Date {
  const easternTime = new Date(from.toLocaleString("en-US", { timeZone: "America/New_York" }));
  let nextOpen = new Date(easternTime);
  
  // Set to next market open time
  nextOpen.setHours(US_MARKET_SCHEDULE.open.hour, US_MARKET_SCHEDULE.open.minute, 0, 0);

  // If it's already past market open today, move to next day
  if (easternTime.getHours() > US_MARKET_SCHEDULE.open.hour || 
      (easternTime.getHours() === US_MARKET_SCHEDULE.open.hour && 
       easternTime.getMinutes() >= US_MARKET_SCHEDULE.open.minute)) {
    nextOpen.setDate(nextOpen.getDate() + 1);
  }

  // Skip weekends and holidays
  while (nextOpen.getDay() === 0 || nextOpen.getDay() === 6 || isMarketHoliday(nextOpen)) {
    nextOpen.setDate(nextOpen.getDate() + 1);
  }

  // Convert back to local time
  return new Date(nextOpen.toLocaleString());
}

/**
 * Get the next market close time
 */
export function getNextMarketClose(from: Date = new Date()): Date {
  const easternTime = new Date(from.toLocaleString("en-US", { timeZone: "America/New_York" }));
  let nextClose = new Date(easternTime);
  
  // Check if today is an early close day
  const holiday = isMarketHoliday(easternTime);
  const closeTime = holiday?.earlyCloseTime || US_MARKET_SCHEDULE.close;
  
  nextClose.setHours(closeTime.hour, closeTime.minute, 0, 0);

  // If it's already past market close today, move to next trading day
  if (easternTime.getHours() > closeTime.hour || 
      (easternTime.getHours() === closeTime.hour && 
       easternTime.getMinutes() >= closeTime.minute)) {
    // Move to next trading day
    do {
      nextClose.setDate(nextClose.getDate() + 1);
    } while (nextClose.getDay() === 0 || nextClose.getDay() === 6 || isMarketHoliday(nextClose));
    
    // Reset to regular close time for next trading day
    nextClose.setHours(US_MARKET_SCHEDULE.close.hour, US_MARKET_SCHEDULE.close.minute, 0, 0);
  }

  // Convert back to local time
  return new Date(nextClose.toLocaleString());
}

/**
 * Get market status with detailed information
 */
export function getMarketStatus(date: Date = new Date()) {
  const isOpen = isMarketOpen(date);
  const nextOpen = isOpen ? null : getNextMarketOpen(date);
  const nextClose = isOpen ? getNextMarketClose(date) : null;
  const holiday = isMarketHoliday(date);

  return {
    isOpen,
    nextOpen,
    nextClose,
    holiday,
    timezone: US_MARKET_SCHEDULE.timezone,
  };
}

/**
 * Get time until next market event (open or close)
 */
export function getTimeUntilNextMarketEvent(from: Date = new Date()) {
  const status = getMarketStatus(from);
  const now = from.getTime();

  if (status.isOpen && status.nextClose) {
    return {
      event: 'close' as const,
      timeMs: status.nextClose.getTime() - now,
      date: status.nextClose,
    };
  }

  if (!status.isOpen && status.nextOpen) {
    return {
      event: 'open' as const,
      timeMs: status.nextOpen.getTime() - now,
      date: status.nextOpen,
    };
  }

  return null;
}

/**
 * Format time duration in a human-readable way
 */
export function formatDuration(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const totalMinutes = Math.floor(totalSeconds / 60);
  const totalHours = Math.floor(totalMinutes / 60);
  const totalDays = Math.floor(totalHours / 24);

  if (totalDays > 0) {
    const hours = totalHours % 24;
    return `${totalDays}d ${hours}h`;
  }

  if (totalHours > 0) {
    const minutes = totalMinutes % 60;
    return `${totalHours}h ${minutes}m`;
  }

  if (totalMinutes > 0) {
    return `${totalMinutes}m`;
  }

  return `${totalSeconds}s`;
}

/**
 * Format time until next market event
 */
export function formatTimeUntilMarketEvent(from: Date = new Date()): string {
  const nextEvent = getTimeUntilNextMarketEvent(from);
  
  if (!nextEvent) {
    return 'Unknown';
  }

  const duration = formatDuration(nextEvent.timeMs);
  return `${duration} until market ${nextEvent.event}s`;
}

/**
 * Check if it's pre-market hours (4:00 AM - 9:30 AM ET)
 */
export function isPreMarketHours(date: Date = new Date()): boolean {
  const easternTime = new Date(date.toLocaleString("en-US", { timeZone: "America/New_York" }));
  const day = easternTime.getDay();
  const hour = easternTime.getHours();
  const minute = easternTime.getMinutes();
  const currentTime = hour * 60 + minute;

  // Not on weekends
  if (day === 0 || day === 6) return false;

  // Not on holidays
  if (isMarketHoliday(easternTime)) return false;

  // Pre-market: 4:00 AM - 9:30 AM ET
  const preMarketStart = 4 * 60; // 4:00 AM
  const marketOpen = US_MARKET_SCHEDULE.open.hour * 60 + US_MARKET_SCHEDULE.open.minute;

  return currentTime >= preMarketStart && currentTime < marketOpen;
}

/**
 * Check if it's after-hours trading (4:00 PM - 8:00 PM ET)
 */
export function isAfterHoursTrading(date: Date = new Date()): boolean {
  const easternTime = new Date(date.toLocaleString("en-US", { timeZone: "America/New_York" }));
  const day = easternTime.getDay();
  const hour = easternTime.getHours();
  const minute = easternTime.getMinutes();
  const currentTime = hour * 60 + minute;

  // Not on weekends
  if (day === 0 || day === 6) return false;

  // Check for early close
  const holiday = isMarketHoliday(easternTime);
  const closeTime = holiday?.earlyCloseTime || US_MARKET_SCHEDULE.close;
  const marketClose = closeTime.hour * 60 + closeTime.minute;
  const afterHoursEnd = 20 * 60; // 8:00 PM

  return currentTime >= marketClose && currentTime < afterHoursEnd;
}

/**
 * Get trading session type
 */
export function getTradingSession(date: Date = new Date()): 'pre-market' | 'market' | 'after-hours' | 'closed' {
  if (isMarketOpen(date)) return 'market';
  if (isPreMarketHours(date)) return 'pre-market';
  if (isAfterHoursTrading(date)) return 'after-hours';
  return 'closed';
}