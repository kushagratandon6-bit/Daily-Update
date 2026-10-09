"use client";
import Link from "next/link";
import { Bookmark, BookmarkCheck, Repeat, Flag, HelpCircle, ExternalLink, Layers } from "lucide-react";
import type { Article } from "@/lib/types";
import { CategoryChip, DemoBadge, ExamRelevanceBadge, ImportanceBadge } from "./ui";
import { actions, useStore } from "@/lib/store";
import { fmtShort } from "@/lib/dates";

export function ArticleActions({ id, compact = false }: { id: string; compact?: boolean }) {
  const s = useStore();
  const saved = s.saved.includes(id), inRev = !!s.revision[id], diff = s.difficult.includes(id), flag = s.flagged.includes(id);
  const sz = compact ? "btn btn-sm" : "btn";
  return (
    <div className="flex flex-wrap gap-1.5">
      <button className={`${sz} ${saved ? "btn-on" : ""}`} onClick={() => actions.toggleSaved(id)} aria-pressed={saved}>{saved ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}{saved ? "Saved" : "Save"}</button>
      <button className={`${sz} ${inRev ? "btn-on" : ""}`} onClick={() => (inRev ? actions.removeFromRevision(id) : actions.addToRevision(id))} aria-pressed={inRev}><Repeat size={14} />{inRev ? "In revision" : "Add to revision"}</button>
      {!compact && <>
        <button className={`${sz} ${diff ? "btn-on" : ""}`} onClick={() => actions.toggleDifficult(id)} aria-pressed={diff}>{diff ? "★ Difficult" : "☆ Mark difficult"}</button>
        <button className={`${sz} ${flag ? "btn-on" : ""}`} onClick={() => actions.toggleFlag(id)} aria-pressed={flag}><Flag size={14} />{flag ? "Flagged" : "Flag for later"}</button>
      </>}
    </div>
  );
}

export default function NewsCard({ a, rank, showQuiz = true }: { a: Article; rank?: number; showQuiz?: boolean }) {
  const read = useStore().read[a.id];
  return (
    <article className="card card-pad flex flex-col gap-2.5">
      <div className="flex flex-wrap items-center gap-1.5">
        {rank && <span className="grid h-6 w-6 place-items-center rounded-md bg-ink-900 text-xs font-bold text-white dark:bg-ink-100 dark:text-ink-900">{rank}</span>}
        <ImportanceBadge score={a.relevance_score} />
        <CategoryChip id={a.category} />
        {a.is_demo && <DemoBadge />}
        {a.sources.length > 1 && <span className="chip" title="Consolidated from multiple sources"><Layers size={11} />{a.sources.length} sources</span>}
        {read && <span className="chip">✓ read</span>}
      </div>
      <h3 className="h-serif text-[17px] font-semibold leading-snug"><Link href={`/article/${a.id}/`} className="hover:text-brand-600 dark:hover:text-brand-400">{a.title}</Link></h3>
      <p className="line-clamp-4 text-sm leading-relaxed text-ink-700 dark:text-ink-200">{a.summary}</p>
      <ExamRelevanceBadge exam={a.exam} />
      <div className="flex flex-wrap gap-1">{a.tags.slice(0, 4).map((t) => <span key={t} className="text-[11px] text-ink-500 dark:text-ink-300">#{t.replace(/\s+/g, "")}</span>)}</div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-ink-100 pt-2.5 dark:border-ink-800">
        <span className="text-[11px] text-ink-500 dark:text-ink-300">{a.sources.map((s) => s.name).slice(0, 2).join(", ")} · {fmtShort(a.published_at)}</span>
        <div className="flex flex-wrap items-center gap-1.5">
          <Link href={`/article/${a.id}/`} className="btn btn-sm">Read more</Link>
          {showQuiz && <Link href={`/article/${a.id}/#questions`} className="btn btn-sm"><HelpCircle size={13} />Questions</Link>}
        </div>
      </div>
      <ArticleActions id={a.id} compact />
    </article>
  );
}
export { ExternalLink };
