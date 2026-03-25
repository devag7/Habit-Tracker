"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  CATEGORIES,
  COLORS,
  COMPLETIONS_KEY,
  Completions,
  createHabitId,
  EMOJIS,
  formatDate,
  formatStreakText,
  buildWeeklyReport,
  getBestEverStreak,
  getCurrentStreak,
  getLastNDays,
  getLastSevenDays,
  getMotivationalMessage,
  getWeeklyCompletionRates,
  HABITS_KEY,
  Habit,
  HabitCategory,
  isDateInWeek,
  isHabitCompletedForDate,
  loadCompletions,
  loadHabits,
  MAX_HABIT_NAME_LENGTH
} from "./lib/habit-data";

const WEEKLY_ROW_MIN_WIDTH = 520;
const ICON_BACKGROUND_ALPHA_HEX = "22";

type ActiveView = "today" | "stats";
type CategoryFilter = "All" | HabitCategory;

function formatReminderLabel(time: string): string {
  if (!time) {
    return "";
  }

  const [hoursRaw, minutesRaw] = time.split(":");
  const hours = Number.parseInt(hoursRaw ?? "", 10);
  const minutes = Number.parseInt(minutesRaw ?? "", 10);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return time;
  }

  const period = hours >= 12 ? "PM" : "AM";
  const normalized = hours % 12 === 0 ? 12 : hours % 12;
  return `${normalized}:${minutes.toString().padStart(2, "0")} ${period}`;
}

function getHeatmapIntensityClass(count: number): string {
  if (count >= 4) {
    return "bg-emerald-700";
  }
  if (count === 3) {
    return "bg-emerald-600";
  }
  if (count === 2) {
    return "bg-emerald-500";
  }
  if (count === 1) {
    return "bg-emerald-300";
  }
  return "bg-slate-200";
}

