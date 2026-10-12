import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

export const isNative = Capacitor.isNativePlatform();

export async function scheduleBirthdayNotification(
  name: string,
  birthDate: Date,
  note?: string
) {
  if (!isNative) return;

  const now = new Date();
  const nextBirthday = new Date(
    now.getFullYear(),
    birthDate.getMonth(),
    birthDate.getDate()
  );

  if (nextBirthday < now) {
    nextBirthday.setFullYear(now.getFullYear() + 1);
  }

  const notifyDate = new Date(nextBirthday);
  notifyDate.setDate(notifyDate.getDate() - 7);
  notifyDate.setHours(9, 0, 0, 0);

  await LocalNotifications.requestPermissions();

  await LocalNotifications.schedule({
    notifications: [
      {
        id: Math.floor(Math.random() * 100000),
        title: `🎂 ${name}'s birthday is in 7 days!`,
        body: note || `Don't forget to wish ${name} a happy birthday!`,
        schedule: {
          at: notifyDate,
          allowWhileIdle: true,
        },
        extra: {
          name,
        },
      },
    ],
  });
}

export async function scheduleBirthdayDayNotification(
  name: string,
  birthDate: Date,
  note?: string
) {
  if (!isNative) return;

  const now = new Date();
  const nextBirthday = new Date(
    now.getFullYear(),
    birthDate.getMonth(),
    birthDate.getDate()
  );

  if (nextBirthday < now) {
    nextBirthday.setFullYear(now.getFullYear() + 1);
  }

  nextBirthday.setHours(9, 0, 0, 0);

  await LocalNotifications.requestPermissions();

  await LocalNotifications.schedule({
    notifications: [
      {
        id: Math.floor(Math.random() * 100000) + 1,
        title: `🎉 Today is ${name}'s birthday!`,
        body: note || `Wish ${name} a happy birthday today!`,
        schedule: {
          at: nextBirthday,
          allowWhileIdle: true,
        },
        extra: {
          name,
        },
      },
    ],
  });
}