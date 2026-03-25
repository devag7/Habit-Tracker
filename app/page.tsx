"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Frequency = "daily" | "weekly";

type Habit = {
  id: string;
  name: string;
  icon: string;
  color: string;
  frequency: Frequency;
};

type Completions = Record<string, string[]>;

const EMOJIS = ["💪", "📚", "🏃", "🧘", "💧", "🛌", "🍎", "🧹", "🎯", "✍️"];
const COLORS = ["#22c55e", "#3b82f6", "#a855f7", "#f97316", "#e11d48", "#14b8a6"];
const HABITS_KEY = "habits";
const COMPLETIONS_KEY = "completions";
const MAX_HABIT_NAME_LENGTH = 40;
const WEEKLY_ROW_MIN_WIDTH = 520;
const ICON_BACKGROUND_ALPHA_HEX = "22";
const MAX_DAILY_STREAK_CHECKS = 366;
const MAX_WEEKLY_STREAK_CHECKS = 52;

function createHabitId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `habit-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getLastSevenDays(): string[] {
  const days: string[] = [];
  const now = new Date();

  for (let offset = 6; offset >= 0; offset -= 1) {
    const d = new Date(now);
    d.setDate(now.getDate() - offset);
    days.push(formatDate(d));
  }

  return days;
}

function getWeekStart(date: Date): Date {
  const start = new Date(date);
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diff);
  start.setHours(0, 0, 0, 0);
  return start;
}

function isDateInWeek(dateString: string, referenceDate: Date): boolean {
  const date = new Date(`${dateString}T00:00:00`);
  const weekStart = getWeekStart(referenceDate);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);
  return date >= weekStart && date < weekEnd;
}

function hasWeeklyCompletion(dates: string[], referenceDate: Date): boolean {
  return dates.some((date) => isDateInWeek(date, referenceDate));
}

function getStreak(dates: string[], frequency: Frequency): number {
  if (!dates.length) {
    return 0;
  }

  if (frequency === "weekly") {
    let streak = 0;
    const now = new Date();
    const maxWeeklyChecks = Math.max(dates.length + 1, MAX_WEEKLY_STREAK_CHECKS);

    while (streak < maxWeeklyChecks) {
      const referenceDate = new Date(now);
      referenceDate.setDate(now.getDate() - streak * 7);

      if (!hasWeeklyCompletion(dates, referenceDate)) {
        break;
      }

      streak += 1;
    }

    return streak;
  }

  const dateSet = new Set(dates);
  const today = new Date();
  let streak = 0;

  while (streak < MAX_DAILY_STREAK_CHECKS) {
    const current = new Date(today);
    current.setDate(today.getDate() - streak);

    if (!dateSet.has(formatDate(current))) {
      break;
    }

    streak += 1;
  }

  return streak;
}

function getMotivationalMessage(percent: number): string {
  if (percent === 100) {
    return "Perfect day!";
  }

  if (percent === 0) {
    return "Let's go!";
  }

  if (percent >= 75) {
    return "Great momentum!";
  }

  if (percent >= 50) {
    return "You're doing well!";
  }

  return "Keep it going!";
}

function formatStreakText(streak: number, frequency: Frequency): string {
  if (frequency === "weekly") {
    return `${streak} week${streak === 1 ? "" : "s"} streak`;
  }

  return `${streak} day${streak === 1 ? "" : "s"} streak`;
}

export default function Home() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [completions, setCompletions] = useState<Completions>({});
  const [name, setName] = useState("");
  const [icon, setIcon] = useState(EMOJIS[0]);
  const [color, setColor] = useState(COLORS[0]);
  const [frequency, setFrequency] = useState<Frequency>("daily");
  const [isLoaded, setIsLoaded] = useState(false);

  const today = useMemo(() => formatDate(new Date()), []);
  const weekDays = useMemo(() => getLastSevenDays(), []);

  useEffect(() => {
    const savedHabits = localStorage.getItem(HABITS_KEY);
    const savedCompletions = localStorage.getItem(COMPLETIONS_KEY);

    if (savedHabits) {
      try {
        setHabits(JSON.parse(savedHabits));
      } catch {
        setHabits([]);
      }
    }

    if (savedCompletions) {
      try {
        setCompletions(JSON.parse(savedCompletions));
      } catch {
        setCompletions({});
      }
    }

    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    localStorage.setItem(HABITS_KEY, JSON.stringify(habits));
  }, [habits, isLoaded]);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    localStorage.setItem(COMPLETIONS_KEY, JSON.stringify(completions));
  }, [completions, isLoaded]);

  const completedToday = habits.filter((habit) => {
    const dates = completions[habit.id] ?? [];
    if (habit.frequency === "weekly") {
      return hasWeeklyCompletion(dates, new Date());
    }

    return dates.includes(today);
  }).length;
  const completionPercent = habits.length ? Math.round((completedToday / habits.length) * 100) : 0;
  const motivation = getMotivationalMessage(completionPercent);

  const onAddHabit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedName = name.trim();
    if (!trimmedName) {
      return;
    }

    const newHabit: Habit = {
      id: createHabitId(),
      name: trimmedName,
      icon,
      color,
      frequency
    };

    setHabits((prev) => [...prev, newHabit]);
    setName("");
    setIcon(EMOJIS[0]);
    setColor(COLORS[0]);
    setFrequency("daily");
  };

  const toggleToday = (habitId: string) => {
    setCompletions((prev) => {
      const habit = habits.find((item) => item.id === habitId);
      const habitDates = prev[habitId] ?? [];
      const isWeekly = habit?.frequency === "weekly";
      const hasToday = isWeekly ? hasWeeklyCompletion(habitDates, new Date()) : habitDates.includes(today);

      return {
        ...prev,
        [habitId]: hasToday
          ? (isWeekly
              ? habitDates.filter((date) => !isDateInWeek(date, new Date()))
              : habitDates.filter((date) => date !== today))
          : [...habitDates, today].sort()
      };
    });
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 p-4 md:p-8">
      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <p className="text-sm font-medium text-slate-500">Today&apos;s motivation</p>
        <h1 className="mt-1 text-3xl font-bold text-slate-900">{motivation}</h1>

        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between text-sm text-slate-600">
            <span>Progress today</span>
            <span>{completionPercent}%</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all"
              style={{ width: `${completionPercent}%` }}
            />
          </div>
        </div>
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-xl font-semibold text-slate-900">Add habit</h2>

        <form onSubmit={onAddHabit} className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-600">Name</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 outline-none ring-emerald-300 focus:ring"
              placeholder="Drink water"
              maxLength={MAX_HABIT_NAME_LENGTH}
              required
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-600">Frequency</span>
            <select
              value={frequency}
              onChange={(event) => setFrequency(event.target.value as Frequency)}
              className="rounded-lg border border-slate-300 px-3 py-2 outline-none ring-emerald-300 focus:ring"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </select>
          </label>

          <div className="md:col-span-2">
            <p className="mb-2 text-sm font-medium text-slate-600">Icon</p>
            <div className="flex flex-wrap gap-2">
              {EMOJIS.map((emoji) => (
                <button
                  type="button"
                  key={emoji}
                  onClick={() => setIcon(emoji)}
                  className={`h-10 w-10 rounded-lg border text-xl transition ${
                    icon === emoji
                      ? "border-emerald-500 bg-emerald-50"
                      : "border-slate-300 bg-white hover:bg-slate-100"
                  }`}
                  aria-label={`Select ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <div className="md:col-span-2">
            <p className="mb-2 text-sm font-medium text-slate-600">Color</p>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((swatch) => (
                <button
                  type="button"
                  key={swatch}
                  onClick={() => setColor(swatch)}
                  className={`h-8 w-8 rounded-full border-2 transition ${
                    color === swatch ? "scale-110 border-slate-900" : "border-white"
                  }`}
                  style={{ backgroundColor: swatch }}
                  aria-label={`Select color ${swatch}`}
                />
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="md:col-span-2 rounded-lg bg-slate-900 px-4 py-2 font-medium text-white hover:bg-slate-700"
          >
            Add habit
          </button>
        </form>
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-xl font-semibold text-slate-900">Today</h2>

        {habits.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">No habits yet. Add your first habit above.</p>
        ) : (
          <div className="mt-4 grid gap-3">
            {habits.map((habit) => {
              const dates = completions[habit.id] ?? [];
              const doneToday = habit.frequency === "weekly" ? hasWeeklyCompletion(dates, new Date()) : dates.includes(today);
              const streak = getStreak(dates, habit.frequency);

              return (
                <article
                  key={habit.id}
                  className="flex items-center justify-between rounded-xl border border-slate-200 p-4"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="flex h-14 w-14 items-center justify-center rounded-xl text-3xl"
                      style={{ backgroundColor: `${habit.color}${ICON_BACKGROUND_ALPHA_HEX}` }}
                    >
                      {habit.icon}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{habit.name}</p>
                      <p className="text-sm text-slate-500">
                        {habit.frequency} · {formatStreakText(streak, habit.frequency)}
                      </p>
                    </div>
                  </div>

                  <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={doneToday}
                      onChange={() => toggleToday(habit.id)}
                      className="h-5 w-5 rounded border-slate-400 text-emerald-600 focus:ring-emerald-500"
                    />
                    Done
                  </label>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-xl font-semibold text-slate-900">Weekly grid</h2>

        {habits.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">Weekly activity will appear here once habits are added.</p>
        ) : (
          <div className="mt-4 space-y-3 overflow-x-auto">
            {habits.map((habit) => {
              const doneDates = new Set(completions[habit.id] ?? []);

              return (
                <div
                  key={habit.id}
                  className="flex items-center gap-4 rounded-xl border border-slate-200 p-3"
                  style={{ minWidth: WEEKLY_ROW_MIN_WIDTH }}
                >
                  <div className="w-44 truncate font-medium text-slate-900">
                    <span className="mr-2 text-2xl">{habit.icon}</span>
                    {habit.name}
                  </div>
                  <div className="grid grid-cols-7 gap-3">
                    {weekDays.map((day) => {
                      const done = doneDates.has(day);

                      return (
                        <div key={day} className="flex flex-col items-center gap-1">
                          <span className="text-xs text-slate-500">{day.slice(5)}</span>
                          <span
                            className={`h-3 w-3 rounded-full ${done ? "bg-emerald-500" : "bg-slate-300"}`}
                            title={done ? "Done" : "Missed"}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
