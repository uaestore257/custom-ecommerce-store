import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Card, Notice, PageHeader } from "@/components/ui";
import type { TemplateManifest } from "@/lib/templates/types";
import { cartLabel, navigationLabel } from "@/lib/templates/vocabulary";

export interface TemplateLibraryEntry {
  manifest: TemplateManifest;
  storeCount: number;
  demos: { name: string; url: string }[];
}

const yesNo = (value: boolean) => (value ? "Yes" : "No");

/**
 * The platform's template library: every registered storefront template
 * (application code, lib/templates/registry.ts), how many stores use it,
 * and its live demo stores. Store owners choose a template on their
 * store's Design page.
 */
export function TemplateView({ templates }: { templates: TemplateLibraryEntry[] }) {
  return (
    <>
      <PageHeader
        title="Template library"
        description="Every client store runs on the same platform code and chooses one of these storefront templates. A template changes presentation only; products, orders, customers and settings are shared by all of them."
        breadcrumbs={[{ label: "Agency Admin", href: "/admin" }, { label: "Templates" }]}
      />

      <Notice className="mb-8">
        Templates are part of the application code and versioned with it. Stores choose a template and its options on
        their store&apos;s <strong>Design</strong> page; mark a store as a demo there to link it here as a live demo.
      </Notice>

      <ul className="grid gap-6 lg:grid-cols-2">
        {templates.map(({ manifest, storeCount, demos }) => (
          <li key={manifest.key}>
            <Card className="h-full p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">{manifest.visualCategory}</p>
                  <h2 className="mt-1 text-xl font-semibold">{manifest.name}</h2>
                </div>
                <p className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                  v{manifest.version} · {storeCount} {storeCount === 1 ? "store" : "stores"}
                </p>
              </div>
              <p className="mt-3 text-sm text-slate-600">{manifest.description}</p>

              <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <Fact label="Navigation" value={navigationLabel(manifest.design.navigation)} />
                <Fact label="Density" value={manifest.design.density} />
                <Fact label="Typography" value={`${manifest.design.typography.heading} / ${manifest.design.typography.body}`} />
                <Fact label="Card images" value={manifest.design.cardImageRatio} />
                <Fact label="Cart" value={cartLabel(manifest.design.cartPresentation)} />
                <Fact label="Quick add on cards" value={yesNo(manifest.capabilities.quickAddOnCards)} />
                <Fact label="Product gallery" value={yesNo(manifest.capabilities.productGallery)} />
                <Fact label="RTL-ready layout" value={yesNo(manifest.capabilities.rtlReady)} />
              </dl>

              <p className="mt-5 text-xs font-medium uppercase tracking-wide text-slate-500">Homepage</p>
              <p className="mt-1 text-sm text-slate-700">{manifest.homepageSections.join(" → ")}</p>
              <p className="mt-4 text-xs font-medium uppercase tracking-wide text-slate-500">Best for</p>
              <p className="mt-1 text-sm text-slate-700">{manifest.bestFor.join(", ")}</p>

              <div className="mt-5 border-t border-slate-200 pt-4 text-sm">
                {demos.length > 0 ? (
                  demos.map((demo) => (
                    <a key={demo.url} href={demo.url} target="_blank" rel="noreferrer" className="mr-4 inline-flex items-center gap-1 font-semibold text-teal-700 hover:underline">
                      Live demo: {demo.name} <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                    </a>
                  ))
                ) : (
                  <span className="text-slate-500">No demo store yet.</span>
                )}
              </div>
            </Card>
          </li>
        ))}
      </ul>

      <p className="mt-8 text-sm text-slate-600">
        <Link href="/admin/stores" className="font-semibold text-teal-700 hover:underline">Manage client stores</Link>
      </p>
    </>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium capitalize text-slate-900">{value}</dd>
    </div>
  );
}
