"use client";
import Link from "next/link";
import type { Article } from "@/lib/types";
import { fmtShort } from "@/lib/dates";
import { CAT_BY_ID } from "@/lib/categories";

export default function MiniList({ items, empty = "Nothing here yet.", numbered = false }: { items: Article[]; empty?: string; numbered?: boolean }) {
  if (!items.length) return <p className="card card-pad text-sm text-ink-500">{empty}</p>;
  return (
    <ul className="card divide-y divide-ink-100 dark:divide-ink-800">
      {items.map((a, i) => (
        <li key={a.id} className="flex items-start gap-3 p-3">
          {numbered && <span className="h-serif w-6 shrink-0 text-right text-base font-bold text-gold-500">{i + 1}</span>}
          <div className="min-w-0 flex-1"><Link href={`/article/${a.id}/`} className="font-medium leading-snug hover:text-brand-600 dark:hover:text-brand-400">{a.title}</Link>
            <p className="text-[11px] text-ink-500 dark:text-ink-300">{CAT_BY_ID[a.category].short} · {fmtShort(a.published_at)} · {a.sources[0]?.name}{a.is_demo ? " · DEMO" : ""}</p></div>
          <span className="shrink-0 rounded-md bg-ink-100 px-1.5 py-0.5 text-[11px] font-bold dark:bg-ink-800">{a.relevance_score}/10</span>
        </li>))}
    </ul>
  );
}
