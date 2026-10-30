# نسخه‌ی iPhone — راهنمای ساخت و انتشار

اپ «یادآور تولد» حالا با **Capacitor** برای iOS هم آماده است. همان کد React
دوباره استفاده می‌شود؛ چیزی از منطق برنامه دوباره نوشته نشده و برنامه مثل
نسخه‌ی اندروید **کاملاً آفلاین** می‌ماند (بدون اینترنت، بدون سرور، بدون ردیاب).

---

## ۱) چه چیزی اضافه شده؟

| مورد | مسیر |
| --- | --- |
| پلتفرم iOS | `ios/App/App.xcodeproj` و `ios/App/App.xcworkspace` |
| وابستگی | `@capacitor/ios` |
| آیکون ۱۰۲۴×۱۰۲۴ | `ios/App/App/Assets.xcassets/AppIcon.appiconset/` |
| اسپلش | `ios/App/App/Assets.xcassets/Splash.imageset/` |
| همگام‌سازی نسخه | `scripts/sync-ios-version.mjs` |
| CI مک | `.github/workflows/ios.yml` |

> ⚠️ **ساخت نسخه‌ی iOS فقط روی مک (macOS + Xcode) ممکن است.**
> ویندوز می‌تواند پروژه را بسازد و همگام کند، اما برای کامپایل و امضا باید از
> یک مک، یک مکِ ابری، یا اجراکننده‌ی macOS در GitHub Actions استفاده کنید.

---

## ۲) پیش‌نیازها

- **macOS** با **Xcode 15** یا جدیدتر
- **CocoaPods** (`sudo gem install cocoapods` یا `brew install cocoapods`)
- Node.js 18+
- برای نصب روی گوشی واقعی: یک **Apple ID** (رایگان) کافی است
- برای TestFlight و App Store: عضویت **Apple Developer Program** (سالانه ۹۹ دلار)

---

## ۳) ساخت و اجرا روی مک

```bash
npm ci
npm run ios:sync      # ساخت وب + cap sync ios + ست‌کردن نسخه
npm run ios:open      # باز کردن پروژه در Xcode
```

در Xcode:

1. از نوار بالا شبیه‌ساز (Simulator) یا گوشی متصل را انتخاب کنید.
2. برای گوشی واقعی: تب **Signing & Capabilities** → **Team** را انتخاب کنید
   (با Apple ID خودتان). Bundle ID از قبل `com.mtmoosavi.birthdayreminder`
   تنظیم شده است؛ اگر برای حساب شما اشغال بود، آن را عوض کنید.
3. دکمه‌ی **Run** (⌘R).

اگر روی گوشی واقعی با Apple ID رایگان نصب می‌کنید، امضا **۷ روز** اعتبار دارد و
بعد از آن باید دوباره از Xcode نصب کنید.

### ساخت از خط فرمان (بدون باز کردن Xcode)

```bash
xcodebuild \
  -workspace ios/App/App.xcworkspace \
  -scheme App \
  -configuration Debug \
  -sdk iphonesimulator \
  -destination 'generic/platform=iOS Simulator' \
  CODE_SIGNING_ALLOWED=NO build
```

### بدون مک: گرفتن فایل نصب (IPA) از GitHub Actions

اگر مک ندارید، فایل `.ipa` را با اجراکننده‌ی macOS در GitHub بسازید:

۱. تغییرات را push کنید.
۲. تب **Actions** → **Build iOS app** → **Run workflow**.
۳. بعد از پایان، از بخش **Artifacts** فایل
   `birthday-reminder-ios-ipa` را دانلود کنید؛ داخلش
   `birthday-reminder-1.1.0-unsigned.ipa` است.

> این IPA **امضانشده** است، چون امضا به Apple ID و گواهی شما نیاز دارد.
> روی ویندوز با ابزارهای رایگان زیر امضا و نصب می‌شود:

**نصب با Sideloadly (ویندوز):**

