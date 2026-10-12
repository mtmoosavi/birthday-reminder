// Jalali (Shamsi) calendar utilities

const JALALI_MONTHS = [
  "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
  "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند",
];

// Convert Gregorian date to Jalali
export function toJalali(date: Date): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-u-ca-persian", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(date);

  const value = (type: "year" | "month" | "day") =>
    Number(parts.find((part) => part.type === type)?.value);

  return { year: value("year"), month: value("month"), day: value("day") };
}

// Get days until next birthday
export function getDaysUntil(
  birthYear: number,
  birthMonth: number,
  birthDay: number,
  today: { year: number; month: number; day: number }
): number {
  // The birth year is intentionally not used: reminders target the next annual
  // occurrence of the Jalali month/day, not the original date of birth.
  void birthYear;

  const hasPassed =
    birthMonth < today.month ||
    (birthMonth === today.month && birthDay < today.day);
  const occurrenceYear = today.year + (hasPassed ? 1 : 0);

  const from = jalaliToGregorian(today.year, today.month, today.day);
  const to = jalaliToGregorian(occurrenceYear, birthMonth, birthDay);
  const millisecondsPerDay = 24 * 60 * 60 * 1000;

  return Math.round(
    (Date.UTC(to.year, to.month - 1, to.day) -
      Date.UTC(from.year, from.month - 1, from.day)) /
      millisecondsPerDay
  );
}

export function jalaliToGregorian(year: number, month: number, day: number) {
  let jy = year + 1595;
  let days = -355668 + 365 * jy + Math.floor(jy / 33) * 8 + Math.floor(((jy % 33) + 3) / 4) + day;
  days += month < 7 ? (month - 1) * 31 : (month - 7) * 30 + 186;

  let gy = 400 * Math.floor(days / 146097);
  days %= 146097;
  if (days > 36524) {
    gy += 100 * Math.floor(--days / 36524);
    days %= 36524;
    if (days >= 365) days++;
  }
  gy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    gy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }

  const monthDays = [31, isGregorianLeapYear(gy) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let gm = 1;
  while (gm <= 12 && days >= monthDays[gm - 1]) days -= monthDays[gm++ - 1];
  return { year: gy, month: gm, day: days + 1 };
}

/** Jalali (Shamsi) date -> Gregorian Date at local midnight */
export function jalaliToDate(year: number, month: number, day: number): Date {
  const g = jalaliToGregorian(year, month, day);
  return new Date(g.year, g.month - 1, g.day);
}

/** Today's Jalali date */
export function todayJalali(): { year: number; month: number; day: number } {
  return toJalali(new Date());
}

/**
 * The next upcoming Gregorian Date for a yearly Jalali month/day.
 * If this year's occurrence already passed, returns next year's.
 */
export function nextOccurrence(month: number, day: number, from = new Date()): Date {
  const today = toJalali(from);
  const hasPassed = month < today.month || (month === today.month && day < today.day);
  const year = today.year + (hasPassed ? 1 : 0);
  return jalaliToDate(year, month, day);
}

function isGregorianLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

export function getMonthName(month: number): string {
  return JALALI_MONTHS[month - 1] || "";
}

export function formatJalaliDate(year: number, month: number, day: number): string {
  return `${day} ${getMonthName(month)} ${year}`;
}
