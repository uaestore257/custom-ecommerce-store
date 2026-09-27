import "server-only";
import { notFound, redirect } from "next/navigation";
import { AccessDenied, requirePlatformOwner, type PlatformOwner } from "./guards";

/** For pages and layouts: redirects to /login, or shows 404 to other users. */
export async function requirePlatformOwnerPage(): Promise<PlatformOwner> {
  try {
    return await requirePlatformOwner();
  } catch (error) {
    if (error instanceof AccessDenied) {
      if (error.reason === "unauthenticated") redirect("/login");
      notFound();
    }
    throw error;
  }
}
