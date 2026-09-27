import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { LoginForm } from "@/components/admin/LoginForm";
import { getSignedInUser } from "@/lib/server/auth/guards";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

// Admin sign-in. Served only on ADMIN_HOST (see proxy.ts). There is no
// sign-up page: the platform owner account is created with the CLI.
export default async function LoginPage() {
  await connection();
  const user = await getSignedInUser();
  if (user?.isPlatformOwner) redirect("/admin");

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12 text-slate-900">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-xl font-semibold">Sign in to the admin</h1>
        <p className="mt-1 text-sm text-slate-600">For the platform administrator only.</p>
        <LoginForm />
      </div>
    </main>
  );
}
