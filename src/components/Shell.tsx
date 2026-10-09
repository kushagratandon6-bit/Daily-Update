"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Menu, X, Search, Sun, Moon, Home, CalendarDays, ListChecks, Repeat, LayoutGrid, Flame } from "lucide-react";
import { CATEGORIES } from "@/lib/categories";
import { useData } from "@/lib/client-data";
import { computeStreak, useStore } from "@/lib/store";
import { fmtDateTime } from "@/lib/dates";

const PRIMARY = [
  { href: "/", label: "Dashboard" },
  { href: "/today/", label: "Today’s Affairs" },
];
const STUDY = [
  { href: "/quiz/", label: "Quizzes & Mock Tests" },
  { href: "/revision/", label: "My Revision" },
  { href: "/flashcards/", label: "Flashcards" },
  { href: "/one-liners/", label: "One-Liners" },
  { href: "/rapid/", label: "30-Minute Revision" },
  { href: "/last/6/", label: "Last 6 Months" },
  { href: "/last/12/", label: "Last 12 Months" },
  { href: "/timeline/", label: "Timeline" },
  { href: "/capsules/", label: "Monthly Capsules" },
  { href: "/archive/", label: "Date Archive" },
  { href: "/progress/", label: "My Preparation" },
  { href: "/search/", label: "Search" },
];

function useTheme() {
  const [dark, setDark] = useState(false);
  useEffect(() => { setDark(document.documentElement.classList.contains("dark")); }, []);
  const toggle = () => {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    try { localStorage.setItem("lawca:theme", next ? "dark" : "light"); } catch {}
    setDark(next);
  };
  return { dark, toggle };
}

function NavLink({ href, label, active, onClick }: { href: string; label: string; active: boolean; onClick?: () => void }) {
  return (
    <Link href={href} onClick={onClick} aria-current={active ? "page" : undefined}
      className={`block rounded-lg px-3 py-2 text-sm transition ${active ? "bg-brand-50 font-semibold text-brand-700 dark:bg-brand-900/40 dark:text-brand-200" : "text-ink-700 hover:bg-ink-100 dark:text-ink-200 dark:hover:bg-ink-800"}`}>
      {label}
    </Link>
  );
}

function NavTree({ pathname, onNav }: { pathname: string; onNav?: () => void }) {
  const is = (h: string) => (h === "/" ? pathname === "/" : pathname.startsWith(h.replace(/\/$/, "")));
  return (
    <nav className="space-y-5" aria-label="Main">
      <div>{PRIMARY.map((l) => <NavLink key={l.href} {...l} active={is(l.href)} onClick={onNav} />)}</div>
      <div><p className="eyebrow px-3 pb-1">Topics</p>
        {CATEGORIES.filter((c) => c.nav).map((c) => <NavLink key={c.id} href={`/category/${c.slug}/`} label={`${c.emoji}  ${c.label}`} active={pathname.startsWith(`/category/${c.slug}`)} onClick={onNav} />)}
      </div>
      <div><p className="eyebrow px-3 pb-1">Study</p>{STUDY.map((l) => <NavLink key={l.href} {...l} active={is(l.href)} onClick={onNav} />)}</div>
    </nav>
  );
}

