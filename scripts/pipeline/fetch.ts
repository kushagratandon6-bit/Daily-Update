import Parser from "rss-parser";
import crypto from "node:crypto";
import type { Article, SourceRef } from "../../src/lib/types";
import { SOURCES, PUBLISHER_QUALITY, type FeedSource } from "./sources";
import { classify, relevanceHeuristic, legalRelevance, nationalImportance, examScores, mcqValue, tagsFrom } from "./classify";
import { findDuplicate, mergeSources, canonicalUrl } from "./dedupe";
import { priorityScore } from "../../src/lib/priority";
import { istDate } from "../../src/lib/dates";

export const parser = new Parser({ timeout: 15000, customFields: { item: [["source", "gsource"]] } });

const BROWSER_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
/** Fetches a feed with browser-like headers (several publishers answer 403/406 to bot-style requests),
 *  trims junk before the first tag (BOM / whitespace / stray text) and parses it. */
export async function parseFeedText(xml: string) {
  const i = xml.indexOf("<"); const clean = (i > 0 ? xml.slice(i) : xml).replace(/^\uFEFF/, "").trim();
  return parser.parseString(clean);
}
export const httpLoader = async (url: string) => {
  const r = await fetch(url, { headers: { "User-Agent": BROWSER_UA, Accept: "*/*", "Accept-Language": "en-IN,en;q=0.9" }, redirect: "follow", signal: AbortSignal.timeout(20000) });
  if (!r.ok) throw new Error(`Status code ${r.status}`);
  return parseFeedText(await r.text());
};

export const stripHtml = (s: string) => s.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&rsquo;|&lsquo;/g, "'").replace(/\s+/g, " ").trim();
const clip = (s: string, n: number) => (s.length <= n ? s : s.slice(0, s.lastIndexOf(" ", n)).replace(/[,;:]$/, "") + "…");
const hash = (s: string) => crypto.createHash("sha1").update(s).digest("hex").slice(0, 12);

const EXAM_Q: Record<string, string[]> = {
  legal: ["Which Article / Act / provision is involved?", "Bench strength and which judge authored the judgment?", "Which earlier case was relied on, distinguished or overruled?", "Which legal doctrine (basic structure, proportionality, etc.) applies?"],
  polity: ["Which constitutional article or body is involved?", "Who appoints / removes the authority concerned?", "Which house or committee is involved?"],
  international: ["Where is the HQ of the organisation / which countries are involved?", "What is India’s connection or stand?", "When was the agreement / grouping formed?"],
  economy: ["Which institution announced it and under which Act?", "What is the exact rate / figure announced?", "Define the term (repo rate, CPI, GDP, fiscal deficit)."],
  environment: ["Which convention / protected area is involved?", "Where is it located and why is it notable?", "Which law governs it?"],
};

const safeIso = (v: unknown): string | null => { if (!v) return null; const d = new Date(v as string); return isNaN(d.getTime()) ? null : d.toISOString(); };

export interface FetchResult { articles: Article[]; failed: string[]; fetched: number; added: number; merged: number }

