import type { Metadata, Viewport } from "next";
import "./globals.css";
import Shell from "@/components/Shell";

export const metadata: Metadata = {
  title: { default: "LawCA — Current Affairs Intelligence for Law Exams", template: "%s · LawCA" },
  description: "Exam-first daily current affairs for NLSAT, AIAT and SSC-level law entrance exams: scored stories, MCQs, spaced revision and monthly capsules.",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: [{ media: "(prefers-color-scheme: light)", color: "#f7f7f5" }, { media: "(prefers-color-scheme: dark)", color: "#0e0e0b" }] };

// Runs before paint so there is no light→dark flash. Preference persisted in localStorage("lawca:theme").
const themeScript = `try{var t=localStorage.getItem('lawca:theme');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.classList.toggle('dark',d)}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head>
      <body><Shell>{children}</Shell></body>
    </html>
  );
}
