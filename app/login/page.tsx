import type { CSSProperties } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { headers } from "next/headers";
import { ArrowLeft } from "lucide-react";
import { LoginForm } from "@/components/admin/LoginForm";
import { AgencyLogo } from "@/components/platform/site/AgencyLogo";
import { studioFonts } from "@/components/platform/site/fonts";
import { focusRing } from "@/components/platform/site/styles";
import { BrowserShot, PhoneShot } from "@/components/platform/site/work/DeviceFrames";
import { SHOWCASE_MEDIA } from "@/components/platform/site/work/showcase-media";
import { adminHostOf } from "@/lib/admin/store-access";
import { safeAdminReturnTo } from "@/lib/auth/constants";
import { studioCssVariables } from "@/lib/platform/showcase";
import { platformRootUrl, storeHostConfig } from "@/lib/store-host";
import { getAgencyProfile } from "@/lib/server/agency";
import { getSignedInUser } from "@/lib/server/auth/guards";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

// Platform-owner sign-in is on ADMIN_HOST; store members use the business
// root portal or the reserved Store Admin hostname. Public sign-up is disabled.
// Presented in the agency website's visual language (tokens, type, brand
// from Agency settings); the sign-in flow itself is LoginForm's, unchanged.
export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  await connection();
  const [{ returnTo }, requestHeaders] = await Promise.all([searchParams, headers()]);
  const host = requestHeaders.get("host") ?? "";
  const returnToPath = safeAdminReturnTo(returnTo);
  const hostKind = adminHostOf(host, storeHostConfig()).kind;
  const storeLogin = hostKind === "store" || hostKind === "store-portal";
  const user = await getSignedInUser();
  if (user) redirect(returnToPath ?? "/admin");

  const agency = await getAgencyProfile();
  const websiteUrl = platformRootUrl("/", process.env.BETTER_AUTH_URL ?? "", storeHostConfig());
  const style = {
    ...studioCssVariables("night"),
    "--sf-font-heading": studioFonts.heading,
    "--sf-font-body": studioFonts.body,
    colorScheme: "dark",
  } as CSSProperties;
  const copy = storeLogin
    ? { eyebrow: "Store owners", title: "Welcome back.", text: "Sign in to choose and manage a store you belong to." }
    : { eyebrow: "Agency admin", title: "Welcome back.", text: "For the platform administrator only." };
  const brand = <AgencyLogo name={agency.name} logoUrl={agency.logoUrl} logoIsWordmark={agency.logoIsWordmark} />;

  return (
    <div style={style} className="relative isolate flex min-h-screen flex-col overflow-hidden bg-background font-body text-foreground antialiased lg:flex-row">
      {/* Ambient light and the architectural grid, as on the website. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="studio-glow absolute -start-[20%] -top-[35%] h-[60rem] w-[60rem] rounded-full bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--sf-accent)_20%,transparent),transparent)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgb(255_255_255/0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgb(255_255_255/0.035)_1px,transparent_1px)] bg-[size:96px_96px] [mask-image:radial-gradient(ellipse_at_30%_30%,black,transparent_70%)]" />
      </div>

      {/* Brand panel */}
      <section aria-label={agency.name} className="relative flex flex-col px-5 pb-4 pt-8 sm:px-8 lg:w-[55%] lg:px-14 lg:py-12">
        <div className="flex items-center justify-between gap-6">
          {websiteUrl ? (
            <a href={websiteUrl} className={`group inline-flex min-w-0 ${focusRing}`}>
              {brand}
            </a>
          ) : (
            brand
          )}
          {websiteUrl && (
            <a href={websiteUrl} className={`group inline-flex min-h-11 shrink-0 items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground ${focusRing}`}>
              <ArrowLeft className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-0.5 rtl:rotate-180" aria-hidden />
              <span className="hidden sm:inline">Back to website</span>
              <span className="sm:hidden">Website</span>
            </a>
          )}
        </div>

        <div className="hidden flex-1 flex-col justify-center lg:flex">
          <p className="studio-rise font-heading text-6xl leading-[0.98] tracking-tight xl:text-7xl">
            Commerce, with a <em className="text-accent">point of view</em>.
          </p>
          <p className="studio-rise mt-6 max-w-md text-base leading-relaxed text-foreground/70" style={{ "--delay": "150ms" } as CSSProperties}>
            {agency.tagline}
          </p>
          <div aria-hidden className="studio-rise relative mt-14 max-w-xl pb-10 pe-12" style={{ "--delay": "300ms" } as CSSProperties}>
            <BrowserShot image={SHOWCASE_MEDIA.atelier.desktop} alt="" sizes="(min-width: 1024px) 38vw, 1px" className="opacity-90" />
            <div className="absolute bottom-0 end-0 w-[26%]">
              <PhoneShot image={SHOWCASE_MEDIA.classic.mobile} alt="" sizes="(min-width: 1024px) 10vw, 1px" />
            </div>
          </div>
        </div>
      </section>

      {/* Sign-in panel */}
      <main className="flex flex-1 items-center justify-center px-5 pb-16 pt-6 sm:px-8 lg:border-s lg:border-border lg:bg-surface/60 lg:px-14 lg:py-12 lg:backdrop-blur-sm">
        <div className="studio-rise w-full max-w-md" style={{ "--delay": "120ms" } as CSSProperties}>
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent">{copy.eyebrow}</p>
          <h1 className="mt-5 font-heading text-5xl leading-none tracking-tight sm:text-6xl">{copy.title}</h1>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">{copy.text}</p>
          <LoginForm returnTo={returnToPath} />
          <p className="mt-10 border-t border-border pt-6 text-xs leading-relaxed text-muted-foreground">
            Accounts are created by invitation only.{" "}
            {storeLogin ? "Ask your store owner or the agency for access." : "There is no public sign-up."}
          </p>
        </div>
      </main>
    </div>
  );
}
