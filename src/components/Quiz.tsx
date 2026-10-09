"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Clock, RotateCcw } from "lucide-react";
import { useData } from "@/lib/client-data";
import { useToday } from "@/lib/hooks";
import type { ExamId, Question } from "@/lib/types";
import { buildQuiz, scoreQuiz, type AnswerMap } from "@/lib/quiz";
import { poolFor } from "@/lib/quiz-pools";
import { istDate } from "@/lib/dates";
import { actions, useStore, type Attempt } from "@/lib/store";
import { CAT_BY_ID } from "@/lib/categories";
import QuestionCard from "./QuestionCard";
import { Empty, ErrorBox, Loading, SectionHead } from "./ui";

type Kind = Attempt["kind"];
interface Config { kind: Kind; label: string; count: number; exam: ExamId | "mixed"; difficulty: "easy" | "medium" | "hard" | "mixed"; seed: string; exam_mode: boolean; negative: number; pool: Question[] }

const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

function Runner({ cfg, onExit, attempts }: { cfg: Config; onExit: () => void; attempts: Attempt[] }) {
  const [seedBump, setSeedBump] = useState(0);
  const qs = useMemo(() => buildQuiz({ count: cfg.count, exam: cfg.exam, difficulty: cfg.difficulty, seed: cfg.seed + (seedBump ? `:r${seedBump}` : ""), pool: cfg.pool }), [cfg, seedBump]);
  const [ans, setAns] = useState<AnswerMap>({}); const [i, setI] = useState(0); const [done, setDone] = useState(false);
  const [secs, setSecs] = useState(0); const started = useRef(Date.now());
  const limit = cfg.exam_mode ? qs.length * 60 : 0;
  const saved = useRef(false);

  useEffect(() => { if (done) return; const t = setInterval(() => setSecs(Math.floor((Date.now() - started.current) / 1000)), 500); return () => clearInterval(t); }, [done]);
  const finish = useCallback(() => setDone(true), []);
  useEffect(() => { if (limit && secs >= limit && !done) finish(); }, [secs, limit, done, finish]);

  const result = useMemo(() => scoreQuiz(qs, ans, cfg.negative), [qs, ans, cfg.negative]);
  useEffect(() => {
    if (!done || saved.current) return; saved.current = true;
    actions.recordAttempt({ id: `${Date.now()}`, kind: cfg.kind, label: cfg.label, at: new Date().toISOString(), date: istDate(), total: result.total, correct: result.correct, wrong: result.wrong, skipped: result.skipped,
      score: result.score, percent: result.percent, accuracy: result.accuracy, seconds: secs, negative: cfg.negative, exam: cfg.exam, byCategory: result.byCategory, weak: result.weak, strong: result.strong, toRevise: result.toRevise });
  }, [done, result, cfg, secs]);

  if (qs.length === 0) return <Empty>No questions available yet for this selection. <button className="underline" onClick={onExit}>Back</button></Empty>;

  if (done) {
    const past = attempts.filter((a) => a.exam === cfg.exam && a.total >= 10);
    const pct = past.length >= 5 ? Math.round((past.filter((a) => a.percent <= result.percent).length / past.length) * 100) : null;
    const revise = qs.filter((q) => result.toRevise.includes(q.id));
    return (
      <div className="space-y-6">
        <SectionHead title={`${cfg.label} — results`} />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[["Score", `${result.score}/${result.maxScore}`], ["Accuracy", `${result.accuracy}%`], ["Time taken", fmt(secs)], ["Correct / Wrong / Skipped", `${result.correct} / ${result.wrong} / ${result.skipped}`]].map(([k, v]) => (
            <div key={k} className="card card-pad"><p className="eyebrow">{k}</p><p className="h-serif text-2xl font-bold">{v}</p></div>))}
        </div>
        {cfg.negative > 0 && <p className="text-xs text-ink-500">Negative marking: −{cfg.negative} per wrong answer.</p>}
        {cfg.exam_mode && <p className="text-sm">{pct === null ? "Percentile simulation needs at least 5 earlier attempts for this exam type — keep practising." : `Simulated percentile vs your own previous attempts: ${pct}th.`}</p>}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="card card-pad"><p className="eyebrow mb-1">Strong areas</p>{result.strong.length ? result.strong.map((c) => <span key={c} className="chip mr-1.5">{CAT_BY_ID[c].emoji} {CAT_BY_ID[c].short}</span>) : <p className="text-sm text-ink-500">None above 75% yet.</p>}</div>
          <div className="card card-pad"><p className="eyebrow mb-1">Weak areas</p>{result.weak.length ? result.weak.map((c) => <Link key={c} href={`/category/${CAT_BY_ID[c].slug}/`} className="chip mr-1.5 hover:border-red-400">{CAT_BY_ID[c].emoji} {CAT_BY_ID[c].short} →</Link>) : <p className="text-sm text-ink-500">No weak areas — nice.</p>}</div>
        </div>
        <div className="flex flex-wrap gap-2"><button className="btn btn-primary" onClick={() => { saved.current = false; setAns({}); setI(0); setDone(false); started.current = Date.now(); setSecs(0); setSeedBump((n) => n + 1); }}><RotateCcw size={14} />Retake (reshuffled)</button><button className="btn" onClick={onExit}>Back to quizzes</button></div>
        <div className="space-y-3"><h3 className="h-serif text-xl font-semibold">Questions to revise ({revise.length})</h3>
          {revise.length === 0 && <Empty>Everything correct. 🎉</Empty>}
          {revise.map((q) => <QuestionCard key={q.id} q={q} selected={ans[q.id]} reveal disabled />)}</div>
        <details><summary className="cursor-pointer text-sm font-medium">Review all questions</summary><div className="mt-3 space-y-3">{qs.map((q, k) => <QuestionCard key={q.id} q={q} index={k} selected={ans[q.id]} reveal disabled />)}</div></details>
      </div>
    );
  }

  const q = qs[i]; const answered = ans[q.id] !== undefined;
  const reveal = !cfg.exam_mode && answered;
  const left = limit ? Math.max(0, limit - secs) : 0;
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between text-sm"><b>{cfg.label}</b>
        <span className="chip"><Clock size={12} />{limit ? `${fmt(left)} left` : fmt(secs)}</span></div>
      <div className="h-1.5 overflow-hidden rounded bg-ink-200 dark:bg-ink-800" role="progressbar" aria-valuemin={0} aria-valuemax={qs.length} aria-valuenow={Object.keys(ans).length}><div className="h-full bg-brand-500" style={{ width: `${(Object.keys(ans).length / qs.length) * 100}%` }} /></div>
      <QuestionCard q={q} index={i} selected={ans[q.id]} onSelect={(n) => !reveal && setAns((a) => ({ ...a, [q.id]: n }))} reveal={reveal} disabled={reveal} />
      <div className="flex items-center justify-between gap-2">
        <button className="btn" disabled={i === 0} onClick={() => setI(i - 1)}><ChevronLeft size={14} />Prev</button>
        <div className="flex gap-2">
          {cfg.exam_mode && answered && <button className="btn btn-sm" onClick={() => setAns((a) => { const n = { ...a }; delete n[q.id]; return n; })}>Clear</button>}
          {i < qs.length - 1 ? <button className="btn btn-primary" onClick={() => setI(i + 1)}>{answered ? "Next" : "Skip"}<ChevronRight size={14} /></button>
            : <button className="btn btn-primary" onClick={finish}>Submit</button>}
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5" aria-label="Question navigator">{qs.map((x, k) => <button key={x.id} onClick={() => setI(k)} aria-label={`Go to question ${k + 1}`} className={`h-7 w-7 rounded-md text-[11px] font-semibold ${k === i ? "bg-brand-600 text-white" : ans[x.id] !== undefined ? "bg-brand-100 text-brand-800 dark:bg-brand-900/50 dark:text-brand-100" : "bg-ink-100 dark:bg-ink-800"}`}>{k + 1}</button>)}</div>
      {i === qs.length - 1 && <button className="btn w-full" onClick={finish}>Finish & see results</button>}
    </div>
  );
}

