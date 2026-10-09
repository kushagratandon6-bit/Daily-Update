import type { Article, CategoryId } from "./types";
import { DAILY_SECTIONS } from "./categories";
import { addDays, istDate } from "./dates";
import { mostLikely, sortByPriority } from "./priority";

export const dayOf = (a: Article) => istDate(a.published_at);
export const byDay = (arts: Article[], ymd: string) => arts.filter((a) => dayOf(a) === ymd);
export const latestDay = (arts: Article[], fallback: string) => arts.reduce((m, a) => (dayOf(a) > m ? dayOf(a) : m), "") || fallback;
export const uniqueDays = (arts: Article[]) => Array.from(new Set(arts.map(dayOf))).sort().reverse();
export const inRange = (arts: Article[], from: string, to: string) => arts.filter((a) => { const d = dayOf(a); return d >= from && d <= to; });
export const ofCats = (arts: Article[], cats: CategoryId[]) => arts.filter((a) => cats.includes(a.category));

export function digest(arts: Article[]) {
  const ranked = sortByPriority(arts);
  const must = ranked.slice(0, 10);
  const mustIds = new Set(must.map((a) => a.id));
  const rest = ranked.filter((a) => !mustIds.has(a.id));
  return {
    must, important: rest.slice(0, 20), worth: rest.slice(20, 50),
    sections: DAILY_SECTIONS.map((s) => ({ ...s, items: sortByPriority(ofCats(arts, s.cats)) })).filter((s) => s.items.length),
    likely: mostLikely(arts, 8),
  };
}
export const windowStart = (today: string, months: number) => addDays(today, -Math.round(months * 30.4));
