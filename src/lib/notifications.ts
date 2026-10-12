import { Capacitor } from '@capacitor/core';
import {
  LocalNotifications,
  type LocalNotificationSchema,
} from '@capacitor/local-notifications';
import { nextOccurrence } from './jalali';
import type { ReminderSettings } from './settings';

export const isNative = Capacitor.isNativePlatform();

export type PermissionState = 'granted' | 'denied' | 'prompt' | 'unsupported';

export interface Birthday {
  id: string;
  name: string;
  year: number;
  month: number;
  day: number;
  note?: string;
}

const CHANNEL_ID = 'birthdays';
const MAX_ID = 2_000_000_000;

/** Stable 32-bit-ish integer id derived from a birthday id + offset. */
function notificationId(birthdayId: string, offset: number): number {
  let hash = 0;
  const key = `${birthdayId}#${offset}`;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % MAX_ID;
}

/** Android notification channel — created once, safe to call repeatedly. */
export async function ensureChannel(): Promise<void> {
  if (!isNative) return;
  try {
    await LocalNotifications.createChannel({
      id: CHANNEL_ID,
      name: 'یادآور تولد',
      description: 'یادآوری روز تولد عزیزان',
      importance: 5,
      visibility: 1,
      vibration: true,
    });
  } catch {
    /* channel may already exist or be unavailable on older Android */
  }
}

/** Ask for POST_NOTIFICATIONS (Android 13+) and return the resulting state. */
export async function ensureNotificationPermission(): Promise<PermissionState> {
  if (!isNative) return 'unsupported';
  try {
    let status = await LocalNotifications.checkPermissions();
    if (status.display !== 'granted') {
      status = await LocalNotifications.requestPermissions();
    }
    return (status.display as PermissionState) ?? 'prompt';
  } catch {
    return 'prompt';
  }
}

export async function checkNotificationPermission(): Promise<PermissionState> {
  if (!isNative) return 'unsupported';
  try {
    const status = await LocalNotifications.checkPermissions();
    return (status.display as PermissionState) ?? 'prompt';
  } catch {
    return 'prompt';
  }
}

/**
 * Android 12+ restricts exact alarms. Returns true when the app is allowed
 * to schedule exact-timed notifications.
 */
export async function ensureExactAlarmPermission(): Promise<boolean> {
  if (!isNative) return true;
  try {
    const anyNotif = LocalNotifications as unknown as {
      checkExactNotificationSetting?: () => Promise<{ exact_alarm: string }>;
      changeExactNotificationSetting?: () => Promise<{ exact_alarm: string }>;
    };
    if (typeof anyNotif.checkExactNotificationSetting !== 'function') return true;
    let res = await anyNotif.checkExactNotificationSetting();
    if (res.exact_alarm !== 'granted' && typeof anyNotif.changeExactNotificationSetting === 'function') {
      res = await anyNotif.changeExactNotificationSetting();
    }
    return res.exact_alarm === 'granted';
  } catch {
    return true;
  }
}

export async function cancelAllNotifications(): Promise<void> {
  if (!isNative) return;
  try {
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length) {
      await LocalNotifications.cancel({ notifications: pending.notifications.map((n) => ({ id: n.id })) });
    }
  } catch {
    /* nothing scheduled */
  }
}

/**
 * (Re)build every scheduled birthday reminder from the user's settings.
 * Uses a yearly repeating schedule so reminders keep firing even if the app
 * is not opened again.
 */
export async function syncScheduledNotifications(
  birthdays: Birthday[],
  settings: ReminderSettings
): Promise<{ scheduled: number }> {
  if (!isNative) return { scheduled: 0 };

  await ensureChannel();
  await cancelAllNotifications();

  if (!settings.enabled || birthdays.length === 0) return { scheduled: 0 };

  const notifications: LocalNotificationSchema[] = [];
  const seen = new Set<number>();

  for (const b of birthdays) {
    const occurrence = nextOccurrence(b.month, b.day);

    for (const offset of settings.daysBefore) {
      const when = new Date(occurrence);
      when.setDate(when.getDate() - offset);
      when.setHours(settings.hour, settings.minute, 0, 0);

      const id = notificationId(b.id, offset);
      if (seen.has(id)) continue;
      seen.add(id);

      const title =
        offset === 0 ? `🎉 امروز تولد ${b.name} است!` : `🎂 تولد ${b.name} نزدیک است`;
      const fallbackBody =
        offset === 0
          ? `امروز تولد ${b.name} است — تبریک بگو!`
          : offset === 1
            ? `فردا تولد ${b.name} است — فراموش نکن!`
            : `${offset} روز تا تولد ${b.name} باقی مانده.`;
      const body = b.note?.trim() || fallbackBody;

      notifications.push({
        id,
        title,
        body,
        channelId: CHANNEL_ID,
        smallIcon: 'ic_stat_birthday',
        schedule: {
          on: {
            month: when.getMonth() + 1,
            day: when.getDate(),
            hour: when.getHours(),
            minute: when.getMinutes(),
          },
          every: 'year' as const,
          allowWhileIdle: true,
        },
        extra: { birthdayId: b.id, name: b.name, offset },
      });
    }
  }

  if (!notifications.length) return { scheduled: 0 };

  try {
    await LocalNotifications.schedule({ notifications });
    return { scheduled: notifications.length };
  } catch {
    return { scheduled: 0 };
  }
}

/** Fire an immediate test notification so the user can confirm it works. */
export async function sendTestNotification(): Promise<boolean> {
  if (!isNative) return false;
  try {
    const permission = await ensureNotificationPermission();
    if (permission !== 'granted') return false;
    await ensureChannel();
    await LocalNotifications.schedule({
      notifications: [
        {
          id: notificationId('test', Math.floor(Math.random() * 1000)),
          title: '🎂 یادآور تولد فعال است',
          body: 'این یک اعلان آزمایشی است — یادآورهای واقعی در زمان مقرر ارسال می‌شوند.',
          channelId: CHANNEL_ID,
          smallIcon: 'ic_stat_birthday',
        },
      ],
    });
    return true;
  } catch {
    return false;
  }
}
