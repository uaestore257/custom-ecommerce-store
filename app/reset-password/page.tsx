import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/admin/AuthRecoveryForms";

export const metadata: Metadata = {
  title: "Choose a new password",
  robots: { index: false, follow: false },
};

export default async function ResetPasswordPage({ searchParams }: PageProps<"/reset-password">) {
  const { token, error } = await searchParams;
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center px-5 py-12">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">Account access</p>
      <h1 className="mt-4 text-4xl font-semibold tracking-tight">Choose a new password</h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        Use a strong password that you have not used for another account.
      </p>
      <ResetPasswordForm
        token={typeof token === "string" ? token : ""}
        invalidLink={typeof error === "string"}
      />
    </main>
  );
}
