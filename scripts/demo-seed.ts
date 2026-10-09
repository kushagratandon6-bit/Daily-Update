/**
 * DEMO DATA — clearly synthetic.
 * These are NOT news items. They are format samples so the UI can be explored before the live pipeline has run.
 * Every record is flagged is_demo=true and the UI shows a "DEMO DATA" banner + badge. Key facts below are
 * stable, well-known static facts (not claims about recent events).
 */
import type { Article, CategoryId, Question } from "../src/lib/types";
import { addDays, istDate } from "../src/lib/dates";
import { priorityScore } from "../src/lib/priority";

type Seed = {
  cat: CategoryId; title: string; blurb: string; ago: number; rel: number; legal: number; nat: number; mcq: number;
  facts: string[]; stat?: string[]; legalL?: string[]; tags: string[]; details?: Record<string, string>; angles?: string[];
};

const S: Seed[] = [
  { cat: "legal", title: "Sample: Constitution Bench judgment on Article 21", ago: 0, rel: 10, legal: 10, nat: 9, mcq: 9, tags: ["Supreme Court", "Article 21", "Constitution Bench"],
    blurb: "Illustrates how a landmark Supreme Court judgment is presented: bench strength, article involved, doctrine and previous cases.",
    facts: ["Article 21: no deprivation of life or personal liberty except by procedure established by law", "Maneka Gandhi (1978): procedure must be fair, just and reasonable", "Puttaswamy (2017): privacy is a fundamental right (9-judge bench)", "Article 32 lets a person move the Supreme Court directly for Fundamental Rights"],
    legalL: ["article-21", "article-32", "judicial-review"], stat: ["supreme-court"], angles: ["Which Article was interpreted?", "Size of the bench and who wrote the judgment", "Which earlier precedent was relied on or overruled?", "Which doctrine (basic structure / proportionality) applies?"] },
  { cat: "legal", title: "Sample: High Court ruling on the Digital Personal Data Protection Act", ago: 1, rel: 8, legal: 9, nat: 7, mcq: 8, tags: ["High Court", "DPDP Act", "Data protection"],
    blurb: "Shows the card layout for a High Court development linked to a statute — with the Act, authority and static background.",
    facts: ["DPDP Act enacted in 2023 (assent 11 August 2023)", "It establishes the Data Protection Board of India", "Right to privacy recognised in Puttaswamy (2017)"], legalL: ["article-21"], stat: ["dpdp"] },
  { cat: "legal", title: "Sample: Bill introduced in Parliament to amend a criminal law", ago: 2, rel: 8, legal: 9, nat: 8, mcq: 7, tags: ["Parliament", "Bill", "Criminal law"],
    blurb: "Template for a legislative development: Bill vs Act, House of introduction and stages of passage.",
    facts: ["BNS, BNSS and BSA replaced IPC, CrPC and Evidence Act", "All three in force from 1 July 2024", "A Bill becomes an Act after passage by both Houses and Presidential assent"], stat: ["bns", "parliament"] },
  { cat: "legal", title: "Sample: Collegium recommends elevation of High Court judges", ago: 3, rel: 7, legal: 9, nat: 6, mcq: 7, tags: ["Collegium", "Judicial appointments"],
    blurb: "Shows how a judicial-appointments story links to the Three Judges Cases and the NJAC verdict.",
    facts: ["Collegium for the SC: CJI + 4 senior-most judges", "Evolved via Three Judges Cases (1981, 1993, 1998)", "NJAC Act struck down in 2015"], legalL: ["collegium"], stat: ["supreme-court"] },
  { cat: "polity", title: "Sample: Election Commission announces schedule of State elections", ago: 0, rel: 8, legal: 6, nat: 9, mcq: 7, tags: ["Election Commission", "Elections"],
    blurb: "Template for an election-schedule card: constitutional basis, who conducts it and the model code.",
    facts: ["Election Commission is a constitutional body under Article 324", "CEC & ECs appointment: Act of 2023 — selection committee of PM, LoP and a Union Cabinet Minister"], stat: ["election-commission"] },
  { cat: "polity", title: "Sample: Cabinet approves a centrally sponsored scheme", ago: 1, rel: 7, legal: 3, nat: 8, mcq: 7, tags: ["Cabinet", "Scheme"],
    blurb: "Template for a Cabinet decision: ministry, outlay, objective and beneficiaries.",
    facts: ["Cabinet decisions are announced via PIB", "Centrally Sponsored Schemes are funded jointly by Centre and States"], stat: ["parliament"] },
  { cat: "schemes", title: "Sample: Scheme card — Name, Ministry, Objective, Beneficiaries", ago: 2, rel: 7, legal: 2, nat: 8, mcq: 8, tags: ["Scheme", "Welfare"],
    blurb: "Structured scheme profile as per spec: name, ministry, launch date, objective, beneficiaries, outlay.",
    facts: ["Scheme profiles use fields from the official notification", "Outlay figures must always match the source"], details: { "Name": "(from source)", "Ministry": "(from source)", "Launch date": "(from source)", "Objective": "(from source)", "Beneficiaries": "(from source)", "Budget": "(from source)" }, stat: ["niti"] },
  { cat: "national", title: "Sample: Major infrastructure project inaugurated", ago: 1, rel: 6, legal: 1, nat: 8, mcq: 6, tags: ["Infrastructure"],
    blurb: "Template for national-affairs infrastructure news: location, length/capacity and agency.", facts: ["Always note the project's location and implementing agency"], stat: [] },
  { cat: "international", title: "Sample: India signs an agreement with an ASEAN member", ago: 0, rel: 9, legal: 4, nat: 8, mcq: 9, tags: ["ASEAN", "India–ASEAN", "Bilateral"],
    blurb: "Shows the 'What happened → countries involved → why important → India connection → possible question' layout, with automatic ASEAN static-GK.",
    facts: ["ASEAN HQ: Jakarta", "ASEAN founded 8 August 1967", "India's Act East Policy anchors ties with ASEAN"], stat: ["asean"], angles: ["Where is the HQ of the grouping?", "Founding year and members", "India's policy framework (Act East)"] },
  { cat: "international", title: "Sample: BRICS / SCO / G20 ministerial meeting held", ago: 2, rel: 8, legal: 3, nat: 7, mcq: 8, tags: ["BRICS", "SCO", "G20"],
    blurb: "Template for multilateral-meeting coverage with static group facts.", facts: ["SCO Secretariat is in Beijing; India became a full member in 2017", "G20: India held the 2023 presidency"], stat: ["brics", "sco", "g20"] },
  { cat: "international", title: "Sample: ICJ delivers an advisory opinion", ago: 4, rel: 8, legal: 9, nat: 6, mcq: 8, tags: ["ICJ", "International law"],
    blurb: "Template for international-law developments, tying to ICJ facts.", facts: ["ICJ seat: The Hague", "15 judges elected for 9 years", "Only States can be parties in contentious cases"], stat: ["icj", "icc"] },
  { cat: "economy", title: "Sample: RBI Monetary Policy Committee announces policy rate decision", ago: 1, rel: 9, legal: 3, nat: 9, mcq: 9, tags: ["RBI", "Repo rate", "MPC"],
    blurb: "Shows how a repo-rate story is turned into exam facts: who decides, target band and terminology.",
    facts: ["MPC has 6 members (3 RBI + 3 external)", "Inflation target: 4% ±2% (CPI)", "Repo rate = rate at which RBI lends short-term to banks"], stat: ["rbi"], angles: ["Number of MPC members", "Inflation target band", "Repo vs reverse repo"] },
  { cat: "economy", title: "Sample: SEBI issues new regulations for markets", ago: 3, rel: 6, legal: 6, nat: 6, mcq: 6, tags: ["SEBI", "Regulation"],
    blurb: "Template for regulator announcements.", facts: ["SEBI established 1988; statutory since 1992"], stat: ["sebi"] },
  { cat: "scitech", title: "Sample: ISRO launch milestone", ago: 2, rel: 8, legal: 1, nat: 8, mcq: 8, tags: ["ISRO", "Space"],
    blurb: "Template for space news with ISRO static facts.", facts: ["ISRO established 1969, HQ Bengaluru", "Chandrayaan-3 landed on 23 August 2023"], stat: ["isro"] },
  { cat: "scitech", title: "Sample: A new AI governance framework is announced", ago: 5, rel: 6, legal: 5, nat: 6, mcq: 6, tags: ["AI", "Policy"],
    blurb: "Template for technology-policy news.", facts: ["Technology laws often tie back to privacy and Article 21"], stat: ["dpdp"] },
  { cat: "environment", title: "Sample: New Ramsar site designated in India", ago: 1, rel: 8, legal: 4, nat: 7, mcq: 9, tags: ["Ramsar", "Wetlands"],
    blurb: "Shows the Ramsar static-GK connection: adoption year, secretariat and World Wetlands Day.",
    facts: ["Ramsar Convention adopted 2 February 1971 in Ramsar, Iran", "World Wetlands Day: 2 February", "Secretariat: Gland, Switzerland"], stat: ["ramsar"] },
  { cat: "environment", title: "Sample: COP climate negotiations update", ago: 6, rel: 7, legal: 4, nat: 6, mcq: 7, tags: ["COP", "UNFCCC", "Climate"],
    blurb: "Template for climate-summit coverage.", facts: ["Paris Agreement adopted at COP21 (2015)", "UNFCCC secretariat: Bonn"], stat: ["unfccc"] },
  { cat: "defence", title: "Sample: Joint military exercise concludes", ago: 3, rel: 5, legal: 1, nat: 6, mcq: 6, tags: ["Exercise", "Defence"],
    blurb: "Template for exercise news: participating countries, location and name.", facts: ["Always record the exercise name, host and participants"], stat: [] },
  { cat: "awards", title: "Sample: Nobel Prize announcement card", ago: 0, rel: 9, legal: 1, nat: 7, mcq: 9, tags: ["Nobel", "Awards"],
    blurb: "Winner → award → field → nationality → achievement layout.", facts: ["First Nobel Prizes: 1901", "Peace Prize is presented in Oslo"], stat: ["nobel"],
    details: { "Winner": "(from source)", "Award": "(from source)", "Field": "(from source)", "Nationality": "(from source)", "Achievement": "(from source)" } },
  { cat: "appointments", title: "Sample: New head of a constitutional body appointed", ago: 1, rel: 8, legal: 7, nat: 8, mcq: 9, tags: ["Appointment"],
    blurb: "Template for appointment news: person, post, predecessor, appointing authority.", facts: ["Check the appointing authority and constitutional article"], stat: ["constitution-bodies"],
    details: { "Name": "(from source)", "Position": "(from source)", "Predecessor": "(from source)", "Appointed by": "(from source)" } },
  { cat: "sports", title: "Sample: Tournament result card — winner, runner-up, venue", ago: 2, rel: 5, legal: 0, nat: 6, mcq: 7, tags: ["Sports"],
    blurb: "Template for sports results.", facts: ["Record: winner, runner-up, venue, year"], stat: [] },
  { cat: "reports", title: "Sample: Global index released — India's rank", ago: 1, rel: 9, legal: 2, nat: 8, mcq: 10, tags: ["Index", "Ranking"],
    blurb: "Report card: report name, organisation, India's rank, top and bottom country, key findings, year.",
    facts: ["Always record: publisher, edition year, India's rank, rank #1"], stat: ["niti"],
    details: { "Report": "(from source)", "Organisation": "(from source)", "India's rank": "(from source)", "Top-ranked": "(from source)", "Year": "(from source)" } },
  { cat: "days", title: "Sample: International day observed — theme and organiser", ago: 0, rel: 6, legal: 0, nat: 5, mcq: 8, tags: ["Important Days"],
    blurb: "Template for important days.", facts: ["World Wetlands Day: 2 February", "World Health Day: 7 April"], stat: ["who", "ramsar"] },
  { cat: "persons", title: "Sample: Person in news card — position, organisation, previous post", ago: 1, rel: 7, legal: 2, nat: 7, mcq: 8, tags: ["Person in news"],
    blurb: "Person card layout.", facts: ["Record position, organisation, previous position"], stat: [],
    details: { "Name": "(from source)", "Position": "(from source)", "Organisation": "(from source)", "Previous position": "(from source)" } },
  { cat: "places", title: "Sample: Place in news — why it matters", ago: 2, rel: 7, legal: 0, nat: 6, mcq: 8, tags: ["Places in news"],
    blurb: "Place card layout.", facts: ["Record country, geography (river/mountain/park) and reason in the news"], stat: [] },
  { cat: "books", title: "Sample: Book & author card", ago: 4, rel: 5, legal: 0, nat: 4, mcq: 7, tags: ["Books"],
    blurb: "Book card layout.", facts: ["Record title, author, publisher/award"], stat: [] },
  { cat: "obituaries", title: "Sample: Obituary card — profession, contribution, awards", ago: 5, rel: 5, legal: 0, nat: 5, mcq: 6, tags: ["Obituary"],
    blurb: "Obituary layout.", facts: ["Record profession, contribution, awards, country"], stat: [] },
];