۱. [Sideloadly](https://sideloadly.io) و **iTunes** (نسخه‌ی سایت اپل، نه Microsoft Store)
   را نصب کنید.
۲. آیفون را با کابل وصل کنید و در Sideloadly انتخابش کنید.
۳. فایل `.ipa` را داخل پنجره بکشید، **Apple ID** خود را وارد کنید و **Start** را بزنید.
۴. روی آیفون: **Settings → General → VPN & Device Management** →
   پروفایل توسعه‌دهنده را Trust کنید.

با Apple ID رایگان، برنامه **۷ روز** کار می‌کند و بعد باید دوباره نصب شود.
با Apple Developer Program (۹۹ دلار در سال) این محدودیت برداشته می‌شود.

جایگزین‌ها: **AltStore** و **SideStore** هم همین IPA را قبول می‌کنند.

---

## ۴) نسخه‌گذاری

`package.json` تنها منبع نسخه است. `npm run ios:version` مقادیر زیر را در
`project.pbxproj` می‌نویسد:

- `MARKETING_VERSION` ← همان `version` (مثلاً `1.1.0`)
- `CURRENT_PROJECT_VERSION` ← عدد صعودی مشتق‌شده (`1.1.0` → `10100`)

همان قاعده‌ای است که `android/app/build.gradle` استفاده می‌کند، پس اندروید و iOS
همیشه هم‌نسخه می‌مانند. `npm run ios:sync` این کار را خودکار انجام می‌دهد.

> برای هر انتشار در App Store، `CURRENT_PROJECT_VERSION` باید بزرگ‌تر از
> نسخه‌ی قبلی باشد؛ با بالا بردن نسخه در `package.json` خودکار زیاد می‌شود.

---

## ۵) آیکون و اسپلش

```bash
npm run icons
```

از همان تصویر اصلی (`Colorful Birthday Cake Icon.png`) این‌ها ساخته می‌شوند:

- آیکون ۱۰۲۴×۱۰۲۴ **بدون شفافیت** (شرط اپل)
- اسپلش ۲۷۳۲×۲۷۳۲ برای هر سه مقیاس

---

## ۶) اعلان‌ها در iOS

- در اولین اجرا، iOS خودش اجازه‌ی اعلان را می‌پرسد
  (`LocalNotifications.requestPermissions`).
- iOS حداکثر **۶۴ اعلان در انتظار** نگه می‌دارد و بقیه را بی‌صدا حذف می‌کند.
  برای همین برنامه اعلان‌ها را بر اساس نزدیک‌ترین تاریخ مرتب و به ۶۴ مورد
  محدود می‌کند (`src/lib/notifications.ts`).
- «کانال اعلان» و «آیکون کوچک» مخصوص اندروید هستند و روی iOS نادیده گرفته
  می‌شوند.
- اعلان‌های سالانه برای هر تولد ساخته می‌شوند و بعد از ری‌استارت گوشی هم
  باقی می‌مانند.

---

## ۷) انتشار در App Store / TestFlight

۱. در [App Store Connect](https://appstoreconnect.apple.com) یک App بسازید با
   همان Bundle ID.
۲. در Xcode: **Product → Archive**.
۳. در Organizer: **Distribute App → App Store Connect → Upload**.
۴. در App Store Connect اطلاعات، اسکرین‌شات‌ها (از `store-assets/`) و لینک
   سیاست حریم خصوصی را وارد کنید.

### نکته‌ی مهم برای توسعه‌دهندگان داخل ایران

اپل سرویس App Store و ثبت‌نام Apple Developer Program را برای ایران ارائه
نمی‌کند و پرداخت سالانه از ایران عملاً ممکن نیست. بنابراین:

- **نصب شخصی روی آیفون خودتان:** با Apple ID رایگان و Xcode ممکن است
  (هر ۷ روز تمدید).
- **انتشار عمومی در App Store:** نیاز به حساب توسعه‌دهنده‌ی معتبر در کشوری
  که اپل پشتیبانی می‌کند دارد (شخص حقوقی/حساب خارج از ایران).
- **وب‌اپ (PWA):** بدون App Store هم می‌توان برنامه را روی صفحه‌ی اصلی آیفون
  نصب کرد، اما اعلان محلیِ آفلاین در وب‌اپ iOS محدود است و جای اپ بومی را
  نمی‌گیرد.

---

## ۸) CI

فایل `.github/workflows/ios.yml` روی `macos-14` پروژه را می‌سازد (بدون امضا)
و خروجی شبیه‌ساز را به‌عنوان artifact آپلود می‌کند. این کار تضمین می‌کند
پروژه‌ی Xcode بعد از هر تغییر همچنان کامپایل می‌شود.

برای انتشار خودکار TestFlight باید این Secretها اضافه شوند:

| Secret | توضیح |
| --- | --- |
| `IOS_DISTRIBUTION_CERT_P12` | گواهی توزیع (base64) |
| `IOS_CERT_PASSWORD` | رمز گواهی |
| `IOS_PROVISIONING_PROFILE` | پروفایل توزیع (base64) |
| `APPSTORE_ISSUER_ID` / `APPSTORE_KEY_ID` / `APPSTORE_PRIVATE_KEY` | کلید App Store Connect API |
