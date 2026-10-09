import HighValue from "@/components/HighValue";
export const dynamicParams = false;
export function generateStaticParams() { return [{ months: "6" }, { months: "12" }]; }
export default async function Page({ params }: { params: Promise<{ months: string }> }) { const { months } = await params; return <HighValue months={months === "12" ? 12 : 6} />; }
