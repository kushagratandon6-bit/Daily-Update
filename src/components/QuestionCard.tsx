"use client";
import type { Question } from "@/lib/types";
import { CAT_BY_ID } from "@/lib/categories";

const L = ["A", "B", "C", "D"];
export default function QuestionCard({ q, index, selected, onSelect, reveal, disabled }: { q: Question; index?: number; selected?: number; onSelect?: (i: number) => void; reveal: boolean; disabled?: boolean }) {
  return (
    <div className="card card-pad">
      <p className="mb-1 text-[11px] text-ink-500 dark:text-ink-300">{index !== undefined && <>Q{index + 1} · </>}{CAT_BY_ID[q.category]?.short} · {q.difficulty}{q.is_demo ? " · demo" : ""}</p>
      <p className="font-medium leading-snug">{q.question}</p>
      <div className="mt-3 grid gap-2" role="radiogroup" aria-label={q.question}>
        {q.options.map((o, i) => {
          const chosen = selected === i; const right = reveal && i === q.answer; const wrong = reveal && chosen && i !== q.answer;
          return (
            <button key={i} role="radio" aria-checked={chosen} disabled={disabled} onClick={() => onSelect?.(i)}
              className={`flex items-start gap-2.5 rounded-xl border px-3 py-2.5 text-left text-sm transition ${right ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20" : wrong ? "border-red-500 bg-red-50 dark:bg-red-900/20" : chosen ? "border-brand-500 bg-brand-50 dark:bg-brand-900/30" : "border-ink-200 hover:bg-ink-100 dark:border-ink-700 dark:hover:bg-ink-800"}`}>
              <span className="mt-px grid h-5 w-5 shrink-0 place-items-center rounded-md bg-ink-100 text-[11px] font-bold dark:bg-ink-800">{L[i]}</span><span>{o}{right && " ✓"}{wrong && " ✗"}</span>
            </button>
          );
        })}
      </div>
      {reveal && <p className="mt-3 rounded-lg bg-ink-100 p-3 text-sm dark:bg-ink-800"><b>Answer: {L[q.answer]}.</b> {q.explanation}</p>}
    </div>
  );
}
