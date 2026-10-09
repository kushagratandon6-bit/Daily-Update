"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useData } from "@/lib/client-data";
import { CAT_BY_ID, CATEGORIES } from "@/lib/categories";
import { fmtShort } from "@/lib/dates";
import { Empty, ErrorBox, Loading } from "./ui";

export default function OneLiners() {
  const { data, error, loading } = useData();
  const [cat, setCat] = useState(""); const [q, setQ] = useState(""); const [n, setN] = useState(40);
  const rows = useMemo(() => (data?.facts ?? []).filter((f) => (!cat || f.category === cat) && (!q || f.text.toLowerCase().includes(q.toLowerCase()))).sort((a, b) => (b.date || "").localeCompare(a.date || "")), [data, cat, q]);
  if (error) return <ErrorBox msg={error} />;
  if (loading || !data) return <Loading />;
  return (
    <div className="space-y-4">
      <div><p className="eyebrow">Last-minute revision</p><h1 className="h-serif text-3xl font-bold">One-Liners</h1></div>
      <div className="flex flex-wrap gap-2"><input className="input !w-auto min-w-[200px] flex-1" placeholder="Filter one-liners…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Filter" />
        <select className="input !w-auto" value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Category"><option value="">All topics</option>{CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select></div>
      {rows.length === 0 ? <Empty>No one-liners match.</Empty> : <ul className="card divide-y divide-ink-100 dark:divide-ink-800">{rows.slice(0, n).map((f) => (
        <li key={f.id} className="flex items-start justify-between gap-3 p-3 text-sm"><span>{f.text}{f.is_demo && <span className="ml-1 text-[10px] font-bold text-amber-700">DEMO</span>}</span>
          <span className="shrink-0 text-right text-[11px] text-ink-500">{CAT_BY_ID[f.category].short}{f.date && <><br />{fmtShort(f.date)}</>}{f.article_id && <><br /><Link className="underline" href={`/article/${f.article_id}/`}>story</Link></>}</span></li>))}</ul>}
      {n < rows.length && <div className="text-center"><button className="btn" onClick={() => setN(n + 40)}>Show more</button></div>}
    </div>
  );
}
