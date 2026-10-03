import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { BusinessSiteShell, BusinessPortfolioPage } from "@/components/platform/BusinessSite";
import { isPlatformBusinessHost } from "@/lib/store-host";

export const metadata: Metadata = { title: "Portfolio" };

export default async function PortfolioPage() {
  if (!isPlatformBusinessHost((await headers()).get("host") ?? "")) notFound();
  return (
    <BusinessSiteShell>
      <BusinessPortfolioPage />
    </BusinessSiteShell>
  );
}
