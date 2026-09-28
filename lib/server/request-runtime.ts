import "server-only";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

// ---------------------------------------------------------------
// Request-scoped Next.js APIs used outside a request context in tests:
// headers() (read by both admin actions, for the sign-in session, and
// the public storefront action, for the trusted-IP header) and
// revalidateAdmin() (admin-only page revalidation). Both only work
// inside a real Next.js request. Database tests replace them with
// setRequestRuntimeForTests() so they can call the real Server Actions
// — with a real Better Auth session cookie for admin actions, or with a
// synthetic IP header for the public one. That replacement is refused
// in production.
// ---------------------------------------------------------------

export interface RequestRuntime {
  headers(): Promise<Headers>;
  revalidateAdmin(): void;
}

const nextRuntime: RequestRuntime = {
  async headers() {
    return new Headers(await headers());
  },
  revalidateAdmin() {
    revalidatePath("/admin", "layout");
  },
};

let current: RequestRuntime = nextRuntime;

export function requestRuntime(): RequestRuntime {
  return current;
}

/** Test seam. Pass null to restore the Next.js runtime. */
export function setRequestRuntimeForTests(runtime: RequestRuntime | null) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("setRequestRuntimeForTests() is not available in production.");
  }
  current = runtime ?? nextRuntime;
}
