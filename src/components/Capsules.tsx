"use client";
import { useMemo, useState } from "react";
import { Download, Printer } from "lucide-react";
import { useData } from "@/lib/client-data";
import { dayOf } from "@/lib/selectors";
import { sortByPriority } from "@/lib/priority";
import { monthKey, monthName } from "@/lib/dates";
import { Empty, ErrorBox, Loading, SectionHead } from "./ui";
import MiniList from "./MiniList";
import type { Article, CategoryId } from "@/lib/types";

export default function Capsules() {
  const { data, error, loading } = useData();
  const months = useMemo(() => Array.from(new Set((data?.articles ?? []).map((a) => monthKey(dayOf(a))))).sort().reverse(), [data]);
  const [sel, setSel] = useState<string>("");
  const month = sel || months[0] || "";
  const cap = useMemo(() => {
    if (!data || !month) return null;
    const a = sortByPriority(data.articles.filter((x) => monthKey(dayOf(x)) === month));
    const c = (cats: CategoryId[], n: number) => a.filter((x) => cats.includes(x.category)).slice(0, n);
    const judg = a.filter((x) => x.category === "legal" && /supreme court|high court|bench|judgment|ruling|verdict/i.test(x.title + " " + x.tags.join(" "))).slice(0, 25);
    return { top100: a.slice(0, 100), legal: c(["legal"], 50), appointments: c(["appointments"], 25), awards: c(["awards", "books"], 25), reports: c(["reports"], 25), schemes: c(["schemes"], 25), judgments: judg, international: c(["international"], 25), economy: c(["economy"], 25) };
  }, [data, month]);
  if (error) return <ErrorBox msg={error} />;
  if (loading || !data) return <Loading />;
  if (!months.length || !cap) return <Empty>No stories yet — capsules build automatically from each month’s stories.</Empty>;
  const [y, m] = month.split("-").map(Number);
  const SECTIONS: [string, Article[]][] = [["Top 100 news", cap.top100], ["Top 50 legal developments", cap.legal], ["Important judgments", cap.judgments], ["Important appointments", cap.appointments], ["Important awards", cap.awards], ["Important reports", cap.reports], ["Important schemes", cap.schemes], ["Important international events", cap.international], ["Important economic developments", cap.economy]];

  const download = () => {
    const md = [`# Monthly Current Affairs Capsule — ${monthName(m)} ${y}`, "", ...SECTIONS.flatMap(([t, items]) => [`## ${t}`, ...items.map((a, i) => `${i + 1}. **${a.title}** (${a.relevance_score}/10) — ${a.summary}\n   - Source: ${a.sources.map((s) => `${s.name} ${s.url}`).join("; ")}`), ""])].join("\n");
    const url = URL.createObjectURL(new Blob([md], { type: "text/markdown" })); const el = document.createElement("a"); el.href = url; el.download = `capsule-${month}.md`; el.click(); URL.revokeObjectURL(url);
  };
  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-3 print:hidden">
        <div><p className="eyebrow">Auto-generated</p><h1 className="h-serif text-3xl font-bold">Monthly Capsule — {monthName(m)} {y}</h1></div>
        <div className="flex flex-wrap gap-2"><select className="input !w-auto" value={month} onChange={(e) => setSel(e.target.value)} aria-label="Month">{months.map((k) => { const [yy, mm] = k.split("-").map(Number); return <option key={k} value={k}>{monthName(mm)} {yy}</option>; })}</select>
          <button className="btn" onClick={download}><Download size={14} />Markdown</button><button className="btn" onClick={() => window.print()}><Printer size={14} />Print / PDF</button></div>
      </div>
      {SECTIONS.map(([t, items]) => <section key={t}><SectionHead title={t} sub={`${items.length} item${items.length === 1 ? "" : "s"}`} /><MiniList items={items} numbered empty="Nothing in this category this month." /></section>)}
    </div>
  );
}
