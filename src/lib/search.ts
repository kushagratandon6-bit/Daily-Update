import type { Article, StaticEntry } from "./types";
import { addDays, istDate } from "./dates";

export interface Filters {
  q: string; date: "all" | "today" | "yesterday" | "7d" | "30d" | "3m" | "custom"; from?: string; to?: string;
  cats: string[]; exam: "" | "nlsat" | "aiat" | "ssc"; minScore: number; source: string; tag: string;
  sort: "priority" | "latest";
}
export const DEFAULT_FILTERS: Filters = { q: "", date: "all", cats: [], exam: "", minScore: 0, source: "", tag: "", sort: "priority" };

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9ऀ-ॿ\s]/g, " ").replace(/\s+/g, " ").trim();

export function haystack(a: Article): string {
  return norm([a.title, a.summary, ...a.content, ...a.keyFacts, ...a.tags, a.category, a.subcategory || "", ...(a.details ? Object.values(a.details) : []), ...a.sources.map((s) => s.name)].join(" "));
}

/** Knowledge entries a query refers to (so searching "DPDP" also finds articles about the Digital Personal Data Protection Act). */
export function matchKnowledge(q: string, knowledge: StaticEntry[]): StaticEntry[] {
  const nq = norm(q); if (nq.length < 2) return [];
  return knowledge.filter((k) => norm(k.title).includes(nq) || k.keywords.some((w) => norm(w) === nq || (nq.length > 3 && norm(w).includes(nq))));
}

export function dateBounds(f: Filters, today: string): [string, string] | null {
  switch (f.date) {
    case "today": return [today, today];
    case "yesterday": return [addDays(today, -1), addDays(today, -1)];
    case "7d": return [addDays(today, -6), today];
    case "30d": return [addDays(today, -29), today];
    case "3m": return [addDays(today, -91), today];
    case "custom": return [f.from || "0000-00-00", f.to || "9999-12-31"];
    default: return null;
  }
}

export function applyFilters(arts: Article[], f: Filters, knowledge: StaticEntry[], today: string, lockedCats?: string[]): Article[] {
  const terms = norm(f.q).split(" ").filter(Boolean);
  const kIds = new Set(matchKnowledge(f.q, knowledge).map((k) => k.id));
  const b = dateBounds(f, today);
  const cats = lockedCats ?? f.cats;
  const out = arts.filter((a) => {
    if (cats.length && !cats.includes(a.category)) return false;
    if (b) { const d = istDate(a.published_at); if (d < b[0] || d > b[1]) return false; }
    if (f.exam && a.exam[f.exam] < Math.max(1, f.minScore)) return false;
    if (!f.exam && f.minScore && a.relevance_score < f.minScore) return false;
    if (f.source && !a.sources.some((s) => s.name === f.source)) return false;
    if (f.tag && !a.tags.includes(f.tag)) return false;
    if (terms.length) {
      const h = haystack(a);
      const linked = a.staticLinks.some((id) => kIds.has(id)) || a.legalLinks.some((id) => kIds.has(id));
      if (!(terms.every((t) => h.includes(t)) || linked)) return false;
    }
    return true;
  });
  return out.sort(f.sort === "latest" ? (x, y) => y.published_at.localeCompare(x.published_at) : (x, y) => y.priority_score - x.priority_score || y.published_at.localeCompare(x.published_at));
}
