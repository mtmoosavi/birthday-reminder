import { useEffect, useState } from 'react';
import {
  Bell,
  BellOff,
  Clock,
  ChevronLeft,
  Send,
  ShieldCheck,
  ShieldAlert,
  Info,
  Trash2,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import {
  OFFSET_OPTIONS,
  offsetLabel,
  formatTime,
  type ReminderSettings,
} from '@/lib/settings';
import { sendTestNotification } from '@/lib/notifications';

interface SettingsScreenProps {
  settings: ReminderSettings;
  onChange: (settings: ReminderSettings) => void;
  /** granted | denied | prompt | unsupported */
  permission: string;
  onRequestPermission: () => void;
  canShowBanner: boolean;
  birthdayCount: number;
  onClearAll: () => void;
  onBack: () => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = [0, 5, 10, 15, 20, 30, 45];

export function SettingsScreen({
  settings,
  onChange,
  permission,
  onRequestPermission,
  canShowBanner,
  birthdayCount,
  onClearAll,
  onBack,
}: SettingsScreenProps) {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'idle' | 'ok' | 'fail'>('idle');
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    if (testResult === 'idle') return;
    const t = setTimeout(() => setTestResult('idle'), 4000);
    return () => clearTimeout(t);
  }, [testResult]);

  const toggleOffset = (days: number) => {
    const has = settings.daysBefore.includes(days);
    const daysBefore = has
      ? settings.daysBefore.filter((d) => d !== days)
      : [...settings.daysBefore, days].sort((a, b) => b - a);
    onChange({ ...settings, daysBefore });
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult('idle');
    const ok = await sendTestNotification();
    setTesting(false);
    setTestResult(ok ? 'ok' : 'fail');
  };

  const permissionGranted = permission === 'granted';

  return (
    <div className="min-h-screen relative bg-gradient-to-br from-rose-100 via-orange-50 to-amber-100">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-gradient-to-br from-rose-200 to-orange-200 opacity-40 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full bg-gradient-to-br from-amber-200 to-yellow-200 opacity-40 blur-3xl" />
      </div>

      <div className="relative max-w-md mx-auto px-4 pt-6 pb-24 safe-top safe-bottom">
        {/* Header */}
        <header className="flex items-center gap-3 mb-6">
          <button
            onClick={onBack}
            aria-label="بازگشت"
            className="p-2.5 rounded-2xl bg-white/80 backdrop-blur shadow-sm text-slate-600 hover:text-rose-500 hover:bg-white transition-all active:scale-95"
          >
            <ChevronLeft className="w-5 h-5 rotate-180" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-800">تنظیمات</h1>
            <p className="text-xs text-slate-500">مدیریت یادآورها و اعلان‌ها</p>
          </div>
        </header>

        {/* Master switch */}
        <section className="rounded-3xl bg-white/95 backdrop-blur border-0 shadow-sm p-5 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'p-2.5 rounded-2xl',
                  settings.enabled
                    ? 'bg-gradient-to-br from-rose-500 to-orange-500 text-white'
                    : 'bg-slate-100 text-slate-400'
                )}
              >
                {settings.enabled ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
              </div>
              <div>
                <p className="font-semibold text-slate-800">یادآور تولد</p>
                <p className="text-xs text-slate-500">
                  {settings.enabled ? 'فعال — اعلان‌ها ارسال می‌شوند' : 'غیرفعال'}
                </p>
              </div>
            </div>
            <Switch
              checked={settings.enabled}
              onCheckedChange={(v) => onChange({ ...settings, enabled: v })}
              aria-label="فعال یا غیرفعال کردن یادآورها"
            />
          </div>
        </section>

        {/* Permission banner */}
        {canShowBanner && !permissionGranted && (
          <section
            className={cn(
              'rounded-3xl p-5 mb-4 border shadow-sm',
              permission === 'denied'
                ? 'bg-rose-50 border-rose-200'
                : 'bg-amber-50 border-amber-200'
            )}
          >
            <div className="flex items-start gap-3">
              <ShieldAlert
                className={cn(
                  'w-5 h-5 mt-0.5 shrink-0',
                  permission === 'denied' ? 'text-rose-500' : 'text-amber-500'
                )}
              />
              <div className="flex-1">
                <p className="font-semibold text-slate-800 text-sm">
                  {permission === 'denied'
                    ? 'اجازه اعلان رد شده است'
                    : 'اجازه اعلان داده نشده'}
                </p>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  {permission === 'denied'
                    ? 'برای دریافت یادآورها، از تنظیمات گوشی > برنامه‌ها > یادآور تولد، اجازه اعلان را فعال کنید.'
                    : 'برای اینکه یادآورها به گوشی شما ارسال شوند، اجازه اعلان لازم است.'}
                </p>
                {permission !== 'denied' && (
                  <Button
                    onClick={onRequestPermission}
                    className="mt-3 h-10 rounded-2xl bg-gradient-to-l from-rose-500 to-orange-500 text-white text-sm"
                  >
                    <Bell className="w-4 h-4 ml-2" />
                    فعال‌سازی اعلان‌ها
                  </Button>
                )}
              </div>
            </div>
          </section>
        )}

        {permissionGranted && (
          <section className="rounded-3xl bg-emerald-50 border border-emerald-200 p-4 mb-4 flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
            <p className="text-sm text-emerald-800">
              اعلان‌ها فعال است — یادآورها به گوشی شما ارسال می‌شوند.
            </p>
          </section>
        )}

        {/* Reminder timing */}
        <section className="rounded-3xl bg-white/95 backdrop-blur shadow-sm p-5 mb-4">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-rose-500" />
            <h2 className="font-semibold text-slate-800">زمان اعلان</h2>
          </div>

          <p className="text-xs text-slate-500 mb-2">ساعت</p>
          <div className="grid grid-cols-6 gap-2 mb-4">
            {HOURS.map((h) => (
              <button
                key={h}
                onClick={() => onChange({ ...settings, hour: h })}
                className={cn(
                  'py-2 rounded-xl text-sm font-medium transition-all active:scale-95',
                  settings.hour === h
                    ? 'bg-gradient-to-l from-rose-500 to-orange-500 text-white shadow-md shadow-rose-200'
                    : 'bg-slate-50 text-slate-600 hover:bg-rose-50'
                )}
              >
                {h}
              </button>
            ))}
          </div>

          <p className="text-xs text-slate-500 mb-2">دقیقه</p>
          <div className="grid grid-cols-6 gap-2">
            {MINUTES.map((m) => (
              <button
                key={m}
                onClick={() => onChange({ ...settings, minute: m })}
                className={cn(
                  'py-2 rounded-xl text-sm font-medium transition-all active:scale-95',
                  settings.minute === m
                    ? 'bg-gradient-to-l from-rose-500 to-orange-500 text-white shadow-md shadow-rose-200'
                    : 'bg-slate-50 text-slate-600 hover:bg-rose-50'
                )}
              >
                {m.toString().padStart(2, '0')}
              </button>
            ))}
          </div>

          <p className="text-xs text-slate-400 mt-4">
            یادآورها هر روز ساعت {formatTime(settings.hour, settings.minute)} بررسی و ارسال می‌شوند.
          </p>
        </section>

        {/* When to remind */}
        <section className="rounded-3xl bg-white/95 backdrop-blur shadow-sm p-5 mb-4">
          <div className="flex items-center gap-2 mb-1">
            <Bell className="w-4 h-4 text-rose-500" />
            <h2 className="font-semibold text-slate-800">چه زمانی یادآوری شود؟</h2>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            می‌توانید چند زمان مختلف را همزمان انتخاب کنید.
          </p>

          <div className="flex flex-wrap gap-2">
            {OFFSET_OPTIONS.map((days) => {
              const active = settings.daysBefore.includes(days);
              return (
                <button
                  key={days}
                  onClick={() => toggleOffset(days)}
                  className={cn(
                    'px-4 py-2.5 rounded-2xl text-sm font-medium transition-all active:scale-95',
                    active
                      ? 'bg-gradient-to-l from-rose-500 to-orange-500 text-white shadow-md shadow-rose-200'
                      : 'bg-slate-50 text-slate-600 hover:bg-rose-50'
                  )}
                >
                  {offsetLabel(days)}
                </button>
              );
            })}
          </div>

          {settings.daysBefore.length === 0 && (
            <p className="text-xs text-rose-500 mt-3 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5" />
              حداقل یک زمان یادآوری انتخاب کنید.
            </p>
          )}
        </section>

        {/* Test notification */}
        <section className="rounded-3xl bg-white/95 backdrop-blur shadow-sm p-5 mb-4">
          <div className="flex items-center gap-2 mb-1">
            <Send className="w-4 h-4 text-rose-500" />
            <h2 className="font-semibold text-slate-800">آزمایش اعلان</h2>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            یک اعلان آزمایشی بفرست تا مطمئن شوی اعلان‌ها روی گوشی کار می‌کنند.
          </p>
          <Button
            onClick={handleTest}
            disabled={testing || !permissionGranted}
            variant="outline"
            className="w-full h-11 rounded-2xl border-rose-200 text-rose-600 hover:bg-rose-50 disabled:opacity-50"
          >
            {testing ? (
              <Loader2 className="w-4 h-4 ml-2 animate-spin" />
            ) : (
              <Send className="w-4 h-4 ml-2" />
            )}
            ارسال اعلان آزمایشی
          </Button>
          {testResult === 'ok' && (
            <p className="text-xs text-emerald-600 mt-3">
              اعلان آزمایشی ارسال شد. اگر آن را نمی‌بینید، تنظیمات اعلان گوشی را بررسی کنید.
            </p>
          )}
          {testResult === 'fail' && (
            <p className="text-xs text-rose-500 mt-3">
              ارسال اعلان ناموفق بود. لطفاً اجازه اعلان را فعال کنید.
            </p>
          )}
        </section>

        {/* Danger zone */}
        <section className="rounded-3xl bg-white/95 backdrop-blur shadow-sm p-5">
          <h2 className="font-semibold text-slate-800 mb-1">داده‌ها</h2>
          <p className="text-xs text-slate-500 mb-4">
            {birthdayCount > 0
              ? `${birthdayCount} تولد ذخیره شده — فقط روی همین گوشی، بدون ارسال به اینترنت.`
              : 'هنوز تولدی ذخیره نشده است.'}
          </p>
          {!confirmClear ? (
            <Button
              onClick={() => setConfirmClear(true)}
              disabled={birthdayCount === 0}
              variant="outline"
              className="w-full h-11 rounded-2xl border-rose-200 text-rose-600 hover:bg-rose-50 disabled:opacity-40"
            >
              <Trash2 className="w-4 h-4 ml-2" />
              حذف همه تولدها
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  onClearAll();
                  setConfirmClear(false);
                }}
                className="flex-1 h-11 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white"
              >
                بله، حذف کن
              </Button>
              <Button
                onClick={() => setConfirmClear(false)}
                variant="outline"
                className="flex-1 h-11 rounded-2xl"
              >
                انصراف
              </Button>
            </div>
          )}
        </section>

        <p className="text-center text-xs text-slate-400 mt-6">یادآور تولد — نسخه ۱.۰.۰</p>
      </div>
    </div>
  );
}
