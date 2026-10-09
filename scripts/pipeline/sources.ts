import type { CategoryId } from "../../src/lib/types";

export interface FeedSource {
  id: string; name: string; url: string;
  quality: number;                 // 1-10 (spec §68): official 10, major paper 8, other credible 7, unknown 3
  defaultCategory?: CategoryId;    // fallback when keyword classification is inconclusive
  note?: string;
}

/**
 * RSS/Atom sources. Feed URLs change over time — run `npm run sources:check` to see which respond.
 * A failing feed never breaks the pipeline: it is recorded in data/live/meta.json and shown in the UI
 * as "Source temporarily unavailable".
 */
export const SOURCES: FeedSource[] = [
  // Official / government (10)
  { id: "pib", name: "PIB", url: "https://www.pib.gov.in/RssMain.aspx?ModId=6&Lang=1&Regid=3", quality: 10, note: "Press Information Bureau — all-India English releases" },
  { id: "rbi-press", name: "RBI", url: "https://www.rbi.org.in/pressreleases_rss.xml", quality: 10, defaultCategory: "economy" },
  { id: "rbi-notif", name: "RBI", url: "https://www.rbi.org.in/notifications_rss.xml", quality: 10, defaultCategory: "economy" },
  { id: "sebi", name: "SEBI", url: "https://www.sebi.gov.in/sebirss.xml", quality: 10, defaultCategory: "economy" },
  // International organisations (9)
  { id: "un-news", name: "UN News", url: "https://news.un.org/feed/subscribe/en/news/all/rss.xml", quality: 9, defaultCategory: "international" },
  { id: "who", name: "WHO", url: "https://www.who.int/rss-feeds/news-english.xml", quality: 9, defaultCategory: "international" },
  // Major newspapers (8)
  { id: "hindu-nat", name: "The Hindu", url: "https://www.thehindu.com/news/national/feeder/default.rss", quality: 8, defaultCategory: "national" },
  { id: "hindu-intl", name: "The Hindu", url: "https://www.thehindu.com/news/international/feeder/default.rss", quality: 8, defaultCategory: "international" },
  { id: "hindu-biz", name: "The Hindu", url: "https://www.thehindu.com/business/feeder/default.rss", quality: 8, defaultCategory: "economy" },
  { id: "hindu-sci", name: "The Hindu", url: "https://www.thehindu.com/sci-tech/feeder/default.rss", quality: 8, defaultCategory: "scitech" },
  { id: "ie-india", name: "The Indian Express", url: "https://indianexpress.com/section/india/feed/", quality: 8, defaultCategory: "national" },
  { id: "ie-explained", name: "The Indian Express", url: "https://indianexpress.com/section/explained/feed/", quality: 8, note: "Explainers are high exam-value" },
  // Legal news (8)
  { id: "livelaw", name: "LiveLaw", url: "https://www.livelaw.in/rss/top-stories", quality: 8, defaultCategory: "legal" },
  { id: "barandbench", name: "Bar & Bench", url: "https://www.barandbench.com/feed", quality: 8, defaultCategory: "legal" },
  { id: "scc", name: "SCC Online Blog", url: "https://www.scconline.com/blog/feed/", quality: 8, defaultCategory: "legal" },
  // Fallbacks for sites that block datacenter IPs (PIB / RBI / Indian Express / LiveLaw / UN return 403/404/406 to GitHub runners).
  // Google News lists their stories with the real publisher; duplicates with the direct feeds are merged by the dedupe step.
  { id: "gn-pib", name: "Google News", url: "https://news.google.com/rss/search?q=site:pib.gov.in+when:2d&hl=en-IN&gl=IN&ceid=IN:en", quality: 6, defaultCategory: "national" },
  { id: "gn-rbi", name: "Google News", url: "https://news.google.com/rss/search?q=RBI+OR+%22Reserve+Bank+of+India%22+when:2d&hl=en-IN&gl=IN&ceid=IN:en", quality: 6, defaultCategory: "economy" },
  { id: "gn-ie", name: "Google News", url: "https://news.google.com/rss/search?q=site:indianexpress.com+explained+when:2d&hl=en-IN&gl=IN&ceid=IN:en", quality: 6, defaultCategory: "national" },
  { id: "gn-livelaw", name: "Google News", url: "https://news.google.com/rss/search?q=site:livelaw.in+when:2d&hl=en-IN&gl=IN&ceid=IN:en", quality: 6, defaultCategory: "legal" },
  { id: "gn-un", name: "Google News", url: "https://news.google.com/rss/search?q=%22United+Nations%22+OR+WTO+OR+ICJ+when:2d&hl=en-IN&gl=IN&ceid=IN:en", quality: 6, defaultCategory: "international" },
  // Search-based aggregation (6): used as a safety net; publisher is parsed from the item title
  { id: "gn-sc", name: "Google News", url: "https://news.google.com/rss/search?q=%22Supreme+Court%22+India+judgment+when:2d&hl=en-IN&gl=IN&ceid=IN:en", quality: 6, defaultCategory: "legal" },
  { id: "gn-app", name: "Google News", url: "https://news.google.com/rss/search?q=appointed+OR+%22takes+charge%22+India+when:2d&hl=en-IN&gl=IN&ceid=IN:en", quality: 6, defaultCategory: "appointments" },
  { id: "gn-idx", name: "Google News", url: "https://news.google.com/rss/search?q=India+rank+index+report+when:3d&hl=en-IN&gl=IN&ceid=IN:en", quality: 6, defaultCategory: "reports" },
];

/** Quality overrides by publisher host/name when a feed aggregates several publishers (e.g. Google News). */
export const PUBLISHER_QUALITY: Record<string, number> = {
  "pib": 10, "press information bureau": 10, "reserve bank": 10, "united nations": 9, "un news": 9, "supreme court": 10, "sansad": 10, "rbi": 10, "the hindu": 8, "indian express": 8, "livelaw": 8, "bar & bench": 8,
  "hindustan times": 8, "the economic times": 8, "business standard": 8, "mint": 8, "reuters": 9, "bbc": 9, "the print": 7, "scroll": 7, "ndtv": 7, "news18": 6,
};
