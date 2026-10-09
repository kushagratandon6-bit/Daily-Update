import { addDays } from "./dates";

/**
 * Spaced revision (spec §36): Day 1 learn → Day 3 → Day 7 → Day 15 → Day 30.
 * Counting the learn day as Day 1, reviews fall at +2, +6, +14, +29 days after learning.
 */
export const REVIEW_OFFSETS = [2, 6, 14, 29] as const;

export interface RevisionItem {
  learnedAt: string;       // YYYY-MM-DD
  stage: number;           // number of completed reviews (0..4)
  nextDue: string | null;  // null once mastered
  mastered: boolean;
  difficult?: boolean;
}

export function startItem(learnedAt: string): RevisionItem {
  return { learnedAt, stage: 0, nextDue: addDays(learnedAt, REVIEW_OFFSETS[0]), mastered: false };
}

/** Student finished a review. `hard` = still difficult → repeat from stage 0 schedule (+2 days). */
export function review(item: RevisionItem, today: string, hard = false): RevisionItem {
  if (hard) return { ...item, stage: 0, learnedAt: today, nextDue: addDays(today, REVIEW_OFFSETS[0]), mastered: false, difficult: true };
  const stage = item.stage + 1;
  if (stage >= REVIEW_OFFSETS.length) return { ...item, stage, nextDue: null, mastered: true, difficult: false };
  return { ...item, stage, nextDue: addDays(item.learnedAt, REVIEW_OFFSETS[stage]), mastered: false, difficult: false };
}

export const isDue = (item: RevisionItem, today: string) => !item.mastered && !!item.nextDue && item.nextDue <= today;
