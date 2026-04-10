import type { JournalRecord, NudgeItem, ReminderSnapshot } from "@/types/journal";

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function differenceInDays(later: Date, earlier: Date) {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.floor((startOfDay(later).getTime() - startOfDay(earlier).getTime()) / msPerDay);
}

function countEntriesWithinDays(entries: JournalRecord[], days: number) {
  const today = new Date();
  return entries.filter((entry) => differenceInDays(today, new Date(`${entry.entry_date}T00:00:00`)) <= days).length;
}

function calculateReflectionLiftRatio(entries: JournalRecord[]) {
  const recent = entries.slice(0, 6);

  if (recent.length === 0) {
    return 0;
  }

  const lifted = recent.filter((entry) => {
    const direction = entry.analysis.emotional_shift.direction;
    return direction === "improved" || direction === "mixed";
  }).length;

  return lifted / recent.length;
}

export function buildReminderSnapshot(entries: JournalRecord[]): ReminderSnapshot {
  const sorted = [...entries].sort((a, b) => b.entry_date.localeCompare(a.entry_date));
  const lastEntry = sorted[0] ?? null;
  const daysSinceLastEntry = lastEntry ? differenceInDays(new Date(), new Date(`${lastEntry.entry_date}T00:00:00`)) : null;
  const entriesInLast7Days = countEntriesWithinDays(sorted, 6);
  const recentReflectionLiftRatio = calculateReflectionLiftRatio(sorted);

  const nudges: NudgeItem[] = [];

  if (daysSinceLastEntry !== null && daysSinceLastEntry >= 3) {
    nudges.push({
      id: "days-since-entry",
      label: "Gentle check-in",
      message: `It's been ${daysSinceLastEntry} days since your last entry. If it helps, a short note could be enough today.`
    });
  }

  if (entriesInLast7Days >= 3) {
    nudges.push({
      id: "consistency-week",
      label: "Consistency",
      message: "You've been consistent this week. That steady rhythm is giving you something real to look back on."
    });
  }

  if (recentReflectionLiftRatio >= 0.5) {
    nudges.push({
      id: "reflection-lift",
      label: "Writing pattern",
      message: "Your recent entries often end a little steadier than they begin. Writing things through seems to help."
    });
  }

  if (nudges.length === 0) {
    nudges.push({
      id: "steady-foundation",
      label: "Quiet encouragement",
      message: "Your journal is building a clearer picture over time. You can keep it brief whenever you want to check in."
    });
  }

  return {
    daysSinceLastEntry,
    entriesInLast7Days,
    recentReflectionLiftRatio,
    nudges
  };
}
