import { vi } from "vitest";
import fs from "node:fs";
import path from "node:path";

// Serve the built dataset (public/data/*.json) to client components, exactly like the static site does.
globalThis.fetch = (async (url: string) => {
  const m = String(url).match(/\/data\/([a-z]+)\.json/);
  if (!m) return new Response("nope", { status: 404 });
  try { return new Response(fs.readFileSync(path.join(process.cwd(), "public/data", `${m[1]}.json`), "utf8"), { status: 200 }); }
  catch { return new Response("{}", { status: 404 }); }
}) as any;

vi.mock("next/navigation", () => ({ usePathname: () => "/", useRouter: () => ({ push: vi.fn(), replace: vi.fn() }), useSearchParams: () => new URLSearchParams("") }));
vi.mock("next/link", () => ({ default: ({ href, children, ...r }: any) => { const React = require("react"); return React.createElement("a", { href, ...r }, children); } }));
// jsdom has no localStorage persistence issues but ensure a clean slate per test
(globalThis as any).confirm = () => true;
