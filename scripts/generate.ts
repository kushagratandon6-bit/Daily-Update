/**
 * Freezes the weekly quiz / monthly mega-test (question ids) so retakes stay stable while the question bank grows.
 *   npm run generate:weekly | generate:monthly
 * Output: data/live/archive/quizzes.json  (seed → question ids), picked up by scripts/build-data.ts
 */
import fs from "node:fs";
import path from "node:path";
import { assemble } from "./build-data";
import { buildQuiz } from "../src/lib/quiz";
import { poolFor, type PoolKind } from "../src/lib/quiz-pools";
import { todayIST } from "../src/lib/dates";

const kind = (process.argv[2] || "weekly") as PoolKind;
const day = process.argv[3] || todayIST();
const ds = assemble();
const spec = poolFor(kind, day, ds.questions);
const ids = buildQuiz({ count: spec.count, exam: "mixed", difficulty: "mixed", seed: spec.seed, pool: spec.pool }).map((q) => q.id);
const file = path.resolve(__dirname, "..", "data", "live", "archive", "quizzes.json");
fs.mkdirSync(path.dirname(file), { recursive: true });
const cur = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : {};
cur[spec.seed] = ids;
fs.writeFileSync(file, JSON.stringify(cur, null, 1));
console.log(`[generate] ${spec.label}: froze ${ids.length} questions → ${path.relative(process.cwd(), file)}`);
