import { httpLoader } from "./pipeline/fetch";
import { SOURCES } from "./pipeline/sources";
(async () => {
  const rows = await Promise.all(SOURCES.map(async (s) => { try { const f = await httpLoader(s.url); return `✓ ${s.id.padEnd(12)} ${String(f.items.length).padStart(3)} items  ${s.url}`; } catch (e) { return `✗ ${s.id.padEnd(12)} ${(e as Error).message.slice(0, 60)}  ${s.url}`; } }));
  console.log(rows.join("\n"));
})();
