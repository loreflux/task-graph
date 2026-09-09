'use client';

import React, { useEffect, useRef } from 'react';
import { useSettingsStore } from '@/stores/settings-store';
import { useUIStore } from '@/stores/ui-store';
import { dataAdapter } from '@/lib/storage/data-adapter';
import { toast } from 'sonner';

/**
 * Play gentle synthetic two-tone chime via Web Audio API.
 * 100% offline, zero external sound files required, catches autoplay blocks.
 */
export function playChimeSound(): void {
  try {
    if (typeof window === 'undefined') return;
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    // Resume context if suspended by browser autoplay policy
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    // Pleasant notification chime: Note E5 (659.25Hz) to G#5 (830.61Hz)
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now);
    osc1.frequency.exponentialRampToValueAtTime(830.61, now + 0.12);

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(659.25, now);
    osc2.frequency.exponentialRampToValueAtTime(830.61, now + 0.12);

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.2, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.6);
    osc2.stop(now + 0.6);
  } catch {
    // Graceful fallback if Web Audio is blocked or unsupported
  }
}

/**
 * Request desktop Notification permission safely.
 */
export async function requestDesktopNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }
  try {
    const perm = await Notification.requestPermission();
    return perm;
  } catch {
    return 'denied';
  }
}

export function DeadlineReminderManager() {
  const { settings } = useSettingsStore();
  const { openDrawer } = useUIStore();

  // Cache to track notified tasks and prevent duplicate notifications within 15 minutes
  const notifiedCache = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    if (!settings.enableDeadlineReminder) return;

    const checkDeadlines = async () => {
      try {
        const tasks = await dataAdapter.getTasks({ includeArchived: false });
        const now = Date.now();
        const thresholdMs = settings.reminderLeadMinutes * 60 * 1000;

        for (const task of tasks) {
          // Skip completed or deleted tasks
          if (task.status === 'DONE' || task.status === 'ARCHIVED' || task.isDeleted) {
            continue;
          }

          if (!task.endAt) continue;

          // Safe Date normalization (handles Date instance or ISO string)
          const endDate =
            task.endAt instanceof Date ? task.endAt : new Date(task.endAt);
          if (isNaN(endDate.getTime())) continue;

          const diffMs = endDate.getTime() - now;
          const remainingMinutes = Math.ceil(diffMs / (60 * 1000));

          // Condition: approaching deadline within threshold, but not yet expired
          if (diffMs > 0 && diffMs <= thresholdMs) {
            const cacheKey = `${task.id}_${endDate.getTime()}`;
            const lastNotified = notifiedCache.current.get(cacheKey);

            // Notify at most once per 15 minutes for the same task deadline
            if (!lastNotified || now - lastNotified > 15 * 60 * 1000) {
              notifiedCache.current.set(cacheKey, now);

              // 1. Toast Notification inside web app
              toast.warning(`任务临期提醒：即将到期`, {
                description: `「${task.title}」将在 ${remainingMinutes} 分钟后截止，请及时处理！`,
                duration: 9000,
                action: {
                  label: '查看任务',
                  onClick: () => openDrawer(task.id, task),
                },
              });

              // 2. Gentle sound alert
              if (settings.enableAudioAlert) {
                playChimeSound();
              }

              // 3. Desktop Native Notification
              if (
                settings.enableDesktopNotification &&
                typeof window !== 'undefined' &&
                'Notification' in window &&
                Notification.permission === 'granted'
              ) {
                try {
                  const n = new Notification('任务临期提醒', {
                    body: `任务「${task.title}」将在 ${remainingMinutes} 分钟后截止！`,
                    tag: `deadline-${task.id}`,
                  });
                  n.onclick = () => {
                    window.focus();
                    openDrawer(task.id, task);
                  };
                } catch {}
              }
            }
          }
        }
      } catch (err) {
        // Silent error handling in reminder loop
      }
    };

    // Run initial check after 2 seconds
    const initialTimer = setTimeout(checkDeadlines, 2000);

    // Periodic check every 20 seconds
    const interval = setInterval(checkDeadlines, 20 * 1000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [
    settings.enableDeadlineReminder,
    settings.reminderLeadMinutes,
    settings.enableAudioAlert,
    settings.enableDesktopNotification,
    openDrawer,
  ]);

  return null; // Headless component
}
