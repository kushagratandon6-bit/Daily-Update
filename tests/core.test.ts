import { describe, it, expect } from "vitest";
import { priorityScore, band, recency, mostLikely } from "@/lib/priority";
import { startItem, review, isDue, REVIEW_OFFSETS } from "@/lib/srs";
import { buildQuiz, scoreQuiz, isoWeek, shuffle } from "@/lib/quiz";
import { poolFor } from "@/lib/quiz-pools";
import { linkKnowledge } from "@/lib/knowledge";
import { applyFilters, DEFAULT_FILTERS } from "@/lib/search";
import { computeStreak } from "@/lib/store";
import { addDays, diffDays, istDate, fmtLong } from "@/lib/dates";
import type { Article, Question, StaticEntry } from "@/lib/types";

const mkQ = (i: number, cat: Question["category"] = "legal", origin: Question["origin"] = "static", date?: string): Question => ({ id: `q${i}`, question: `Q${i}?`, options: ["a", "b", "c", "d"], answer: (i % 4) as 0 | 1 | 2 | 3, explanation: "e", difficulty: "medium", category: cat, exam: ["nlsat", "aiat", "ssc"], origin, date, is_demo: false });
const mkA = (o: Partial<Article>): Article => ({ id: "a", title: "T", summary: "S", content: ["c"], whyMatters: "w", keyFacts: ["f"], category: "legal", tags: [], published_at: "2026-10-09T10:00:00+05:30", created_at: "", sources: [{ name: "PIB", url: "u", quality: 10 }], source_quality: 10, relevance_score: 8, exam: { nlsat: 8, aiat: 8, ssc: 8 }, legal_relevance: 8, national_importance: 8, mcq_value: 8, priority_score: 50, staticLinks: [], legalLinks: [], verified: true, ai_generated: false, is_demo: false, ...o });

describe("dates", () => {
  it("IST conversion crosses midnight correctly", () => { expect(istDate("2026-10-08T19:00:00Z")).toBe("2026-10-09"); expect(istDate("2026-10-08T18:29:00Z")).toBe("2026-10-08"); });
  it("add/diff days", () => { expect(addDays("2026-02-27", 2)).toBe("2026-03-01"); expect(diffDays("2026-10-09", "2026-10-01")).toBe(8); expect(fmtLong("2026-10-09")).toBe("09 October 2026"); });
});

describe("priority engine", () => {
  const base = { relevance_score: 10, legal_relevance: 10, national_importance: 10, source_quality: 10, mcq_value: 10, published_at: "2026-10-09T10:00:00+05:30" };
  it("max inputs on the same day = 100", () => expect(priorityScore(base, "2026-10-09")).toBe(100));
  it("recency decays with half-life", () => { expect(recency("2026-10-06T10:00:00+05:30", "2026-10-09", 3)).toBeCloseTo(0.5, 5); expect(priorityScore(base, "2026-10-16")).toBeLessThan(priorityScore(base, "2026-10-09")); });
  it("higher source quality ranks higher, all else equal", () => expect(priorityScore({ ...base, source_quality: 10 }, "2026-10-09")).toBeGreaterThan(priorityScore({ ...base, source_quality: 3 }, "2026-10-09")));
  it("importance bands follow the spec", () => { expect(band(10).label).toBe("Must Know"); expect(band(9).label).toBe("High Priority"); expect(band(6).label).toBe("Moderate"); expect(band(4).label).toBe("Low Priority"); expect(band(2).label).toBe("Ignore"); });
  it("mostLikely prefers multi-source, high-relevance stories", () => {
    const a = mkA({ id: "x", relevance_score: 9 }), b = mkA({ id: "y", relevance_score: 9, sources: [{ name: "PIB", url: "1", quality: 10 }, { name: "Hindu", url: "2", quality: 8 }] }), c = mkA({ id: "z", relevance_score: 4 });
    expect(mostLikely([a, b, c], 5).map((x) => x.id)).toEqual(["y", "x"]);
  });
});

