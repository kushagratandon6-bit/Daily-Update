# LawCA — Law Exam Current Affairs Intelligence Dashboard

Exam-first current-affairs dashboard for **NLSAT, AIAT and SSC-level law entrance exams**. It is not a news feed: every story is scored for exam relevance and carries *what happened · why it matters · exam-ready facts · MCQs · static-GK / legal-concept links · examiner angles · source link*.

> **Status of data.** A fresh clone shows clearly-labelled **DEMO DATA** (format samples with placeholder details — *not* real news). Real stories appear after the first successful GitHub Actions run (or `npm run pipeline:run` on a machine with internet). Demo and live data are never mixed: as soon as `data/live/articles.json` has items, only live items are shown.

## Features
- **Dashboard** — Top 10 Must Know, Likely Exam Questions, daily snapshot, section digest, per-exam (NLSAT/AIAT/SSC) star ratings, priority score.
- **19 categories**, `/daily/YYYY-MM-DD` pages, date archive, last 6 / 12 months, timeline, monthly capsules (Markdown download + print).
- **Search & filters** — text, category, exam, relevance, date range, source, saved/unread; knowledge-aware (searching "Ramsar" also finds the concept).
- **Quizzes** — daily (≥10), weekly (50), monthly (100), mock tests with *exam mode* (timer, negative marking, explanations only at the end), score analytics.
- **Revision** — spaced repetition at Day 1/3/7/15/30, "still difficult" restarts the ladder; saved / difficult / flagged lists; flashcards; one-liners; 30-minute rapid revision; high-value (most-likely) list.
- **Progress** — streak, accuracy, weak topics, score trend, exam countdown. All stored **on your device** (localStorage) — no login required.
- Dark mode, mobile-first layout, bottom nav on phones.

## How accuracy is protected
- Facts shown on a card come from the source item or the curated knowledge base in `data/knowledge/`. Nothing is invented by the app.
- Optional LLM step (off by default) is constrained by a strict prompt **and** a code-level *grounding guard* (`scripts/pipeline/grounding.ts`): any number or named entity in LLM output that does not appear in the source text / curated KB causes that item to be **dropped**. Unclear items read *"Information could not be independently verified."*
- AI-generated items are flagged `ai_generated`; unverified items are labelled. Wording says "High exam potential", never certainty.
- Duplicate stories are merged into one card (canonical URL + token similarity within ±3 days); sources only merge across *independent* publishers.
- A failing source never breaks the build — it shows up in a "Source temporarily unavailable" banner.

## Architecture (free-first)
```
GitHub Actions (cron) ──► scripts/pipeline.ts ──► data/live/*.json (committed)
                                                     │
                       npm run build ◄───────────────┘   (scripts/build-data.ts → public/data/*.json)
                           │
                  Next.js static export (out/) ──► GitHub Pages
User state: browser localStorage        Supabase: optional mirror only
```
Stack: Next.js 15 (static export), React 19, TypeScript, Tailwind, Recharts, zod, rss-parser, vitest.

## Quick start
```bash
npm ci
npm run dev          # builds demo/live data, then starts the dev server
npm test             # 48 tests (logic, pipeline with fixture feeds, UI click-through)
npm run build        # static site in ./out
```
Without internet access to the feeds, `npm run pipeline:fetch` logs each failing source and exits cleanly with no data written.

## Environment variables (`.env.example`)
| Variable | Needed? | Purpose |
|---|---|---|
| `NEXT_PUBLIC_BASE_PATH` | for project Pages | e.g. `/lawca` (set automatically by the deploy workflow) |
| `NEXT_PUBLIC_DATA_MODE` | no | `auto` (default) / `live` / `demo` |
| `LLM_PROVIDER` | no | `anthropic` or `openai`. **Unset = free rule-based mode.** |
| `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` / `OPENAI_API_KEY`, `OPENAI_MODEL` | only with LLM | **Paid API usage** |
| `LLM_MAX_ARTICLES_PER_RUN` | no | cost cap per run (default 15) |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | no | optional mirror (`npm run sync:supabase`) |

**Never commit keys.** Put them in GitHub → Settings → Secrets and variables → Actions (secrets: API keys & Supabase; variables: `LLM_PROVIDER`, `LLM_MAX_ARTICLES_PER_RUN`, `BASE_PATH`).

## Deploy on GitHub Pages
1. Push the repo to GitHub (default branch `main`).
2. Settings → Pages → **Source: GitHub Actions**.
3. Actions → **Deploy to GitHub Pages** → *Run workflow* (or just push). The site base path defaults to `/<repo-name>`. For a user site / custom domain, add repo variable `BASE_PATH` = `none`.
4. Actions → **Fetch news** → *Run workflow* once to pull the first live data. After that it runs every 3 hours.

### Workflows (`.github/workflows`)
| File | Schedule | Does |
|---|---|---|
| `fetch-news.yml` | every 3 h | fetch → dedupe → classify → (optional LLM) → commit `data/live` → redeploy |
| `generate-current-affairs.yml` | 19:30 IST daily | second enrichment pass (higher LLM cap) → redeploy |
| `daily-quiz.yml` | 23:00 IST daily | freezes weekly (Sunday) / monthly (month-end) quiz sets so retakes stay stable |
| `deploy.yml` | on push + called by the above | tests, builds, publishes Pages |

Change cron times in each file's `on.schedule`. Note: GitHub may delay or skip scheduled runs on inactive repos (it pauses schedules after 60 days of no repo activity — the data commits keep it active).

## Optional Supabase
Run `supabase/schema.sql` in the SQL editor (tables: articles, questions, topics, sources, users, bookmarks, revision_items, quiz_attempts; RLS on, anon = read-only on content). Add the two secrets; `fetch-news.yml` then mirrors data after each run. The app itself does not require Supabase.

## Sources
Defined in `scripts/pipeline/sources.ts` with a quality score (1–10): PIB, RBI, SEBI (10); UN News, WHO (9); The Hindu, Indian Express, LiveLaw, Bar & Bench, SCC Online blog (8); Google News topic feeds (6, used for discovery only). **Feed URLs could not be verified from the build sandbox (no outbound access).** Run `npm run sources:check` on your machine / in Actions and edit or remove any feed that returns an error. Only titles, short summaries and links are stored — never full article text.

## Cost notes
| Component | Cost |
|---|---|
| GitHub Pages / Actions (public repo) | Free |
| Rule-based classification, dedupe, quizzes, SRS | Free |
| **LLM enrichment** (Anthropic/OpenAI) | **Paid per token** — capped by `LLM_MAX_ARTICLES_PER_RUN`; off unless `LLM_PROVIDER` is set |
| Supabase | Free tier sufficient; optional |
| GitHub Actions on a *private* repo | Uses free-tier minutes (~8 short runs/day) |

## Extending
- Static knowledge: `data/knowledge/static-gk.json`, `legal-concepts.json`, `static-questions.json`, `flashcards.json` — add entries; stories auto-link by keyword (acronyms ≤4 letters must be uppercase to match).
- Exam patterns/relevance rules: `scripts/pipeline/classify.ts`; priority formula: `src/lib/priority.ts`.

## Known limitations
- Live feeds are untested from the build environment; verify with `npm run sources:check`.
- Progress/revision data lives in one browser; clearing site data resets it (export/sync across devices is not implemented).
- Rule-based summaries are extractive (feed snippet), so "why it matters" is templated until the LLM step is enabled.
