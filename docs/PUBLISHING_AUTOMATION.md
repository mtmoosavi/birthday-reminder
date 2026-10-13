# انتشار خودکار در مایکت و بازار

این سند دو مسیر انتشار خودکار را توضیح می‌دهد:

- **مایکت** — از طریق API رسمی انتشار (خودکار، از GitHub Actions یا سیستم خودتان)
- **بازار** — از طریق پنل پیشخوان (دستی؛ بازار API انتشار عمومی ندارد)

> ⚠️ برنامه‌ی «یادآور تولد» کاملاً آفلاین است و مجوز اینترنت ندارد.
> این اسکریپت‌ها بخشی از **فرآیند توسعه/انتشار** هستند و روی رایانه‌ی شما یا
> سرور CI اجرا می‌شوند؛ هیچ‌وقت داخل خود اپ قرار نمی‌گیرند.

---

## ۱) آماده‌سازی یک‌باره

### الف) توکن مایکت

۱. وارد [پنل توسعه‌دهندگان مایکت](https://developer.myket.ir) شوید.
۲. برنامه‌ی **یادآور تولد** را باز کنید.
۳. بخش **محصولات درون‌برنامه‌ای** → قسمت محصولات → **«توکن صحت‌سنجی»**.
۴. توکن را کپی کنید. (این توکن فقط برای ارتباط سرور‌به‌سرور است؛ آن را در اپ قرار ندهید.)

سپس یکی از این دو کار را انجام دهید:

- محلی: فایل `.myket-token` را در ریشه‌ی پروژه بسازید و توکن را در آن بگذارید
  (در `.gitignore` هست و کامیت نمی‌شود).
- CI: آن را به‌عنوان Secret با نام `MYKET_ACCESS_TOKEN` در تنظیمات مخزن GitHub ثبت کنید.

### ب) کلید امضای نسخه (Release keystore)

APK منتشرشده باید با کلید ثابت امضا شود؛ در غیر این صورت مایکت نسخه‌ی جدید
را روی نسخه‌ی نصب‌شده‌ی کاربران به‌روزرسانی نمی‌کند.

برای CI، این Secretها را بسازید (نام‌ها دقیقاً همین باشند):

| Secret | مقدار |
| --- | --- |
| `KEYSTORE_BASE64` | خروجی base64 از فایل `keystore/release.keystore` |
| `KEYSTORE_PASSWORD` | رمز keystore |
| `KEY_ALIAS` | نام کلید (مثلاً `birthday-reminder`) |
| `KEY_PASSWORD` | رمز کلید |

ساخت مقدار base64 در PowerShell:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("keystore\release.keystore")) | Set-Clipboard
```

> 🔐 **مهم:** فایل `keystore.properties` و فایل keystore هرگز نباید در مخزن
> عمومی قرار بگیرند. اگر رمزها جایی افشا شده‌اند، keystore را با رمز جدید
> دوباره بسازید (گم‌شدن کلید یعنی ناتوانی در به‌روزرسانی اپ).

---

## ۲) مسیر CI (GitHub Actions) — خودکار

فایل [`.github/workflows/release-myket.yml`](../.github/workflows/release-myket.yml):
نسخه‌ی امضاشده می‌سازد، `versionCode` را از شماره‌ی اجرا (run number) می‌گیرد،
و آن را به مایکت می‌فرستد.

### اجرای دستی
از تب **Actions** → «Release to Myket» → **Run workflow**. ورودی‌ها:

- `release_notes` — متن تغییرات (فارسی، به کاربر نمایش داده می‌شود)
- `version_name` — نام نسخه، مثلاً `1.1.0` (خالی = از `package.json`)
- `publish` — اگر خاموش باشد فقط APK ساخته می‌شود (بدون ارسال)
- `manual_publish` — بعد از تأیید مدیر، انتشار دستی انجام شود
- `rollout` — درصد انتشار تدریجی (۱ تا ۱۰۰)

### اجرای خودکار با تگ
با ساختن و پوش‌کردن یک تگ مثل `v1.1.0`:

```bash
git tag v1.1.0
git push origin v1.1.0
```

نسخه ساخته و به مایکت ارسال می‌شود و یک GitHub Release هم ایجاد می‌گردد.

> `versionCode` = شماره‌ی اجرای Workflow (`github.run_number`) — همیشه یکتا و
> صعودی است، پس مایکت همیشه آن را به‌عنوان «نسخه‌ی جدیدتر» می‌پذیرد.

---

## ۳) مسیر محلی — یک فرمان

### الف) فقط ساخت APK امضاشده

```powershell
.\scripts\build-offline.ps1 -Variant release
# خروجی: APK builds/yadavar-tavalod-<version>-release.apk
```

یا ساده‌تر: روی `Build APK.bat` دوبار کلیک کنید → گزینه ۱.

### ب) ارسال به مایکت

```powershell
# نمایش بسته‌های موجود و وضعیت آن‌ها
npm run publish:myket:status

