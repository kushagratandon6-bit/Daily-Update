import type { Question } from "./types";
import { addDays, monthKey, monthName } from "./dates";
import { isoWeek } from "./quiz";

export type PoolKind = "daily" | "weekly" | "monthly";
export interface PoolSpec { kind: PoolKind; label: string; count: number; seed: string; pool: Question[] }

/** Single definition of how daily/weekly/monthly quizzes are assembled — used by the UI and by scripts/generate.ts. */
export function poolFor(kind: PoolKind, day: string, all: Question[]): PoolSpec {
  const staticQ = all.filter((q) => q.origin === "static");
  const art = all.filter((q) => q.origin === "article");
  const within = (from: string, to: string) => art.filter((q) => q.date && q.date >= from && q.date <= to);
  if (kind === "daily") { const own = within(day, day); return { kind, label: `Daily quiz — ${day}`, count: Math.min(15, Math.max(10, own.length)), seed: `daily:${day}`, pool: [...own, ...staticQ] }; }
  if (kind === "weekly") { const w = isoWeek(day); return { kind, label: `Weekly quiz — ${w}`, count: 50, seed: `weekly:${w}`, pool: [...within(addDays(day, -6), day), ...staticQ] }; }
  const [y, m] = day.split("-").map(Number);
  return { kind, label: `Monthly mega test — ${monthName(m)} ${y}`, count: 100, seed: `monthly:${monthKey(day)}`, pool: [...within(addDays(day, -29), day), ...staticQ] };
}
