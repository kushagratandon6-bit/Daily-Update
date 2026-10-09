export type CategoryId =
  | "legal" | "polity" | "schemes" | "national" | "international" | "economy"
  | "scitech" | "environment" | "defence" | "awards" | "appointments" | "sports"
  | "reports" | "days" | "books" | "obituaries" | "places" | "persons" | "other";

export interface SourceRef { name: string; url: string; quality: number }

export interface ExamScores { nlsat: number; aiat: number; ssc: number } // each 1-10

export interface Article {
  id: string;
  title: string;
  summary: string;               // 2-4 lines
  content: string[];             // paragraphs ("What happened")
  whyMatters: string;            // "Why this matters" (exam-focused)
  keyFacts: string[];            // "Exam ready" facts (verbatim-grounded in source)
  background?: string[];
  examinerAngles?: string[];     // "If I were setting the exam…"
  category: CategoryId;
  subcategory?: string;
  tags: string[];
  published_at: string;          // ISO
  created_at: string;
  sources: SourceRef[];          // >1 => consolidated story
  source_quality: number;        // 1-10 (max over sources)
  relevance_score: number;       // 1-10 exam relevance
  exam: ExamScores;
  legal_relevance: number;       // 0-10
  national_importance: number;   // 0-10
  mcq_value: number;             // 0-10
  priority_score: number;        // 0-100 (computed)
  staticLinks: string[];         // ids in static-gk knowledge base
  legalLinks: string[];          // ids in legal-concepts knowledge base
  details?: Record<string, string>; // structured card (report/award/person/place/scheme)
  one_liners?: string[];
  verified: boolean;             // false => "Information could not be independently verified."
  ai_generated: boolean;
  is_demo: boolean;
}

export interface Question {
  id: string;
  article_id?: string;
  question: string;
  options: [string, string, string, string];
  answer: 0 | 1 | 2 | 3;
  explanation: string;
  difficulty: "easy" | "medium" | "hard";
  category: CategoryId;
  exam: ("nlsat" | "aiat" | "ssc")[];
  origin: "static" | "article";
  date?: string;                 // YYYY-MM-DD for article questions
  is_demo: boolean;
}

export interface Fact { id: string; text: string; category: CategoryId; date?: string; article_id?: string; is_demo?: boolean }
export interface Flashcard { id: string; front: string; back: string; category: CategoryId }

export interface StaticEntry { id: string; title: string; kind: "static-gk" | "legal"; keywords: string[]; points: string[]; explanation?: string }

export interface Meta {
  generated_at: string;
  mode: "live" | "demo";
  article_count: number;
  failed_sources: string[];
  last_fetch_at?: string;
}

export interface Dataset {
  articles: Article[];
  questions: Question[];
  facts: Fact[];
  flashcards: Flashcard[];
  knowledge: StaticEntry[];
  meta: Meta;
  frozen?: Record<string, string[]>;   // quiz seed -> question ids, written by scripts/generate.ts
}

export type ExamId = "nlsat" | "aiat" | "ssc";
