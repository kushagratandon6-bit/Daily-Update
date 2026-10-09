"use client";
import Link from "next/link";
import { useMemo } from "react";
import { useData } from "@/lib/client-data";
import { useToday } from "@/lib/hooks";
import { windowStart, inRange } from "@/lib/selectors";
import { sortByPriority } from "@/lib/priority";
import { ErrorBox, Loading, SectionHead } from "./ui";
import MiniList from "./MiniList";
import type { Article, CategoryId } from "@/lib/types";

const words = (s: string) => s.split(/\s+/).filter(Boolean).length;

export default function Rapid() {
  const { data, error, loading } = useData();
  const { real } = useToday(data);
  const model = useMemo(() => {
    if (!data) return null;
    const win = inRange(data.articles, windowStart(real, 3), real).filter((a) => a.relevance_score >= 6);
    const cat = (c: CategoryId[], n: number) => sortByPriority(win.filter((a) => c.includes(a.category))).slice(0, n);
    const facts = data.facts.filter((f) => win.some((a) => a.id === f.article_id));
    const numbers = facts.filter((f) => /\d/.test(f.text)).slice(0, 15);
    const orgs = data.knowledge.filter((k) => k.kind === "static-gk" && ["un", "imf", "world-bank", "wto", "nato", "asean", "brics", "sco", "g20", "icj", "icc", "who"].includes(k.id));
    const sec = {
      oneLiners: facts.slice(0, 25), judgments: cat(["legal"], 8), appointments: cat(["appointments"], 8), awards: cat(["awards"], 8),
      reports: cat(["reports"], 8), schemes: cat(["schemes"], 8), numbers, orgs,
    };
    const w = facts.slice(0, 25).reduce((n, f) => n + words(f.text), 0) + [...sec.judgments, ...sec.appointments, ...sec.awards, ...sec.reports, ...sec.schemes].reduce((n, a: Article) => n + words(a.title) + words(a.keyFacts.join(" ")), 0) + orgs.reduce((n, k) => n + words(k.points[0] || ""), 0);
    return { sec, minutes: Math.max(1, Math.round(w / 180)), count: win.length };
  }, [data, real]);
  if (error) return <ErrorBox msg={error} />;
  if (loading || !data || !model) return <Loading />;
  const { sec } = model;
  return (
    <div className="space-y-8">
      <div><p className="eyebrow">Rapid revision</p><h1 className="h-serif text-3xl font-bold">30-Minute Revision</h1>
        <p className="text-sm text-ink-700 dark:text-ink-200">The highest-value items from the last 3 months ({model.count} stories scoring 6+). Estimated reading time for this page: ~{model.minutes} min.</p></div>
      <section><SectionHead title="⚡ One-line facts" />{sec.oneLiners.length ? <ul className="card divide-y divide-ink-100 dark:divide-ink-800">{sec.oneLiners.map((f) => <li key={f.id} className="p-3 text-sm">{f.text}</li>)}</ul> : <p className="card card-pad text-sm text-ink-500">No facts yet.</p>}</section>
      <section><SectionHead title="⚖️ Important judgments & legal developments" /><MiniList items={sec.judgments} empty="No legal stories in the window." /></section>
      <section><SectionHead title="🧑‍💼 Appointments" /><MiniList items={sec.appointments} empty="No appointments in the window." /></section>
      <section><SectionHead title="🏅 Awards" /><MiniList items={sec.awards} empty="No awards in the window." /></section>
      <section><SectionHead title="📑 Reports & indices" /><MiniList items={sec.reports} empty="No reports in the window." /></section>
      <section><SectionHead title="📋 Government schemes" /><MiniList items={sec.schemes} empty="No schemes in the window." /></section>
      <section><SectionHead title="🌐 International organisations (static)" />
        <div className="grid gap-3 sm:grid-cols-2">{sec.orgs.map((k) => <div key={k.id} className="card card-pad"><h3 className="font-semibold">{k.title}</h3><p className="text-sm text-ink-700 dark:text-ink-200">{k.points.slice(0, 2).join(" · ")}</p></div>)}</div></section>
      <section><SectionHead title="🔢 Important numbers & dates" />{sec.numbers.length ? <ul className="card divide-y divide-ink-100 dark:divide-ink-800">{sec.numbers.map((f) => <li key={f.id} className="p-3 text-sm">{f.text}</li>)}</ul> : <p className="card card-pad text-sm text-ink-500">None yet.</p>}</section>
      <div className="flex flex-wrap gap-2"><Link href="/flashcards/" className="btn">Flashcards →</Link><Link href="/quiz/" className="btn btn-primary">Take a quiz →</Link></div>
    </div>
  );
}
