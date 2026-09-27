"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { buttonClass, errorProps, Field, inputClass, Notice } from "@/components/ui";

const GENERIC = "The email or password is incorrect.";

/**
 * Posts to Better Auth's /api/auth/sign-in/email endpoint, where its rate
 * limit applies. The same message is shown for an unknown email and a
 * wrong password, so the form doesn't reveal which accounts exist.
 */
export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
        router.replace("/admin");
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
    <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
      {error && <Notice tone="warning">{error}</Notice>}
      <Field label="Email" htmlFor="login-email" required>
        <input
          {...errorProps("login-email", undefined)}
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass(false)}
        />
      </Field>
      <Field label="Password" htmlFor="login-password" required>
        <input
          {...errorProps("login-password", undefined)}
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClass(false)}
        />
      </Field>
      <button type="submit" disabled={pending} className={`${buttonClass("primary")} w-full justify-center`}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
