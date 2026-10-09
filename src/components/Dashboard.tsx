"use client";
import Link from "next/link";
import { useMemo } from "react";
import { Flame, Timer, Repeat, ListChecks, Zap } from "lucide-react";
import { useData } from "@/lib/client-data";
import { useToday } from "@/lib/hooks";
import { byDay, digest, ofCats } from "@/lib/selectors";
import { computeStreak, useStore } from "@/lib/store";
import { diffDays, fmtLong, todayIST } from "@/lib/dates";
import { isDue } from "@/lib/srs";
import { sortByPriority } from "@/lib/priority";
import { EXAMS } from "@/lib/categories";
import NewsCard from "./NewsCard";
import { Empty, ErrorBox, Loading, SectionHead } from "./ui";
import type { Article } from "@/lib/types";

function Row({ items, n }: { items: Article[]; n: number }) {
  if (!items.length) return <Empty>Nothing new in this section yet.</Empty>;
  return <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{items.slice(0, n).map((a) => <NewsCard key={a.id} a={a} />)}</div>;
}

export default function Dashboard() {
  const { data, error, loading } = useData();
  const store = useStore();
  const { day, isToday } = useToday(data);
  const dayArts = useMemo(() => (data ? byDay(data.articles, day) : []), [data, day]);
  const d = useMemo(() => digest(dayArts), [dayArts]);
  if (error) return <ErrorBox msg={error} />;
  if (loading || !data) return <Loading />;

  const hour = Number(new Date(Date.now() + 330 * 60_000).toISOString().slice(11, 13));
  const greet = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const streak = computeStreak(store.activity);
  const due = Object.entries(store.revision).filter(([, it]) => isDue(it, todayIST()));
  const sec = (cats: Article["category"][]) => sortByPriority(ofCats(dayArts, cats));
  const quizCount = Math.min(15, Math.max(10, data.questions.length >= 10 ? 10 : data.questions.length));
  const oneLiners = data.facts.filter((f) => f.date === day).slice(0, 20);
  const exams = EXAMS.filter((e) => store.examDates[e.id]);

  return (
    <div className="space-y-9">
      <section>
        <p className="eyebrow">Current Affairs Intelligence</p>
        <h1 className="h-serif mt-1 text-3xl font-bold sm:text-4xl">{greet} 👋</h1>
        <p className="mt-1 text-ink-700 dark:text-ink-200">Your daily law-exam preparation dashboard — <b>{fmtLong(day)}</b>{!isToday && <span className="chip ml-2">latest available day</span>}</p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="card card-pad"><p className="eyebrow">Updates</p><p className="h-serif text-3xl font-bold">{dayArts.length}</p><p className="text-xs text-ink-500 dark:text-ink-300">relevant today</p></div>
          <Link href="/revision/" className="card card-pad hover:border-brand-400"><p className="eyebrow flex items-center gap-1"><Repeat size={12} />Revision due</p><p className="h-serif text-3xl font-bold">{due.length}</p><p className="text-xs text-ink-500 dark:text-ink-300">items to review</p></Link>
          <Link href="/progress/" className="card card-pad hover:border-brand-400"><p className="eyebrow flex items-center gap-1"><Flame size={12} className="text-orange-500" />Streak</p><p className="h-serif text-3xl font-bold">{streak}<span className="text-base font-medium"> days</span></p><p className="text-xs text-ink-500 dark:text-ink-300">keep it going</p></Link>
          <Link href="/quiz/?type=daily" className="card card-pad bg-brand-600 text-white hover:bg-brand-700 dark:bg-brand-600"><p className="text-[11px] font-semibold uppercase tracking-widest opacity-80">Today’s quiz</p><p className="h-serif text-3xl font-bold">{quizCount} MCQs</p><p className="text-xs opacity-90">Start quiz →</p></Link>
        </div>
        {exams.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {exams.map((e) => { const left = diffDays(store.examDates[e.id]!, todayIST()); return (
              <Link key={e.id} href="/progress/" className="chip !px-3 !py-1.5 text-xs"><Timer size={12} /><b>{e.label}</b> {left >= 0 ? `${left} days left` : "exam date passed"}</Link>); })}
          </div>
        )}
      </section>

      <section>
        <SectionHead title="🔥 Top 10 Must Know" sub="Highest-priority stories of the day (exam relevance + legal weight + source quality + recency + MCQ value)" href={`/daily/${day}/`} linkLabel="Full daily page →" />
        {d.must.length ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{d.must.map((a, i) => <NewsCard key={a.id} a={a} rank={i + 1} />)}</div> : <Empty>No stories yet. The pipeline runs every few hours — check back soon.</Empty>}
      </section>

      {d.likely.length > 0 && (
        <section>
          <SectionHead title="🎯 Most likely to be asked" sub="High exam potential — an editorial estimate, not a prediction" />
          <ol className="card divide-y divide-ink-100 dark:divide-ink-800">
            {d.likely.slice(0, 6).map((a, i) => (
              <li key={a.id} className="flex items-start gap-3 p-3.5"><span className="h-serif text-lg font-bold text-gold-500">{i + 1}</span>
                <div><Link href={`/article/${a.id}/`} className="font-medium hover:text-brand-600 dark:hover:text-brand-400">{a.title}</Link><p className="text-xs text-ink-500 dark:text-ink-300">High exam potential · {a.relevance_score}/10{a.sources.length > 1 ? ` · covered by ${a.sources.length} sources` : ""}</p></div></li>))}
          </ol>
        </section>
      )}

      {([
        ["⚖️ Law today", "Top legal developments", ["legal"], "/category/legal/", 5],
        ["🇮🇳 India", "National developments", ["national", "polity", "schemes"], "/category/national/", 6],
        ["🌎 World", "International developments", ["international"], "/category/international/", 6],
        ["📊 Economy", "Economic developments", ["economy"], "/category/economy/", 5],
        ["🔬 Science & Tech", "Technology and science", ["scitech", "defence"], "/category/scitech/", 3],
        ["🌱 Environment", "Climate and environment", ["environment"], "/category/environment/", 3],
      ] as [string, string, Article["category"][], string, number][]).map(([t, s, cats, href, n]) => (
        <section key={t}><SectionHead title={t} sub={s} href={href} /><Row items={sec(cats)} n={n} /></section>
      ))}

      <section>
        <SectionHead title="🧠 Quick revision" sub="One-line facts from today’s stories" href="/one-liners/" />
        {oneLiners.length ? (
          <ul className="card divide-y divide-ink-100 dark:divide-ink-800">{oneLiners.map((f) => <li key={f.id} className="flex gap-2 p-3 text-sm"><Zap size={14} className="mt-0.5 shrink-0 text-gold-500" />{f.text}</li>)}</ul>
        ) : <Empty>No one-liners for this day.</Empty>}
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <Link href="/quiz/?type=daily" className="card card-pad hover:border-brand-400"><ListChecks className="text-brand-600" /><h3 className="h-serif mt-2 text-lg font-semibold">📝 Today’s quiz</h3><p className="text-sm text-ink-700 dark:text-ink-200">{quizCount} questions · timer · explanations · weak-topic report</p></Link>
        <Link href="/revision/" className="card card-pad hover:border-brand-400"><Repeat className="text-brand-600" /><h3 className="h-serif mt-2 text-lg font-semibold">🔁 Revision due</h3><p className="text-sm text-ink-700 dark:text-ink-200">{due.length ? `${due.length} item${due.length > 1 ? "s" : ""} need revision` : "Nothing due — add stories to revision to build your schedule"}</p></Link>
      </section>
    </div>
  );
}
