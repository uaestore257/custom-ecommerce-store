import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { PortfolioPage as BusinessPortfolioPage } from "@/components/platform/site/pages/PortfolioPage";
import { SiteShell } from "@/components/platform/site/SiteShell";
import { platformSitePageMetadata } from "@/lib/server/platform/site-metadata";
import { isPlatformBusinessHost, isStorefrontPathPreviewHost } from "@/lib/store-host";
import { listTemplateManifests } from "@/lib/templates/registry";

export async function generateMetadata(): Promise<Metadata> {
  const host = (await headers()).get("host") ?? "";
  if (!isPlatformBusinessHost(host) || isStorefrontPathPreviewHost(host)) {
    return { title: "Portfolio", robots: { index: false, follow: false } };
  }
  return platformSitePageMetadata({
    path: "/portfolio",
    title: "Portfolio",
    description: `${new Intl.ListFormat("en").format(listTemplateManifests().map((manifest) => manifest.name))}: complete storefront templates for premium commerce. Explore every page, palette and right-to-left layout.`,
  });
}

export default async function PortfolioPage() {
  if (!isPlatformBusinessHost((await headers()).get("host") ?? "")) notFound();
  return (
    <SiteShell>
      <BusinessPortfolioPage />
    </SiteShell>
  );
}