export type FeedLoader = (url: string) => Promise<{ items: any[] }>;
export async function fetchAll(existing: Article[], sources: FeedSource[] = SOURCES, now = new Date(), load: FeedLoader = httpLoader): Promise<FetchResult> {
  const failed: string[] = []; const pool = [...existing]; let fetched = 0, added = 0, merged = 0;
  const results = await Promise.allSettled(sources.map(async (s) => ({ s, feed: await load(s.url) })));
  results.forEach((r, i) => { if (r.status === "rejected") { const n = sources[i].name; if (!failed.includes(n)) failed.push(n); console.warn(`[fetch] ✗ ${sources[i].id}: ${(r.reason as Error)?.message}`); } });

  for (const r of results) {
    if (r.status !== "fulfilled") continue; const { s, feed } = r.value;
    for (const it of (feed.items || []).slice(0, 40)) {
      fetched++;
      try {
      let title = stripHtml(it.title || ""); const link = it.link || ""; if (!title || !link) continue;
      let pub = s.name; let q = s.quality;
      const gs = (it as any).gsource; // Google News: real publisher in <source>
      if (s.id.startsWith("gn-")) { const p = (typeof gs === "string" ? gs : gs?._ || "").trim() || title.split(" - ").pop() || ""; title = title.replace(/ - [^-]+$/, ""); if (p) { pub = p; q = PUBLISHER_QUALITY[p.toLowerCase()] ?? PUBLISHER_QUALITY[Object.keys(PUBLISHER_QUALITY).find((k) => p.toLowerCase().includes(k)) || ""] ?? 5; } }
      const published = safeIso(it.isoDate) || safeIso(it.pubDate) || safeIso(it.published) || now.toISOString();
      if (now.getTime() - new Date(published).getTime() > 14 * 86_400_000) continue; // ignore stale feed items
      const snippet = clip(stripHtml(it.contentSnippet || it.summary || (it as any).content || ""), 520);
      const text = `${title}. ${snippet}`;
      const ref: SourceRef = { name: pub, url: link, quality: q };

      const dupId = findDuplicate(title, link, published, pool);
      if (dupId) {
        const a = pool.find((x) => x.id === dupId)!; const before = a.sources.length;
        a.sources = mergeSources(a.sources, ref); a.source_quality = Math.max(a.source_quality, q);
        if (a.sources.length > before) merged++;
        continue;
      }
      const cl = classify(text, s.defaultCategory ?? "national");
      const category = cl.confidence === 0 && s.defaultCategory ? s.defaultCategory : cl.category;
      const rel = relevanceHeuristic(category, text, q);
      if (rel < 4) continue; // "Ignore" band (1–3) is not stored
      const legal = legalRelevance(category, text), nat = nationalImportance(category, text, q), mcq = mcqValue(category, text);
      const sentences = snippet.split(/(?<=[.!?])\s+/).filter((x) => x.length > 25);
      const facts = sentences.filter((x) => /\d|[A-Z][a-z]+ [A-Z][a-z]+/.test(x)).slice(0, 4);
      const base = {
        id: hash(canonicalUrl(link)), title, summary: snippet || title, content: [snippet || title],
        whyMatters: "", keyFacts: facts.length ? facts : sentences.slice(0, 2),
        examinerAngles: EXAM_Q[category] ?? ["Which person / place / institution / number can be asked?", "What is the static-GK link?"],
        category, tags: tagsFrom(text, category), published_at: published, created_at: now.toISOString(),
        sources: [ref], source_quality: q, relevance_score: rel, exam: examScores(rel, category, legal), legal_relevance: legal, national_importance: nat, mcq_value: mcq,
        staticLinks: [], legalLinks: [], verified: q >= 8, ai_generated: false, is_demo: false,
      };
      const art: Article = { ...base, priority_score: priorityScore(base, istDate(now)) };
      art.whyMatters = whyTemplate(category);
      pool.push(art); added++;
      } catch (err) { console.warn(`[fetch] skipped one item from ${s.id}: ${(err as Error).message}`); }
    }
  }
  return { articles: pool, failed, fetched, added, merged };
}

/** Honest, non-factual "why it matters" used until/unless the LLM step refines it. */
export function whyTemplate(c: Article["category"]): string {
  const m: Record<string, string> = {
    legal: "Judgments, statutes and constitutional provisions are the most testable current-affairs area for law entrance exams. Note the court/bench, the provision involved and the principle laid down.",
    polity: "Institutions, constitutional bodies and legislative developments may be tested through names, articles and appointment rules.",
    international: "Questions typically ask which countries/organisations are involved, headquarters, founding years and India’s connection.",
    economy: "Policy rates, regulators and economic indicators can be tested as facts (who announced, what figure) and as definitions.",
    awards: "Awards are tested as winner → award → field → nationality.", appointments: "Appointments are tested as person → post → predecessor and the appointing authority.",
    reports: "Index/report questions ask India’s rank, the top-ranked country and the publishing organisation.", environment: "Environment items link to conventions, protected areas and laws — note names and locations.",
    scitech: "Science & technology items are tested through the mission/technology name, the agency and the headline milestone.", defence: "Defence items are tested through exercise/system names, participating countries and locations.",
  };
  return m[c] ?? "This item may be tested through the names, places, numbers and institutions it mentions. Verify details at the original source.";
}
