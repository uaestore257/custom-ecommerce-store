import type { CSSProperties, ReactNode } from "react";
import { PlatformContactDisclosure } from "@/components/PlatformContactDisclosure";
import { themeCssVariables } from "@/lib/templates/theme";
import type { StorefrontContext } from "@/lib/storefront-types";
import type { StorefrontTemplate } from "@/templates/types";
import { StorefrontProvider } from "./StorefrontProvider";

/**
 * The root of every public storefront page. Applies the active template's
 * tokens (colours, radii, fonts), the store's language and writing
 * direction, then renders the template's Shell around the page.
 *
 * Everything here comes from the server-resolved store context; the
 * template was chosen from that store's own row (lib/templates/registry.ts),
 * never from the request. The style values are built only from template
 * constants and a validated accent colour (lib/templates/theme.ts).
 */
export function StorefrontRoot({
  context,
  template,
  isAdminHost,
  children,
}: {
  context: StorefrontContext;
  template: StorefrontTemplate;
  isAdminHost: boolean;
  children: ReactNode;
}) {
  const { store } = context;
  const style = {
    ...themeCssVariables(template.definition, store.theme, store.accentColor),
    "--sf-font-heading": template.fonts.heading,
    "--sf-font-body": template.fonts.body,
  } as CSSProperties;
  const { Shell } = template;

  return (
    <StorefrontProvider value={context}>
      <div
        data-template={template.key}
        lang={store.language}
        dir={store.direction}
        style={style}
        className="flex min-h-screen flex-col bg-background font-body text-foreground antialiased"
      >
        {isAdminHost && <PreviewBar storeName={store.name} templateName={template.definition.manifest.name} />}
        {store.isDemo && (
          <p className="bg-foreground px-4 py-1.5 text-center text-xs text-background">
            Demonstration store — products and orders here are for showcasing the {template.definition.manifest.name} template.
          </p>
        )}
        <Shell {...context}>{children}</Shell>
      </div>
    </StorefrontProvider>
  );
}

/**
 * Only on the platform host (ADMIN_HOST): says this is the platform owner's
 * preview of a store. A store's own site has no bar and no way to switch
 * to another store; the store is chosen by the site's hostname.
 */
function PreviewBar({ storeName, templateName }: { storeName: string; templateName: string }) {
  return (
    <div className="bg-slate-900 text-xs text-slate-200" dir="ltr" lang="en">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2 font-sans sm:px-6">
        <p className="flex flex-wrap items-center gap-2">
          <span className="rounded bg-white/10 px-1.5 py-0.5 font-semibold uppercase tracking-wide text-white">Preview</span>
          <span>
            Previewing <strong className="text-white">{storeName}</strong> ({templateName} template) on the platform host.
          </span>
        </p>
        <PlatformContactDisclosure label="Agency Admin" />
      </div>
    </div>
  );
}

/** Shown when the host serves no public store (shared; no template applies). */
export function StorefrontUnavailable({ adminLink }: { adminLink?: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-xl px-4 py-24 text-center text-slate-700">
      <h1 className="text-xl font-semibold text-slate-900">This storefront isn&apos;t available right now</h1>
      <p className="mt-2 text-sm">There is no active store to show here yet.</p>
      {adminLink && <div className="mt-6">{adminLink}</div>}
    </div>
  );
}
