import { toNextJsHandler } from "better-auth/next-js";
import { authHandler } from "@/lib/server/auth/auth";

// Better Auth HTTP endpoints (/api/auth/...). authHandler serves only the
// paths listed in ENABLED_PATHS (lib/server/auth/auth.ts) and answers 404
// for everything else, including sign-up. The proxy serves this route only
// on ADMIN_HOST. The auth instance is created on the first request so the
// build does not need database or auth settings.
export const { GET, POST } = toNextJsHandler((request: Request) => authHandler(request));
