import type { Question, ExamId, CategoryId } from "./types";

/** Deterministic PRNG (mulberry32) so daily/weekly quizzes are stable for everyone. */
export function rng(seedStr: string) {
  let h = 1779033703 ^ seedStr.length;
  for (let i = 0; i < seedStr.length; i++) { h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  let a = (h ^ (h >>> 16)) >>> 0;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export function shuffle<T>(xs: T[], seed: string): T[] {
  const r = rng(seed); const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

export interface QuizOptions { count: number; exam?: ExamId | "mixed"; difficulty?: "easy" | "medium" | "hard" | "mixed"; seed: string; pool: Question[] }

/** Build a quiz: filters by exam/difficulty, shuffles deterministically, tops up from the wider pool if short. */
export function buildQuiz(o: QuizOptions): Question[] {
  const ok = (q: Question) =>
    (!o.exam || o.exam === "mixed" || q.exam.includes(o.exam)) && (!o.difficulty || o.difficulty === "mixed" || q.difficulty === o.difficulty);
  const primary = shuffle(o.pool.filter(ok), o.seed);
  if (primary.length >= o.count) return primary.slice(0, o.count);
  const rest = shuffle(o.pool.filter((q) => !primary.includes(q)), o.seed + ":fill");
  return [...primary, ...rest].slice(0, o.count);
}

export interface AnswerMap { [qid: string]: number | undefined }
export interface QuizResult {
  total: number; attempted: number; correct: number; wrong: number; skipped: number;
  score: number; maxScore: number; accuracy: number; percent: number;
  byCategory: Record<string, { correct: number; total: number }>;
  weak: CategoryId[]; strong: CategoryId[]; toRevise: string[];
}

/** Scoring with optional negative marking (default 0.25 per wrong answer — as in several law entrance tests). */
export function scoreQuiz(qs: Question[], ans: AnswerMap, negative = 0): QuizResult {
  let correct = 0, wrong = 0, skipped = 0; const byCategory: QuizResult["byCategory"] = {}; const toRevise: string[] = [];
  for (const q of qs) {
    const a = ans[q.id]; const c = (byCategory[q.category] ||= { correct: 0, total: 0 }); c.total++;
    if (a === undefined) { skipped++; toRevise.push(q.id); continue; }
    if (a === q.answer) { correct++; c.correct++; } else { wrong++; toRevise.push(q.id); }
  }
  const attempted = correct + wrong;
  const score = Math.round((correct - wrong * negative) * 100) / 100;
  const cats = Object.entries(byCategory).filter(([, v]) => v.total >= 1).map(([k, v]) => ({ k: k as CategoryId, p: v.correct / v.total, n: v.total }));
  return {
    total: qs.length, attempted, correct, wrong, skipped, score, maxScore: qs.length,
    accuracy: attempted ? Math.round((correct / attempted) * 100) : 0,
    percent: qs.length ? Math.round((score / qs.length) * 100) : 0,
    byCategory,
    weak: cats.filter((c) => c.p < 0.5).sort((a, b) => a.p - b.p).map((c) => c.k),
    strong: cats.filter((c) => c.p >= 0.75).sort((a, b) => b.p - a.p).map((c) => c.k),
    toRevise,
  };
}

/** ISO week key e.g. 2026-W41 */
export function isoWeek(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d)); const day = dt.getUTCDay() || 7;
  dt.setUTCDate(dt.getUTCDate() + 4 - day);
  const ys = new Date(Date.UTC(dt.getUTCFullYear(), 0, 1));
  const w = Math.ceil(((dt.getTime() - ys.getTime()) / 86_400_000 + 1) / 7);
  return `${dt.getUTCFullYear()}-W${String(w).padStart(2, "0")}`;
}
