"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut } from "lucide-react";

/**
 * Ends the session on the server (Better Auth deletes it from the
 * database and clears the cookie), then goes to /login and refreshes the
 * router so no admin page is served from the client cache.
 */
export function SignOutButton({ email }: { email: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function signOut() {
    setPending(true);
    try {
      await fetch("/api/auth/sign-out", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
        credentials: "same-origin",
      });
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }

  return (
    <button
      type="button"
      onClick={signOut}
      disabled={pending}
      title={`Signed in as ${email}`}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-60"
    >
      <LogOut className="h-4 w-4" aria-hidden />
      <span className="hidden sm:inline">{pending ? "Signing out…" : "Sign out"}</span>
      <span className="sr-only sm:hidden">Sign out</span>
    </button>
  );
}
