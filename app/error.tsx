"use client"; // Error boundaries must be Client Components

import Link from "next/link";

// Shown when a page of the storefront or admin fails unexpectedly. The
// error's details are never shown: errors from the server only carry a
// reference code (`digest`) that matches the server's log entry.
export default function ErrorPage({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-white px-4 text-center text-slate-900">
      <p className="text-sm font-semibold text-teal-700">Error</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">Something went wrong</h1>
      <p className="mt-3 max-w-md text-slate-600">
        This page couldn&apos;t be loaded. Please try again in a moment.
      </p>
      {error.digest && <p className="mt-2 text-xs text-slate-500">Reference: {error.digest}</p>}
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={() => retry()}
          className="rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-800"
        >
          Try again
        </button>
        <Link href="/" className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50">
          Go to the homepage
        </Link>
      </div>
    </main>
  );
}
