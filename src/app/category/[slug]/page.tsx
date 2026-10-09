import { notFound } from "next/navigation";
import Browse from "@/components/Browse";
import { CATEGORIES, CAT_BY_SLUG } from "@/lib/categories";

export const dynamicParams = false;
export function generateStaticParams() { return CATEGORIES.map((c) => ({ slug: c.slug })); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) { const { slug } = await params; return { title: CAT_BY_SLUG[slug]?.label ?? "Category" }; }

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = CAT_BY_SLUG[slug]; if (!c) notFound();
  return (
    <div className="space-y-4">
      <div><p className="eyebrow">Topic</p><h1 className="h-serif text-3xl font-bold">{c.emoji} {c.label}</h1></div>
      <Browse lockCats={[c.id]} showSearch />
    </div>
  );
}
