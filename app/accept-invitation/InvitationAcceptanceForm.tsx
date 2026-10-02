"use client";

import Link from "next/link";
import { useEffect, useState, useTransition, type FormEvent } from "react";
import { acceptStoreInvitationAction, prepareStoreInvitationAction } from "./actions";

type InvitationDetails = {
  email: string;
  role: "MANAGER" | "STAFF";
  storeName: string;
  nameRequired: boolean;
  passwordRequired: boolean;
};

export function InvitationAcceptanceForm() {
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    const token = fragment.get("token");
    window.history.replaceState(null, "", window.location.pathname);
    if (!token) {
      void Promise.resolve().then(() => {
        setError("This invitation is invalid, expired, or already used.");
        setReady(true);
      });
      return;
    }
    void prepareStoreInvitationAction(token).then((result) => {
      if (result.ok) setInvitation(result.data);
      else setError(result.error);
      setReady(true);
    }).catch(() => {
      setError("The invitation could not be checked. Please try again.");
      setReady(true);
    });
  }, []);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await acceptStoreInvitationAction(name, password);
      if (result.ok) {
        setPassword("");
        setAccepted(result.message ?? "Invitation accepted. Sign in to continue.");
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12 text-slate-900">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-xl font-semibold">Accept store invitation</h1>
        {!ready ? <p className="mt-3 text-sm text-slate-600">Checking invitation…</p> : null}
        {error && <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900" role="alert">{error}</p>}
        {accepted && (
          <div className="mt-4">
            <p className="text-sm text-emerald-800" role="status">{accepted}</p>
            <Link className="mt-4 inline-flex rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white" href="/login">
              Sign in
            </Link>
          </div>
        )}
        {invitation && !accepted && (
          <>
            <p className="mt-3 text-sm text-slate-600">
              You have been invited to {invitation.storeName} as a {invitation.role === "MANAGER" ? "Manager" : "Staff"}.
            </p>
            <p className="mt-2 text-sm text-slate-700">Invited email: <strong>{invitation.email}</strong></p>
            <form className="mt-5 space-y-4" onSubmit={submit}>
              {invitation.nameRequired && (
                  <label className="block text-sm font-medium">
                    Your name
                    <input
                      autoComplete="name"
                      required
                      maxLength={120}
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2"
                    />
                  </label>
              )}
              {invitation.passwordRequired && (
                  <label className="block text-sm font-medium">
                    Create a password
                    <input
                      autoComplete="new-password"
                      required
                      minLength={12}
                      maxLength={128}
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2"
                    />
                    <span className="mt-1 block text-xs font-normal text-slate-500">Use 12–128 characters.</span>
                  </label>
              )}
              <button
                type="submit"
                disabled={pending}
                className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {pending ? "Accepting…" : "Accept invitation"}
              </button>
            </form>
          </>
        )}
      </section>
    </main>
  );
}
