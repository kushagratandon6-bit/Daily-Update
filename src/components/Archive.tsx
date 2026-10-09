"use client";
import Link from "next/link";
import { useMemo } from "react";
import { useData } from "@/lib/client-data";
import { dayOf } from "@/lib/selectors";
import { fmtLong, monthKey, monthName } from "@/lib/dates";
import { Empty, ErrorBox, Loading } from "./ui";

export default function Archive() {
  const { data, error, loading } = useData();
  const months = useMemo(() => {
    const m = new Map<string, Map<string, number>>();
    (data?.articles ?? []).forEach((a) => { const d = dayOf(a), k = monthKey(d); const dm = m.get(k) || new Map(); dm.set(d, (dm.get(d) || 0) + 1); m.set(k, dm); });
    return Array.from(m.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [data]);
  if (error) return <ErrorBox msg={error} />;
  if (loading || !data) return <Loading />;
  return (
    <div className="space-y-5">
      <div><p className="eyebrow">Archive</p><h1 className="h-serif text-3xl font-bold">Date Archive</h1></div>
      {months.length === 0 ? <Empty>No archive yet.</Empty> : months.map(([k, days], idx) => { const [y, m] = k.split("-").map(Number); const total = Array.from(days.values()).reduce((a, b) => a + b, 0); return (
        <details key={k} open={idx === 0} className="card card-pad"><summary className="cursor-pointer font-semibold">{monthName(m)} {y} <span className="text-sm font-normal text-ink-500">· {total} stories · {days.size} days</span></summary>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{Array.from(days.entries()).sort((a, b) => b[0].localeCompare(a[0])).map(([d, n]) => <Link key={d} href={`/daily/${d}/`} className="btn justify-between"><span>{fmtLong(d)}</span><span className="chip">{n}</span></Link>)}</div>
          <Link href="/capsules/" className="mt-3 inline-block text-sm text-brand-600 underline dark:text-brand-400">Monthly capsule →</Link></details>); })}
    </div>
  );
}