export function buildDemo(nowISO = new Date().toISOString()): { articles: Article[]; questions: Question[] } {
  const today = istDate(nowISO);
  const articles: Article[] = S.map((s, i) => {
    const day = addDays(today, -s.ago);
    const published = `${day}T${String((i % 9) + 7).padStart(2, "0")}:30:00+05:30`;
    const exam = { nlsat: clamp(s.rel + (s.legal > 6 ? 0 : -1)), aiat: clamp(s.rel + (s.legal > 6 ? 0 : -2)), ssc: clamp(s.rel + (s.cat === "legal" ? -1 : 0)) };
    const base: Omit<Article, "priority_score"> = {
      id: `demo-${String(i + 1).padStart(3, "0")}`,
      title: s.title,
      summary: s.blurb,
      content: [
        "DEMO DATA — this is a format sample, not a news report. In live mode this section is a faithful, source-grounded account of what happened.",
        "The card below the summary shows how Why-This-Matters, Exam-Ready facts, static/legal connections, examiner angles and MCQs are laid out for every story.",
      ],
      whyMatters: `A real story of this type is tested through names, numbers, institutions and legal provisions. The facts below are stable static facts a student should know for this topic.`,
      keyFacts: s.facts,
      background: [],
      examinerAngles: s.angles ?? ["Which institution / provision / person is involved?", "What is the static-GK link?", "Which number, date or place can be asked?"],
      category: s.cat, tags: s.tags,
      published_at: published, created_at: nowISO,
      sources: [{ name: "Demo Data", url: "#", quality: 5 }], source_quality: 5,
      relevance_score: s.rel, exam, legal_relevance: s.legal, national_importance: s.nat, mcq_value: s.mcq,
      staticLinks: s.stat ?? [], legalLinks: s.legalL ?? [],
      details: s.details, verified: false, ai_generated: false, is_demo: true,
    };
    return { ...base, priority_score: priorityScore(base, today) };
  });
  const questions: Question[] = [];
  return { articles, questions };
}
const clamp = (n: number) => Math.max(1, Math.min(10, n));
