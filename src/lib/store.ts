"use client";
import { useSyncExternalStore } from "react";
import { addDays, todayIST } from "./dates";
import { RevisionItem, review as srsReview, startItem } from "./srs";
import type { ExamId } from "./types";

export interface Attempt {
  id: string; kind: "daily" | "weekly" | "monthly" | "mock"; label: string; at: string; date: string;
  total: number; correct: number; wrong: number; skipped: number; score: number; percent: number; accuracy: number;
  seconds: number; negative: number; exam: string; byCategory: Record<string, { correct: number; total: number }>;
  weak: string[]; strong: string[]; toRevise: string[];
}
export interface State {
  saved: string[]; difficult: string[]; flagged: string[];
  read: Record<string, string>;                 // article id -> YYYY-MM-DD first read
  revision: Record<string, RevisionItem>;
  attempts: Attempt[];
  activity: string[];                           // YYYY-MM-DD days with any study activity
  examDates: Partial<Record<ExamId, string>>;
  fc: Record<string, "know" | "dont">;
}
const KEY = "lawca:v1";
const EMPTY: State = { saved: [], difficult: [], flagged: [], read: {}, revision: {}, attempts: [], activity: [], examDates: {}, fc: {} };

let state: State = EMPTY; let loaded = false;
const subs = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return; loaded = true;
  try { const raw = localStorage.getItem(KEY); if (raw) state = { ...EMPTY, ...JSON.parse(raw) }; } catch { /* corrupted or blocked storage → start fresh */ }
}
function commit(next: State) {
  state = next;
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* storage full/blocked: state stays in memory for this session */ }
  subs.forEach((f) => f());
}
function subscribe(f: () => void) {
  load(); subs.add(f);
  const onStorage = (e: StorageEvent) => { if (e.key === KEY) { try { state = { ...EMPTY, ...JSON.parse(e.newValue || "{}") }; } catch {} f(); } };
  window.addEventListener("storage", onStorage);
  return () => { subs.delete(f); window.removeEventListener("storage", onStorage); };
}
const getSnapshot = () => { load(); return state; };
export const useStore = (): State => useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);

const toggle = (xs: string[], id: string) => (xs.includes(id) ? xs.filter((x) => x !== id) : [...xs, id]);
const act = (s: State): State => (s.activity.includes(todayIST()) ? s : { ...s, activity: [...s.activity, todayIST()] });

export const actions = {
  toggleSaved: (id: string) => commit(act({ ...getSnapshot(), saved: toggle(getSnapshot().saved, id) })),
  toggleFlag: (id: string) => commit({ ...getSnapshot(), flagged: toggle(getSnapshot().flagged, id) }),
  toggleDifficult: (id: string) => {
    const s = getSnapshot(); const on = !s.difficult.includes(id);
    const rev = { ...s.revision };
    if (on && !rev[id]) rev[id] = { ...startItem(todayIST()), difficult: true };
    else if (rev[id]) rev[id] = { ...rev[id], difficult: on };
    commit(act({ ...s, difficult: toggle(s.difficult, id), revision: rev }));
  },
  markRead: (id: string) => { const s = getSnapshot(); if (s.read[id]) return; commit(act({ ...s, read: { ...s.read, [id]: todayIST() } })); },
  addToRevision: (id: string) => { const s = getSnapshot(); if (s.revision[id]) return; commit(act({ ...s, revision: { ...s.revision, [id]: startItem(todayIST()) } })); },
  removeFromRevision: (id: string) => { const s = getSnapshot(); const r = { ...s.revision }; delete r[id]; commit({ ...s, revision: r }); },
  /** "Mark as learned" = start (or restart) the spaced schedule. */
  markLearned: (id: string) => { const s = getSnapshot(); commit(act({ ...s, revision: { ...s.revision, [id]: { ...startItem(todayIST()), difficult: s.difficult.includes(id) } } })); },
  reviewDone: (id: string, hard = false) => {
    const s = getSnapshot(); const it = s.revision[id]; if (!it) return;
    const next = srsReview(it, todayIST(), hard);
    commit(act({ ...s, revision: { ...s.revision, [id]: next }, difficult: hard ? Array.from(new Set([...s.difficult, id])) : s.difficult.filter((x) => x !== id) }));
  },
  recordAttempt: (a: Attempt) => { const s = getSnapshot(); commit(act({ ...s, attempts: [...s.attempts, a].slice(-200) })); },
  setExamDate: (e: ExamId, d: string) => { const s = getSnapshot(); const ex = { ...s.examDates }; if (d) ex[e] = d; else delete ex[e]; commit({ ...s, examDates: ex }); },
  setFlashcard: (id: string, v: "know" | "dont") => { const s = getSnapshot(); commit(act({ ...s, fc: { ...s.fc, [id]: v } })); },
  resetAll: () => commit(EMPTY),
};

/** Consecutive-day streak ending today (or yesterday, so the streak isn't lost before you study today). */
export function computeStreak(activity: string[], today = todayIST()): number {
  const set = new Set(activity);
  let d = set.has(today) ? today : addDays(today, -1);
  let n = 0;
  while (set.has(d)) { n++; d = addDays(d, -1); }
  return n;
}
