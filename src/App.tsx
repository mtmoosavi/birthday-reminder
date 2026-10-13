import { useState, useEffect, useMemo, useCallback } from "react";
import { Cake, Plus, Bell, Trash2, Sparkles, Gift, Star, Music, PartyPopper, ChevronDown, X, Settings, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { SettingsScreen } from "@/components/SettingsScreen";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";
import { toJalali, getDaysUntil, getMonthName } from "@/lib/jalali";
import { loadTheme, saveTheme, applyTheme, type ThemeMode } from "@/lib/theme";
import {
  loadSettings,
  saveSettings,
  type ReminderSettings,
} from "@/lib/settings";
import {
  isNative,
  ensureNotificationPermission,
  checkNotificationPermission,
  ensureExactAlarmPermission,
  syncScheduledNotifications,
  cancelAllNotifications,
} from "@/lib/notifications";

interface Birthday {
  id: string;
  name: string;
  year: number;
  month: number;
  day: number;
  note?: string;
}

const STORAGE_KEY = "birthday-reminders";

function readStoredBirthdays(): Birthday[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (b): b is Birthday =>
        b &&
        typeof b.id === "string" &&
        typeof b.name === "string" &&
        typeof b.year === "number" &&
        typeof b.month === "number" &&
        typeof b.day === "number"
    );
  } catch {
    return [];
  }
}

const MONTHS = [
  "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
  "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند",
];

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);
const YEARS = Array.from({ length: 100 }, (_, i) => 1404 - i);

const CONFETTI_COLORS = ["#f43f5e", "#fb7185", "#f97316", "#fbbf24", "#34d399", "#60a5fa"];

type PickerType = "year" | "month" | "day" | null;

