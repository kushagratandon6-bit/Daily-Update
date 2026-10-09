import { Suspense } from "react";
import Quiz from "@/components/Quiz";
export const metadata = { title: "Quizzes & Mock Tests" };
export default function QuizPage() { return <Suspense fallback={null}><Quiz /></Suspense>; }
