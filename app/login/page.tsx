import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { headers } from "next/headers";
import { LoginForm } from "@/components/admin/LoginForm";
import { adminHostOf } from "@/lib/admin/store-access";
import { safeAdminReturnTo } from "@/lib/auth/constants";
import { storeHostConfig } from "@/lib/store-host";
import { getSignedInUser } from "@/lib/server/auth/guards";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

// Platform-owner sign-in is on ADMIN_HOST; store members use the business
// root portal or the reserved Store Admin hostname. Public sign-up is disabled.
export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  await connection();
  const [{ returnTo }, requestHeaders] = await Promise.all([searchParams, headers()]);
  const host = requestHeaders.get("host") ?? "";
  const returnToPath = safeAdminReturnTo(returnTo);
  const hostKind = adminHostOf(host, storeHostConfig()).kind;
  const storeLogin = hostKind === "store" || hostKind === "store-portal";
  const user = await getSignedInUser();
  if (user) redirect(returnToPath ?? "/admin");

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12 text-slate-900">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-xl font-semibold">{storeLogin ? "Store Owner sign in" : "Sign in to the admin"}</h1>
        <p className="mt-1 text-sm text-slate-600">
          {storeLogin ? "Sign in to choose and manage a store you belong to." : "For the platform administrator only."}
        </p>
        <LoginForm returnTo={returnToPath} />
      </div>
    </main>
  );
}
