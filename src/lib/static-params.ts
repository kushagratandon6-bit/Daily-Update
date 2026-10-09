import fs from "node:fs";
import path from "node:path";
import type { Article } from "./types";
import { istDate } from "./dates";

/** Build-time read of the dataset written by `npm run data` (scripts/build-data.ts). */
export function readArticles(): Article[] {
  try { return JSON.parse(fs.readFileSync(path.join(process.cwd(), "public", "data", "articles.json"), "utf8")) as Article[]; }
  catch { return []; }
}
export const articleIds = () => readArticles().map((a) => a.id);
export const articleDays = () => Array.from(new Set(readArticles().map((a) => istDate(a.published_at))));
