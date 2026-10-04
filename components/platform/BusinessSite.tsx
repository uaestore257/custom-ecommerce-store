import Link from "next/link";
import type { ReactNode } from "react";
import { PLATFORM_FALLBACK_NAME } from "@/lib/platform-brand";
import { getDb } from "@/lib/server/db";
import { getPlatformName } from "@/lib/server/platform-brand";
import { storefrontPreviewUrlForSlug, storeHostConfig } from "@/lib/store-host";

const navigation = [
  { href: "/", label: "Home" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/services", label: "Services" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export async function BusinessSiteShell({ children }: { children: ReactNode }) {
  const platformName = await getPlatformName();
  return (
    <div className="flex min-h-screen flex-col bg-white text-slate-900">
      <header className="border-b border-slate-200">
        <nav className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-5 sm:px-6">
          <Link href="/" className="text-lg font-bold tracking-tight">{platformName}</Link>
          <div className="flex flex-wrap gap-4 text-sm font-medium text-slate-600">
            {navigation.map((item) => (
              <Link key={item.href} href={item.href} className="hover:text-teal-700">{item.label}</Link>
            ))}
            <Link
              href="/login"
              className="rounded-full bg-teal-700 px-4 py-1.5 font-semibold text-white hover:bg-teal-800"
            >
              Login
            </Link>
          </div>
        </nav>
      </header>
      <div className="flex-1">{children}</div>
      <footer className="border-t border-slate-200">
        <div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-3 px-4 py-6 text-sm text-slate-500 sm:px-6">
          <span>{platformName} — ecommerce platform and services</span>
          <Link href="/contact" className="hover:text-teal-700">Contact</Link>
        </div>
      </footer>
    </div>
  );
}

export function BusinessHomePage() {
  return (
    <main>
      <section className="mx-auto grid max-w-6xl gap-8 px-4 py-20 sm:px-6 sm:py-28 md:grid-cols-[3fr_2fr] md:items-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-teal-700">Ecommerce for growing businesses</p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-6xl">Your business. Your store. Your customers.</h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-600">
            Launch a dedicated online storefront and manage products, orders and customer messages from one platform.
            Every store has its own address and its own Store Owner administration.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/services" className="rounded-full bg-teal-700 px-6 py-3 font-semibold text-white hover:bg-teal-800">Explore services</Link>
            <Link href="/portfolio" className="rounded-full border border-slate-300 px-6 py-3 font-semibold hover:bg-slate-50">View portfolio</Link>
          </div>
        </div>
        <div className="rounded-3xl bg-slate-50 p-7 sm:p-9">
          <p className="text-sm font-semibold uppercase tracking-wider text-slate-500">One platform</p>
          <ul className="mt-5 space-y-4 text-slate-700">
            <li>Independent storefront for every business</li>
            <li>Store-specific products, categories and orders</li>
            <li>Separate Store Owner access for each store</li>
          </ul>
        </div>
      </section>
      <section className="bg-slate-50">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-14 sm:px-6 md:grid-cols-3">
          {[
            ["Portfolio", "Explore the distinct stores running on the platform.", "/portfolio"],
            ["Services", "See the store setup and management capabilities.", "/services"],
            ["About", "Learn how the multi-store platform is organized.", "/about"],
          ].map(([title, description, href]) => (
            <Link key={title} href={href} className="rounded-2xl border border-slate-200 bg-white p-6 hover:border-teal-600">
              <h2 className="font-semibold">{title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{description}</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}

export async function BusinessPortfolioPage() {
  const config = storeHostConfig();
  const baseUrl = process.env.BETTER_AUTH_URL ?? "";
  const stores = await getDb().store.findMany({
    where: { status: "ACTIVE", archivedAt: null },
    select: {
      name: true,
      slug: true,
      domains: {
        where: { status: "VERIFIED", isPrimary: true },
        select: { hostname: true },
        take: 1,
      },
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
  const publicStores = stores.map((store) => {
    const url = storefrontPreviewUrlForSlug(store.slug, baseUrl, config, store.domains[0]?.hostname);
    return { ...store, url, hostname: url ? new URL(url).host : null };
  });
  return (
    <main className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
      <p className="text-sm font-semibold uppercase tracking-widest text-teal-700">Portfolio</p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-5xl">Stores on the platform</h1>
      <p className="mt-6 max-w-3xl text-lg leading-relaxed text-slate-600">
        Each store has its own hostname, catalog and Store Owner admin.
      </p>
      <ul className="mt-8 grid max-w-4xl gap-3 sm:grid-cols-2">
        {publicStores.map((store) => (
          <li key={store.slug} className="rounded-xl border border-slate-200 p-5">
            <h2 className="font-semibold">{store.name}</h2>
            <p className="mt-1 text-sm text-slate-600">{store.hostname ?? "Storefront hostname not configured"}</p>
            {store.url && (
              <Link href={store.url} className="mt-3 inline-block text-sm font-semibold text-teal-700 hover:underline">
                Visit storefront
              </Link>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}

export async function BusinessContactPage() {
  const settings = await getDb().platformSettings.findUnique({
    where: { id: 1 },
    select: { platformName: true, contactEmail: true },
  });
  return (
    <BusinessContentPage
      title={`Contact ${settings?.platformName.trim() || PLATFORM_FALLBACK_NAME}`}
      eyebrow="Contact"
      description={
        settings?.contactEmail
          ? "For platform and ecommerce service enquiries, contact our team."
          : "Platform contact details have not been configured yet."
      }
      items={settings?.contactEmail ? [`Email: ${settings.contactEmail}`] : undefined}
    />
  );
}

export function BusinessContentPage({
  title,
  eyebrow,
  description,
  items,
}: {
  title: string;
  eyebrow: string;
  description: string;
  items?: string[];
}) {
  return (
    <main className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
      <p className="text-sm font-semibold uppercase tracking-widest text-teal-700">{eyebrow}</p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-5xl">{title}</h1>
      <p className="mt-6 max-w-3xl text-lg leading-relaxed text-slate-600">{description}</p>
      {items && (
        <ul className="mt-8 grid max-w-4xl gap-3 sm:grid-cols-2">
          {items.map((item) => <li key={item} className="rounded-xl border border-slate-200 p-5 text-slate-700">{item}</li>)}
        </ul>
      )}
    </main>
  );
}
