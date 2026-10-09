import type { CategoryId } from "../../src/lib/types";

/** Rule-based classifier + exam-relevance heuristics. Deterministic, free, explainable — the LLM only refines. */
const RULES: { cat: CategoryId; w: number; re: RegExp }[] = [
  { cat: "legal", w: 3, re: /\b(supreme court|high court|constitution bench|apex court|judgment|verdict|collegium|chief justice|cji|pil|writ petition|tribunal|article \d+|fundamental right|bench|sc order|ordinance|amendment act|law commission|attorney general|solicitor general|ipc|bns|bnss|crpc|contempt)\b/i },
  { cat: "polity", w: 2, re: /\b(lok sabha|rajya sabha|parliament|election commission|speaker|bill passed|cabinet|governor|chief minister|assembly election|bypoll|delimitation|president of india|vice-president|anti-defection)\b/i },
  { cat: "schemes", w: 2, re: /\b(scheme|yojana|mission|abhiyan|launches?d? .*programme|outlay|beneficiar|pm-|pradhan mantri)\b/i },
  { cat: "economy", w: 2, re: /\b(rbi|repo rate|monetary policy|inflation|gdp|fiscal deficit|sebi|budget|upi|npci|ipo|forex|exports?|imports?|gst|banking|nbfc|stock market|sensex|nifty|fdi|trade deficit)\b/i },
  { cat: "scitech", w: 2, re: /\b(isro|chandrayaan|gaganyaan|satellite|ai model|artificial intelligence|quantum|semiconductor|nasa|esa|space mission|biotech|vaccine|drdo|launch vehicle|rocket|genome)\b/i },
  { cat: "environment", w: 2, re: /\b(climate|cop\d{2}|unfccc|biodiversity|wildlife|tiger reserve|national park|ramsar|wetland|emission|carbon|renewable|solar|pollution|forest|ipcc|sanctuary)\b/i },
  { cat: "defence", w: 2, re: /\b(army|navy|air force|missile|defence ministry|drdo|exercise|border|lac|loc|armed forces|fighter jet|submarine|brahmos|agni|chief of defence)\b/i },
  { cat: "awards", w: 3, re: /\b(nobel|bharat ratna|padma|booker|pulitzer|oscar|grammy|jnanpith|sahitya akademi|dadasaheb phalke|awarded|wins? award|conferred)\b/i },
  { cat: "appointments", w: 3, re: /\b(appointed|takes? charge|new chief|assumes? office|sworn in|named as|nominated as|new governor|new ceo|new chairman|new director)\b/i },
  { cat: "sports", w: 2, re: /\b(olympic|asian games|commonwealth games|world cup|grand slam|wimbledon|championship|medal|fifa|icc|bcci|hockey|badminton|tournament|final)\b/i },
  { cat: "reports", w: 3, re: /\b(index|ranking|ranks?|report released|survey|global .* report|human development|happiness report|corruption perceptions|innovation index|gender gap)\b/i },
  { cat: "international", w: 2, re: /\b(united nations|un general assembly|unsc|nato|g20|g7|brics|sco|quad|asean|saarc|imf|world bank|wto|who|icj|icc|summit|bilateral|foreign minister|mea|treaty|sanctions|ceasefire)\b/i },
  { cat: "obituaries", w: 3, re: /\b(passes away|dies at|dead at|demise|obituary|passed away)\b/i },
  { cat: "days", w: 3, re: /\b(international day|world .* day|national .* day|observed on|theme for)\b/i },
  { cat: "books", w: 3, re: /\b(new book|memoir|biography|authored|novel|book release|launches? book)\b/i },
];

export function classify(text: string, fallback: CategoryId = "national"): { category: CategoryId; confidence: number } {
  const score = new Map<CategoryId, number>();
  for (const r of RULES) { const m = text.match(new RegExp(r.re.source, "gi")); if (m) score.set(r.cat, (score.get(r.cat) || 0) + r.w * Math.min(m.length, 3)); }
  const best = [...score.entries()].sort((a, b) => b[1] - a[1])[0];
  if (!best) return { category: fallback, confidence: 0 };
  return { category: best[0], confidence: best[1] };
}

