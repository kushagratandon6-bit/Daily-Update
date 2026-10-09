const IST_OFFSET_MIN = 330;

/** YYYY-MM-DD in IST for a given instant. */
export function istDate(d: Date | string | number = new Date()): string {
  const t = new Date(d).getTime() + IST_OFFSET_MIN * 60_000;
  return new Date(t).toISOString().slice(0, 10);
}
export const todayIST = () => istDate(new Date());

export function addDays(ymd: string, n: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const t = Date.UTC(y, m - 1, d) + n * 86_400_000;
  return new Date(t).toISOString().slice(0, 10);
}
export function diffDays(a: string, b: string): number {
  const p = (s: string) => { const [y, m, d] = s.split("-").map(Number); return Date.UTC(y, m - 1, d); };
  return Math.round((p(a) - p(b)) / 86_400_000);
}
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
export const monthName = (m: number) => MONTHS[m - 1];
export function fmtLong(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return `${String(d).padStart(2, "0")} ${MONTHS[m - 1]} ${y}`;
}
export function fmtShort(iso: string): string {
  const ymd = istDate(iso);
  const [y, m, d] = ymd.split("-").map(Number);
  return `${String(d).padStart(2, "0")} ${MONTHS[m - 1].slice(0, 3)} ${y}`;
}
export function fmtDateTime(iso: string): string {
  const t = new Date(new Date(iso).getTime() + IST_OFFSET_MIN * 60_000);
  let h = t.getUTCHours(); const mm = String(t.getUTCMinutes()).padStart(2, "0");
  const ap = h >= 12 ? "PM" : "AM"; h = h % 12 || 12;
  return `${fmtShort(iso)}, ${h}:${mm} ${ap} IST`;
}
export const monthKey = (ymd: string) => ymd.slice(0, 7);
