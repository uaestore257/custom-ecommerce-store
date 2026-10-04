"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { focusRing } from "@/components/platform/site/styles";

const GENERIC = "The email or password is incorrect.";

const label = "font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground";
const input = `block min-h-12 w-full min-w-0 rounded-md border border-border bg-background/60 px-4 text-base text-foreground placeholder:text-muted-foreground/60 transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25`;

/**
 * Posts to Better Auth's /api/auth/sign-in/email endpoint, where its rate
 * limit applies. The same message is shown for an unknown email and a
 * wrong password, so the form doesn't reveal which accounts exist.
 * Styled with the agency website's semantic tokens (set by the login page).
 */
export function LoginForm({ returnTo }: { returnTo: string | null }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }
    setPending(true);
    try {
      const response = await fetch("/api/auth/sign-in/email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password, rememberMe: false }),
        credentials: "same-origin",
      });
      if (response.ok) {
        // The session cookie is set; render the admin with it.
        router.replace(returnTo ?? "/admin");
        router.refresh();
        return;
      }
      setError(
        response.status === 429 ? "Too many sign-in attempts. Wait a minute and try again." : GENERIC,
      );
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    }
    setPassword("");
    setPending(false);
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-10 space-y-6">
      {error && (
        <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-foreground">
          {error}
        </p>
      )}
      <div>
        <label htmlFor="login-email" className={label}>
          Email
        </label>
        <input
          id="login-email"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={`${input} mt-2`}
        />
      </div>
      <div>
        <label htmlFor="login-password" className={label}>
          Password
        </label>
        <div className="relative mt-2">
          <input
            id="login-password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`${input} pe-12`}
          />
          <button
            type="button"
            onClick={() => setShowPassword((shown) => !shown)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
            className={`absolute inset-y-0 end-0 flex w-12 items-center justify-center rounded-e-md text-muted-foreground transition-colors hover:text-foreground ${focusRing}`}
          >
            {showPassword ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
          </button>
        </div>
      </div>
      <button
        type="submit"
        disabled={pending}
        className={`studio-shine group relative inline-flex min-h-12 w-full items-center justify-center gap-3 overflow-hidden rounded-md bg-accent px-6 text-sm font-medium text-accent-foreground transition-[filter,transform] duration-300 hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 ${focusRing}`}
      >
        {pending ? "Signing in…" : "Sign in"}
        {!pending && <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1 rtl:rotate-180" aria-hidden />}
      </button>
    </form>
  );
}
