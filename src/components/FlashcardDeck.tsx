"use client";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Check, X, Shuffle } from "lucide-react";
import { useData } from "@/lib/client-data";
import { actions, useStore } from "@/lib/store";
import { shuffle } from "@/lib/quiz";
import { CATEGORIES } from "@/lib/categories";
import { Empty, ErrorBox, Loading } from "./ui";

export default function FlashcardDeck() {
  const { data, error, loading } = useData();
  const s = useStore();
  const [cat, setCat] = useState(""); const [only, setOnly] = useState<"all" | "dont">("all");
  const [i, setI] = useState(0); const [flip, setFlip] = useState(false); const [seed, setSeed] = useState(1);
  const deck = useMemo(() => {
    if (!data) return [];
    let d = data.flashcards.filter((c) => !cat || c.category === cat);
    if (only === "dont") d = d.filter((c) => s.fc[c.id] !== "know");
    return shuffle(d, `fc:${seed}`);
  }, [data, cat, only, seed, s.fc]);
  useEffect(() => { setI(0); setFlip(false); }, [cat, only, seed]);
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === "ArrowRight") go(1); if (e.key === "ArrowLeft") go(-1); if (e.key === " ") { e.preventDefault(); setFlip((f) => !f); } }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); });
  if (error) return <ErrorBox msg={error} />;
  if (loading || !data) return <Loading />;
  const go = (d: number) => { if (!deck.length) return; setFlip(false); setI((x) => (x + d + deck.length) % deck.length); };
  const c = deck[i]; const known = Object.values(s.fc).filter((v) => v === "know").length;

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div><p className="eyebrow">Active recall</p><h1 className="h-serif text-3xl font-bold">Flashcards</h1><p className="text-sm text-ink-700 dark:text-ink-200">Tap the card (or press Space) to flip · ← → to move · {known}/{data.flashcards.length} marked “Know”</p></div>
      <div className="flex flex-wrap gap-2">
        <select className="input !w-auto !py-1.5 text-xs" value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Category"><option value="">All topics</option>{CATEGORIES.filter((x) => data.flashcards.some((f) => f.category === x.id)).map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}</select>
        <button className={`btn btn-sm ${only === "dont" ? "btn-on" : ""}`} onClick={() => setOnly(only === "all" ? "dont" : "all")}>Hide cards I know</button>
        <button className="btn btn-sm" onClick={() => setSeed((n) => n + 1)}><Shuffle size={13} />Shuffle</button>
      </div>
      {!c ? <Empty>No cards to show — you know them all. 🎉</Empty> : <>
        <button onClick={() => setFlip(!flip)} aria-label={flip ? "Show question" : "Show answer"} className={`card grid min-h-[240px] w-full place-items-center p-6 text-center transition ${flip ? "border-brand-400 bg-brand-50 dark:bg-brand-900/20" : ""}`}>
          <div><p className="eyebrow mb-3">{flip ? "Answer" : "Question"} · {i + 1}/{deck.length}</p><p className="h-serif text-2xl font-semibold leading-snug">{flip ? c.back : c.front}</p></div></button>
        <div className="grid grid-cols-4 gap-2">
          <button className="btn" onClick={() => go(-1)}><ChevronLeft size={14} />Prev</button>
          <button className="btn" onClick={() => { actions.setFlashcard(c.id, "dont"); go(1); }}><X size={14} className="text-red-500" />Don’t know</button>
          <button className="btn" onClick={() => { actions.setFlashcard(c.id, "know"); go(1); }}><Check size={14} className="text-emerald-500" />Know</button>
          <button className="btn" onClick={() => go(1)}>Next<ChevronRight size={14} /></button>
        </div></>}
    </div>
  );
}
