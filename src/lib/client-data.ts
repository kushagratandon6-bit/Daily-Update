"use client";
import { useEffect, useState } from "react";
import type { Dataset } from "./types";

export const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";
const FILES = ["articles", "questions", "facts", "flashcards", "knowledge", "meta"] as const;
let cache: Promise<Dataset> | null = null;

async function fetchJSON(name: string) {
  const r = await fetch(`${BASE}/data/${name}.json`, { cache: "force-cache" });
  if (!r.ok) throw new Error(`${name}.json → HTTP ${r.status}`);
  return r.json();
}
export function loadDataset(): Promise<Dataset> {
  if (!cache) {
    cache = Promise.all([...FILES.map(fetchJSON), fetchJSON("frozen").catch(() => ({}))]).then(([articles, questions, facts, flashcards, knowledge, meta, frozen]) =>
      ({ articles, questions, facts, flashcards, knowledge, meta, frozen }) as Dataset).catch((e) => { cache = null; throw e; });
  }
  return cache;
}
export function useData() {
  const [data, setData] = useState<Dataset | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { let on = true; loadDataset().then((d) => on && setData(d)).catch((e) => on && setError(String(e.message || e))); return () => { on = false; }; }, []);
  return { data, error, loading: !data && !error };
}