export default function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/";
  const router = useRouter();
  const { data } = useData();
  const store = useStore();
  const { dark, toggle } = useTheme();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const streak = computeStreak(store.activity);
  useEffect(() => { setOpen(false); }, [pathname]);

  const submit = (e: React.FormEvent) => { e.preventDefault(); const s = q.trim(); if (s) router.push(`/search/?q=${encodeURIComponent(s)}`); };

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-ink-200 bg-ink-50/90 backdrop-blur dark:border-ink-800 dark:bg-ink-950/90">
        <div className="mx-auto flex max-w-[1400px] items-center gap-2 px-3 py-2.5 sm:px-5">
          <button className="btn btn-sm lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu"><Menu size={16} /></button>
          <Link href="/" className="mr-1 flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-sm font-black text-white">⚖</span>
            <span className="h-serif hidden text-lg font-bold sm:block">LawCA</span>
          </Link>
          <form onSubmit={submit} role="search" className="relative mx-auto w-full max-w-xl">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" />
            <input value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search current affairs" placeholder="Search judgments, laws, people, reports…" className="input pl-9" />
          </form>
          <Link href="/progress/" className="btn btn-sm hidden sm:inline-flex" title="Daily streak"><Flame size={15} className={streak ? "text-orange-500" : ""} />{streak}d</Link>
          <button className="btn btn-sm" onClick={toggle} aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}>{dark ? <Sun size={16} /> : <Moon size={16} />}</button>
        </div>
        {data?.meta.mode === "demo" && (
          <div className="border-t border-amber-300 bg-amber-50 px-4 py-1.5 text-center text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
            <b>DEMO DATA</b> — format samples, not real news. Run the live pipeline (see README) to replace these with sourced current affairs.
          </div>
        )}
        {data && data.meta.failed_sources.length > 0 && (
          <div className="border-t border-ink-200 bg-ink-100 px-4 py-1 text-center text-[11px] text-ink-700 dark:border-ink-800 dark:bg-ink-900 dark:text-ink-200">
            Source temporarily unavailable: {data.meta.failed_sources.join(", ")} — showing everything else.
          </div>
        )}
      </header>

      <div className="mx-auto flex max-w-[1400px]">
        <aside className="sticky top-[57px] hidden h-[calc(100vh-57px)] w-64 shrink-0 overflow-y-auto px-3 py-5 lg:block"><NavTree pathname={pathname} /></aside>
        <main className="min-w-0 flex-1 px-3 pb-28 pt-5 sm:px-5 lg:pb-12">
          {children}
          <footer className="mt-12 border-t border-ink-200 pt-4 text-xs text-ink-500 dark:border-ink-800 dark:text-ink-300">
            {data ? <>Last updated: {fmtDateTime(data.meta.last_fetch_at || data.meta.generated_at)} · {data.meta.article_count} stories · {data.meta.mode === "live" ? "Live data" : "Demo data"}</> : "Loading…"}
            <span className="block pt-1">Summaries are exam-prep aids. Always verify facts with the linked original source.</span>
          </footer>
        </main>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-[82%] max-w-xs overflow-y-auto bg-ink-50 p-4 dark:bg-ink-950">
            <div className="mb-3 flex items-center justify-between"><span className="h-serif text-lg font-bold">LawCA</span><button className="btn btn-sm" onClick={() => setOpen(false)} aria-label="Close menu"><X size={16} /></button></div>
            <NavTree pathname={pathname} onNav={() => setOpen(false)} />
          </div>
        </div>
      )}

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-ink-200 bg-ink-50/95 pb-[env(safe-area-inset-bottom)] backdrop-blur dark:border-ink-800 dark:bg-ink-950/95 lg:hidden" aria-label="Quick">
        {[
          { href: "/", icon: Home, label: "Home" }, { href: "/today/", icon: CalendarDays, label: "Today" },
          { href: "/quiz/", icon: ListChecks, label: "Quiz" }, { href: "/revision/", icon: Repeat, label: "Revise" },
        ].map(({ href, icon: I, label }) => {
          const on = href === "/" ? pathname === "/" : pathname.startsWith(href.replace(/\/$/, ""));
          return <Link key={href} href={href} className={`flex flex-col items-center gap-0.5 py-2 text-[10px] ${on ? "font-bold text-brand-600 dark:text-brand-400" : "text-ink-500 dark:text-ink-300"}`}><I size={19} />{label}</Link>;
        })}
        <button onClick={() => setOpen(true)} className="flex flex-col items-center gap-0.5 py-2 text-[10px] text-ink-500 dark:text-ink-300"><LayoutGrid size={19} />More</button>
      </nav>
    </div>
  );
}
