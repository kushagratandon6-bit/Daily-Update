import DailyView from "@/components/DailyView";
import { articleDays } from "@/lib/static-params";

export const dynamicParams = false;
export function generateStaticParams() { const d = articleDays(); return (d.length ? d : ["1970-01-01"]).map((date) => ({ date })); }
export default async function DailyPage({ params }: { params: Promise<{ date: string }> }) { const { date } = await params; return <DailyView date={date} />; }
