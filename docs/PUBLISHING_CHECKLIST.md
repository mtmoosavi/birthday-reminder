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

## نکات امنیتی مهم

- فایل `keystore/release.keystore` را در جای امن پشتیبان بگیرید.
- `keystore.properties` را هرگز در گیت‌هاب عمومی قرار ندهید (در `.gitignore` هست).
- رمز keystore را در جایی غیر از خود پروژه هم نگه دارید.
