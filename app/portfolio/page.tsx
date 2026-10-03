import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { BusinessSiteShell, BusinessPortfolioPage } from "@/components/platform/BusinessSite";
import {
  isPlatformBusinessHost,
  isStorefrontPathPreviewHost,
  platformRootUrl,
  storeHostConfig,
} from "@/lib/store-host";

export async function generateMetadata(): Promise<Metadata> {
  const host = (await headers()).get("host") ?? "";
  if (!isPlatformBusinessHost(host) || isStorefrontPathPreviewHost(host)) {
    return { title: "Portfolio", robots: { index: false, follow: false } };
  }
  const canonical = platformRootUrl("/portfolio", process.env.BETTER_AUTH_URL ?? "", storeHostConfig());
  return { title: "Portfolio", alternates: canonical ? { canonical } : undefined };
}

export default async function PortfolioPage() {
  if (!isPlatformBusinessHost((await headers()).get("host") ?? "")) notFound();
  return (
    <BusinessSiteShell>
      <BusinessPortfolioPage />
    </BusinessSiteShell>
  );
}
