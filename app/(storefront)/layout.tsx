import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { isConfiguredAdminHost } from "@/lib/auth/constants";
import { SiteShell } from "@/components/platform/site/SiteShell";
import { StorefrontRoot, StorefrontUnavailable } from "@/components/storefront/StorefrontRoot";
import { getAgencyProfile } from "@/lib/server/agency";
import { getPlatformName } from "@/lib/server/platform-brand";
import { platformSiteDescription } from "@/lib/server/platform/site-metadata";
import { getRequestStorefront } from "@/lib/server/storefront/catalog";
import { getPublicStorefrontSeoContext } from "@/lib/server/storefront/seo";
import { isPlatformBusinessHost, isStorefrontPathPreviewHost, platformRootUrl, storeHostConfig } from "@/lib/store-host";
import { getStorefrontTemplate } from "@/templates";

export async function generateMetadata(): Promise<Metadata> {
  const host = (await headers()).get("host") ?? "";
  if (isPlatformBusinessHost(host) && !isStorefrontPathPreviewHost(host)) {
    const baseUrl = process.env.BETTER_AUTH_URL ?? "";
    const origin = platformRootUrl("/", baseUrl, storeHostConfig());
    const name = await getPlatformName();
    return {
      metadataBase: origin ? new URL(origin) : undefined,
      title: { default: name, template: `%s | ${name}` },
      description: await platformSiteDescription(),
    };
  }
  const context = await getPublicStorefrontSeoContext();
  if (!context) return { robots: { index: false, follow: false } };
  const description = context.store.tagline || context.store.heroText || `${context.store.name} online store.`;
  return {
    metadataBase: context.origin,
    title: { default: context.store.name, template: `%s | ${context.store.name}` },
    description,
  };
}

// Every public storefront page renders inside the template the shown
// store's own row selects (lib/templates/registry.ts), with that store's
// tokens, language and direction (components/storefront/StorefrontRoot.tsx).
// The store comes only from the request host (lib/server/storefront/catalog.ts).
export default async function StorefrontLayout({ children }: LayoutProps<"/">) {
  const requestHeaders = await headers();
  const host = requestHeaders.get("host") ?? "";
  const isAdminHost = isConfiguredAdminHost(host, process.env.ADMIN_HOST ?? "");
  const isBusinessHost = isPlatformBusinessHost(host);
  const isPathPreviewHost = isStorefrontPathPreviewHost(host);
  if (isBusinessHost && !isPathPreviewHost) return <SiteShell>{children}</SiteShell>;
  const context = await getRequestStorefront();
  if (isBusinessHost && !context) return <SiteShell>{children}</SiteShell>;
  if (!context) {
    return (
      <StorefrontUnavailable
        adminLink={
          isAdminHost ? (
            <Link href="/admin/stores" className="font-semibold text-teal-700 hover:underline">Manage stores</Link>
          ) : undefined
        }
      />
    );
  }

  return (
    <StorefrontRoot
      context={context}
      template={getStorefrontTemplate(context.store.templateKey)}
      isAdminHost={isAdminHost}
      agencyContact={isAdminHost ? await agencyPreviewContact() : undefined}
    >
      {children}
    </StorefrontRoot>
  );
}

/** The agency's own public contact details for the platform host's preview bar (Agency settings). */
async function agencyPreviewContact() {
  const { contact } = await getAgencyProfile();
  return { email: contact.email, phone: contact.phone, whatsapp: contact.whatsapp, address: contact.address.join(", ") || undefined };
}
