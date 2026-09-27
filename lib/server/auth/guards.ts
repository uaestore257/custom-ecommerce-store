import "server-only";
import { getDb } from "@/lib/server/db";
import { requestRuntime } from "@/lib/server/request-runtime";
import { getAuth } from "./auth";

// ---------------------------------------------------------------
// ACCESS GUARDS — the only way admin code learns who is calling.
//
// 1. The Better Auth session is read from the request cookie and
//    validated against the Session table (expired or revoked sessions
//    are rejected by Better Auth).
// 2. The user is then RE-READ from our database, so a disabled user or a
//    removed platform-owner flag takes effect on the very next request.
// 3. Nothing the browser sends (store IDs, roles, flags) is consulted.
//
// requirePlatformOwner() returns a PlatformOwner value that can only be
// created here. Platform-only data functions require it as an argument,
// so calling them without this check does not type-check.
// ---------------------------------------------------------------

declare const platformOwnerBrand: unique symbol;

export interface PlatformOwner {
  readonly userId: string;
  readonly email: string;
  readonly name: string;
  readonly [platformOwnerBrand]: true;
}

export interface SignedInUser {
  id: string;
  email: string;
  name: string;
  isPlatformOwner: boolean;
}

export class AccessDenied extends Error {
  constructor(readonly reason: "unauthenticated" | "forbidden") {
    super(reason === "unauthenticated" ? "Sign in required." : "Access denied.");
  }
}

/** The signed-in, non-disabled user of this request, or null. */
export async function getSignedInUser(): Promise<SignedInUser | null> {
  const headers = await requestRuntime().headers();
  const session = await getAuth().api.getSession({ headers });
  if (!session) return null;
  const user = await getDb().user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, name: true, isPlatformOwner: true, disabledAt: true },
  });
  if (!user || user.disabledAt) return null;
  return { id: user.id, email: user.email, name: user.name, isPlatformOwner: user.isPlatformOwner };
}

/** For Server Actions: throws AccessDenied unless the caller is the platform owner. */
export async function requirePlatformOwner(): Promise<PlatformOwner> {
  const user = await getSignedInUser();
  if (!user) throw new AccessDenied("unauthenticated");
  if (!user.isPlatformOwner) throw new AccessDenied("forbidden");
  return { userId: user.id, email: user.email, name: user.name } as PlatformOwner;
}