export default function Quiz() {
  const { data, error, loading } = useData();
  const store = useStore();
  const sp = useSearchParams();
  const t = useToday(data);
  const [cfg, setCfg] = useState<Config | null>(null);
  const [mock, setMock] = useState({ count: 25, difficulty: "mixed" as Config["difficulty"], exam: "mixed" as Config["exam"], exam_mode: false, negative: 0 });
  const autostart = useRef(false);

  const pools = useMemo(() => {
    if (!data) return null;
    const q = data.questions; return { all: q, staticQ: q.filter((x) => x.origin === "static") };
  }, [data]);

  const build = useCallback((kind: Kind, date?: string): Config | null => {
    if (!pools || !data) return null; if (kind === "mock") return null;
    const spec = poolFor(kind, date || t.day, pools.all);
    const frozen = data.frozen?.[spec.seed]; // weekly/monthly sets are frozen by the scheduled workflow so retakes stay stable
    const pool = frozen ? (frozen.map((id) => pools.all.find((q) => q.id === id)).filter(Boolean) as Question[]) : spec.pool;
    return { kind, label: spec.label, count: frozen ? pool.length : spec.count, exam: "mixed", difficulty: "mixed", seed: spec.seed, exam_mode: false, negative: 0, pool };
  }, [pools, data, t.day]);

  useEffect(() => {
    if (!pools || autostart.current) return; const type = sp.get("type") as Kind | null;
    if (type === "daily" || type === "weekly" || type === "monthly") { autostart.current = true; setCfg(build(type, sp.get("date") || undefined)); }
  }, [pools, sp, build]);

  if (error) return <ErrorBox msg={error} />;
  if (loading || !data || !pools) return <Loading />;
  if (cfg) return <Runner cfg={cfg} attempts={store.attempts} onExit={() => setCfg(null)} />;

  const recent = [...store.attempts].reverse().slice(0, 6);
  const artCount = pools.all.filter((x) => x.origin === "article").length;
  const startMock = () => setCfg({ kind: "mock", label: `Mock test — ${mock.count}Q`, count: mock.count, exam: mock.exam, difficulty: mock.difficulty, seed: `mock:${Date.now()}`, exam_mode: mock.exam_mode, negative: mock.negative, pool: pools.all });

  return (
    <div className="space-y-8">
      <div><p className="eyebrow">Practice</p><h1 className="h-serif text-3xl font-bold">Quizzes & Mock Tests</h1>
        <p className="text-sm text-ink-700 dark:text-ink-200">Question bank: {pools.all.length} questions ({pools.staticQ.length} static GK/legal, {artQ(pools)} from current stories). Quizzes use as many as exist.</p>
        {artCount === 0 && <p className="mt-1 text-xs text-ink-500">Story-based MCQs appear once the pipeline runs with an LLM key; until then quizzes draw on the static GK & legal bank.</p>}</div>
      <section className="grid gap-3 sm:grid-cols-3">
        {([["daily", "📝 Today’s quiz", "10–15 MCQs • instant explanations"], ["weekly", "🗓️ Weekly quiz", "Up to 50 questions • this ISO week"], ["monthly", "🏆 Monthly mega test", "Up to 100 questions • last 30 days"]] as const).map(([k, t1, s]) => (
          <button key={k} onClick={() => setCfg(build(k))} className="card card-pad text-left hover:border-brand-400"><h3 className="h-serif text-lg font-semibold">{t1}</h3><p className="text-sm text-ink-700 dark:text-ink-200">{s}</p><p className="mt-2 text-sm font-medium text-brand-600 dark:text-brand-400">Start →</p></button>))}
      </section>
      <section className="card card-pad space-y-3">
        <h2 className="h-serif text-xl font-semibold">Current affairs mock test</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-xs font-medium">Questions<select className="input !py-2" value={mock.count} onChange={(e) => setMock({ ...mock, count: Number(e.target.value) })}>{[25, 50, 100].map((n) => <option key={n}>{n}</option>)}</select></label>
          <label className="text-xs font-medium">Difficulty<select className="input !py-2" value={mock.difficulty} onChange={(e) => setMock({ ...mock, difficulty: e.target.value as Config["difficulty"] })}>{["mixed", "easy", "medium", "hard"].map((n) => <option key={n}>{n}</option>)}</select></label>
          <label className="text-xs font-medium">Exam<select className="input !py-2" value={mock.exam} onChange={(e) => setMock({ ...mock, exam: e.target.value as Config["exam"] })}><option value="mixed">Mixed</option><option value="nlsat">NLSAT</option><option value="aiat">AIAT</option><option value="ssc">SSC Law</option></select></label>
          <label className="text-xs font-medium">Negative marking<select className="input !py-2" value={mock.negative} onChange={(e) => setMock({ ...mock, negative: Number(e.target.value) })}><option value={0}>None</option><option value={0.25}>−0.25 per wrong</option><option value={0.33}>−0.33 per wrong</option></select></label>
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={mock.exam_mode} onChange={(e) => setMock({ ...mock, exam_mode: e.target.checked })} />Exam mode — hide explanations until the end, countdown timer (1 min/question), auto-submit</label>
        <button className="btn btn-primary" onClick={startMock}>Start mock test</button>
      </section>
      <section><SectionHead title="Recent attempts" />
        {recent.length === 0 ? <Empty>No attempts yet. Take a quiz — results and weak topics are tracked on this device.</Empty> :
          <div className="card divide-y divide-ink-100 dark:divide-ink-800">{recent.map((a) => <div key={a.id} className="flex items-center justify-between gap-3 p-3 text-sm"><span>{a.label}<span className="block text-xs text-ink-500">{a.date} · {a.correct}/{a.total} correct · {a.accuracy}% accuracy</span></span><b className="h-serif text-lg">{a.percent}%</b></div>)}</div>}</section>
    </div>
  );
}
const artQ = (p: { all: Question[] }) => p.all.filter((x) => x.origin === "article").length;
