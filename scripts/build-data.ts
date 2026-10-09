/**
 * Prebuild step: picks LIVE data (data/live) if present, else DEMO data, and writes JSON the static site loads
 * from /data/*.json. DEMO and LIVE are never mixed.
 */
import fs from "node:fs";
import path from "node:path";
import type { Article, Dataset, Fact, Flashcard, Question, StaticEntry } from "../src/lib/types";
import { buildDemo } from "./demo-seed";
import { linkKnowledge } from "../src/lib/knowledge";
import { priorityScore } from "../src/lib/priority";
import { istDate } from "../src/lib/dates";

const root = path.resolve(__dirname, "..");
const readJSON = <T,>(p: string, fallback: T): T => { try { return JSON.parse(fs.readFileSync(path.join(root, p), "utf8")) as T; } catch { return fallback; } };

export function assemble(mode: "auto" | "live" | "demo" = (process.env.NEXT_PUBLIC_DATA_MODE as any) || "auto"): Dataset {
  const now = new Date().toISOString();
  const today = istDate(now);
  const liveArticles = readJSON<Article[]>("data/live/articles.json", []);
  const liveQuestions = readJSON<Question[]>("data/live/questions.json", []);
  const liveMeta = readJSON<{ failed_sources?: string[]; last_fetch_at?: string }>("data/live/meta.json", {});
  const useLive = mode === "live" || (mode === "auto" && liveArticles.length > 0);

  const knowledge: StaticEntry[] = [
    ...readJSON<StaticEntry[]>("data/knowledge/static-gk.json", []),
    ...readJSON<StaticEntry[]>("data/knowledge/legal-concepts.json", []),
  ];
  const staticQ = readJSON<Question[]>("data/knowledge/static-questions.json", []);
  const flashcards = readJSON<Flashcard[]>("data/knowledge/flashcards.json", []);

  let articles: Article[]; let articleQ: Question[];
  if (useLive) { articles = liveArticles; articleQ = liveQuestions; }
  else { const d = buildDemo(now); articles = d.articles; articleQ = d.questions; }

  // Re-link knowledge + recompute priority with the build date (keeps recency fresh without re-running the pipeline)
  articles = articles.map((a) => {
    const text = [a.title, a.summary, ...a.content, ...a.keyFacts].join(" \n ");
    const links = linkKnowledge(text, knowledge);
    return {
      ...a,
      staticLinks: Array.from(new Set([...(a.staticLinks || []), ...links.staticLinks])).slice(0, 4),
      legalLinks: Array.from(new Set([...(a.legalLinks || []), ...links.legalLinks])).slice(0, 3),
      priority_score: priorityScore(a, today),
    };
  }).sort((a, b) => b.published_at.localeCompare(a.published_at));

  const facts: Fact[] = [];
  for (const a of articles) {
    const date = istDate(a.published_at);
    [...(a.one_liners || []), ...a.keyFacts.slice(0, 2)].forEach((t, i) =>
      facts.push({ id: `${a.id}-f${i}`, text: t, category: a.category, date, article_id: a.id, is_demo: a.is_demo }));
  }

  return {
    articles, facts, flashcards, knowledge,
    questions: [...articleQ, ...staticQ],
    meta: { generated_at: now, mode: useLive ? "live" : "demo", article_count: articles.length, failed_sources: liveMeta.failed_sources || [], last_fetch_at: liveMeta.last_fetch_at },
  };
}

if (require.main === module || process.argv[1]?.endsWith("build-data.ts")) {
  const ds = assemble();
  const out = path.join(root, "public", "data");
  fs.mkdirSync(out, { recursive: true });
  for (const k of ["articles", "questions", "facts", "flashcards", "knowledge", "meta"] as const)
    fs.writeFileSync(path.join(out, `${k}.json`), JSON.stringify(ds[k]));
  fs.writeFileSync(path.join(out, "frozen.json"), JSON.stringify(readJSON("data/live/archive/quizzes.json", {})));
  console.log(`[build-data] mode=${ds.meta.mode} articles=${ds.articles.length} questions=${ds.questions.length} facts=${ds.facts.length}`);
}
