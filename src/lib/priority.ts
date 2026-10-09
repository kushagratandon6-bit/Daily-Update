import type { Article } from "./types";
import { diffDays, istDate } from "./dates";

/** Importance bands from the spec (§27). */
export function band(score: number): { label: string; tone: "must" | "high" | "mid" | "low" | "ignore" } {
  if (score >= 10) return { label: "Must Know", tone: "must" };
  if (score >= 8) return { label: "High Priority", tone: "high" };
  if (score >= 6) return { label: "Moderate", tone: "mid" };
  if (score >= 4) return { label: "Low Priority", tone: "low" };
  return { label: "Ignore", tone: "ignore" };
}

/** Recency factor 0..1. halfLifeDays controls decay; revision modes use a long half-life. */
export function recency(publishedISO: string, now: string, halfLifeDays = 3): number {
  const age = Math.max(0, diffDays(now, istDate(publishedISO)));
  return Math.pow(0.5, age / halfLifeDays);
}

export interface PriorityInput {
  relevance_score: number; legal_relevance: number; national_importance: number;
  source_quality: number; mcq_value: number; published_at: string;
}

/**
 * Priority engine (spec §69):
 * Exam relevance 30 + Legal 15 + National 15 + Source reliability 15 + Recency 15 + MCQ value 10 = 0..100
 */
export function priorityScore(a: PriorityInput, now: string, halfLifeDays = 3): number {
  const n = (x: number) => Math.min(10, Math.max(0, x)) / 10;
  const s =
    30 * n(a.relevance_score) + 15 * n(a.legal_relevance) + 15 * n(a.national_importance) +
    15 * n(a.source_quality) + 15 * recency(a.published_at, now, halfLifeDays) + 10 * n(a.mcq_value);
  return Math.round(s * 10) / 10;
}

/** Stars (1–5) from a 1–10 score. */
export const stars = (n: number) => Math.max(1, Math.min(5, Math.round(n / 2)));

export function sortByPriority<T extends Pick<Article, "priority_score" | "published_at">>(xs: T[]): T[] {
  return [...xs].sort((a, b) => b.priority_score - a.priority_score || b.published_at.localeCompare(a.published_at));
}

/** "High exam potential" – never claim certainty (spec §77). */
export function mostLikely(articles: Article[], n = 8): Article[] {
  return sortByPriority(articles)
    .filter((a) => a.relevance_score >= 6)
    .map((a) => ({ a, v: a.relevance_score * 2 + a.mcq_value + a.legal_relevance * 0.5 + a.sources.length * 1.5 + a.source_quality * 0.3 }))
    .sort((x, y) => y.v - x.v)
    .slice(0, n)
    .map((x) => x.a);
}