describe("spaced revision", () => {
  it("schedules Day 3, 7, 15, 30 counting the learn day as Day 1", () => {
    let it = startItem("2026-10-01"); expect(it.nextDue).toBe("2026-10-03");
    it = review(it, "2026-10-03"); expect(it.nextDue).toBe("2026-10-07");
    it = review(it, "2026-10-07"); expect(it.nextDue).toBe("2026-10-15");
    it = review(it, "2026-10-15"); expect(it.nextDue).toBe("2026-10-30");
    it = review(it, "2026-10-30"); expect(it.mastered).toBe(true); expect(it.nextDue).toBeNull();
    expect(REVIEW_OFFSETS).toEqual([2, 6, 14, 29]);
  });
  it("is due on/after the due date, not before; mastered never due", () => {
    const it = startItem("2026-10-01"); expect(isDue(it, "2026-10-02")).toBe(false); expect(isDue(it, "2026-10-03")).toBe(true); expect(isDue(it, "2026-11-01")).toBe(true);
    expect(isDue({ ...it, mastered: true, nextDue: null }, "2026-11-01")).toBe(false);
  });
  it("'still difficult' restarts the ladder from today", () => { const it = review(review(startItem("2026-10-01"), "2026-10-03"), "2026-10-07", true); expect(it.stage).toBe(0); expect(it.nextDue).toBe("2026-10-09"); expect(it.difficult).toBe(true); });
});

describe("quiz engine", () => {
  const pool = Array.from({ length: 30 }, (_, i) => mkQ(i, i % 2 ? "legal" : "economy"));
  it("is deterministic for the same seed and differs across seeds", () => {
    const a = buildQuiz({ count: 10, seed: "s1", pool }).map((q) => q.id), b = buildQuiz({ count: 10, seed: "s1", pool }).map((q) => q.id), c = buildQuiz({ count: 10, seed: "s2", pool }).map((q) => q.id);
    expect(a).toEqual(b); expect(a).not.toEqual(c); expect(new Set(a).size).toBe(10);
  });
  it("never exceeds the pool and has no duplicates", () => { const q = buildQuiz({ count: 100, seed: "x", pool }); expect(q.length).toBe(30); expect(new Set(q.map((x) => x.id)).size).toBe(30); });
  it("filters by difficulty then tops up", () => { const p2 = [...pool.slice(0, 5).map((q) => ({ ...q, difficulty: "hard" as const })), ...pool.slice(5)]; const q = buildQuiz({ count: 8, difficulty: "hard", seed: "x", pool: p2 }); expect(q.slice(0, 5).every((x) => x.difficulty === "hard")).toBe(true); expect(q.length).toBe(8); });
  it("scores with negative marking and reports weak/strong areas", () => {
    const qs = [mkQ(0, "legal"), mkQ(1, "legal"), mkQ(2, "economy"), mkQ(3, "economy"), mkQ(4, "economy")];
    const ans = { q0: qs[0].answer, q1: qs[1].answer, q2: (qs[2].answer + 1) % 4, q3: (qs[3].answer + 1) % 4 }; // 2 right, 2 wrong, 1 skipped
    const r = scoreQuiz(qs, ans, 0.25);
    expect(r.correct).toBe(2); expect(r.wrong).toBe(2); expect(r.skipped).toBe(1); expect(r.score).toBe(1.5); expect(r.accuracy).toBe(50);
    expect(r.weak).toContain("economy"); expect(r.strong).toContain("legal"); expect(r.toRevise.sort()).toEqual(["q2", "q3", "q4"]);
  });
  it("ISO week keys", () => { expect(isoWeek("2026-10-09")).toBe("2026-W41"); expect(isoWeek("2026-01-01")).toBe("2026-W01"); expect(isoWeek("2021-01-03")).toBe("2020-W53"); });
  it("poolFor builds daily/weekly/monthly pools with stable seeds", () => {
    const all = [mkQ(1), mkQ(2), mkQ(3, "legal", "article", "2026-10-09"), mkQ(4, "legal", "article", "2026-09-01")];
    expect(poolFor("daily", "2026-10-09", all).pool.map((q) => q.id)).toEqual(["q3", "q1", "q2"]);
    expect(poolFor("weekly", "2026-10-09", all).seed).toBe("weekly:2026-W41");
    expect(poolFor("monthly", "2026-10-09", all).pool.some((q) => q.id === "q4")).toBe(false);
  });
  it("shuffle is a permutation", () => expect(shuffle([1, 2, 3, 4, 5], "a").sort()).toEqual([1, 2, 3, 4, 5]));
});