const NOISE = /\b(bollywood|box office|celebrity|actor|actress|web series|ott|trailer|gossip|horoscope|viral|reel|instagram|cricket score|ipl auction|stock tips|murder case|accident|rape|robbery|fire breaks|weather today|petrol price|gold rate|match preview|dating|wedding)\b/i;
const BOOST: [RegExp, number][] = [
  [/\bconstitution bench|constitutional bench|landmark|historic\b/i, 2], [/\bsupreme court\b/i, 1.5], [/\bparliament|lok sabha|rajya sabha\b/i, 1],
  [/\bact,? \d{4}|bill,? \d{4}|amendment\b/i, 1.5], [/\b(rbi|repo rate|monetary policy)\b/i, 1.5], [/\b(appointed|takes charge|assumes office)\b/i, 1.5],
  [/\b(index|ranking|ranks?)\b.*\bindia\b|\bindia\b.*\b(index|ranking|rank)\b/i, 2], [/\bnobel|bharat ratna|padma\b/i, 2.5], [/\b(treaty|agreement|mou|summit)\b/i, 1],
  [/\bunited nations|g20|brics|quad|asean|nato|imf|world bank|wto\b/i, 1], [/\b(launch(es|ed)?|inaugurat\w+)\b.*\b(mission|scheme|yojana)\b/i, 1.5], [/\bnew (act|law|rules)\b/i, 1.5],
  [/\bramsar|tiger reserve|national park|unesco|world heritage\b/i, 1.5], [/\bisro|chandrayaan|gaganyaan\b/i, 1.5],
];
const BASE: Partial<Record<CategoryId, number>> = { legal: 6, polity: 5, schemes: 5, international: 5, economy: 5, awards: 6, appointments: 5.5, reports: 6, scitech: 4.5, environment: 5, defence: 4.5, national: 4, sports: 3.5, days: 4, books: 3.5, obituaries: 3.5, persons: 4, places: 4, other: 3 };

export function relevanceHeuristic(category: CategoryId, text: string, quality: number): number {
  let s = BASE[category] ?? 3;
  for (const [re, w] of BOOST) if (re.test(text)) s += w;
  if (NOISE.test(text)) s -= 3;
  if (quality >= 9) s += 0.5;
  return Math.max(1, Math.min(10, Math.round(s)));
}

export function legalRelevance(category: CategoryId, text: string): number {
  let s = category === "legal" ? 8 : 2;
  if (/\b(act|bill|ordinance|article \d+|constitution|supreme court|high court|tribunal|judg?ment|law)\b/i.test(text)) s += category === "legal" ? 2 : 3;
  return Math.min(10, s);
}
export function nationalImportance(category: CategoryId, text: string, quality: number): number {
  let s = { legal: 7, polity: 8, schemes: 7, national: 6, economy: 7, international: 6, defence: 6 }[category as string] ?? 4;
  if (/\bunion cabinet|prime minister|president of india|parliament|supreme court\b/i.test(text)) s += 1.5;
  if (quality >= 9) s += 1;
  return Math.min(10, Math.round(s));
}
export function examScores(rel: number, category: CategoryId, legal: number) {
  const clamp = (n: number) => Math.max(1, Math.min(10, Math.round(n)));
  // NLSAT: analytical/legal-issue oriented last 6–12 months; AIAT: socio-legal & contemporary topics (WAT); SLAT-style SSC law: people/places/sports/awards/economy/science
  const gk = ["awards", "appointments", "sports", "reports", "scitech", "environment", "days", "books", "places", "persons", "obituaries"].includes(category);
  return { nlsat: clamp(rel + (legal >= 7 ? 0.5 : 0) + (gk ? -0.5 : 0)), aiat: clamp(rel + (legal >= 7 || category === "polity" || category === "schemes" ? 0.5 : -1)), ssc: clamp(rel + (gk ? 0.5 : -0.5)) };
}
export function mcqValue(category: CategoryId, text: string): number {
  let s = ["appointments", "awards", "reports", "days", "places", "persons", "sports"].includes(category) ? 8 : 5;
  const nums = (text.match(/\b\d[\d,.]*\b/g) || []).length; s += Math.min(2, nums * 0.5);
  if (/\b[A-Z][a-z]+ [A-Z][a-z]+\b/.test(text)) s += 0.5;
  return Math.min(10, Math.round(s));
}
export function tagsFrom(text: string, category: CategoryId): string[] {
  const t = new Set<string>();
  const dict: [RegExp, string][] = [[/supreme court/i, "Supreme Court"], [/high court/i, "High Court"], [/constitution bench/i, "Constitution Bench"], [/parliament|lok sabha|rajya sabha/i, "Parliament"], [/\bRBI\b|reserve bank/i, "RBI"], [/\bSEBI\b/i, "SEBI"], [/election commission/i, "Election Commission"], [/\bISRO\b/i, "ISRO"], [/\bUN\b|united nations/i, "UN"], [/BRICS/i, "BRICS"], [/\bG20\b/i, "G20"], [/\bQuad\b/i, "QUAD"], [/ASEAN/i, "ASEAN"], [/\bWTO\b/i, "WTO"], [/\bIMF\b/i, "IMF"], [/world bank/i, "World Bank"], [/\bNATO\b/i, "NATO"], [/article \d+/i, "Constitution"], [/ramsar/i, "Ramsar"], [/nobel/i, "Nobel"], [/bharat ratna|padma/i, "National Awards"], [/data protection|dpdp/i, "Data Protection"], [/\bBNS\b|bharatiya nyaya/i, "Criminal Law"], [/\bUPI\b/i, "UPI"]];
  for (const [re, tag] of dict) if (re.test(text)) t.add(tag);
  return Array.from(t).slice(0, 5).concat(t.size ? [] : [category]);
}
