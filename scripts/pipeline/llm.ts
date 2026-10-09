import { z } from "zod";
import { grounded } from "./grounding";
import type { Question, CategoryId } from "../../src/lib/types";

const Mcq = z.object({ question: z.string().min(10), options: z.array(z.string().min(1)).length(4), answer: z.number().int().min(0).max(3), explanation: z.string().min(5), difficulty: z.enum(["easy", "medium", "hard"]).default("medium") });
export const Enrichment = z.object({
  summary: z.string().min(20).max(900),
  why_matters: z.string().min(20).max(900),
  key_facts: z.array(z.string()).max(6),
  examiner_angles: z.array(z.string()).max(5).default([]),
  background: z.array(z.string()).max(4).default([]),
  mcqs: z.array(Mcq).max(5).default([]),
  verified: z.boolean().default(true),
});
export type EnrichmentT = z.infer<typeof Enrichment>;

export const SYSTEM = `You are an exam-prep editor for Indian law entrance exams (NLSAT, AIAT, SLAT-style GK).
You receive ONE news item (title + text). Produce STRICT JSON only.
ABSOLUTE RULES — violating any makes the output unusable:
1. Use ONLY facts stated in the provided text. Never add outside facts, statistics, quotes, dates, legal principles or names.
2. Never alter names, dates or numbers. Copy them exactly.
3. If the text is too thin or unclear for a field, return fewer items (or an empty list). Do not pad.
4. key_facts: 3-5 short, verbatim-faithful facts (<=25 words each) each containing a concrete name/number/date from the text.
5. mcqs: 3-5 questions, 4 options, exactly one correct, answer = 0-based index. The CORRECT option and explanation must be supported by the text. Distractors must be plausible but clearly wrong.
6. why_matters: 2-4 sentences on why a law aspirant should care (exam angle). No predictions of what "will" be asked — say "may be tested".
7. If you cannot verify a claim from the text, set "verified": false.
Return JSON: {"summary","why_matters","key_facts":[],"examiner_angles":[],"background":[],"mcqs":[{"question","options":[4],"answer","explanation","difficulty"}],"verified":true}`;

async function call(provider: string, user: string): Promise<string> {
  if (provider === "openai") {
    const r = await fetch("https://api.openai.com/v1/chat/completions", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({ model: process.env.OPENAI_MODEL || "gpt-4o-mini", temperature: 0.1, response_format: { type: "json_object" }, messages: [{ role: "system", content: SYSTEM }, { role: "user", content: user }] }) });
    if (!r.ok) throw new Error(`OpenAI HTTP ${r.status}`);
    return (await r.json()).choices[0].message.content;
  }
  const r = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "content-type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY!, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: process.env.ANTHROPIC_MODEL || "claude-haiku-5-5", max_tokens: 2000, temperature: 0.1, system: SYSTEM, messages: [{ role: "user", content: user }] }) });
  if (!r.ok) throw new Error(`Anthropic HTTP ${r.status}`);
  const j = await r.json(); return j.content?.[0]?.text ?? "";
}
export const llmAvailable = () => (process.env.LLM_PROVIDER === "openai" ? !!process.env.OPENAI_API_KEY : !!process.env.ANTHROPIC_API_KEY);

/** Returns a grounded enrichment, or null. Ungrounded facts/MCQs are dropped individually (never "fixed" by guessing). */
export async function enrichText(title: string, text: string, knowledgeText: string): Promise<{ e: EnrichmentT; dropped: number } | null> {
  const provider = process.env.LLM_PROVIDER === "openai" ? "openai" : "anthropic";
  const raw = await call(provider, `TITLE: ${title}\n\nTEXT:\n${text.slice(0, 6000)}`);
  const json = raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1);
  const parsed = Enrichment.safeParse(JSON.parse(json)); if (!parsed.success) return null;
  const e = parsed.data; let dropped = 0; const src = `${title}\n${text}`;
  const sumOk = grounded(e.summary, src);
  if (!sumOk.ok) { dropped++; e.summary = ""; e.verified = false; }
  const whyOk = grounded(e.why_matters, src, knowledgeText);
  if (!whyOk.ok) { dropped++; e.why_matters = ""; }
  e.key_facts = e.key_facts.filter((f) => { const g = grounded(f, src).ok; if (!g) dropped++; return g; });
  e.background = e.background.filter((f) => { const g = grounded(f, src, knowledgeText).ok; if (!g) dropped++; return g; });
  e.mcqs = e.mcqs.filter((m) => {
    const ok = new Set(m.options).size === 4 && grounded(m.options[m.answer], src, knowledgeText).ok && grounded(m.explanation, src, knowledgeText).ok && grounded(m.question, src, knowledgeText).ok;
    if (!ok) dropped++; return ok;
  });
  return { e, dropped };
}
export type QBuild = Omit<Question, "id" | "article_id" | "category" | "exam" | "origin" | "date" | "is_demo">;
export const toQuestions = (mcqs: EnrichmentT["mcqs"], base: { id: string; category: CategoryId; date: string; exam: Question["exam"] }): Question[] =>
  mcqs.map((m, i) => ({ id: `${base.id}-q${i + 1}`, article_id: base.id, question: m.question, options: m.options as Question["options"], answer: m.answer as Question["answer"], explanation: m.explanation, difficulty: m.difficulty, category: base.category, exam: base.exam, origin: "article", date: base.date, is_demo: false }));
