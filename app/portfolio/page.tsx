import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { PortfolioPage as BusinessPortfolioPage } from "@/components/platform/site/pages/PortfolioPage";
import { SiteShell } from "@/components/platform/site/SiteShell";
import { platformSitePageMetadata } from "@/lib/server/platform/site-metadata";
import { isPlatformBusinessHost, isStorefrontPathPreviewHost } from "@/lib/store-host";

export async function generateMetadata(): Promise<Metadata> {
  const host = (await headers()).get("host") ?? "";
  if (!isPlatformBusinessHost(host) || isStorefrontPathPreviewHost(host)) {
    return { title: "Work", robots: { index: false, follow: false } };
  }
  return platformSitePageMetadata({
    path: "/portfolio",
    title: "Work",
    description:
      "Selected work: live ecommerce stores running on our platform — explore the storefronts, collections, product pages and checkout for yourself.",
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
