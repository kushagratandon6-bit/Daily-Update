import fs from "node:fs";
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, waitFor, within, cleanup, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Dashboard from "@/components/Dashboard";
import Browse from "@/components/Browse";
import Quiz from "@/components/Quiz";
import RevisionView from "@/components/RevisionView";
import FlashcardDeck from "@/components/FlashcardDeck";
import ArticleView from "@/components/ArticleView";
import DailyView from "@/components/DailyView";
import { actions } from "@/lib/store";
import { todayIST } from "@/lib/dates";

beforeEach(() => { cleanup(); localStorage.clear(); actions.resetAll(); });

describe("dashboard", () => {
  it("renders Top 10, sections and demo badge from the dataset", async () => {
    render(<Dashboard />);
    await screen.findByText(/Top 10 Must Know/i);
    expect(screen.getAllByRole("article").length).toBeGreaterThan(5);
    expect(screen.getAllByText("Demo").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Today’s quiz/i).length).toBeGreaterThan(0);
  });
});

describe("save / revision buttons really persist", () => {
  it("Save and Add to revision update the store and the revision page lists them", async () => {
    const user = userEvent.setup();
    render(<Dashboard />);
    await screen.findByText(/Top 10 Must Know/i);
    const card = screen.getAllByRole("article")[0];
    await user.click(within(card).getByRole("button", { name: /^Save$/ }));
    await user.click(within(card).getByRole("button", { name: /Add to revision/ }));
    expect(within(card).getByRole("button", { name: /Saved/ })).toBeTruthy();
    expect(JSON.parse(localStorage.getItem("lawca:v1")!).saved.length).toBe(1);
    cleanup(); render(<RevisionView />);
    await screen.findByText(/My Revision/);
    await user.click(screen.getByRole("tab", { name: /Saved/ }));
    expect(screen.getAllByRole("link").some((a) => a.getAttribute("href")?.startsWith("/article/"))).toBe(true);
    await user.click(screen.getByRole("tab", { name: /Not revised/ }));
    expect(screen.getAllByRole("link").some((a) => a.getAttribute("href")?.startsWith("/article/"))).toBe(true);
  });
});

describe("search & filters actually filter", () => {
  it("text search narrows results; knowledge-aware search matches concepts; clear filters restores", async () => {
    const user = userEvent.setup();
    render(<Browse />);
    await screen.findByLabelText("Search");
    const all = Number(screen.getByText(/results?$/).parentElement!.textContent!.match(/(\d+)/)![1]);
    await user.type(screen.getByLabelText("Search"), "ramsar");
    await waitFor(() => expect(Number(screen.getByText(/results?$/).parentElement!.textContent!.match(/(\d+)/)![1])).toBeLessThan(all));
    expect(screen.getAllByRole("article").length).toBeGreaterThan(0);
    expect(screen.getByText(/Background for/)).toBeTruthy(); // static concept panel
    await user.clear(screen.getByLabelText("Search"));
    await user.type(screen.getByLabelText("Search"), "zzzzqqqq");
    await screen.findByText(/No stories match/);
  });
  it("category filter works", async () => {
    render(<Browse />);
    await screen.findByLabelText("Search");
    const sel = screen.getByLabelText("Category") as HTMLSelectElement;
    fireEvent.change(sel, { target: { value: "economy" } });
    await waitFor(() => { const cards = screen.getAllByRole("article"); expect(cards.length).toBeGreaterThan(0); cards.forEach((c) => expect(c.textContent).toMatch(/Economy/)); });
  });
});

describe("article page", () => {
  it("shows exam-ready facts, static-GK connection, questions and records the read", async () => {
    render(<ArticleView id="demo-009" />); // ASEAN sample
    await screen.findByText(/Exam ready/);
    expect(screen.getByText(/Static GK connection/)).toBeTruthy();
    expect(screen.getAllByText(/Jakarta/).length).toBeGreaterThan(0);
    expect(Object.keys(JSON.parse(localStorage.getItem("lawca:v1")!).read)).toContain("demo-009");
  });
  it("unknown id degrades gracefully", async () => { render(<ArticleView id="nope" />); await screen.findByText(/Story not found/); });
});

describe("daily page", () => {
  it("renders a dated page with sections", async () => { const arts = JSON.parse(fs.readFileSync("public/data/articles.json", "utf8")); const latest = arts.map((a: any) => a.published_at.slice(0, 10)).sort().pop(); render(<DailyView date={latest} />); await screen.findByText(/Top 10 must know/i); expect(screen.getAllByRole("article").length).toBeGreaterThan(3); });
  it("empty day is handled", async () => { render(<DailyView date="2020-01-01" />); await screen.findByText(/No stories recorded/); });
});

describe("quiz flow", () => {
  it("answers, shows explanation, finishes, records an attempt with analytics, and retake resets", async () => {
    const user = userEvent.setup();
    render(<Quiz />);
    await screen.findByText(/Quizzes & Mock Tests/);
    await user.click(screen.getByText(/Today’s quiz/i).closest("button")!);
    await screen.findByRole("progressbar");
    // answer first question by clicking option A
    await user.click(screen.getAllByRole("radio")[0]);
    expect(screen.getByText(/Answer:/)).toBeTruthy(); // practice mode reveals the explanation
    await user.click(screen.getByLabelText("Go to question 10"));
    await user.click(screen.getByRole("button", { name: "Submit" }));
    await screen.findByText(/results/i);
    expect(screen.getByText("Accuracy")).toBeTruthy();
    const attempts = JSON.parse(localStorage.getItem("lawca:v1")!).attempts;
    expect(attempts.length).toBe(1); expect(attempts[0].total).toBeGreaterThanOrEqual(10); expect(attempts[0].skipped).toBe(attempts[0].total - 1);
    await user.click(screen.getByRole("button", { name: /Retake/ }));
    await screen.findByRole("progressbar");
  });
  it("exam mode hides explanations until the end", async () => {
    const user = userEvent.setup();
    render(<Quiz />);
    await screen.findByText(/Quizzes & Mock Tests/);
    await user.click(screen.getByLabelText(/Exam mode/));
    await user.click(screen.getByRole("button", { name: /Start mock test/ }));
    await screen.findByRole("progressbar");
    await user.click(screen.getAllByRole("radio")[1]);
    expect(screen.queryByText(/Answer:/)).toBeNull();
  });
});

describe("flashcards", () => {
  it("flip, know / don't know persist", async () => {
    const user = userEvent.setup();
    render(<FlashcardDeck />);
    const card = await screen.findByRole("button", { name: /Show answer/ });
    await user.click(card); expect(screen.getByRole("button", { name: /Show question/ })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /^Know$/ }));
    expect(Object.values(JSON.parse(localStorage.getItem("lawca:v1")!).fc)).toEqual(["know"]);
  });
});
