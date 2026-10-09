/** Optional: mirror data/live into Supabase (tables in supabase/schema.sql). Needs SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY. */
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import type { Article, Question } from "../src/lib/types";

const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.log("[supabase] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set → skipping."); process.exit(0); }
const rd = <T,>(f: string): T => JSON.parse(fs.readFileSync(path.resolve(__dirname, "..", "data", "live", f), "utf8"));
const db = createClient(url, key, { auth: { persistSession: false } });
const chunk = <T,>(xs: T[], n = 200) => Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, i * n + n));

(async () => {
  const arts = rd<Article[]>("articles.json"); let qs: Question[] = []; try { qs = rd<Question[]>("questions.json"); } catch {}
  const srcRows = Array.from(new Map(arts.flatMap((a) => a.sources.map((s) => [s.name, { name: s.name, quality: s.quality }] as const))).values());
  await db.from("sources").upsert(srcRows, { onConflict: "name" });
  for (const c of chunk(arts)) {
    const { error } = await db.from("articles").upsert(c.map((a) => ({ id: a.id, title: a.title, summary: a.summary, content: a.content.join("\n\n"), source: a.sources[0]?.name, source_url: a.sources[0]?.url, sources: a.sources, published_at: a.published_at,
      category: a.category, subcategory: a.subcategory ?? null, relevance_score: a.relevance_score, nlsat_relevance: a.exam.nlsat, aiat_relevance: a.exam.aiat, ssc_relevance: a.exam.ssc, tags: a.tags, priority_score: a.priority_score,
      why_matters: a.whyMatters, key_facts: a.keyFacts, verified: a.verified, ai_generated: a.ai_generated })), { onConflict: "id" });
    if (error) throw error;
  }
  for (const c of chunk(qs)) { const { error } = await db.from("questions").upsert(c.map((q) => ({ id: q.id, article_id: q.article_id ?? null, question: q.question, option_a: q.options[0], option_b: q.options[1], option_c: q.options[2], option_d: q.options[3], answer: "ABCD"[q.answer], explanation: q.explanation, difficulty: q.difficulty })), { onConflict: "id" }); if (error) throw error; }
  console.log(`[supabase] upserted ${arts.length} articles, ${qs.length} questions`);
})().catch((e) => { console.error(e); process.exit(1); });
