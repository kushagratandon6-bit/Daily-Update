"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useData } from "@/lib/client-data";
import { dayOf } from "@/lib/selectors";
import { sortByPriority } from "@/lib/priority";
import { fmtShort, monthKey, monthName } from "@/lib/dates";
import { CAT_BY_ID } from "@/lib/categories";
import { Empty, ErrorBox, Loading } from "./ui";

export default function TimelineView() {
  const { data, error, loading } = useData();
  const [min, setMin] = useState(7);
  const months = useMemo(() => {
    const m = new Map<string, NonNullable<typeof data>["articles"]>();
    (data?.articles ?? []).filter((a) => a.relevance_score >= min).forEach((a) => { const k = monthKey(dayOf(a)); m.set(k, [...(m.get(k) || []), a]); });
    return Array.from(m.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([k, v]) => [k, sortByPriority(v).slice(0, 15).sort((a, b) => a.published_at.localeCompare(b.published_at))] as const);
  }, [data, min]);
  if (error) return <ErrorBox msg={error} />;
  if (loading || !data) return <Loading />;
  return (
    <div className="space-y-6">
      <div><p className="eyebrow">Chronological revision</p><h1 className="h-serif text-3xl font-bold">Current Affairs Timeline</h1>
        <p className="text-sm text-ink-700 dark:text-ink-200">Major events month by month — top 15 per month.</p></div>
      <label className="text-sm">Minimum relevance <select className="input !inline-block !w-auto !py-1.5" value={min} onChange={(e) => setMin(Number(e.target.value))}>{[5, 6, 7, 8, 9, 10].map((n) => <option key={n} value={n}>{n}/10</option>)}</select></label>
      {months.length > 1 && <div className="scroll-x flex gap-2 overflow-x-auto text-sm">{months.map(([k]) => { const [y, m] = k.split("-").map(Number); return <a key={k} href={`#m-${k}`} className="chip shrink-0">{monthName(m).slice(0, 3)} {y}</a>; })}</div>}
      {months.length === 0 ? <Empty>No stories at this relevance level yet.</Empty> : months.map(([k, items]) => { const [y, m] = k.split("-").map(Number); return (
        <section key={k} id={`m-${k}`} className="scroll-mt-20">
          <h2 className="h-serif mb-3 text-2xl font-bold">{monthName(m)} {y}</h2>
          <ol className="ml-2 space-y-3 border-l-2 border-brand-200 pl-5 dark:border-brand-900">{items.map((a) => (
            <li key={a.id} className="relative"><span className="absolute -left-[27px] top-1.5 h-3 w-3 rounded-full border-2 border-brand-500 bg-ink-50 dark:bg-ink-950" />
              <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-400">{fmtShort(a.published_at)} · {CAT_BY_ID[a.category].short}</p>
              <Link href={`/article/${a.id}/`} className="font-medium hover:underline">{a.title}</Link></li>))}</ol>
        </section>); })}
    </div>
  );
}
