import "server-only";

/**
 * Who may open an admin session at all. Phase 2a: only the platform
 * owner. Phase 2b extends this to store owners with an active membership.
 * Disabled users can never sign in.
 */
export function canSignIn(user: { isPlatformOwner: boolean; disabledAt: Date | null }) {
  return user.disabledAt === null && user.isPlatformOwner;
}
