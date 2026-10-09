import type { CategoryId } from "./types";

export interface CategoryDef { id: CategoryId; slug: string; label: string; short: string; emoji: string; nav: boolean }

export const CATEGORIES: CategoryDef[] = [
  { id: "legal", slug: "legal", label: "Legal & Constitutional", short: "Legal", emoji: "⚖️", nav: true },
  { id: "national", slug: "national", label: "National Affairs", short: "National", emoji: "🇮🇳", nav: true },
  { id: "international", slug: "international", label: "International Affairs", short: "International", emoji: "🌍", nav: true },
  { id: "polity", slug: "polity", label: "Polity & Governance", short: "Polity", emoji: "🏛️", nav: true },
  { id: "economy", slug: "economy", label: "Economy & Business", short: "Economy", emoji: "📊", nav: true },
  { id: "scitech", slug: "scitech", label: "Science & Technology", short: "Sci & Tech", emoji: "🔬", nav: true },
  { id: "environment", slug: "environment", label: "Environment & Climate", short: "Environment", emoji: "🌱", nav: true },
  { id: "defence", slug: "defence", label: "Defence & Security", short: "Defence", emoji: "🛡️", nav: true },
  { id: "awards", slug: "awards", label: "Awards & Honours", short: "Awards", emoji: "🏅", nav: true },
  { id: "appointments", slug: "appointments", label: "Appointments", short: "Appointments", emoji: "🧑‍💼", nav: true },
  { id: "sports", slug: "sports", label: "Sports", short: "Sports", emoji: "🏆", nav: true },
  { id: "reports", slug: "reports", label: "Reports & Indices", short: "Reports", emoji: "📑", nav: true },
  { id: "schemes", slug: "schemes", label: "Schemes & Policies", short: "Schemes", emoji: "📋", nav: true },
  { id: "days", slug: "days", label: "Important Days", short: "Days", emoji: "📅", nav: false },
  { id: "books", slug: "books", label: "Books & Authors", short: "Books", emoji: "📚", nav: false },
  { id: "obituaries", slug: "obituaries", label: "Obituaries", short: "Obituaries", emoji: "🕯️", nav: false },
  { id: "places", slug: "places", label: "Places in News", short: "Places", emoji: "📍", nav: false },
  { id: "persons", slug: "persons", label: "Person in News", short: "Persons", emoji: "👤", nav: false },
  { id: "other", slug: "other", label: "Other Important News", short: "Other", emoji: "📰", nav: false },
];

export const CAT_BY_ID = Object.fromEntries(CATEGORIES.map((c) => [c.id, c])) as Record<CategoryId, CategoryDef>;
export const CAT_BY_SLUG = Object.fromEntries(CATEGORIES.map((c) => [c.slug, c])) as Record<string, CategoryDef>;

/** Daily-page section order (spec §26). */
export const DAILY_SECTIONS: { id: string; label: string; cats: CategoryId[] }[] = [
  { id: "legal", label: "Legal Affairs", cats: ["legal"] },
  { id: "polity", label: "Polity", cats: ["polity", "schemes"] },
  { id: "national", label: "National", cats: ["national"] },
  { id: "international", label: "International", cats: ["international"] },
  { id: "economy", label: "Economy", cats: ["economy"] },
  { id: "scitech", label: "Science & Technology", cats: ["scitech"] },
  { id: "environment", label: "Environment", cats: ["environment"] },
  { id: "defence", label: "Defence", cats: ["defence"] },
  { id: "awards", label: "Awards", cats: ["awards", "books"] },
  { id: "sports", label: "Sports", cats: ["sports"] },
  { id: "reports", label: "Reports & Indices", cats: ["reports"] },
  { id: "appointments", label: "Appointments", cats: ["appointments", "persons"] },
  { id: "other", label: "Other Important News", cats: ["other", "days", "obituaries", "places"] },
];

export const EXAMS = [
  { id: "nlsat", label: "NLSAT", note: "NLSIU Bengaluru — current affairs of last 6–12 months, analytical/legal-issue oriented" },
  { id: "aiat", label: "AIAT", note: "All India Admission Test — writing-ability (WAT) on socio-legal & contemporary topics + PI" },
  { id: "ssc", label: "SSC Law", note: "SLAT-style GK section — mostly current affairs (people, places, sports, economy, science)" },
] as const;
