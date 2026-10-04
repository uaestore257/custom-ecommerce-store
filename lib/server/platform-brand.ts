import "server-only";
import { cache } from "react";
import { PLATFORM_FALLBACK_NAME } from "@/lib/platform-brand";
import { getDb } from "./db";

/** The platform's configured public name (PlatformSettings), or the fallback. Once per request. */
export const getPlatformName = cache(async (): Promise<string> => {
  const settings = await getDb().platformSettings.findUnique({ where: { id: 1 }, select: { platformName: true } });
  return settings?.platformName.trim() || PLATFORM_FALLBACK_NAME;
});