export default function Home() {
  const [habits, setHabits] = useState<Habit[]>(loadHabits);
  const [completions, setCompletions] = useState<Completions>(loadCompletions);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState(EMOJIS[0]);
  const [color, setColor] = useState(COLORS[0]);
  const [frequency, setFrequency] = useState<"daily" | "weekly">("daily");
  const [category, setCategory] = useState<HabitCategory>("Personal");
  const [reminderTime, setReminderTime] = useState("");
  const [activeView, setActiveView] = useState<ActiveView>("today");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("All");
  const [showConfetti, setShowConfetti] = useState(false);
  const confettiTimeoutRef = useRef<number | null>(null);

  const today = useMemo(() => formatDate(new Date()), []);
  const weekDays = useMemo(() => getLastSevenDays(), []);
  const heatmapDays = useMemo(() => getLastNDays(30), []);

  useEffect(() => {
    localStorage.setItem(HABITS_KEY, JSON.stringify(habits));
  }, [habits]);

  useEffect(() => {
    localStorage.setItem(COMPLETIONS_KEY, JSON.stringify(completions));
  }, [completions]);

  useEffect(() => {
    return () => {
      if (confettiTimeoutRef.current !== null) {
        window.clearTimeout(confettiTimeoutRef.current);
      }
    };
  }, []);

  const filteredHabits = useMemo(
    () => habits.filter((habit) => categoryFilter === "All" || habit.category === categoryFilter),
    [habits, categoryFilter]
  );

  const dueHabits = useMemo(() => habits, [habits]);
  const completedToday = dueHabits.filter((habit) => {
    const dates = completions[habit.id] ?? [];
    return isHabitCompletedForDate(habit, dates, new Date());
  }).length;
  const completionPercent = dueHabits.length ? Math.round((completedToday / dueHabits.length) * 100) : 0;
  const motivation = getMotivationalMessage(completionPercent);
  const totalCompletions = useMemo(
    () => habits.reduce((sum, habit) => sum + (completions[habit.id] ?? []).length, 0),
    [habits, completions]
  );

  const bestStreakEver = useMemo(
    () =>
      habits.reduce((best, habit) => {
        const bestForHabit = getBestEverStreak(completions[habit.id] ?? [], habit.frequency);
        return Math.max(best, bestForHabit);
      }, 0),
    [habits, completions]
  );

  const weeklyRates = useMemo(() => getWeeklyCompletionRates(habits, completions), [habits, completions]);
  const reportCard = useMemo(() => buildWeeklyReport(habits, completions), [habits, completions]);

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
      frequency,
      category,
      reminderTime
    };

    setHabits((prev) => [...prev, newHabit]);
    setName("");
    setIcon(EMOJIS[0]);
    setColor(COLORS[0]);
    setFrequency("daily");
    setCategory("Personal");
    setReminderTime("");
  };

  const toggleToday = (habitId: string) => {
    const habit = habits.find((item) => item.id === habitId);
    if (!habit) {
      return;
    }

    const habitDates = completions[habitId] ?? [];
    const hasToday = isHabitCompletedForDate(habit, habitDates, new Date());

    const nextCompletions: Completions = {
      ...completions,
      [habitId]: hasToday
        ? habit.frequency === "weekly"
          ? habitDates.filter((date) => !isDateInWeek(date, new Date()))
          : habitDates.filter((date) => date !== today)
        : [...habitDates, today].sort()
    };

    setCompletions(nextCompletions);

    const nextCompletedToday = habits.filter((currentHabit) =>
      isHabitCompletedForDate(currentHabit, nextCompletions[currentHabit.id] ?? [], new Date())
    ).length;
    const isAllDone = habits.length > 0 && nextCompletedToday === habits.length;

    if (isAllDone) {
      setShowConfetti(true);
      if (confettiTimeoutRef.current !== null) {
        window.clearTimeout(confettiTimeoutRef.current);
      }

      confettiTimeoutRef.current = window.setTimeout(() => {
        setShowConfetti(false);
      }, 2400);
    } else {
      setShowConfetti(false);
    }
  };

  const onDragStart = (event: React.DragEvent<HTMLElement>, habitId: string) => {
    event.dataTransfer.setData("text/plain", habitId);
    event.dataTransfer.effectAllowed = "move";
  };

  const onDrop = (event: React.DragEvent<HTMLElement>, targetHabitId: string) => {
    event.preventDefault();
    const sourceHabitId = event.dataTransfer.getData("text/plain");
    if (!sourceHabitId || sourceHabitId === targetHabitId) {
      return;
    }

    setHabits((prev) => {
      const sourceIndex = prev.findIndex((habit) => habit.id === sourceHabitId);
      const targetIndex = prev.findIndex((habit) => habit.id === targetHabitId);

      if (sourceIndex < 0 || targetIndex < 0) {
        return prev;
      }

      const reordered = [...prev];
      const [moved] = reordered.splice(sourceIndex, 1);
      reordered.splice(targetIndex, 0, moved);
      return reordered;
    });
  };

  return (
    <main className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 p-4 md:p-8">
      {showConfetti && (
        <div aria-label="Confetti celebration" className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
          {Array.from({ length: 42 }).map((_, index) => (
            <span
              key={`confetti-${index}`}
              className="confetti-piece"
              style={{
                left: `${(index * 17) % 100}%`,
                animationDelay: `${(index % 10) * 0.08}s`
              }}
            />
          ))}
        </div>
      )}

      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-slate-500">Today&apos;s motivation</p>
            <h1 className="mt-1 text-3xl font-bold text-slate-900">{motivation}</h1>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setActiveView("today")}
              className={`rounded-lg px-3 py-2 text-sm font-medium ${
                activeView === "today" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"
              }`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setActiveView("stats")}
              className={`rounded-lg px-3 py-2 text-sm font-medium ${
                activeView === "stats" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"
              }`}
            >
              Statistics
            </button>
            <Link
              href="/stats"
              className="rounded-lg bg-indigo-100 px-3 py-2 text-sm font-medium text-indigo-700"
            >
              Open stats page
            </Link>
          </div>
        </div>

        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between text-sm text-slate-600">
            <span>Progress today</span>
            <span>{completionPercent}%</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-slate-200">
            <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${completionPercent}%` }} />
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
              onChange={(event) => setFrequency(event.target.value as "daily" | "weekly")}
              className="rounded-lg border border-slate-300 px-3 py-2 outline-none ring-emerald-300 focus:ring"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </select>
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-600">Category</span>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value as HabitCategory)}
              className="rounded-lg border border-slate-300 px-3 py-2 outline-none ring-emerald-300 focus:ring"
            >
              {CATEGORIES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-600">Reminder time</span>
            <input
              type="time"
              value={reminderTime}
              onChange={(event) => setReminderTime(event.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 outline-none ring-emerald-300 focus:ring"
            />
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
        <h2 className="text-xl font-semibold text-slate-900">Categories</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {(["All", ...CATEGORIES] as CategoryFilter[]).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setCategoryFilter(value)}
              className={`rounded-full px-3 py-1 text-sm font-medium ${
                categoryFilter === value ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-700"
              }`}
            >
              {value}
            </button>
          ))}
        </div>
      </section>

      {activeView === "today" ? (
        <>
          <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-xl font-semibold text-slate-900">Today</h2>

            {filteredHabits.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">No habits in this category yet.</p>
            ) : (
              <div className="mt-4 grid gap-3">
                {filteredHabits.map((habit) => {
                  const dates = completions[habit.id] ?? [];
                  const doneToday = isHabitCompletedForDate(habit, dates, new Date());
                  const streak = getCurrentStreak(dates, habit.frequency);

                  return (
                    <article
                      key={habit.id}
                      className="flex items-center justify-between rounded-xl border border-slate-200 p-4"
                      draggable
                      onDragStart={(event) => onDragStart(event, habit.id)}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => onDrop(event, habit.id)}
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
                            {habit.frequency} · {habit.category} · {formatStreakText(streak, habit.frequency)}
                          </p>
                          {habit.reminderTime && (
                            <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                              🕒 {formatReminderLabel(habit.reminderTime)}
                            </span>
                          )}
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

            {filteredHabits.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">Weekly activity will appear here once habits are added.</p>
            ) : (
              <div className="mt-4 space-y-3 overflow-x-auto">
                {filteredHabits.map((habit) => {
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

          <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-xl font-semibold text-slate-900">30-day heatmap</h2>

            {filteredHabits.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">Heatmap data appears after adding habits.</p>
            ) : (
              <div className="mt-4 space-y-4">
                {filteredHabits.map((habit) => {
                  const dateSet = new Set(completions[habit.id] ?? []);

                  return (
                    <div key={`heatmap-${habit.id}`} className="rounded-xl border border-slate-200 p-3">
                      <div className="mb-2 font-medium text-slate-900">
                        <span className="mr-2 text-2xl">{habit.icon}</span>
                        {habit.name}
                      </div>
                      <div className="grid grid-cols-10 gap-1">
                        {heatmapDays.map((day) => {
                          const count = dateSet.has(day) ? 1 : 0;
                          return (
                            <span
                              key={`${habit.id}-${day}`}
                              className={`h-4 w-4 rounded-sm ${getHeatmapIntensityClass(count)}`}
                              title={`${day}: ${count > 0 ? "completed" : "missed"}`}
                            />
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-xl font-semibold text-slate-900">Weekly report card</h2>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">Best: {reportCard.best}</p>
              <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-900">Needs focus: {reportCard.worst}</p>
            </div>
          </section>
        </>
      ) : (
        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-xl font-semibold text-slate-900">Statistics</h2>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <article className="rounded-xl border border-slate-200 p-4">
              <p className="text-sm text-slate-500">Best streak ever</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{bestStreakEver}</p>
            </article>
            <article className="rounded-xl border border-slate-200 p-4">
              <p className="text-sm text-slate-500">Total completions</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{totalCompletions}</p>
            </article>
            <article className="rounded-xl border border-slate-200 p-4">
              <p className="text-sm text-slate-500">Today completion rate</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{completionPercent}%</p>
            </article>
          </div>

          <div className="mt-6">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Completion rate by week</h3>
            <div className="mt-3 space-y-2">
              {weeklyRates.map((entry) => (
                <div key={entry.label} className="rounded-lg border border-slate-200 p-3">
                  <div className="mb-1 flex items-center justify-between text-sm text-slate-600">
                    <span>{entry.label}</span>
                    <span>{entry.percent}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-200">
                    <div className="h-full rounded-full bg-indigo-500" style={{ width: `${entry.percent}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
