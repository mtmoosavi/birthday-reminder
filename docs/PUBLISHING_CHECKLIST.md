# چک‌لیست انتشار — یادآور تولد

## پیش از ساخت (Build)

- [x] نام نمایشی: **یادآور تولد**
- [x] شناسه بسته: `com.mtmoosavi.birthdayreminder`
- [x] آیکون‌ها از فایل «Colorful Birthday Cake Icon.png» ساخته شدند
- [x] مجوزها به حداقل لازم کاهش یافتند
- [x] برنامه کاملاً آفلاین است (بدون اینترنت، بدون تبلیغ، بدون ردیاب)

## ساخت فایل نهایی

```powershell
# ۱) نصب وابستگی‌ها
npm install

# ۲) ساخت فایل وب + همگام‌سازی با اندروید
npm run cap:sync

# ۳) ساخت APK امضاشده برای انتشار
cd android
./gradlew.bat assembleRelease
# خروجی: android/app/build/outputs/apk/release/app-release.apk
```

## برای آپلود در بازار / مایکت

- [ ] فایل `app-release.apk` را آپلود کنید
- [ ] آیکون ۵۱۲×۵۱۲ (`public/icon-512.png`)
- [ ] تصویر کاور ۱۰۲۴×۵۰۰
- [ ] حداقل ۲ اسکرین‌شات
- [ ] توضیحات کوتاه و کامل (از `STORE_LISTING.md`)
- [ ] لینک سیاست حریم خصوصی: `https://mtmoosavi.github.io/birthday-reminder/`
- [ ] تعیین رده‌بندی سنی: همه سنین
- [ ] تکمیل احراز هویت حساب توسعه‌دهنده

## انتشار خودکار در مایکت

دیگر لازم نیست APK را دستی آپلود کنید. راهنمای کامل:
[`docs/PUBLISHING_AUTOMATION.md`](PUBLISHING_AUTOMATION.md)

```powershell
# محلی: ساخت نسخه‌ی امضاشده و ارسال برای بررسی
.\scripts\build-offline.ps1 -Variant release
npm run publish:myket -- --notes "بهبود سرعت و رفع اشکال ها"

# وضعیت بسته‌ها
npm run publish:myket:status
```

- [ ] Secretهای مخزن تنظیم شده‌اند: `MYKET_ACCESS_TOKEN`، `KEYSTORE_BASE64`،
      `KEYSTORE_PASSWORD`، `KEY_ALIAS`، `KEY_PASSWORD`
- [ ] فایل `.myket-token` (برای اجرای محلی) ساخته شده و کامیت نشده است
- [ ] هر انتشار با تگ `v*` یا از تب Actions پیکربندی شده است

## نکات امنیتی مهم

- فایل `keystore/release.keystore` را در جای امن پشتیبان بگیرید.
- `keystore.properties` را هرگز در گیت‌هاب عمومی قرار ندهید (در `.gitignore` هست).
- رمز keystore را در جایی غیر از خود پروژه هم نگه دارید.
