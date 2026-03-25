"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Completions,
  getBestEverStreak,
  getWeeklyCompletionRates,
  Habit,
  loadCompletions,
  loadHabits
} from "../lib/habit-data";

function buildWeeklyReport(habits: Habit[], completions: Completions): { best: string; worst: string } {
  if (!habits.length) {
    return {
      best: "Add a habit to generate your weekly report.",
      worst: "Add a habit to generate your weekly report."
    };
  }

  const scores = habits.map((habit) => {
    const dates = completions[habit.id] ?? [];
    const uniqueDates = new Set(dates);
    return {
      name: habit.name,
      icon: habit.icon,
      rate: uniqueDates.size
    };
  });

  const sorted = [...scores].sort((a, b) => b.rate - a.rate);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];

  return {
    best: `${best.icon} ${best.name} has the strongest recent consistency.`,
    worst: `${worst.icon} ${worst.name} has the lowest completion momentum.`
  };
}

export default function StatsPage() {
  const [habits] = useState<Habit[]>(loadHabits);
  const [completions] = useState<Completions>(loadCompletions);

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
  const report = useMemo(() => buildWeeklyReport(habits, completions), [habits, completions]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 p-4 md:p-8">
      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-slate-900">Statistics</h1>
          <Link href="/" className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white">
            Back to tracker
          </Link>
        </div>

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
            <p className="text-sm text-slate-500">Tracked habits</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{habits.length}</p>
          </article>
        </div>
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">Completion rate by week</h2>
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
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">Weekly report card</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">Best: {report.best}</p>
          <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-900">Needs focus: {report.worst}</p>
        </div>
      </section>
    </main>
  );
}
