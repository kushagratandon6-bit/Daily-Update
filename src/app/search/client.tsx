"use client";
import { useSearchParams } from "next/navigation";
import Browse from "@/components/Browse";
export default function SearchClient() {
  const q = useSearchParams().get("q") || "";
  return (<div className="space-y-4"><div><p className="eyebrow">Global search</p><h1 className="h-serif text-3xl font-bold">Search</h1></div><Browse initialQ={q} /></div>);
}
