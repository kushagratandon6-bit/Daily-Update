import type { StaticEntry } from "./types";

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Deterministic knowledge linking: matches curated static-GK / legal-concept entries against article text.
 * No AI involved => no hallucinated "static facts". Short acronyms (<=4 chars) must appear in UPPERCASE.
 */
export function linkKnowledge(text: string, entries: StaticEntry[]): { staticLinks: string[]; legalLinks: string[] } {
  const staticLinks: string[] = []; const legalLinks: string[] = [];
  const lower = text.toLowerCase();
  for (const e of entries) {
    const hit = e.keywords.some((k) => {
      if (k.length <= 4 && /^[a-z0-9]+$/.test(k)) return new RegExp(`\\b${esc(k.toUpperCase())}\\b`).test(text);
      return new RegExp(`(^|[^a-z0-9])${esc(k.toLowerCase())}($|[^a-z0-9])`).test(lower);
    });
    if (hit) (e.kind === "legal" ? legalLinks : staticLinks).push(e.id);
  }
  return { staticLinks: staticLinks.slice(0, 4), legalLinks: legalLinks.slice(0, 3) };
}
