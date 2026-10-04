import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { studioCssVariables } from "@/lib/platform/showcase";
import { getPlatformName } from "@/lib/server/platform-brand";
import { studioFonts } from "./fonts";
import { SiteHeader, type SiteNavItem } from "./SiteHeader";
import { CONTAINER, focusRing } from "./styles";

/** Every link points at a route the business host serves (proxy.ts allowlist) or a section on one. */
const NAVIGATION: readonly SiteNavItem[] = [
  { href: "/portfolio", label: "Portfolio" },
  { href: "/#platform", label: "Platform" },
  { href: "/services", label: "Services" },
  { href: "/about", label: "About" },
];

const FOOTER_LINKS: readonly SiteNavItem[] = [
  { href: "/portfolio", label: "Portfolio" },
  { href: "/services", label: "Services" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

/**
 * The platform's public business site (the bare PLATFORM_ROOT_DOMAIN).
 * Paints the page with the studio tokens and display face, then header,
 * the page and footer. Pages render their own <StudioMain>.
 */
export async function SiteShell({ children }: { children: ReactNode }) {
  const platformName = await getPlatformName();
  const style = {
    ...studioCssVariables("paper"),
    "--sf-font-heading": studioFonts.heading,
    "--sf-font-body": studioFonts.body,
  } as CSSProperties;

  return (
    <div style={style} className="flex min-h-screen flex-col bg-background font-body text-foreground antialiased">
      <a
        href="#main-content"
        className="sr-only z-50 bg-foreground px-4 py-3 text-sm text-background focus:not-sr-only focus:fixed focus:start-4 focus:top-4"
      >
        Skip to content
      </a>
      <SiteHeader platformName={platformName} items={NAVIGATION} />
      <div className="flex-1">{children}</div>
      <footer className="border-t border-border">
        <div className={`${CONTAINER} grid gap-12 py-16 md:grid-cols-12`}>
          <div className="md:col-span-6">
            <p className="font-heading text-3xl leading-tight sm:text-4xl">{platformName}</p>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
              Premium online stores, designed as complete systems and run on one production-grade commerce platform.
            </p>
          </div>
          <nav aria-label="Footer" className="md:col-span-3">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground rtl:tracking-normal">Explore</p>
            <ul className="mt-4 space-y-1">
              {FOOTER_LINKS.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className={`inline-flex min-h-9 items-center text-sm hover:text-accent ${focusRing}`}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="md:col-span-3">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground rtl:tracking-normal">Store owners</p>
            <ul className="mt-4 space-y-1">
              <li>
                <Link href="/login" className={`inline-flex min-h-9 items-center text-sm hover:text-accent ${focusRing}`}>
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
          <p>Built on the platform it describes.</p>
        </div>
      </footer>
    </div>
  );
}
