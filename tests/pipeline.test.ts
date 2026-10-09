import { describe, it, expect } from "vitest";
import { grounded, numbersIn } from "../scripts/pipeline/grounding";
import { jaccard, tokens, canonicalUrl, findDuplicate, mergeSources } from "../scripts/pipeline/dedupe";
import { classify, relevanceHeuristic } from "../scripts/pipeline/classify";
import { fetchAll } from "../scripts/pipeline/fetch";
import { Enrichment } from "../scripts/pipeline/llm";
import type { FeedSource } from "../scripts/pipeline/sources";

describe("grounding guard (anti-hallucination)", () => {
  const src = "The Supreme Court on Tuesday held that the 2023 Act is valid. A five-judge Constitution Bench headed by Chief Justice D.Y. Chandrachud said 11 December was the date.";
  it("accepts facts copied from the source", () => { expect(grounded("A five-judge Constitution Bench upheld the Act in 2023", src).ok).toBe(true); });
  it("rejects invented numbers", () => { const r = grounded("A seven-judge bench decided 7:6", src); expect(r.ok).toBe(false); expect(r.missing).toContain("7"); });
  it("rejects invented names", () => { const r = grounded("Justice Sharma wrote the judgment", src); expect(r.ok).toBe(false); expect(r.missing.join(" ")).toMatch(/Sharma/); });
  it("allows the curated knowledge base as an additional source", () => { expect(grounded("Article 142 allows complete justice", src, "Article 142 — complete justice").ok).toBe(true); });
  it("normalises thousands separators", () => expect(numbersIn("₹1,20,000 crore and 4.5%")).toEqual(["120000", "4.5"]));
});

describe("dedupe", () => {
  it("jaccard on headline tokens", () => { expect(jaccard(tokens("Supreme Court strikes down electoral bonds scheme"), tokens("SC strikes down electoral bonds scheme: Supreme Court verdict"))).toBeGreaterThan(0.5); expect(jaccard(tokens("RBI keeps repo rate unchanged"), tokens("ISRO launches satellite"))).toBe(0); });
  it("canonical URL strips tracking params and trailing slash", () => expect(canonicalUrl("https://X.com/a/b/?utm_source=tw&id=3#top")).toBe("https://x.com/a/b?id=3"));
  const pool = [{ id: "A", title: "Supreme Court strikes down electoral bonds scheme", published_at: "2026-10-08T10:00:00Z", sources: [{ name: "The Hindu", url: "https://h.com/1", quality: 8 }] }];
  it("detects same-URL and near-identical headlines, ignores far-apart dates", () => {
    expect(findDuplicate("x", "https://h.com/1/?utm_source=a", "2026-10-09T00:00:00Z", pool)).toBe("A");
    expect(findDuplicate("SC strikes down electoral bonds scheme", "https://ie.com/9", "2026-10-09T00:00:00Z", pool)).toBe("A");
    expect(findDuplicate("SC strikes down electoral bonds scheme", "https://ie.com/9", "2026-11-09T00:00:00Z", pool)).toBeNull();
  });
  it("merges independent publishers, keeps best quality first, ignores same publisher twice", () => {
    let s = mergeSources(pool[0].sources, { name: "PIB", url: "p", quality: 10 }); expect(s.map((x) => x.name)).toEqual(["PIB", "The Hindu"]);
    s = mergeSources(s, { name: "The Hindu", url: "h2", quality: 8 }); expect(s.length).toBe(2);
  });
});

describe("classifier & relevance", () => {
  it("classifies obvious cases", () => {
    expect(classify("Supreme Court Constitution Bench holds Article 21 includes privacy").category).toBe("legal");
    expect(classify("RBI MPC keeps repo rate unchanged, inflation target").category).toBe("economy");
    expect(classify("Nobel Peace Prize awarded").category).toBe("awards");
    expect(classify("New Ramsar site added; wetland conservation").category).toBe("environment");
  });
  it("scores landmark legal news far above celebrity noise", () => {
    expect(relevanceHeuristic("legal", "Constitution Bench landmark Supreme Court judgment", 10)).toBeGreaterThanOrEqual(9);
    expect(relevanceHeuristic("national", "Bollywood actor viral reel box office", 7)).toBeLessThan(4);
  });
});

