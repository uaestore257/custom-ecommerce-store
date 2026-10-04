import "server-only";
import type { Metadata } from "next";
import { getAgencyProfile } from "@/lib/server/agency";
import { platformRootUrl, storeHostConfig } from "@/lib/store-host";

/** An Agency-settings image as an absolute URL (site paths resolve against the platform root). */
function absoluteImage(url: string | undefined): string | undefined {
  if (!url) return undefined;
  if (!url.startsWith("/")) return url;
  return platformRootUrl(url, process.env.BETTER_AUTH_URL ?? "", storeHostConfig()) ?? undefined;
}

/**
 * Metadata for a page of the public business site on the platform root
 * host, from Agency settings: the website name (= agency name), SEO title
 * and description, social image and brand mark. Canonical URLs point at
 * the root domain. Callers handle the other hosts (the temporary
 * path-preview host stays noindex, as before). Never sets robots, so the
 * public site is indexable — demo-store noindex rules don't apply here.
 */
export async function platformSitePageMetadata({
  path,
  title,
  description,
}: {
  path: string;
  /** Page title without the website name; omit for the homepage (which uses the SEO title). */
  title?: string;
  /** Page description; defaults to the configured SEO description. */
  description?: string;
}): Promise<Metadata> {
  const agency = await getAgencyProfile();
  const fullTitle = title ? `${title} | ${agency.name}` : (agency.seo.title ?? agency.name);
  const summary = description ?? agency.seo.description;
  const canonical = platformRootUrl(path, process.env.BETTER_AUTH_URL ?? "", storeHostConfig());
  const image = absoluteImage(agency.seo.ogImageUrl);
  const icon = absoluteImage(agency.brandMarkUrl);
  return {
    title: { absolute: fullTitle },
    description: summary,
    alternates: canonical ? { canonical } : undefined,
    ...(icon ? { icons: { icon, apple: icon } } : {}),
    openGraph: {
      type: "website",
      siteName: agency.name,
      title: fullTitle,
      description: summary,
      locale: "en",
      ...(canonical ? { url: canonical } : {}),
      ...(image ? { images: [{ url: image }] } : {}),
    },
    twitter: image
      ? { card: "summary_large_image", title: fullTitle, description: summary, images: [image] }
      : { card: "summary", title: fullTitle, description: summary },
  };
}

/** The business site's default description (layout fallback, path-preview host). */
export async function platformSiteDescription() {
  return (await getAgencyProfile()).seo.description;
}

/** schema.org Organization for the business site's homepage, from Agency settings (public fields only). */
export async function platformOrganizationJsonLd(): Promise<Record<string, unknown> | null> {
  const url = platformRootUrl("/", process.env.BETTER_AUTH_URL ?? "", storeHostConfig());
  if (!url) return null;
  const agency = await getAgencyProfile();
  const { contact } = agency;
  const logo = absoluteImage(agency.logoUrl);
  const founders = agency.team.filter((member) => /founder/i.test(member.title));
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: agency.name,
    url,
    description: agency.description,
    ...(logo ? { logo } : {}),
    ...(contact.email ? { email: contact.email } : {}),
    ...(contact.phone ? { telephone: contact.phone } : {}),
    ...(contact.address.length > 0 ? { address: { "@type": "PostalAddress", streetAddress: contact.address.join(", ") } } : {}),
    ...(founders.length > 0
      ? { founder: founders.map((member) => ({ "@type": "Person", name: member.name, ...(member.title ? { jobTitle: member.title } : {}) })) }
      : {}),
    ...(agency.social.length > 0 ? { sameAs: agency.social.map((account) => account.url) } : {}),
  };
}
