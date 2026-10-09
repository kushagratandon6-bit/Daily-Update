import type { CategoryId } from "./types";
/** Static-knowledge entries to revise when a category is weak. */
export const REVISE_MAP: Partial<Record<CategoryId, string[]>> = {
  international: ["un", "imf", "world-bank", "wto", "nato", "asean", "brics", "sco", "g20", "icj", "icc"],
  legal: ["basic-structure", "article-21", "article-14", "article-32", "judicial-review", "collegium", "pil", "fundamental-rights"],
  polity: ["election-commission", "parliament", "anti-defection", "money-bill", "constitution-bodies", "women-reservation"],
  economy: ["rbi", "sebi", "niti", "npci-upi", "imf", "world-bank"],
  environment: ["ramsar", "unfccc", "project-tiger"],
  scitech: ["isro", "dpdp"],
  awards: ["bharat-ratna", "nobel"],
};