describe("ingestion on fixture feeds (network-free)", () => {
  const now = new Date("2026-10-09T12:00:00Z");
  const S: FeedSource[] = [
    { id: "pib", name: "PIB", url: "pib://x", quality: 10 }, { id: "hindu", name: "The Hindu", url: "hindu://x", quality: 8, defaultCategory: "national" },
    { id: "dead", name: "Dead Feed", url: "dead://x", quality: 8 },
  ];
  const feeds: Record<string, any> = {
    "pib://x": { items: [{ title: "Supreme Court Constitution Bench holds right to privacy part of Article 21", link: "https://pib.gov.in/1?utm_source=x", isoDate: "2026-10-09T08:00:00Z", contentSnippet: "A five-judge Constitution Bench of the Supreme Court held on Friday that privacy is protected under Article 21. The bench was headed by the Chief Justice." }] },
    "hindu://x": { items: [
      { title: "SC Constitution Bench holds right to privacy part of Article 21", link: "https://thehindu.com/2", isoDate: "2026-10-09T09:00:00Z", contentSnippet: "Privacy is protected under Article 21, a five-judge Constitution Bench of the Supreme Court held." },
      { title: "Bollywood actor viral reel crosses box office record", link: "https://thehindu.com/3", isoDate: "2026-10-09T09:00:00Z", contentSnippet: "Celebrity gossip." },
      { title: "Ancient story", link: "https://thehindu.com/4", isoDate: "2026-01-01T09:00:00Z", contentSnippet: "Old Supreme Court judgment." },
    ] },
  };
  const load = async (u: string) => { if (!feeds[u]) throw new Error("ENOTFOUND"); return feeds[u]; };
  it("merges duplicates across publishers, drops noise & stale items, survives a dead feed", async () => {
    const r = await fetchAll([], S, now, load);
    expect(r.failed).toEqual(["Dead Feed"]);
    expect(r.articles.length).toBe(1);
    const a = r.articles[0];
    expect(a.sources.map((s) => s.name)).toEqual(["PIB", "The Hindu"]);
    expect(a.category).toBe("legal"); expect(a.relevance_score).toBeGreaterThanOrEqual(8); expect(a.source_quality).toBe(10); expect(a.is_demo).toBe(false);
    expect(a.keyFacts.every((f) => a.summary.includes(f.replace(/…$/, "")))).toBe(true); // extractive facts are verbatim from the source snippet
  });
  it("is idempotent: re-running adds nothing new", async () => {
    const first = await fetchAll([], S, now, load); const second = await fetchAll(first.articles, S, now, load);
    expect(second.added).toBe(0); expect(second.articles.length).toBe(1);
  });
});

describe("LLM output schema", () => {
  it("rejects malformed MCQs (wrong option count / answer index)", () => {
    const base = { summary: "x".repeat(30), why_matters: "y".repeat(30), key_facts: [], mcqs: [{ question: "Which court decided?", options: ["a", "b", "c"], answer: 0, explanation: "because" }] };
    expect(Enrichment.safeParse(base).success).toBe(false);
    expect(Enrichment.safeParse({ ...base, mcqs: [{ ...base.mcqs[0], options: ["a", "b", "c", "d"], answer: 5 }] }).success).toBe(false);
    expect(Enrichment.safeParse({ ...base, mcqs: [{ ...base.mcqs[0], options: ["a", "b", "c", "d"], answer: 2 }] }).success).toBe(true);
  });
});


import { parseFeedText, fetchAll as fetchAll2 } from "../scripts/pipeline/fetch";
describe("real-world feed robustness", () => {
  it("parses a feed with junk/BOM before the first tag (UN News style)", async () => {
    const f = await parseFeedText("\uFEFF \n  <?xml version=\"1.0\"?><rss version=\"2.0\"><channel><title>x</title><item><title>Supreme Court rules on bail</title><link>http://a/1</link></item></channel></rss>");
    expect(f.items.length).toBe(1);
  });
  it("an item with an invalid date no longer crashes the run", async () => {
    const src = [{ id: "t", name: "T", url: "u", quality: 8, defaultCategory: "legal" as const }];
    const now = new Date("2026-10-09T10:00:00Z");
    const load = async () => ({ items: [{ title: "Supreme Court strikes down provision under Article 14", link: "http://x/1", pubDate: "not a date" }, { title: "Supreme Court Collegium recommends judges", link: "http://x/2", isoDate: "garbage" }] });
    const r = await fetchAll2([], src, now, load);
    expect(r.fetched).toBe(2); expect(r.added).toBeGreaterThan(0);
  });
});
