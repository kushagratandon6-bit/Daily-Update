/**
 * Anti-hallucination guard (spec §46 / §70): any number or proper noun in AI output must literally appear in the
 * source text (or, for explanations only, in the curated static knowledge base). Otherwise the item is dropped.
 */
const COMMON_CAPS = new Set("The A An In On At It Its This That These Those Which Who Whom What Why How Where When Under Over After Before During While If As But And Or For With Without By From To Of Is Are Was Were Be Has Have Had Not No Yes Both Each All Some Any One Two Three Four Five Article Section Act Bill Q Answer Correct Incorrect India Indian Indians".split(" "));

const norm = (s: string) => s.toLowerCase().replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, " ");
export function numbersIn(s: string): string[] {
  return (s.match(/\d[\d,]*(?:\.\d+)?/g) || []).map((n) => n.replace(/,/g, "")).filter((n) => n.length > 0);
}
export function entitiesIn(s: string): string[] {
  const out: string[] = [];
  const re = /\b(?:[A-Z][a-zA-Z.&'-]+(?:\s+(?:of|the|and|for|de|von)\s+)?(?:\s*[A-Z][a-zA-Z.&'-]+)*|[A-Z]{2,}[a-z]*)\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    const words = m[0].split(/\s+/).filter((w) => !COMMON_CAPS.has(w));
    if (words.length) out.push(words.join(" ").replace(/[.,;:]+$/, ""));
  }
  return out.filter((e) => e.length > 1);
}
export interface GroundResult { ok: boolean; missing: string[] }
export function grounded(candidate: string, ...sources: string[]): GroundResult {
  const hay = norm(sources.join(" \n ")); const hayNums = new Set(numbersIn(hay));
  const missing: string[] = [];
  for (const n of numbersIn(candidate)) if (!hayNums.has(n)) missing.push(n);
  for (const e of entitiesIn(candidate)) {
    const ne = norm(e);
    // accept if the full entity or every word of it appears (handles "Supreme Court of India" vs "Supreme Court")
    if (!hay.includes(ne) && !ne.split(" ").every((w) => hay.includes(w))) missing.push(e);
  }
  return { ok: missing.length === 0, missing };
}
