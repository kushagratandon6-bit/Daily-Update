"use client";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function TrendChart({ data }: { data: { n: number; pct: number }[] }) {
  return (
    <div className="h-48 w-full" role="img" aria-label="Quiz score trend">
      <ResponsiveContainer><LineChart data={data} margin={{ left: -20, right: 8, top: 8 }}><CartesianGrid strokeDasharray="3 3" opacity={0.3} /><XAxis dataKey="n" fontSize={11} /><YAxis domain={[0, 100]} fontSize={11} /><Tooltip formatter={(v) => [`${v}%`, "Score"]} labelFormatter={(l) => `Attempt ${l}`} /><Line type="monotone" dataKey="pct" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 3 }} /></LineChart></ResponsiveContainer>
    </div>
  );
}
export function CategoryChart({ data }: { data: { name: string; acc: number }[] }) {
  return (
    <div className="h-56 w-full" role="img" aria-label="Accuracy by topic">
      <ResponsiveContainer><BarChart data={data} layout="vertical" margin={{ left: 10, right: 12 }}><CartesianGrid strokeDasharray="3 3" opacity={0.3} /><XAxis type="number" domain={[0, 100]} fontSize={11} /><YAxis type="category" dataKey="name" width={84} fontSize={11} /><Tooltip formatter={(v) => [`${v}%`, "Accuracy"]} /><Bar dataKey="acc" fill="#c8962e" radius={[0, 6, 6, 0]} /></BarChart></ResponsiveContainer>
    </div>
  );
}
