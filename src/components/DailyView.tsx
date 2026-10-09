"use client";
import Link from "next/link";
import { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useData } from "@/lib/client-data";
import { byDay, digest, uniqueDays } from "@/lib/selectors";
import { fmtLong } from "@/lib/dates";
import { useToday } from "@/lib/hooks";
import NewsCard from "./NewsCard";
import { Empty, ErrorBox, Loading, SectionHead } from "./ui";

export default function DailyView({ date }: { date?: string }) {
  const { data, error, loading } = useData();
  const t = useToday(data);
  const day = date || t.day;
  const arts = useMemo(() => (data ? byDay(data.articles, day) : []), [data, day]);
  const d = useMemo(() => digest(arts), [arts]);
  const days = useMemo(() => (data ? uniqueDays(data.articles) : []), [data]);
  if (error) return <ErrorBox msg={error} />;
  if (loading || !data) return <Loading />;
  const i = days.indexOf(day); const newer = i > 0 ? days[i - 1] : null; const older = i >= 0 && i < days.length - 1 ? days[i + 1] : null;
  const oneLiners = data.facts.filter((f) => f.date === day);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><p className="eyebrow">Daily current affairs</p><h1 className="h-serif text-3xl font-bold">{fmtLong(day)}</h1>
          <p className="text-sm text-ink-700 dark:text-ink-200">{arts.length} stories{!date && !t.isToday && <> · latest available day</>}</p></div>
        <div className="flex gap-2">
          {older ? <Link href={`/daily/${older}/`} className="btn btn-sm"><ChevronLeft size={14} />{fmtLong(older)}</Link> : <span />}
          {newer && <Link href={`/daily/${newer}/`} className="btn btn-sm">{fmtLong(newer)}<ChevronRight size={14} /></Link>}
        </div>
      </div>
      {arts.length === 0 ? <Empty>No stories recorded for this day. <Link href="/archive/" className="underline">Browse the archive</Link>.</Empty> : <>
        <section><SectionHead title="🔥 Top 10 must know" />
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{d.must.map((a, i) => <NewsCard key={a.id} a={a} rank={i + 1} />)}</div></section>
        {d.sections.map((s) => { const items = s.items.filter((a) => !d.must.some((m) => m.id === a.id)); if (!items.length) return null;
          return <section key={s.id} id={s.id}><SectionHead title={s.label} sub={`${items.length} more`} /><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{items.map((a) => <NewsCard key={a.id} a={a} />)}</div></section>; })}
        {oneLiners.length > 0 && <section><SectionHead title="⚡ One-liners" /><ul className="card divide-y divide-ink-100 dark:divide-ink-800">{oneLiners.map((f) => <li key={f.id} className="p-3 text-sm">{f.text}</li>)}</ul></section>}
        <div className="text-center"><Link href={`/quiz/?type=daily&date=${day}`} className="btn btn-primary">Take this day’s quiz →</Link></div>
      </>}
    </div>
  );
}
