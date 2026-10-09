"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useData } from "@/lib/client-data";
import { actions, useStore } from "@/lib/store";
import { isDue, REVIEW_OFFSETS } from "@/lib/srs";
import { todayIST, diffDays, fmtLong } from "@/lib/dates";
import { Empty, ErrorBox, Loading, SectionHead } from "./ui";
import type { Article } from "@/lib/types";
import { ArticleActions } from "./NewsCard";

const TABS = ["due", "saved", "difficult", "notrevised", "mastered"] as const;
const LABEL: Record<(typeof TABS)[number], string> = { due: "Due today", saved: "Saved", difficult: "Difficult", notrevised: "Not revised", mastered: "Mastered" };

export default function RevisionView() {
  const { data, error, loading } = useData();
  const s = useStore();
  const [tab, setTab] = useState<(typeof TABS)[number]>("due");
  const today = todayIST();
  const map = useMemo(() => new Map((data?.articles ?? []).map((a) => [a.id, a])), [data]);
  if (error) return <ErrorBox msg={error} />;
  if (loading || !data) return <Loading />;

  const get = (ids: string[]) => ids.map((i) => map.get(i)).filter(Boolean) as Article[];
  const rev = Object.entries(s.revision);
  const lists = {
    due: get(rev.filter(([, it]) => isDue(it, today)).map(([id]) => id)),
    saved: get(s.saved),
    difficult: get(s.difficult),
    notrevised: get(rev.filter(([, it]) => !it.mastered && it.stage === 0 && !isDue(it, today)).map(([id]) => id)),
    mastered: get(rev.filter(([, it]) => it.mastered).map(([id]) => id)),
  };
  const items = lists[tab];
  const missing = s.saved.length + rev.length > 0 && [...s.saved, ...rev.map(([id]) => id)].some((id) => !map.has(id));

  return (
    <div className="space-y-5">
      <div><p className="eyebrow">Spaced revision</p><h1 className="h-serif text-3xl font-bold">My Revision</h1>
        <p className="text-sm text-ink-700 dark:text-ink-200">Learn on Day 1 → review on Day 3 → Day 7 → Day 15 → Day 30 (reviews fall {REVIEW_OFFSETS.map((n) => `+${n}`).join(", ")} days after you learn a story). Progress is stored on this device.</p></div>
      <div className="scroll-x flex gap-2 overflow-x-auto" role="tablist">
        {TABS.map((t) => <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`btn btn-sm shrink-0 ${tab === t ? "btn-primary" : ""}`}>{LABEL[t]} <span className="opacity-70">({lists[t].length})</span></button>)}
      </div>
      {missing && <p className="text-xs text-ink-500">Some saved stories are no longer in the current dataset and are hidden.</p>}
      {items.length === 0 ? (
        <Empty>{tab === "due" ? <>Nothing due today. Open any story and tap <b>Add to revision</b> to start its schedule — or <Link href="/today/" className="underline">read today’s stories</Link>.</> : `No ${LABEL[tab].toLowerCase()} stories yet.`}</Empty>
      ) : (
        <div className="space-y-3">
          {items.map((a) => { const it = s.revision[a.id]; const days = it?.nextDue ? diffDays(it.nextDue, today) : null;
            return (
              <div key={a.id} className="card card-pad space-y-2.5">
                <Link href={`/article/${a.id}/`} className="h-serif text-base font-semibold hover:text-brand-600 dark:hover:text-brand-400">{a.title}</Link>
                <ul className="list-disc space-y-0.5 pl-5 text-sm text-ink-700 dark:text-ink-200">{a.keyFacts.slice(0, 3).map((f) => <li key={f}>{f}</li>)}</ul>
                {it && <p className="text-xs text-ink-500 dark:text-ink-300">Stage {Math.min(it.stage, 4)}/4 · learned {fmtLong(it.learnedAt)}{it.mastered ? " · mastered ✓" : it.nextDue ? ` · next review ${days! <= 0 ? "due now" : `in ${days} day${days === 1 ? "" : "s"} (${fmtLong(it.nextDue)})`}` : ""}</p>}
                <div className="flex flex-wrap items-center gap-2">
                  {it && !it.mastered && isDue(it, today) && <>
                    <button className="btn btn-sm btn-primary" onClick={() => actions.reviewDone(a.id)}>✓ Reviewed — remembered</button>
                    <button className="btn btn-sm" onClick={() => actions.reviewDone(a.id, true)}>Still difficult</button></>}
                  {!it && <button className="btn btn-sm" onClick={() => actions.markLearned(a.id)}>Mark as learned (start schedule)</button>}
                  {it && !it.mastered && !isDue(it, today) && <button className="btn btn-sm" onClick={() => actions.markLearned(a.id)}>Restart schedule</button>}
                </div>
                <ArticleActions id={a.id} />
              </div>);
          })}
        </div>
      )}
    </div>
  );
}