# ارسال آخرین APK ساخته‌شده برای بررسی
npm run publish:myket -- --notes "بهبود سرعت و رفع اشکال ها"

# تست بدون ارسال واقعی
npm run publish:myket -- --dry-run

# فقط آپلود، بدون ارسال برای بررسی
npm run publish:myket -- --no-commit

# ارسال برای بررسی با نگه‌داشتن برای انتشار دستی بعد از تأیید
npm run publish:myket -- --manual

# لغو درخواست بررسی فعلی
npm run publish:myket -- --revert
```

می‌توانید مسیر APK را هم صریح بدهید:

```powershell
npm run publish:myket -- --apk "APK builds/yadavar-tavalod-1.1.0-release.apk"
```

### ج) از منوی `Build APK.bat`

بعد از ساخت نسخه با گزینه‌ی **۱**، گزینه‌ی **۵** (یا **۶** در منوی اصلی) آخرین
APK را به مایکت می‌فرستد.

---

## ۴) API مایکت که استفاده می‌شود

مبنا: `https://developer.myket.ir/api/partners/applications/{packageName}/release-bundle`

| مرحله | متد | مسیر | کار |
| --- | --- | --- | --- |
| ۱ | `PUT` | `/release-bundle` | ساخت/ویرایش بسته (عنوان، ترجمه‌ها، انتشار تدریجی) |
| ۲ | `PUT` | `/release-bundle/upload` | آپلود فایل APK به‌صورت `multipart/form-data` |
| ۳ | `POST` | `/release-bundle/commit` | ارسال بسته برای بررسی مدیر |

همه‌ی درخواست‌ها هدر `X-Access-Token` می‌خواهند. سرویس‌های بیشتر:
`GET /release-bundle` (لیست نسخه‌ها)، `DELETE /release-bundle/revert`
(لغو بررسی)، `DELETE /release-bundle` (حذف بسته‌ی جاری).

مرجع کامل: <https://myket.ir/kb/pages/developer-cd/>

---

## ۵) بازار (Cafe Bazaar)

بازار API رسمی انتشار ندارد؛ فقط API *خرید درون‌برنامه‌ای* دارد. آپلود نسخه
از طریق [پیشخوان](https://pishkhan.cafebazaar.ir) و دستی انجام می‌شود.

برای اینکه کار دستی سریع باشد، همین APK امضاشده را آپلود کنید و از فایل‌های
`store-assets/` و متن `STORE_LISTING.md` استفاده کنید.

---

## ۶) چک‌لیست هر انتشار

- [ ] `npm run typecheck` و `npm run build` بدون خطا
- [ ] `versionName` به‌روز شده (و `versionCode` بزرگ‌تر از نسخه‌ی قبل)
- [ ] APK با همان کلید همیشگی امضا شده (`apksigner verify`)
- [ ] متن تغییرات را در `release_notes` نوشته‌اید
- [ ] `npm run publish:myket:status` وضعیت درست را نشان می‌دهد
- [ ] پس از انتشار، `--status` را دوباره بزنید تا تأیید مدیر را ببینید
