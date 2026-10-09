"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo } from "react";
import { Flame } from "lucide-react";
import { useData } from "@/lib/client-data";
import { actions, computeStreak, useStore } from "@/lib/store";
import { diffDays, todayIST } from "@/lib/dates";
import { EXAMS, CAT_BY_ID } from "@/lib/categories";
import { REVISE_MAP } from "@/lib/recommend";
import { Empty, ErrorBox, Loading, SectionHead } from "./ui";
import type { CategoryId, ExamId } from "@/lib/types";

const TrendChart = dynamic(() => import("./ScoreChart").then((m) => m.TrendChart), { ssr: false, loading: () => <div className="h-48" /> });
const CategoryChart = dynamic(() => import("./ScoreChart").then((m) => m.CategoryChart), { ssr: false, loading: () => <div className="h-56" /> });

function plan(left: number): string {
  if (left < 0) return "This exam date has passed — set a new date to get a plan.";
  if (left <= 14) return "Final stretch: daily 30-minute revision, flashcards for weak topics, and one timed mock every 2 days. Don’t start new sources.";
  if (left <= 60) return "Consolidate: Last-6-months mode daily, spaced revision for saved stories, and 2–3 mock tests a week in exam mode.";
  if (left <= 150) return "Build depth: read the Top 10 each day, add key stories to revision, take the daily quiz, and review the monthly capsule every month-end.";
  return "Build the base: cover the last 12 months month by month, read the Top 10 daily, and keep your streak alive. Mocks can wait until ~60 days out.";
}

export default function Progress() {
  const { data, error, loading } = useData();
  const s = useStore(); const today = todayIST();
  const m = useMemo(() => {
    const atts = s.attempts; const attempted = atts.reduce((n, a) => n + a.correct + a.wrong, 0);
    const avg = atts.length ? Math.round(atts.reduce((n, a) => n + a.percent, 0) / atts.length) : null;
    const revs = Object.values(s.revision); const rc = revs.length ? Math.round((revs.filter((r) => r.mastered).length / revs.length) * 100) : null;
    const cat: Record<string, { c: number; t: number }> = {};
    atts.forEach((a) => Object.entries(a.byCategory).forEach(([k, v]) => { const x = (cat[k] ||= { c: 0, t: 0 }); x.c += v.correct; x.t += v.total; }));
    const rows = Object.entries(cat).filter(([, v]) => v.t >= 3).map(([k, v]) => ({ k: k as CategoryId, acc: Math.round((v.c / v.t) * 100), t: v.t })).sort((a, b) => a.acc - b.acc);
    return { attempted, avg, rc, rows, weakest: rows[0], strongest: rows[rows.length - 1], trend: atts.map((a, i) => ({ n: i + 1, pct: a.percent })) };
  }, [s]);
  if (error) return <ErrorBox msg={error} />;
  if (loading || !data) return <Loading />;
  const streak = computeStreak(s.activity);
  const weakRev = m.weakest && m.weakest.acc < 70 ? (REVISE_MAP[m.weakest.k] || []).map((id) => data.knowledge.find((k) => k.id === id)).filter(Boolean) : [];
  const stat = (k: string, v: string | number, sub?: string) => <div key={k} className="card card-pad"><p className="eyebrow">{k}</p><p className="h-serif text-2xl font-bold">{v}</p>{sub && <p className="text-xs text-ink-500">{sub}</p>}</div>;

  return (
    <div className="space-y-8">
      <div><p className="eyebrow">Your progress</p><h1 className="h-serif text-3xl font-bold">My Preparation</h1><p className="text-sm text-ink-700 dark:text-ink-200">All progress is stored in this browser. Nothing is uploaded.</p></div>
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <div className="card card-pad col-span-2 flex items-center gap-4 bg-gradient-to-br from-orange-50 to-transparent dark:from-orange-900/20 lg:col-span-1"><Flame size={34} className={streak ? "text-orange-500" : "text-ink-300"} />
          <div><p className="eyebrow">Current affairs streak</p><p className="h-serif text-3xl font-bold">{streak} {streak === 1 ? "day" : "days"}</p><p className="text-xs text-ink-500">Counts days you read, quizzed, saved or revised.</p></div></div>
        {stat("News read", Object.keys(s.read).length.toLocaleString())}
        {stat("Questions attempted", m.attempted.toLocaleString())}
        {stat("Average score", m.avg === null ? "—" : `${m.avg}%`, m.avg === null ? "Take a quiz" : `${s.attempts.length} attempts`)}
        {stat("Revision completed", m.rc === null ? "—" : `${m.rc}%`, m.rc === null ? "Add stories to revision" : `${Object.values(s.revision).filter((r) => r.mastered).length}/${Object.keys(s.revision).length} mastered`)}
        {stat("Weakest topic", m.weakest ? `${CAT_BY_ID[m.weakest.k].short} (${m.weakest.acc}%)` : "—")}
        {stat("Strongest topic", m.strongest && m.rows.length > 1 ? `${CAT_BY_ID[m.strongest.k].short} (${m.strongest.acc}%)` : "—")}
      </section>

      <section><SectionHead title="⏳ Exam countdown" />
        <div className="grid gap-3 md:grid-cols-3">{EXAMS.map((e) => { const d = s.examDates[e.id as ExamId]; const left = d ? diffDays(d, today) : null; return (
          <div key={e.id} className="card card-pad space-y-2"><h3 className="font-semibold">{e.label}</h3><p className="text-xs text-ink-500">{e.note}</p>
            <input type="date" className="input" value={d || ""} onChange={(ev) => actions.setExamDate(e.id as ExamId, ev.target.value)} aria-label={`${e.label} exam date`} />
            {left !== null && <><p className="h-serif text-3xl font-bold">{left >= 0 ? `${left} days left` : "Date passed"}</p><p className="text-sm text-ink-700 dark:text-ink-200">{plan(left)}</p></>}</div>); })}</div></section>

      <section><SectionHead title="📈 Performance" />
        {s.attempts.length === 0 ? <Empty>No quiz data yet. <Link href="/quiz/" className="underline">Take a quiz</Link> to see trends, strong areas and weak areas.</Empty> : (
          <div className="grid gap-3 lg:grid-cols-2"><div className="card card-pad"><p className="eyebrow mb-2">Score trend</p><TrendChart data={m.trend} /></div>
            <div className="card card-pad"><p className="eyebrow mb-2">Accuracy by topic</p>{m.rows.length ? <CategoryChart data={m.rows.map((r) => ({ name: CAT_BY_ID[r.k].short, acc: r.acc }))} /> : <p className="text-sm text-ink-500">Need a few more answers per topic.</p>}</div></div>)}</section>

      {weakRev.length > 0 && <section><SectionHead title="🎯 Recommended revision" sub={`You are weakest in ${CAT_BY_ID[m.weakest!.k].label}. Revise:`} />
        <div className="flex flex-wrap gap-2">{weakRev.map((k) => <Link key={k!.id} className="btn btn-sm" href={`/search/?q=${encodeURIComponent(k!.title)}`}>{k!.title}</Link>)}</div></section>}

      <section className="flex flex-wrap gap-2"><Link href="/revision/" className="btn">My revision →</Link><Link href="/quiz/" className="btn btn-primary">Take a quiz →</Link>
        <button className="btn ml-auto text-red-600" onClick={() => { if (confirm("Delete all saved items, revision schedule, quiz history and streak from this browser?")) actions.resetAll(); }}>Reset progress</button></section>
    </div>
  );
}
