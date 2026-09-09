import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Generate a nanoid-based unique identifier.
 * For use in client-side temporary IDs before server assignment.
 */
export function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Format a date for display in the user's locale.
 */
export function formatDate(date: Date | null | undefined): string {
  if (!date) return "";
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/**
 * Format a date with time for display.
 */
export function formatDateTime(date: Date | null | undefined): string {
  if (!date) return "";
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/**
 * Format duration in minutes to human-readable string.
 */
export function formatDuration(minutes: number | null | undefined): string {
  if (!minutes) return "";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

/**
 * Check if a date is today.
 */
export function isToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

/**
 * Check if a date is overdue (before now).
 */
export function isOverdue(date: Date | null | undefined): boolean {
  if (!date) return false;
  return date < new Date();
}

/**
 * Parse natural language time input to Date.
 * Supports: "今天 18:00", "明天 09:30", "本周五", "2026-09-20 14:00"
 */
export function parseTimeInput(input: string): Date | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const now = new Date();

  // Try ISO format first: "2026-09-20" or "2026-09-20 14:00"
  const isoMatch = trimmed.match(
    /^(\d{4}-\d{2}-\d{2})(?:\s+(\d{2}):(\d{2}))?$/
  );
  if (isoMatch) {
    const [, datePart, hours, minutes] = isoMatch;
    const date = new Date(datePart);
    if (hours && minutes) {
      date.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    }
    return isNaN(date.getTime()) ? null : date;
  }

  // "今天 HH:MM"
  const todayMatch = trimmed.match(/^今天\s+(\d{1,2}):(\d{2})$/);
  if (todayMatch) {
    const date = new Date(now);
    date.setHours(parseInt(todayMatch[1]), parseInt(todayMatch[2]), 0, 0);
    return date;
  }

  // "明天 HH:MM"
  const tomorrowMatch = trimmed.match(/^明天\s+(\d{1,2}):(\d{2})$/);
  if (tomorrowMatch) {
    const date = new Date(now);
    date.setDate(date.getDate() + 1);
    date.setHours(
      parseInt(tomorrowMatch[1]),
      parseInt(tomorrowMatch[2]),
      0,
      0
    );
    return date;
  }

  // "本周X" where X is 一二三四五六日
  const weekdayMap: Record<string, number> = {
    日: 0,
    一: 1,
    二: 2,
    三: 3,
    四: 4,
    五: 5,
    六: 6,
  };
  const weekMatch = trimmed.match(/^本周([一二三四五六日])$/);
  if (weekMatch) {
    const targetDay = weekdayMap[weekMatch[1]];
    const currentDay = now.getDay();
    const diff = targetDay - currentDay;
    const date = new Date(now);
    date.setDate(date.getDate() + (diff >= 0 ? diff : diff + 7));
    date.setHours(0, 0, 0, 0);
    return date;
  }

  return null;
}
