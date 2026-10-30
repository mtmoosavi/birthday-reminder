# تغییرات نسخه‌ها / Changelog

یادآور تولد — یادداشت‌های هر نسخه.

بخش «فارسی» نسخه‌ی جاری در `package.json` به‌طور خودکار به‌عنوان
«توضیحات نسخه» (release notes) در مایکت ثبت می‌شود؛ بخش «English» هم به‌عنوان
ترجمه‌ی انگلیسی همان متن ارسال می‌شود. برای دیدن متنی که ارسال خواهد شد:

```bash
npm run publish:myket:notes
```

قالب هر نسخه: یک تیتر `## <version>` و در ادامه دو زیربخش `### فارسی` و
`### English`. متن هر بخش عیناً همان چیزی است که کاربر در صفحه‌ی اپ می‌بیند.

---

## 1.1.0

### فارسی

- حالت شب: ظاهر تیره با یک کلید، به‌صورت پیش‌فرض هماهنگ با تنظیمات گوشی
- بهبود خوانایی و مرتب‌سازی رابط کاربری
- رفع چند اشکال گزارش‌شده

### English

- Night mode: a dark theme with a single toggle, defaulting to your phone's setting
- Cleaner, more readable interface
- Several reported bugs fixed

## 1.0.0

### فارسی

- انتشار اولیه: ثبت تولدها روی تقویم شمسی، یادآوری اعلان و پشتیبانی کامل آفلاین

### English

- First release: birthdays on the Jalali calendar, notification reminders, fully offline
