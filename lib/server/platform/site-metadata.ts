import "server-only";
import type { Metadata } from "next";
import { getPlatformName } from "@/lib/server/platform-brand";
import { platformRootUrl, storeHostConfig } from "@/lib/store-host";

/** The business site's default description (homepage, layout fallback). */
export const PLATFORM_SITE_DESCRIPTION =
  "A commerce studio and platform for premium online stores — editorial storefront templates, right-to-left layouts and a secure, multi-store commerce core.";

/**
 * Metadata for a page of the public business site on the platform root
 * host: an absolute title, canonical URL on the root domain, and Open
 * Graph / Twitter cards. Callers handle the other hosts (the temporary
 * path-preview host stays noindex, as before). Never sets robots, so the
 * public site is indexable — demo-store noindex rules don't apply here.
 */
export async function platformSitePageMetadata({
  path,
  title,
  description,
}: {
  path: string;
  /** Page title without the platform name; omit for the homepage. */
  title?: string;
  description: string;
}): Promise<Metadata> {
  const name = await getPlatformName();
  const fullTitle = title ? `${title} | ${name}` : name;
  const canonical = platformRootUrl(path, process.env.BETTER_AUTH_URL ?? "", storeHostConfig());
  return {
    title: { absolute: fullTitle },
    description,
    alternates: canonical ? { canonical } : undefined,
    openGraph: {
      type: "website",
      siteName: name,
      title: fullTitle,
      description,
      locale: "en",
      ...(canonical ? { url: canonical } : {}),
    },
    twitter: { card: "summary", title: fullTitle, description },
  };
}

/** schema.org Organization for the business site's homepage. */
export async function platformOrganizationJsonLd(): Promise<Record<string, unknown> | null> {
  const url = platformRootUrl("/", process.env.BETTER_AUTH_URL ?? "", storeHostConfig());
  if (!url) return null;
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: await getPlatformName(),
    url,
    description: PLATFORM_SITE_DESCRIPTION,
  };
}
