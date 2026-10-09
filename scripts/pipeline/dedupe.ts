import type { Article, SourceRef } from "../../src/lib/types";

const STOP = new Set("a an the of in on at to for and or with by from as is are was were be been it its this that these those after over amid says say said new india indian govt government".split(" "));
export const tokens = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w));
export function jaccard(a: string[], b: string[]): number {
  const A = new Set(a), B = new Set(b); if (!A.size || !B.size) return 0;
  let i = 0; for (const x of A) if (B.has(x)) i++;
  return i / (A.size + B.size - i);
}
export function canonicalUrl(u: string): string {
  try { const x = new URL(u); ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "ref", "fbclid", "gclid"].forEach((p) => x.searchParams.delete(p)); x.hash = ""; return (x.origin + x.pathname.replace(/\/$/, "") + x.search).toLowerCase(); } catch { return u.toLowerCase(); }
}
export const SIMILARITY = 0.55;

/** Find the existing story an incoming item duplicates (same URL, or near-identical headline within ±3 days). */
export function findDuplicate(title: string, url: string, publishedISO: string, pool: Pick<Article, "id" | "title" | "published_at" | "sources">[]): string | null {
  const cu = canonicalUrl(url); const tk = tokens(title); const t = new Date(publishedISO).getTime();
  for (const a of pool) {
    if (a.sources.some((s) => canonicalUrl(s.url) === cu)) return a.id;
    if (Math.abs(new Date(a.published_at).getTime() - t) > 3 * 86_400_000) continue;
    if (jaccard(tk, tokens(a.title)) >= SIMILARITY) return a.id;
  }
  return null;
}
export function mergeSources(existing: SourceRef[], incoming: SourceRef): SourceRef[] {
  if (existing.some((s) => s.name === incoming.name && s.url === incoming.url)) return existing;
  // same publisher but different URL (e.g. 2 Hindu feeds) is not an independent corroboration → keep first
  if (existing.some((s) => s.name === incoming.name)) return existing;
  return [...existing, incoming].sort((a, b) => b.quality - a.quality);
}
