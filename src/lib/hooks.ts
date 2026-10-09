"use client";
import { useMemo } from "react";
import type { Dataset } from "./types";
import { todayIST } from "./dates";
import { latestDay } from "./selectors";

/** "Today" for the UI: IST today if it has stories; otherwise the most recent day with stories (the UI labels this). */
export function useToday(data: Dataset | null) {
  return useMemo(() => {
    const real = todayIST();
    if (!data || !data.articles.length) return { real, day: real, isToday: true };
    const latest = latestDay(data.articles, real);
    const day = latest > real ? real : latest;
    return { real, day, isToday: day === real };
  }, [data]);
}
