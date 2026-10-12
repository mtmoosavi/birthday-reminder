# یادآور تولد — Birthday Reminder

یک برنامه‌ی زیبا و کاملاً آفلاین برای یادآوری تولد عزیزان، با **تقویم شمسی
(جلالی)** و **اعلان‌های بومی اندروید**.

A beautiful, fully-offline birthday reminder with a **Shamsi (Jalali) calendar**
and **native Android notifications**.

## امکانات / Features

- **تقویم شمسی** — ثبت و نمایش تاریخ‌ها با تقویم جلالی
- **اعلان بومی** — یادآور واقعی روی گوشی (حتی وقتی برنامه بسته است)
- **تنظیمات یادآور** — انتخاب زمان‌های دلخواه (۳۰/۱۴/۷/۳/۱ روز قبل و روز تولد)
  و ساعت دقیق ارسال
- **اعلان آزمایشی** — برای اطمینان از کارکرد اعلان‌ها
- **رابط فارسی RTL** — کاملاً راست‌چین با فونت وزیرمتن
- **تولد امروز و این هفته** — با جشن و افکت کاغذرنگی
- **محاسبه سن**، **یادداشت برای هر فرد**، **مرتب‌سازی خودکار بر اساس نزدیک‌ترین تولد**
- **حریم خصوصی** — بدون اینترنت، بدون تبلیغ، بدون ردیاب، بدون سرور
- **آیکون و اسپلش اختصاصی** از تصویر کیک رنگی

## پیش‌نیازها / Prerequisites

- Node.js 18+
- JDK 17
- Android SDK (API 34 + Build-Tools 34.0.0)

## توسعه / Development

```bash
npm install
npm run dev            # اجرای نسخه وب (مرورگر)
npm run typecheck      # بررسی تایپ‌ها
npm run icons          # ساخت مجدد آیکون‌ها از تصویر اصلی
npm run store-assets   # ساخت تصاویر فروشگاه
```

> نکته: اعلان‌ها فقط در نسخه بومی اندروید کار می‌کنند، نه در مرورگر.

## ساخت اپلیکیشن اندروید / Android build

```bash
npm run build          # ساخت فایل‌های وب در dist/
npx cap sync android   # همگام‌سازی با پروژه اندروید
cd android
./gradlew.bat assembleDebug     # APK آزمایشی
./gradlew.bat assembleRelease   # APK امضاشده برای انتشار
```

خروجی انتشار: `android/app/build/outputs/apk/release/app-release.apk`

### امضای دیجیتال (Release signing)

فایل `keystore.properties` در ریشه پروژه (و در `.gitignore`) قرار دارد و شامل
مسیر و رمزهای کلید امضا است. اگر این فایل نباشد، بیلد ریلیز به‌صورت
بدون‌امضا (unsigned) ساخته می‌شود و شکست نمی‌خورد.

> **مهم:** فایل `keystore/release.keystore` و رمزهای آن را جای امن نگه دارید.
> گم شدن آن یعنی ناتوانی در آپدیت برنامه در بازار/مایکت.

## ساختار پروژه

```
src/
  App.tsx                     صفحه اصلی + لیست تولدها
  components/
    SettingsScreen.tsx        صفحه تنظیمات (اعلان، زمان، داده‌ها)
    ui/                       کامپوننت‌های پایه (Button, Input, Switch, ...)
  lib/
    jalali.ts                 تبدیل و محاسبات تقویم شمسی
    notifications.ts          موتور اعلان بومی (زمان‌بندی سالانه)
    settings.ts               بارگذاری/ذخیره تنظیمات
    utils.ts                  cn()
android/                      پروژه بومی Capacitor (Android)
docs/
  PRIVACY_POLICY.md           سیاست حریم خصوصی (برای فروشگاه)
  STORE_LISTING.md            متن و اطلاعات فروشگاه بازار/مایکت
  PUBLISHING_CHECKLIST.md     چک‌لیست انتشار
scripts/
  generate-icons.mjs          ساخت آیکون‌ها از تصویر اصلی
  generate-store-assets.mjs   ساخت تصاویر فروشگاه
store-assets/                 تصاویر آماده برای آپلود در فروشگاه
```

## انتشار در بازار و مایکت

همه‌ی اطلاعات، متن‌ها، سیاست حریم خصوصی و چک‌لیست در پوشه `docs/` آماده است.
خلاصه:

1. حساب توسعه‌دهنده در [بازار](https://pishkhan.cafebazaar.ir) و
   [مایکت](https://developer.myket.ir) بسازید (احراز هویت با کد ملی + شبا).
2. `npm run build && npx cap sync android` سپس
   `cd android && ./gradlew.bat assembleRelease`
3. فایل `app-release.apk` را آپلود کنید.
4. آیکون، کاور و اسکرین‌شات‌ها را از `store-assets/` آپلود کنید.
5. لینک سیاست حریم خصوصی (`docs/PRIVACY_POLICY.md`) را منتشر و وارد کنید.

جزئیات کامل: [`docs/STORE_LISTING.md`](docs/STORE_LISTING.md) و
[`docs/PUBLISHING_CHECKLIST.md`](docs/PUBLISHING_CHECKLIST.md)

## مجوزها / Permissions

برنامه فقط مجوزهای ضروری را می‌خواهد:

- `POST_NOTIFICATIONS` — ارسال یادآور
- `SCHEDULE_EXACT_ALARM` / `USE_EXACT_ALARM` — یادآور در ساعت دقیق
- `RECEIVE_BOOT_COMPLETED` — حفظ یادآورها بعد از ری‌استارت
- `VIBRATE` — لرزش اعلان

**برنامه دسترسی اینترنت، موقعیت مکانی، مخاطبین، حافظه یا دوربین ندارد.**

## حریم خصوصی

هیچ داده‌ای جمع‌آوری یا ارسال نمی‌شود. همه چیز روی گوشی شما می‌ماند.
متن کامل: [`docs/PRIVACY_POLICY.md`](docs/PRIVACY_POLICY.md)

## تکنولوژی / Tech stack

React 18 · TypeScript · Vite · Tailwind CSS · Capacitor 6 · lucide-react
