"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { passwordProblem } from "@/lib/auth/password-policy";
import { focusRing } from "@/components/platform/site/styles";

const input =
  "mt-2 block min-h-12 w-full rounded-md border border-border bg-background/60 px-4 text-base text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25";
const label = "font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground";
const button =
  `inline-flex min-h-12 w-full items-center justify-center rounded-md bg-accent px-6 text-sm font-medium text-accent-foreground transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 ${focusRing}`;

function Feedback({ message, error = false }: { message: string; error?: boolean }) {
  return (
    <p
      role={error ? "alert" : "status"}
      className={`rounded-md border px-4 py-3 text-sm ${
        error ? "border-destructive/40 bg-destructive/10" : "border-accent/40 bg-accent/10"
      }`}
    >
      {message}
    </p>
  );
}

export function ForgotPasswordForm({ callbackURL }: { callbackURL: string }) {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setMessage(null);
    setError(null);
    setPending(true);
    try {
      const response = await fetch("/api/auth/request-password-reset", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ email: email.trim(), redirectTo: callbackURL }),
      });
      if (response.status === 429) setError("Too many requests. Wait a minute and try again.");
      else if (!response.ok) setError("Password recovery is temporarily unavailable. Contact your administrator.");
      else setMessage("If the address is eligible, a reset email may arrive. Contact support if it does not.");
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-8 space-y-5">
      {message && <Feedback message={message} />}
      {error && <Feedback message={error} error />}
      <label className={label} htmlFor="recovery-email">
        Email
        <input
          id="recovery-email"
          type="email"
          autoComplete="email"
          required
          maxLength={254}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className={input}
        />
      </label>
      <button className={button} type="submit" disabled={pending}>
        {pending ? "Sending…" : "Send reset link"}
      </button>
      <p className="text-sm text-muted-foreground">
        <Link href="/login" className={`underline underline-offset-4 hover:text-foreground ${focusRing}`}>
          Back to sign in
        </Link>
      </p>
    </form>
  );
}

export function ResetPasswordForm({ token, invalidLink }: { token: string; invalidLink: boolean }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token && window.location.search.includes("token=")) {
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, [token]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const problem = passwordProblem(password);
    if (problem) {
      setError(problem);
      return;
    }
    if (password !== confirm) {
      setError("The passwords don't match.");
      return;
    }
    setPending(true);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ newPassword: password, token }),
      });
      if (response.ok) {
        router.replace("/login?passwordReset=1");
        router.refresh();
        return;
      }
      if (response.status === 429) setError("Too many attempts. Wait a minute and try again.");
      else {
        let message = "This reset link is invalid or expired. Request a new one.";
        try {
          const result = await response.json() as { message?: string };
          if (result.message) message = result.message;
        } catch {
          // Use the safe reset-link message for non-JSON errors.
        }
        setError(message);
      }
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  if (!token || invalidLink) {
    return (
      <div className="mt-8 space-y-5">
        <Feedback message="This reset link is invalid or expired. Request a new one." error />
        <Link href="/forgot-password" className={`text-sm underline underline-offset-4 ${focusRing}`}>
          Request another reset link
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-8 space-y-5">
      {error && <Feedback message={error} error />}
      <label className={label} htmlFor="reset-password">
        New password
        <input
          id="reset-password"
          type="password"
          autoComplete="new-password"
          required
          minLength={12}
          maxLength={128}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className={input}
        />
      </label>
      <label className={label} htmlFor="reset-password-confirm">
        Confirm new password
        <input
          id="reset-password-confirm"
          type="password"
          autoComplete="new-password"
          required
          minLength={12}
          maxLength={128}
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          className={input}
        />
      </label>
      <button className={button} type="submit" disabled={pending}>
        {pending ? "Updating…" : "Update password"}
      </button>
    </form>
  );
}

export function VerifyEmailForm({ callbackURL }: { callbackURL: string }) {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setMessage(null);
    setError(null);
    setPending(true);
    try {
      const response = await fetch("/api/auth/send-verification-email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ email: email.trim(), callbackURL }),
      });
      if (response.status === 429) setError("Too many requests. Wait a minute and try again.");
      else if (!response.ok) setError("Email verification is temporarily unavailable. Contact your administrator.");
      else setMessage("If the account needs verification, a link may arrive. Contact support if it does not.");
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-8 space-y-5">
      {message && <Feedback message={message} />}
      {error && <Feedback message={error} error />}
      <label className={label} htmlFor="verification-email">
        Email
        <input
          id="verification-email"
          type="email"
          autoComplete="email"
          required
          maxLength={254}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className={input}
        />
      </label>
      <button className={button} type="submit" disabled={pending}>
        {pending ? "Sending…" : "Send verification link"}
      </button>
      <p className="text-sm text-muted-foreground">
        <Link href="/login" className={`underline underline-offset-4 hover:text-foreground ${focusRing}`}>
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