export default function App() {
  const [birthdays, setBirthdays] = useState<Birthday[]>([]);
  const [name, setName] = useState("");
  const [year, setYear] = useState("");
  const [month, setMonth] = useState("");
  const [day, setDay] = useState("");
  const [note, setNote] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [confetti, setConfetti] = useState<{ id: number; x: number; color: string; delay: number }[]>([]);
  const [activePicker, setActivePicker] = useState<PickerType>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<ReminderSettings>(() => loadSettings());
  const [permission, setPermission] = useState<string>("prompt");
  const [theme, setTheme] = useState<ThemeMode>(() => loadTheme());

  useEffect(() => {
    setBirthdays(readStoredBirthdays());
  }, []);

  useEffect(() => {
    applyTheme(theme);
    saveTheme(theme);
  }, [theme]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(birthdays));
    } catch {
      /* storage full / private mode — non-fatal */
    }
  }, [birthdays]);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  // Keep notification permissions and scheduled reminders in sync.
  useEffect(() => {
    if (!isNative) {
      setPermission("unsupported");
      return;
    }
    let active = true;
    (async () => {
      const current = await checkNotificationPermission();
      if (active) setPermission(current);
    })();
    return () => {
      active = false;
    };
  }, [settings.enabled]);

  useEffect(() => {
    if (!isNative) return;
    let cancelled = false;
    (async () => {
      await ensureExactAlarmPermission();
      if (!cancelled) {
        await syncScheduledNotifications(birthdays, settings);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [birthdays, settings]);

  const requestPermission = useCallback(async () => {
    const result = await ensureNotificationPermission();
    setPermission(result);
    if (result === "granted") {
      await ensureExactAlarmPermission();
      await syncScheduledNotifications(birthdays, settings);
    }
  }, [birthdays, settings]);

  const clearAllBirthdays = useCallback(async () => {
    setBirthdays([]);
    await cancelAllNotifications();
  }, []);

  const sortedBirthdays = useMemo(() => {
    const now = new Date();
    const today = toJalali(now);
    return [...birthdays].sort((a, b) => {
      const aDays = getDaysUntil(a.year, a.month, a.day, today);
      const bDays = getDaysUntil(b.year, b.month, b.day, today);
      return aDays - bDays;
    });
  }, [birthdays]);

  const upcomingThisWeek = useMemo(() => {
    const now = new Date();
    const today = toJalali(now);
    return sortedBirthdays.filter((b) => {
      const days = getDaysUntil(b.year, b.month, b.day, today);
      return days >= 0 && days <= 7;
    });
  }, [sortedBirthdays]);

  const todayBirthdays = useMemo(() => {
    const now = new Date();
    const today = toJalali(now);
    return birthdays.filter((b) => {
      const days = getDaysUntil(b.year, b.month, b.day, today);
      return days === 0;
    });
  }, [birthdays]);

  const addBirthday = () => {
    if (!name.trim() || !year || !month || !day) return;

    const newBirthday: Birthday = {
      id: Date.now().toString(),
      name: name.trim(),
      year: parseInt(year),
      month: parseInt(month),
      day: parseInt(day),
      note: note.trim() || undefined,
    };

    setBirthdays([...birthdays, newBirthday]);
    setName("");
    setYear("");
    setMonth("");
    setDay("");
    setNote("");
    setShowForm(false);

    // Trigger confetti
    const pieces = Array.from({ length: 12 }, (_, i) => ({
      id: Date.now() + i,
      x: Math.random() * 100,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      delay: Math.random() * 0.5,
    }));
    setConfetti(pieces);
    setTimeout(() => setConfetti([]), 3000);
  };

  const removeBirthday = (id: string) => {
    setBirthdays(birthdays.filter((b) => b.id !== id));
  };

  const getStatus = (b: Birthday) => {
    const now = new Date();
    const today = toJalali(now);
    const days = getDaysUntil(b.year, b.month, b.day, today);
    if (days === 0) return "today";
    if (days === 1) return "tomorrow";
    if (days <= 7) return "week";
    return "later";
  };

  const getAge = (birthYear: number) => {
    const now = new Date();
    const today = toJalali(now);
    return today.year - birthYear;
  };

  const getPickerItems = () => {
    if (activePicker === "year") {
      return YEARS.map((y) => ({ value: y.toString(), label: `${y}` }));
    }
    if (activePicker === "month") {
      return MONTHS.map((m, i) => ({ value: (i + 1).toString(), label: m }));
    }
    if (activePicker === "day") {
      return DAYS.map((d) => ({ value: d.toString(), label: `${d}` }));
    }
    return [];
  };

  const handlePickerSelect = (value: string) => {
    if (activePicker === "year") setYear(value);
    if (activePicker === "month") setMonth(value);
    if (activePicker === "day") setDay(value);
    setActivePicker(null);
  };

  const getPickerDisplay = () => {
    if (activePicker === "year") return year ? `${year}` : "انتخاب سال";
    if (activePicker === "month") return month ? MONTHS[parseInt(month) - 1] : "انتخاب ماه";
    if (activePicker === "day") return day ? `${day}` : "انتخاب روز";
    return "";
  };

  if (showSettings) {
    return (
      <SettingsScreen
        settings={settings}
        onChange={setSettings}
        permission={permission}
        onRequestPermission={requestPermission}
        canShowBanner={isNative}
        birthdayCount={birthdays.length}
        onClearAll={clearAllBirthdays}
        onBack={() => setShowSettings(false)}
        theme={theme}
        onToggleTheme={() => setTheme(theme === "dark" ? "light" : "dark")}
      />
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-rose-100 via-orange-50 to-amber-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950" dir="rtl">
      {/* Decorative background elements */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Floating balloons */}
        <div className="absolute top-10 left-8 w-16 h-20 rounded-full bg-gradient-to-b from-rose-300 to-rose-400 opacity-30 blur-sm animate-float" />
        <div className="absolute top-24 right-12 w-12 h-16 rounded-full bg-gradient-to-b from-amber-300 to-amber-400 opacity-30 blur-sm animate-float-delayed" />
        <div className="absolute bottom-32 left-4 w-14 h-18 rounded-full bg-gradient-to-b from-pink-300 to-pink-400 opacity-20 blur-sm animate-float-slow" />
        
        {/* Sparkles */}
        <div className="absolute top-1/3 right-8 text-rose-300 dark:text-rose-400/70 opacity-40 animate-twinkle">
          <Star className="w-6 h-6 fill-current" />
        </div>
        <div className="absolute top-2/3 left-10 text-amber-300 opacity-40 animate-twinkle-delayed">
          <Star className="w-4 h-4 fill-current" />
        </div>
        <div className="absolute top-1/4 left-1/3 text-pink-300 opacity-30 animate-twinkle-slow">
          <Star className="w-5 h-5 fill-current" />
        </div>

        {/* Soft gradient blobs */}
        <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-gradient-to-br from-rose-200 to-orange-200 opacity-40 dark:opacity-20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full bg-gradient-to-br from-amber-200 to-yellow-200 opacity-40 dark:opacity-20 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 rounded-full bg-gradient-to-br from-pink-200 to-rose-200 opacity-30 dark:opacity-15 blur-3xl" />
      </div>

      {/* Confetti animation */}
      {confetti.length > 0 && (
        <div className="fixed inset-0 pointer-events-none z-50">
          {confetti.map((piece) => (
            <div
              key={piece.id}
              className="absolute w-3 h-3 rounded-sm animate-confetti"
              style={{
                left: `${piece.x}%`,
                top: "-20px",
                backgroundColor: piece.color,
                animationDelay: `${piece.delay}s`,
              }}
            />
          ))}
        </div>
      )}

      <div className="relative max-w-md mx-auto px-4 py-6 pb-24">
      {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={() => setShowSettings(true)}
            aria-label="تنظیمات"
            className="p-2.5 rounded-2xl bg-white/70 dark:bg-slate-900/70 backdrop-blur shadow-sm text-slate-500 dark:text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-white dark:hover:bg-slate-800 transition-all active:scale-95"
          >
            <Settings className="w-5 h-5" />
          </button>
          <ThemeToggle mode={theme} onToggle={() => setTheme(theme === "dark" ? "light" : "dark")} />
        </div>
        <header className="mb-8 text-center">
          <div className="relative inline-block mb-3">
            <div className="absolute inset-0 bg-gradient-to-br from-rose-400 to-orange-400 rounded-3xl blur-lg opacity-50 animate-pulse" />
            <div className="relative p-4 rounded-3xl bg-gradient-to-br from-rose-500 to-orange-500 shadow-xl shadow-rose-200">
              <Cake className="w-8 h-8 text-white" />
            </div>
            <div className="absolute -top-1 -right-1 text-amber-300 animate-twinkle">
              <Sparkles className="w-4 h-4 fill-current" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-1">یادآور تولد</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">هیچ روز خاصی را از دست نده</p>
          <div className="mt-3 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-medium shadow-sm">
            <Bell className="w-3.5 h-3.5 animate-ring" />
            یادآوری یک هفته قبل
          </div>
        </header>

        {/* Today's birthdays celebration */}
        {todayBirthdays.length > 0 && (
          <div className="mb-6 p-5 rounded-3xl bg-gradient-to-l from-rose-500 via-pink-500 to-orange-500 text-white shadow-xl shadow-rose-200 relative overflow-hidden">
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-2 right-4 text-white animate-twinkle">
                <Star className="w-4 h-4 fill-current" />
              </div>
              <div className="absolute bottom-3 left-6 text-white animate-twinkle-delayed">
                <Star className="w-3 h-3 fill-current" />
              </div>
              <div className="absolute top-1/2 left-1/3 text-white animate-twinkle-slow">
                <Star className="w-5 h-5 fill-current" />
              </div>
            </div>
            <div className="relative flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-white/20 backdrop-blur">
                <PartyPopper className="w-6 h-6" />
              </div>
              <div>
                <h2 className="font-bold text-lg mb-0.5">تولد امروز!</h2>
                {todayBirthdays.map((b) => (
                  <p key={b.id} className="text-sm text-white/90">
                    {b.name} — {getAge(b.year)} ساله شد!
                  </p>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Upcoming this week banner */}
        {upcomingThisWeek.length > 0 && todayBirthdays.length === 0 && (
          <div className="mb-6 p-4 rounded-3xl bg-gradient-to-l from-rose-500 to-orange-500 text-white shadow-lg shadow-rose-200 relative overflow-hidden">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-3 right-8 text-white animate-twinkle">
                <Star className="w-4 h-4 fill-current" />
              </div>
              <div className="absolute bottom-2 left-10 text-white animate-twinkle-delayed">
                <Star className="w-3 h-3 fill-current" />
              </div>
            </div>
            <div className="relative">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-5 h-5" />
                <h2 className="font-semibold">این هفته در پیش است</h2>
              </div>
              <div className="space-y-1.5">
                {upcomingThisWeek.map((b) => {
                  const now = new Date();
                  const today = toJalali(now);
                  const days = getDaysUntil(b.year, b.month, b.day, today);
                  return (
                    <div key={b.id} className="flex items-center justify-between text-sm">
                      <span className="font-medium flex items-center gap-1.5">
                        <Heart className="w-3.5 h-3.5 fill-current" />
                        {b.name}
                      </span>
                      <span className="text-white/90">
                        {days === 0 ? "امروز!" : days === 1 ? "فردا" : `${days} روز دیگر`}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Add button */}
        {!showForm ? (
          <Button
            onClick={() => setShowForm(true)}
            className="w-full mb-6 py-6 rounded-3xl bg-gradient-to-l from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 text-white shadow-lg shadow-rose-200 text-base font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-5 h-5 ml-2" />
            افزودن تولد
          </Button>
        ) : (
          <Card className="mb-6 rounded-3xl border-0 shadow-xl shadow-rose-100 bg-white/95 dark:bg-slate-900/95 backdrop-blur">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-lg">تولد جدید</h3>
                <button
                  onClick={() => setShowForm(false)}
                  className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 text-sm transition-colors"
                >
                  انصراف
                </button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm text-slate-600 dark:text-slate-300">نام</Label>
                <div className="relative">
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="مثلاً: هما ابوالقاسمی"
                    className="rounded-2xl border-slate-200 dark:border-slate-700 focus:border-rose-400 focus:ring-rose-400 pr-10"
                  />
                  <Gift className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-rose-300 dark:text-rose-400/70" />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm text-slate-600 dark:text-slate-300">تاریخ تولد (شمسی)</Label>
                <div className="grid grid-cols-3 gap-2">
                  {/* Year Picker */}
                  <button
                    onClick={() => setActivePicker("year")}
                    className={cn(
                      "p-2.5 border rounded-2xl text-sm transition-all hover:border-rose-300 dark:hover:border-rose-500/50 active:scale-95 flex items-center justify-between gap-1",
                      year ? "border-rose-300 dark:border-rose-500/50 bg-rose-50 dark:bg-rose-500/15 text-slate-800 dark:text-slate-100" : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-400 dark:text-slate-500"
                    )}
                  >
                    <span className="truncate">{year || "سال"}</span>
                    <ChevronDown className="w-3.5 h-3.5 shrink-0" />
                  </button>

                  {/* Month Picker */}
                  <button
                    onClick={() => setActivePicker("month")}
                    className={cn(
                      "p-2.5 border rounded-2xl text-sm transition-all hover:border-rose-300 dark:hover:border-rose-500/50 active:scale-95 flex items-center justify-between gap-1",
                      month ? "border-rose-300 dark:border-rose-500/50 bg-rose-50 dark:bg-rose-500/15 text-slate-800 dark:text-slate-100" : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-400 dark:text-slate-500"
                    )}
                  >
                    <span className="truncate">{month ? MONTHS[parseInt(month) - 1] : "ماه"}</span>
                    <ChevronDown className="w-3.5 h-3.5 shrink-0" />
                  </button>

                  {/* Day Picker */}
                  <button
                    onClick={() => setActivePicker("day")}
                    className={cn(
                      "p-2.5 border rounded-2xl text-sm transition-all hover:border-rose-300 dark:hover:border-rose-500/50 active:scale-95 flex items-center justify-between gap-1",
                      day ? "border-rose-300 dark:border-rose-500/50 bg-rose-50 dark:bg-rose-500/15 text-slate-800 dark:text-slate-100" : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-400 dark:text-slate-500"
                    )}
                  >
                    <span className="truncate">{day || "روز"}</span>
                    <ChevronDown className="w-3.5 h-3.5 shrink-0" />
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="note" className="text-sm text-slate-600 dark:text-slate-300">یادداشت (اختیاری)</Label>
                <div className="relative">
                  <Input
                    id="note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="مثلاً: کیک شکلاتی دوست دارد"
                    className="rounded-2xl border-slate-200 dark:border-slate-700 focus:border-rose-400 focus:ring-rose-400 pr-10"
                  />
                  <Music className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-300" />
                </div>
              </div>

              <Button
                onClick={addBirthday}
                disabled={!name.trim() || !year || !month || !day}
                className="w-full rounded-2xl bg-gradient-to-l from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 text-white transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100"
              >
                <Sparkles className="w-4 h-4 ml-2" />
                ذخیره تولد
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Birthday list */}
        {sortedBirthdays.length === 0 ? (
          <div className="text-center py-16">
            <div className="relative inline-flex p-6 rounded-3xl bg-white/60 dark:bg-slate-900/60 backdrop-blur mb-4 shadow-lg shadow-rose-100">
              <Gift className="w-12 h-12 text-rose-300 dark:text-rose-400/70" />
              <div className="absolute -top-2 -right-2 text-amber-300 animate-twinkle">
                <Star className="w-4 h-4 fill-current" />
              </div>
            </div>
            <h3 className="font-semibold text-slate-700 dark:text-slate-200 mb-1 text-lg">هنوز تولدی ثبت نشده</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              اولین تولد را اضافه کنید و جشن بگیرید!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedBirthdays.map((b) => {
              const status = getStatus(b);
              const now = new Date();
              const today = toJalali(now);
              const days = getDaysUntil(b.year, b.month, b.day, today);
              return (
                <Card
                  key={b.id}
                  className={cn(
                    "rounded-3xl border-0 shadow-sm transition-all hover:shadow-md hover:scale-[1.01]",
                    status === "today" && "bg-gradient-to-l from-rose-500 to-orange-500 text-white shadow-lg shadow-rose-200",
                    status === "week" && "bg-white/90 dark:bg-slate-900/90 border-r-4 border-r-orange-400 backdrop-blur",
                    status === "later" && "bg-white/70 dark:bg-slate-900/70 backdrop-blur"
                  )}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg shadow-sm",
                          status === "today" ? "bg-white/20 text-white" : "bg-gradient-to-br from-rose-100 to-orange-100 text-rose-500 dark:from-rose-500/25 dark:to-orange-500/25 dark:text-rose-400"
                        )}>
                          {b.name.charAt(0)}
                        </div>
                        <div>
                          <h3 className={cn(
                            "font-semibold",
                            status === "today" ? "text-white" : "text-slate-800 dark:text-slate-100"
                          )}>
                            {b.name}
                          </h3>
                          <p className={cn(
                            "text-xs",
                            status === "today" ? "text-white/80" : "text-slate-500 dark:text-slate-400"
                          )}>
                            {b.day} {getMonthName(b.month)} {b.year}
                            {b.note && ` • ${b.note}`}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="text-left">
                          <div className={cn(
                            "text-sm font-semibold",
                            status === "today" ? "text-white" : "text-slate-700 dark:text-slate-200"
                          )}>
                            {status === "today" ? "امروز!" : status === "tomorrow" ? "فردا" : `${days} روز`}
                          </div>
                          {status === "week" && (
                            <div className="text-[10px] text-orange-500 dark:text-orange-400 font-medium">این هفته</div>
                          )}
                        </div>
                        <button
                          onClick={() => removeBirthday(b.id)}
                          className={cn(
                            "p-2 rounded-xl transition-all hover:scale-110 active:scale-95",
                            status === "today" ? "text-white/70 hover:text-white hover:bg-white/10" : "text-slate-300 dark:text-slate-600 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/15"
                          )}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Bottom padding for safe area */}
        <div className="h-4" />
      </div>

      {/* Mobile Bottom Sheet Picker */}
      {activePicker && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
            onClick={() => setActivePicker(null)}
          />

          {/* Bottom Sheet */}
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-t-3xl shadow-2xl animate-slide-up overflow-hidden">
            {/* Drag handle */}
            <div className="pt-3 pb-1 flex justify-center">
              <div className="w-12 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700" />
            </div>

            {/* Header */}
            <div className="px-6 py-3 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-semibold text-slate-800 dark:text-slate-100">
                {activePicker === "year" && "انتخاب سال"}
                {activePicker === "month" && "انتخاب ماه"}
                {activePicker === "day" && "انتخاب روز"}
              </h3>
              <button
                onClick={() => setActivePicker(null)}
                className="p-2 rounded-xl text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Selected value display */}
            <div className="px-6 py-2 text-center">
              <span className="text-2xl font-bold text-rose-500 dark:text-rose-400">{getPickerDisplay()}</span>
            </div>

            {/* Scrollable list */}
            <div className="max-h-72 overflow-y-auto px-4 pb-6">
              <div className="grid grid-cols-3 gap-2">
                {getPickerItems().map((item) => (
                  <button
                    key={item.value}
                    onClick={() => handlePickerSelect(item.value)}
                    className={cn(
                      "p-3 rounded-2xl text-sm font-medium transition-all hover:scale-105 active:scale-95",
                      (activePicker === "year" && year === item.value) ||
                      (activePicker === "month" && month === item.value) ||
                      (activePicker === "day" && day === item.value)
                        ? "bg-gradient-to-l from-rose-500 to-orange-500 text-white shadow-lg shadow-rose-200"
                        : "bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-200 hover:bg-rose-50 dark:hover:bg-rose-500/15 hover:text-rose-600 dark:hover:text-rose-400"
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(5deg); }
        }
        @keyframes float-delayed {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-15px) rotate(-5deg); }
        }
        @keyframes float-slow {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-25px) rotate(10deg); }
        }
        @keyframes twinkle {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
        @keyframes twinkle-delayed {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
        @keyframes twinkle-slow {
          0%, 100% { opacity: 0.2; transform: scale(0.7); }
          50% { opacity: 0.8; transform: scale(1.3); }
        }
        @keyframes ring {
          0%, 100% { transform: rotate(0deg); }
          10% { transform: rotate(15deg); }
          20% { transform: rotate(-15deg); }
          30% { transform: rotate(10deg); }
          40% { transform: rotate(-10deg); }
          50% { transform: rotate(0deg); }
        }
        @keyframes confetti-fall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-float-delayed { animation: float-delayed 7s ease-in-out infinite; }
        .animate-float-slow { animation: float-slow 8s ease-in-out infinite; }
        .animate-twinkle { animation: twinkle 3s ease-in-out infinite; }
        .animate-twinkle-delayed { animation: twinkle-delayed 4s ease-in-out infinite; }
        .animate-twinkle-slow { animation: twinkle-slow 5s ease-in-out infinite; }
        .animate-ring { animation: ring 2s ease-in-out infinite; }
        .animate-confetti { animation: confetti-fall 3s ease-in forwards; }
        .animate-slide-up { animation: slide-up 0.3s ease-out; }
        .animate-fade-in { animation: fade-in 0.2s ease-out; }
      `}</style>
    </div>
  );
}
