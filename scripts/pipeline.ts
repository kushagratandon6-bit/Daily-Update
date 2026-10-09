/**
 * LawCA pipeline.   npm run pipeline:fetch | pipeline:enrich | pipeline:run
 * fetch  : RSS/Atom → normalize → classify → score → de-duplicate/merge → data/live/articles.json
 * enrich : (optional, needs an LLM key) grounded summaries, facts, examiner angles and MCQs for the top new stories
 */
import fs from "node:fs";
import path from "node:path";
import type { Article, Question, StaticEntry } from "../src/lib/types";
import { fetchAll, stripHtml, whyTemplate } from "./pipeline/fetch";
import { enrichText, llmAvailable, toQuestions } from "./pipeline/llm";
import { priorityScore } from "../src/lib/priority";
import { istDate } from "../src/lib/dates";
import { linkKnowledge } from "../src/lib/knowledge";

const root = path.resolve(__dirname, "..");
const LIVE = path.join(root, "data", "live");
const rd = <T,>(f: string, d: T): T => { try { return JSON.parse(fs.readFileSync(path.join(LIVE, f), "utf8")); } catch { return d; } };
const wr = (f: string, v: unknown) => { fs.mkdirSync(LIVE, { recursive: true }); fs.writeFileSync(path.join(LIVE, f), JSON.stringify(v, null, 1)); };
const knowledge: StaticEntry[] = [...rd<StaticEntry[]>("../knowledge/static-gk.json", []), ...rd<StaticEntry[]>("../knowledge/legal-concepts.json", [])];

async function doFetch() {
  const existing = rd<Article[]>("articles.json", []);
  const res = await fetchAll(existing);
  const today = istDate();
  const keep = res.articles
    .filter((a) => new Date(a.published_at).getTime() > Date.now() - 400 * 86_400_000)
    .map((a) => { const l = linkKnowledge([a.title, a.summary].join(" "), knowledge); return { ...a, staticLinks: l.staticLinks, legalLinks: l.legalLinks, priority_score: priorityScore(a, today) }; })
    .sort((a, b) => b.published_at.localeCompare(a.published_at)).slice(0, 8000);
  wr("articles.json", keep);
  wr("meta.json", { last_fetch_at: new Date().toISOString(), failed_sources: res.failed, fetched: res.fetched, added: res.added, merged: res.merged });
  console.log(`[fetch] items=${res.fetched} new=${res.added} merged=${res.merged} failed_sources=${res.failed.join(",") || "none"} total=${keep.length}`);
  if (res.fetched === 0) console.warn("[fetch] no items fetched — check network access and run `npm run sources:check`");
}

async function articleText(a: Article): Promise<string> {
  // Transient LLM input only — never stored or republished. Falls back to the RSS snippet.
  try {
    const url = a.sources[0]?.url; if (!url || url === "#") return a.summary;
    const r = await fetch(url, { headers: { "User-Agent": "LawCA-Bot/1.0" }, signal: AbortSignal.timeout(12000) }); if (!r.ok) return a.summary;
    const html = await r.text(); const ps = Array.from(html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)).map((m) => stripHtml(m[1])).filter((p) => p.length > 60);
    const t = ps.join("\n"); return t.length > 400 ? t : a.summary;
  } catch { return a.summary; }
}

async function doEnrich() {
  if (!llmAvailable()) { console.log("[enrich] no LLM key set (ANTHROPIC_API_KEY / OPENAI_API_KEY) → skipping. Rule-based data is still published."); return; }
  const arts = rd<Article[]>("articles.json", []); const qs = rd<Question[]>("questions.json", []);
  const max = Number(process.env.LLM_MAX_ARTICLES_PER_RUN || 25); const cut = Date.now() - 3 * 86_400_000;
  const todo = arts.filter((a) => !a.ai_generated && a.relevance_score >= 6 && new Date(a.published_at).getTime() > cut).sort((a, b) => b.priority_score - a.priority_score).slice(0, max);
  const kt = knowledge.map((k) => `${k.title}. ${k.points.join(" ")}`).join(" ");
  let ok = 0, dropped = 0, failed = 0;
  for (const a of todo) {
    try {
      const text = await articleText(a); const out = await enrichText(a.title, text, kt); if (!out) { failed++; continue; }
      const { e } = out; dropped += out.dropped;
      if (e.summary) { a.summary = e.summary; a.content = [e.summary]; }
      if (e.why_matters) a.whyMatters = e.why_matters; else a.whyMatters = whyTemplate(a.category);
      if (e.key_facts.length >= 2) a.keyFacts = e.key_facts;
      if (e.examiner_angles.length) a.examinerAngles = e.examiner_angles;
      if (e.background.length) a.background = e.background;
      a.verified = e.verified && a.verified; a.ai_generated = true;
      const day = istDate(a.published_at); const examList = (["nlsat", "aiat", "ssc"] as const).filter((x) => a.exam[x] >= 5);
      const newQs = toQuestions(e.mcqs, { id: a.id, category: a.category, date: day, exam: examList.length ? [...examList] : ["nlsat", "aiat", "ssc"] });
      for (let i = qs.length - 1; i >= 0; i--) if (qs[i].article_id === a.id) qs.splice(i, 1);
      qs.push(...newQs); ok++;
    } catch (err) { failed++; console.warn(`[enrich] ✗ ${a.id}: ${(err as Error).message}`); }
  }
  wr("articles.json", arts); wr("questions.json", qs.slice(-6000));
  console.log(`[enrich] enriched=${ok} failed=${failed} ungrounded-items-dropped=${dropped}`);
}

(async () => {
  const cmd = process.argv[2] || "all";
  if (cmd === "fetch" || cmd === "all") await doFetch();
  if (cmd === "enrich" || cmd === "all") await doEnrich();
})().catch((e) => { console.error("[pipeline] error (existing data is kept; build continues):", e); process.exit(0); });