describe("knowledge linking", () => {
  const K: StaticEntry[] = [
    { id: "asean", title: "ASEAN", kind: "static-gk", keywords: ["asean"], points: [] },
    { id: "who", title: "WHO", kind: "static-gk", keywords: ["who", "world health organization"], points: [] },
    { id: "article-21", title: "Art 21", kind: "legal", keywords: ["article 21", "right to life"], points: [] },
  ];
  it("matches acronyms only in uppercase (avoids the English word 'who')", () => {
    expect(linkKnowledge("India signs pact with ASEAN", K).staticLinks).toEqual(["asean"]);
    expect(linkKnowledge("Those who decided said so", K).staticLinks).toEqual([]);
    expect(linkKnowledge("The WHO released data", K).staticLinks).toEqual(["who"]);
  });
  it("matches multi-word phrases and splits legal vs static", () => { const r = linkKnowledge("Court expands the Right to Life under Article 21", K); expect(r.legalLinks).toEqual(["article-21"]); expect(r.staticLinks).toEqual([]); });
});

describe("filters & search", () => {
  const K: StaticEntry[] = [{ id: "dpdp", title: "Digital Personal Data Protection Act, 2023", kind: "static-gk", keywords: ["dpdp", "digital personal data protection"], points: [] }];
  const arts = [
    mkA({ id: "1", title: "Supreme Court on privacy", tags: ["Article 21"], published_at: "2026-10-09T10:00:00+05:30", relevance_score: 9, staticLinks: ["dpdp"] }),
    mkA({ id: "2", title: "RBI keeps repo rate", category: "economy", published_at: "2026-10-04T10:00:00+05:30", relevance_score: 6, exam: { nlsat: 3, aiat: 3, ssc: 9 } }),
    mkA({ id: "3", title: "Old story", category: "economy", published_at: "2026-06-01T10:00:00+05:30", relevance_score: 5 }),
  ];
  const f = (p: Partial<typeof DEFAULT_FILTERS>) => applyFilters(arts, { ...DEFAULT_FILTERS, ...p }, K, "2026-10-09").map((a) => a.id);
  it("date presets", () => { expect(f({ date: "today" })).toEqual(["1"]); expect(f({ date: "7d" })).toEqual(["1", "2"]); expect(f({ date: "3m" }).sort()).toEqual(["1", "2"]); expect(f({ date: "custom", from: "2026-05-01", to: "2026-06-30" })).toEqual(["3"]); });
  it("category / importance / exam filters", () => { expect(f({ cats: ["economy"] }).sort()).toEqual(["2", "3"]); expect(f({ minScore: 8 })).toEqual(["1"]); expect(f({ exam: "ssc", minScore: 9 })).toEqual(["2"]); expect(f({ exam: "nlsat", minScore: 8 }).sort()).toEqual(["1", "3"]); });
  it("text search + knowledge-aware search finds linked stories", () => { expect(f({ q: "repo" })).toEqual(["2"]); expect(f({ q: "DPDP" })).toEqual(["1"]); expect(f({ q: "nothing-here" })).toEqual([]); });
});

describe("streak", () => {
  it("counts consecutive days ending today or yesterday", () => {
    expect(computeStreak(["2026-10-09", "2026-10-08", "2026-10-07", "2026-10-05"], "2026-10-09")).toBe(3);
    expect(computeStreak(["2026-10-08", "2026-10-07"], "2026-10-09")).toBe(2);
    expect(computeStreak(["2026-10-01"], "2026-10-09")).toBe(0);
    expect(computeStreak([], "2026-10-09")).toBe(0);
  });
});
