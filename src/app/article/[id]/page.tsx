import ArticleView from "@/components/ArticleView";
import { articleIds } from "@/lib/static-params";

export const dynamicParams = false;
export function generateStaticParams() { const ids = articleIds(); return (ids.length ? ids : ["none"]).map((id) => ({ id })); }
export default async function ArticlePage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <ArticleView id={id} />; }
