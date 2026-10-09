import type { Article, Question, StaticEntry } from "./types";

/** Practice questions related to an article: its own MCQs first, then bank questions that mention a linked concept. */
export function relatedQuestions(a: Article, questions: Question[], knowledge: StaticEntry[], max = 5): { own: Question[]; related: Question[] } {
  const own = questions.filter((q) => q.article_id === a.id);
  const ids = new Set([...a.staticLinks, ...a.legalLinks]);
  const kws = knowledge.filter((k) => ids.has(k.id)).flatMap((k) => [k.title.toLowerCase(), ...k.keywords.filter((x) => x.length > 4)]);
  const related = questions.filter((q) => q.article_id !== a.id && kws.some((k) => (q.question + " " + q.options.join(" ")).toLowerCase().includes(k))).slice(0, Math.max(0, max - own.length));
  return { own, related };
}
