import "server-only";
import { cache } from "react";
import { getAgencyProfile } from "./agency";

/** The agency (and public website) name from Agency settings, or the fallback. Once per request. */
export const getPlatformName = cache(async (): Promise<string> => (await getAgencyProfile()).name);
