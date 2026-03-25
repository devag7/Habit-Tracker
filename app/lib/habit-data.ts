export type Frequency = "daily" | "weekly";
export type HabitCategory = "Health" | "Work" | "Learning" | "Personal";

export type Habit = {
  id: string;
  name: string;
  icon: string;
  color: string;
  frequency: Frequency;
  category: HabitCategory;
  reminderTime: string;
};

export type Completions = Record<string, string[]>;

export const EMOJIS = ["💪", "📚", "🏃", "🧘", "💧", "🛌", "🍎", "🧹", "🎯", "✍️"];
export const COLORS = ["#22c55e", "#3b82f6", "#a855f7", "#f97316", "#e11d48", "#14b8a6"];
export const CATEGORIES: HabitCategory[] = ["Health", "Work", "Learning", "Personal"];

export const HABITS_KEY = "habits";
export const COMPLETIONS_KEY = "completions";
export const MAX_HABIT_NAME_LENGTH = 40;

const DEFAULT_CATEGORY: HabitCategory = "Personal";
const MAX_DAILY_STREAK_CHECKS = 366;
const MAX_WEEKLY_STREAK_CHECKS = 104;

function normalizeHabit(raw: Partial<Habit>): Habit {
  return {
    id: raw.id ?? createHabitId(),
    name: raw.name ?? "Habit",
    icon: raw.icon ?? EMOJIS[0],
    color: raw.color ?? COLORS[0],
    frequency: raw.frequency === "weekly" ? "weekly" : "daily",
    category: CATEGORIES.includes(raw.category as HabitCategory)
      ? (raw.category as HabitCategory)
      : DEFAULT_CATEGORY,
    reminderTime: typeof raw.reminderTime === "string" ? raw.reminderTime : ""
  };
}

export function createHabitId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `habit-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function getLastNDays(count: number): string[] {
  const days: string[] = [];
  const now = new Date();

  for (let offset = count - 1; offset >= 0; offset -= 1) {
    const day = new Date(now);
    day.setDate(now.getDate() - offset);
    days.push(formatDate(day));
  }

  return days;
}

export function getLastSevenDays(): string[] {
  return getLastNDays(7);
}

export function getWeekStart(date: Date): Date {
  const start = new Date(date);
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diff);
  start.setHours(0, 0, 0, 0);
  return start;
}

export function isDateInWeek(dateString: string, referenceDate: Date): boolean {
  const date = new Date(`${dateString}T00:00:00`);
  const weekStart = getWeekStart(referenceDate);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);
  return date >= weekStart && date < weekEnd;
}

export function hasWeeklyCompletion(dates: string[], referenceDate: Date): boolean {
  return dates.some((date) => isDateInWeek(date, referenceDate));
}

export function isHabitCompletedForDate(habit: Habit, dates: string[], referenceDate: Date): boolean {
  if (habit.frequency === "weekly") {
    return hasWeeklyCompletion(dates, referenceDate);
  }

  return dates.includes(formatDate(referenceDate));
}

export function getCurrentStreak(dates: string[], frequency: Frequency): number {
  if (!dates.length) {
    return 0;
  }

  if (frequency === "weekly") {
    let streak = 0;
    const now = new Date();
    const maxWeeklyChecks = Math.max(new Set(dates).size + 1, MAX_WEEKLY_STREAK_CHECKS);

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

export function getBestEverStreak(dates: string[], frequency: Frequency): number {
  if (!dates.length) {
    return 0;
  }

  const uniqueDates = Array.from(new Set(dates)).sort();

  if (frequency === "weekly") {
    const weekStarts = Array.from(
      new Set(
        uniqueDates.map((day) => formatDate(getWeekStart(new Date(`${day}T00:00:00`))))
      )
    ).sort();

    let best = 0;
    let current = 0;

    for (let i = 0; i < weekStarts.length; i += 1) {
      if (i === 0) {
        current = 1;
      } else {
        const prev = new Date(`${weekStarts[i - 1]}T00:00:00`);
        const curr = new Date(`${weekStarts[i]}T00:00:00`);
        const diffDays = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
        current = diffDays === 7 ? current + 1 : 1;
      }

      best = Math.max(best, current);
    }

    return best;
  }

  let best = 0;
  let current = 0;

  for (let i = 0; i < uniqueDates.length; i += 1) {
    if (i === 0) {
      current = 1;
    } else {
      const prev = new Date(`${uniqueDates[i - 1]}T00:00:00`);
      const curr = new Date(`${uniqueDates[i]}T00:00:00`);
      const diffDays = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
      current = diffDays === 1 ? current + 1 : 1;
    }

    best = Math.max(best, current);
  }

  return best;
}

export function getMotivationalMessage(percent: number): string {
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

export function formatStreakText(streak: number, frequency: Frequency): string {
  if (frequency === "weekly") {
    return `${streak} week${streak === 1 ? "" : "s"} streak`;
  }

  return `${streak} day${streak === 1 ? "" : "s"} streak`;
}

export function loadHabits(): Habit[] {
  if (typeof window === "undefined") {
    return [];
  }

  const savedHabits = localStorage.getItem(HABITS_KEY);
  if (!savedHabits) {
    return [];
  }

  try {
    const parsed = JSON.parse(savedHabits) as Partial<Habit>[];
    return Array.isArray(parsed) ? parsed.map(normalizeHabit) : [];
  } catch {
    return [];
  }
}

export function loadCompletions(): Completions {
  if (typeof window === "undefined") {
    return {};
  }

  const savedCompletions = localStorage.getItem(COMPLETIONS_KEY);
  if (!savedCompletions) {
    return {};
  }

  try {
    const parsed = JSON.parse(savedCompletions) as Completions;
    if (typeof parsed !== "object" || parsed === null) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(parsed).map(([habitId, entries]) => [habitId, Array.from(new Set(entries)).sort()])
    );
  } catch {
    return {};
  }
}

export function getWeeklyCompletionRates(habits: Habit[], completions: Completions, weeks = 6): Array<{ label: string; percent: number }> {
  const rates: Array<{ label: string; percent: number }> = [];
  const now = new Date();
  const currentWeekStart = getWeekStart(now);

  for (let i = weeks - 1; i >= 0; i -= 1) {
    const weekStart = new Date(currentWeekStart);
    weekStart.setDate(currentWeekStart.getDate() - i * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    let due = 0;
    let done = 0;

    for (const habit of habits) {
      const dates = completions[habit.id] ?? [];

      if (habit.frequency === "weekly") {
        due += 1;
        if (hasWeeklyCompletion(dates, weekStart)) {
          done += 1;
        }
      } else {
        due += 7;
        const uniqueWeekDays = new Set(
          dates.filter((date) => isDateInWeek(date, weekStart))
        );
        done += uniqueWeekDays.size;
      }
    }

    const percent = due > 0 ? Math.round((done / due) * 100) : 0;
    rates.push({
      label: `${formatDate(weekStart).slice(5)}-${formatDate(weekEnd).slice(5)}`,
      percent
    });
  }

  return rates;
}
