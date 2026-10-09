"use client";
import { useMemo, useState } from "react";
import { useData } from "@/lib/client-data";
import { useToday } from "@/lib/hooks";
import { inRange, windowStart } from "@/lib/selectors";
import { sortByPriority } from "@/lib/priority";
import { CATEGORIES, CAT_BY_ID } from "@/lib/categories";
import { monthKey, monthName, istDate } from "@/lib/dates";
import { Empty, ErrorBox, Loading } from "./ui";
import MiniList from "./MiniList";

export default function HighValue({ months }: { months: 6 | 12 }) {
  const { data, error, loading } = useData();
  const { real } = useToday(data);
  const [cat, setCat] = useState("");
  const min = months === 6 ? 7 : 5;
  const arts = useMemo(() => data ? sortByPriority(inRange(data.articles, windowStart(real, months), real).filter((a) => a.relevance_score >= min && (!cat || a.category === cat))) : [], [data, real, months, min, cat]);
  const groups = useMemo(() => { const m = new Map<string, typeof arts>(); arts.forEach((a) => { const k = monthKey(istDate(a.published_at)); m.set(k, [...(m.get(k) || []), a]); }); return Array.from(m.entries()).sort((a, b) => b[0].localeCompare(a[0])); }, [arts]);
  if (error) return <ErrorBox msg={error} />;
  if (loading || !data) return <Loading />;
  return (
    <div className="space-y-5">
      <div><p className="eyebrow">Revision mode</p><h1 className="h-serif text-3xl font-bold">Last {months} months</h1>
        <p className="text-sm text-ink-700 dark:text-ink-200">{months === 6 ? "Only high-value stories (relevance 7+)" : "Comprehensive revision database (relevance 5+)"} · {arts.length} stories</p></div>
      <div className="scroll-x flex gap-2 overflow-x-auto"><button className={`btn btn-sm shrink-0 ${!cat ? "btn-primary" : ""}`} onClick={() => setCat("")}>All</button>
        {CATEGORIES.filter((c) => c.nav).map((c) => <button key={c.id} onClick={() => setCat(c.id)} className={`btn btn-sm shrink-0 ${cat === c.id ? "btn-primary" : ""}`}>{c.emoji} {c.short}</button>)}</div>
      {groups.length === 0 ? <Empty>No stories in this window yet. The archive grows with every pipeline run.</Empty> : groups.map(([k, items]) => { const [y, m] = k.split("-").map(Number); return (
        <section key={k}><h2 className="h-serif mb-2 text-xl font-semibold">{monthName(m)} {y} <span className="text-sm font-normal text-ink-500">· {items.length}</span></h2><MiniList items={items} /></section>); })}
      <p className="text-xs text-ink-500">Category view: {cat ? CAT_BY_ID[cat as keyof typeof CAT_BY_ID].label : "all topics"}.</p>
    </div>
  );
}
