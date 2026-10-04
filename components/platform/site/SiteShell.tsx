import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { studioCssVariables } from "@/lib/platform/showcase";
import { SERVICE_CATEGORIES } from "@/lib/platform/services";
import { getPlatformName } from "@/lib/server/platform-brand";
import { studioFonts } from "./fonts";
import { MotionRuntime } from "./motion/MotionRuntime";
import { SiteHeader, type SiteNavItem } from "./SiteHeader";
import { CONTAINER, focusRing } from "./styles";

/** Every link points at a route the business host serves (proxy.ts BUSINESS_SITE_PATHS). */
const NAVIGATION: readonly SiteNavItem[] = [
  { href: "/portfolio", label: "Work" },
  { href: "/services", label: "Services" },
  { href: "/platform", label: "Platform" },
  { href: "/about", label: "About" },
];

const STUDIO_LINKS: readonly SiteNavItem[] = [...NAVIGATION, { href: "/contact", label: "Start a project" }];

const footerLabel = "font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground rtl:tracking-normal";
const footerLink = `inline-flex min-h-9 items-center text-sm text-foreground/85 transition-colors hover:text-accent ${focusRing}`;

/**
 * The platform's public business site (the bare PLATFORM_ROOT_DOMAIN).
 * Paints the page with the night tone and display face, then header, the
 * page and footer. Pages render their own <StudioMain>.
 */
export async function SiteShell({ children }: { children: ReactNode }) {
  const platformName = await getPlatformName();
  const style = {
    ...studioCssVariables("night"),
    "--sf-font-heading": studioFonts.heading,
    "--sf-font-body": studioFonts.body,
    colorScheme: "dark",
  } as CSSProperties;

  return (
    <div style={style} className="flex min-h-screen flex-col overflow-x-clip bg-background font-body text-foreground antialiased selection:bg-accent selection:text-accent-foreground">
      <a
        href="#main-content"
        className="sr-only z-[60] bg-accent px-4 py-3 text-sm text-accent-foreground focus:not-sr-only focus:fixed focus:start-4 focus:top-4"
      >
        Skip to content
      </a>
      <MotionRuntime />
      <SiteHeader platformName={platformName} items={NAVIGATION} />
      <div className="flex-1">{children}</div>
      <footer className="border-t border-border">
        <div className={`${CONTAINER} grid gap-12 py-16 md:grid-cols-12 lg:py-20`}>
          <div className="md:col-span-5">
            <p className="font-heading text-4xl leading-tight sm:text-5xl">{platformName}</p>
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-muted-foreground">
              An AI-first digital commerce studio. We design and build ecommerce stores, websites, apps and AI-powered systems
              for ambitious businesses.
            </p>
            <Link href="/contact" className={`group mt-8 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-accent ${focusRing}`}>
              Start a project
              <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-1 rtl:rotate-180">
                →
              </span>
            </Link>
          </div>
          <nav aria-label="Studio" className="md:col-span-2">
            <p className={footerLabel}>Studio</p>
            <ul className="mt-4">
              {STUDIO_LINKS.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className={footerLink}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <nav aria-label="Services" className="md:col-span-3">
            <p className={footerLabel}>What we build</p>
            <ul className="mt-4">
              {SERVICE_CATEGORIES.map((category) => (
                <li key={category.slug}>
                  <Link href={`/services#${category.slug}`} className={footerLink}>
                    {category.title}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="md:col-span-2">
            <p className={footerLabel}>Store owners</p>
            <ul className="mt-4">
              <li>
                <Link href="/login" className={footerLink}>
                  Sign in to your store
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className={`${CONTAINER} flex flex-wrap items-center justify-between gap-3 border-t border-border py-6 text-xs text-muted-foreground`}>
          <p>
            © {new Date().getFullYear()} {platformName}
          </p>
          <p>Designed and engineered in-house.</p>
        </div>
      </footer>
    </div>
  );
}
