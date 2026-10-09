import Link from "next/link";
export default function NotFound() { return <div className="card card-pad mx-auto max-w-md text-center"><h1 className="h-serif text-2xl font-bold">Page not found</h1><p className="mt-2 text-sm">That story or date isn’t in the current dataset.</p><Link href="/" className="btn btn-primary mt-4">Back to dashboard</Link></div>; }
