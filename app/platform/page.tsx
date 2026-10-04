import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { PlatformPage as BusinessPlatformPage } from "@/components/platform/site/pages/PlatformPage";
import { SiteShell } from "@/components/platform/site/SiteShell";
import { platformSitePageMetadata } from "@/lib/server/platform/site-metadata";
import { isPlatformBusinessHost, isStorefrontPathPreviewHost } from "@/lib/store-host";

// Business-site only (like /portfolio): store hosts get a 404.
export async function generateMetadata(): Promise<Metadata> {
  const host = (await headers()).get("host") ?? "";
  if (!isPlatformBusinessHost(host) || isStorefrontPathPreviewHost(host)) {
    return { title: "Platform", robots: { index: false, follow: false } };
  }
  return platformSitePageMetadata({
    path: "/platform",
    title: "Platform",
    description:
      "The multi-store commerce platform under every store we launch: isolated stores, a checkout that re-checks on the server, search foundations, Arabic layouts and template design systems.",
  });
}

export default async function PlatformPage() {
  if (!isPlatformBusinessHost((await headers()).get("host") ?? "")) notFound();
  return (
    <SiteShell>
      <BusinessPlatformPage />
    </SiteShell>
  );
}
