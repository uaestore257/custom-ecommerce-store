import type { Metadata } from "next";
import { AboutView } from "@/components/storefront/AboutView";
import { BusinessContentPage } from "@/components/platform/BusinessSite";
import { getRequestStorefront } from "@/lib/server/storefront/catalog";
import { headers } from "next/headers";
import { isPlatformBusinessHost } from "@/lib/store-host";

export async function generateMetadata(): Promise<Metadata> {
  if (isPlatformBusinessHost((await headers()).get("host") ?? "")) return { title: "About UAE Store" };
  const { catalog } = await getRequestStorefront();
  return { title: catalog ? `About ${catalog.store.name}` : "About" };
}

export default async function AboutPage() {
  if (isPlatformBusinessHost((await headers()).get("host") ?? "")) {
    return <BusinessContentPage title="About UAE Store" eyebrow="About" description="We help businesses launch and manage their own online stores." />;
  }
  return <AboutView />;
}
