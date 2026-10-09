"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { SlidersHorizontal, X } from "lucide-react";
import { useData } from "@/lib/client-data";
import { useToday } from "@/lib/hooks";
import { applyFilters, DEFAULT_FILTERS, matchKnowledge, type Filters } from "@/lib/search";
import { CATEGORIES, EXAMS } from "@/lib/categories";
import NewsCard from "./NewsCard";
import { Empty, ErrorBox, Loading } from "./ui";

const PAGE = 18;

export function FilterPanel({ f, set, sources, tags, lockCats }: { f: Filters; set: (p: Partial<Filters>) => void; sources: string[]; tags: string[]; lockCats: boolean }) {
  const sel = "input !py-2";
  return (
    <div className="card card-pad grid gap-3 sm:grid-cols-2 lg:grid-cols-4" role="group" aria-label="Filters">
      <label className="text-xs font-medium">Date
        <select className={sel} value={f.date} onChange={(e) => set({ date: e.target.value as Filters["date"] })}>
          <option value="all">All time</option><option value="today">Today</option><option value="yesterday">Yesterday</option>
          <option value="7d">Last 7 days</option><option value="30d">Last 30 days</option><option value="3m">Last 3 months</option><option value="custom">Custom range…</option>
        </select></label>
      {f.date === "custom" && <>
        <label className="text-xs font-medium">From<input type="date" className={sel} value={f.from || ""} onChange={(e) => set({ from: e.target.value })} /></label>
        <label className="text-xs font-medium">To<input type="date" className={sel} value={f.to || ""} onChange={(e) => set({ to: e.target.value })} /></label></>}
      {!lockCats && <label className="text-xs font-medium">Category
        <select className={sel} value={f.cats[0] || ""} onChange={(e) => set({ cats: e.target.value ? [e.target.value] : [] })}>
          <option value="">All categories</option>{CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select></label>}
      <label className="text-xs font-medium">Exam
        <select className={sel} value={f.exam} onChange={(e) => set({ exam: e.target.value as Filters["exam"] })}>
          <option value="">Any exam</option>{EXAMS.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}</select></label>
      <label className="text-xs font-medium">Importance
        <select className={sel} value={f.minScore} onChange={(e) => set({ minScore: Number(e.target.value) })}>
          <option value={0}>All</option><option value={4}>4+ Low and above</option><option value={6}>6+ Moderate</option><option value={8}>8+ High priority</option><option value={10}>10 Must know</option></select></label>
      <label className="text-xs font-medium">Source
        <select className={sel} value={f.source} onChange={(e) => set({ source: e.target.value })}><option value="">All sources</option>{sources.map((s) => <option key={s}>{s}</option>)}</select></label>
      <label className="text-xs font-medium">Topic
        <select className={sel} value={f.tag} onChange={(e) => set({ tag: e.target.value })}><option value="">All topics</option>{tags.map((s) => <option key={s}>{s}</option>)}</select></label>
      <label className="text-xs font-medium">Sort
        <select className={sel} value={f.sort} onChange={(e) => set({ sort: e.target.value as Filters["sort"] })}><option value="priority">Highest priority</option><option value="latest">Latest first</option></select></label>
    </div>
  );
}

export default function Browse({ lockCats, initialQ = "", showSearch = true }: { lockCats?: string[]; initialQ?: string; showSearch?: boolean }) {
  const { data, error, loading } = useData();
  const { real } = useToday(data);
  const [f, setF] = useState<Filters>({ ...DEFAULT_FILTERS, q: initialQ });
  const [open, setOpen] = useState(!!lockCats ? false : true);
  const [shown, setShown] = useState(PAGE);
  useEffect(() => { setF((p) => ({ ...p, q: initialQ })); }, [initialQ]);
  useEffect(() => { setShown(PAGE); }, [f, lockCats]);
  const set = (p: Partial<Filters>) => setF((x) => ({ ...x, ...p }));

  const base = useMemo(() => (data && lockCats ? data.articles.filter((a) => lockCats.includes(a.category)) : data?.articles ?? []), [data, lockCats]);
  const sources = useMemo(() => Array.from(new Set(base.flatMap((a) => a.sources.map((s) => s.name)))).sort(), [base]);
  const tags = useMemo(() => Array.from(new Set(base.flatMap((a) => a.tags))).sort(), [base]);
  const results = useMemo(() => (data ? applyFilters(data.articles, f, data.knowledge, real, lockCats) : []), [data, f, real, lockCats]);
  const concepts = useMemo(() => (data && f.q ? matchKnowledge(f.q, data.knowledge).slice(0, 4) : []), [data, f.q]);

  if (error) return <ErrorBox msg={error} />;
  if (loading || !data) return <Loading />;
  const active = JSON.stringify({ ...f, q: "", sort: "" }) !== JSON.stringify({ ...DEFAULT_FILTERS, q: "", sort: "" });

  return (
    <div className="space-y-4">
      {showSearch && <input autoFocus={!lockCats} value={f.q} onChange={(e) => set({ q: e.target.value })} className="input" placeholder="Search news, people, organisations, laws, judgments, countries, reports, schemes…" aria-label="Search" />}
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-ink-700 dark:text-ink-200" aria-live="polite"><b>{results.length}</b> result{results.length === 1 ? "" : "s"}</p>
        <div className="flex gap-2">
          {active && <button className="btn btn-sm" onClick={() => setF({ ...DEFAULT_FILTERS, q: f.q })}><X size={13} />Clear filters</button>}
          <button className="btn btn-sm" onClick={() => setOpen((o) => !o)} aria-expanded={open}><SlidersHorizontal size={13} />Filters</button>
        </div>
      </div>
      {open && <FilterPanel f={f} set={set} sources={sources} tags={tags} lockCats={!!lockCats} />}
      {concepts.length > 0 && (
        <div className="card card-pad border-brand-200 bg-brand-50/50 dark:border-brand-900 dark:bg-brand-900/10">
          <p className="eyebrow mb-2">Background for “{f.q}”</p>
          <div className="grid gap-3 md:grid-cols-2">{concepts.map((k) => (
            <div key={k.id}><h4 className="font-semibold">{k.title}</h4><ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-ink-700 dark:text-ink-200">{k.points.slice(0, 4).map((p) => <li key={p}>{p}</li>)}</ul></div>))}</div>
        </div>
      )}
      {results.length === 0 ? <Empty>No stories match. Try fewer filters or a broader search term{f.q ? ` (“${f.q}”)` : ""}.</Empty> : (
        <>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{results.slice(0, shown).map((a) => <NewsCard key={a.id} a={a} />)}</div>
          {shown < results.length && <div className="text-center"><button className="btn" onClick={() => setShown((s) => s + PAGE)}>Load more ({results.length - shown} left)</button></div>}
        </>
      )}
      <p className="text-center text-xs text-ink-500"><Link href="/archive/" className="underline">Browse the date archive</Link></p>
    </div>
  );
}
