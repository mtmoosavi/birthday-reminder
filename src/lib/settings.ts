export interface ReminderSettings {
  /** Master switch for birthday reminders */
  enabled: boolean;
  /** How many days before the birthday to remind (0 = on the day itself) */
  daysBefore: number[];
  /** Hour of day (0-23) to fire reminders */
  hour: number;
  /** Minute of hour (0-59) to fire reminders */
  minute: number;
}

export const DEFAULT_SETTINGS: ReminderSettings = {
  enabled: true,
  daysBefore: [7, 0],
  hour: 9,
  minute: 0,
};

export const OFFSET_OPTIONS = [30, 14, 7, 3, 1, 0];

const KEY = 'birthday-reminder-settings';

export function loadSettings(): ReminderSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      enabled: typeof parsed.enabled === 'boolean' ? parsed.enabled : DEFAULT_SETTINGS.enabled,
      daysBefore: Array.isArray(parsed.daysBefore)
        ? parsed.daysBefore.filter((n: unknown) => typeof n === 'number' && n >= 0 && n <= 365)
        : DEFAULT_SETTINGS.daysBefore,
      hour: Number.isInteger(parsed.hour) && parsed.hour >= 0 && parsed.hour <= 23 ? parsed.hour : DEFAULT_SETTINGS.hour,
      minute: Number.isInteger(parsed.minute) && parsed.minute >= 0 && parsed.minute <= 59 ? parsed.minute : DEFAULT_SETTINGS.minute,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: ReminderSettings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    /* storage full / private mode — non-fatal */
  }
}

export function offsetLabel(days: number): string {
  if (days === 0) return 'روز تولد';
  if (days === 1) return 'یک روز قبل';
  if (days === 7) return 'یک هفته قبل';
  if (days === 14) return 'دو هفته قبل';
  if (days === 30) return 'یک ماه قبل';
  return `${days} روز قبل`;
}

export function formatTime(hour: number, minute: number): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(hour)}:${pad(minute)}`;
}
