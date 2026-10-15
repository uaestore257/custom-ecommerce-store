import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/admin/AuthRecoveryForms";

export const metadata: Metadata = {
  title: "Reset password",
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  const authUrl = process.env.BETTER_AUTH_URL;
  const callbackURL = authUrl ? new URL("/reset-password", authUrl).toString() : "";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center px-5 py-12">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">Account access</p>
      <h1 className="mt-4 text-4xl font-semibold tracking-tight">Reset your password</h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        Enter your account email. If it is registered, we will send a one-time reset link.
      </p>
      {callbackURL
        ? <ForgotPasswordForm callbackURL={callbackURL} />
        : <p role="alert" className="mt-8 text-sm text-destructive">Password recovery is not configured. Contact your administrator.</p>}
    </main>
  );
}
