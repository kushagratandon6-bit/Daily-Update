"use client";
import Link from "next/link";
import type { ReactNode } from "react";
import { band, stars } from "@/lib/priority";
import { CAT_BY_ID } from "@/lib/categories";
import type { CategoryId } from "@/lib/types";

const TONE: Record<string, string> = {
  must: "bg-red-600 text-white border-red-600",
  high: "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-700",
  mid: "bg-sky-100 text-sky-900 border-sky-300 dark:bg-sky-900/30 dark:text-sky-200 dark:border-sky-700",
  low: "bg-ink-100 text-ink-700 border-ink-200 dark:bg-ink-800 dark:text-ink-200 dark:border-ink-700",
  ignore: "bg-ink-100 text-ink-500 border-ink-200 dark:bg-ink-800 dark:text-ink-300 dark:border-ink-700",
};
export function ImportanceBadge({ score }: { score: number }) {
  const b = band(score);
  return <span title={`Exam relevance ${score}/10 — ${b.label}`} className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[11px] font-bold ${TONE[b.tone]}`}>{score}/10 · {b.label}</span>;
}
export function Stars({ n }: { n: number }) {
  const s = stars(n);
  return <span aria-label={`${s} of 5 stars`} className="tracking-tighter text-gold-500">{"★".repeat(s)}<span className="text-ink-300 dark:text-ink-700">{"★".repeat(5 - s)}</span></span>;
}
export function ExamRelevanceBadge({ exam }: { exam: { nlsat: number; aiat: number; ssc: number } }) {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-ink-500 dark:text-ink-300">
      {([["NLSAT", exam.nlsat], ["AIAT", exam.aiat], ["SSC Law", exam.ssc]] as const).map(([k, v]) => (
        <span key={k} className="inline-flex items-center gap-1"><b className="font-semibold text-ink-700 dark:text-ink-100">{k}</b><Stars n={v} /></span>))}
    </div>
  );
}
export function CategoryChip({ id }: { id: CategoryId }) {
  const c = CAT_BY_ID[id];
  return <Link href={`/category/${c.slug}/`} className="chip hover:border-brand-400">{c.emoji} {c.short}</Link>;
}
export function DemoBadge() { return <span className="rounded-md border border-dashed border-amber-500 bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800 dark:bg-amber-900/20 dark:text-amber-200">Demo</span>; }

export function SectionHead({ title, sub, href, linkLabel = "View all →", right }: { title: ReactNode; sub?: ReactNode; href?: string; linkLabel?: string; right?: ReactNode }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div><h2 className="h-serif text-xl font-semibold sm:text-2xl">{title}</h2>{sub && <p className="mt-0.5 text-sm text-ink-500 dark:text-ink-300">{sub}</p>}</div>
      {right ?? (href && <Link href={href} className="shrink-0 text-sm font-medium text-brand-600 hover:underline dark:text-brand-400">{linkLabel}</Link>)}
    </div>
  );
}
export function Empty({ children }: { children: ReactNode }) {
  return <div className="card card-pad text-center text-sm text-ink-500 dark:text-ink-300">{children}</div>;
}
export function Loading() { return <div className="card card-pad animate-pulse text-sm text-ink-500">Loading current affairs…</div>; }
export function ErrorBox({ msg }: { msg: string }) {
  return <div className="card card-pad border-red-300 text-sm text-red-700 dark:border-red-800 dark:text-red-300">Couldn’t load data ({msg}). Run <code>npm run data</code> and reload.</div>;
}
