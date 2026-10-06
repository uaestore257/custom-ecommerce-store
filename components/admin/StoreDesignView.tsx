"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Check, ExternalLink } from "lucide-react";
import { updateStoreDesignAction } from "@/app/admin/actions";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { buttonClass, Card, Notice, PageHeader } from "@/components/ui";
import { StoreDemoControls } from "./StoreDemoControls";
import type { AdminStoreDesign } from "@/lib/server/admin/design";
import type { TemplateKey } from "@/lib/templates/registry";
import type { TemplateManifest, ThemeChoice } from "@/lib/templates/types";
import { cartDescription } from "@/lib/templates/vocabulary";

export interface DesignTemplateOption {
  key: TemplateKey;
  manifest: TemplateManifest;
  options: { key: string; label: string; description: string; default: string; choices: ThemeChoice[] }[];
  /** Live demo storefronts using this template. */
  demos: { name: string; url: string }[];
}

/**
 * Choose the storefront template and its options. Switching template only
 * changes presentation: products, categories, orders, customers and
 * settings are untouched (the server enforces this too).
 */
export function StoreDesignView({
  storeId,
  design,
  templates,
  storefrontUrl,
  readOnly,
  platform,
}: {
  storeId: string;
  design: AdminStoreDesign;
  templates: DesignTemplateOption[];
  storefrontUrl: string | null;
  readOnly: boolean;
  /** The platform owner may also mark the store as a template demo. */
  platform: boolean;
}) {
  const router = useRouter();
  const [templateKey, setTemplateKey] = useState<TemplateKey>(design.templateKey);
  const [theme, setTheme] = useState<Record<string, string>>({ ...design.theme });
  const [notice, setNotice] = useState<{ tone: "success" | "warning"; text: string } | null>(null);
  const [saving, startSaving] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const current = templates.find((template) => template.key === design.templateKey);
  const selected = templates.find((template) => template.key === templateKey) ?? templates[0];
  const changed = templateKey !== design.templateKey || JSON.stringify(theme) !== JSON.stringify(design.theme);

  function chooseTemplate(key: TemplateKey) {
    if (key === templateKey) return;
    const next = templates.find((template) => template.key === key);
    if (!next) return;
    setTemplateKey(key);
    // Options belong to a template: start from the new template's defaults
    // (or what this store saved for it before).
    setTheme(
      key === design.templateKey
        ? { ...design.theme }
        : Object.fromEntries(next.options.map((option) => [option.key, option.default])),
    );
    setNotice(null);
  }

  /** A template change is confirmed first; option changes within the current template save directly. */
  function requestSave() {
    if (templateKey !== design.templateKey) setConfirming(true);
    else save();
  }

  function save() {
    setConfirming(false);
    setNotice(null);
    startSaving(async () => {
      const result = await updateStoreDesignAction(storeId, { templateKey, theme });
      if (result.ok) {
        setNotice({ tone: "success", text: "Design saved. Your storefront now uses it." });
        router.refresh();
      } else {
        const details = result.fieldErrors ? ` ${Object.values(result.fieldErrors).join(" ")}` : "";
        setNotice({ tone: "warning", text: `${result.error}${details}` });
      }
    });
  }

  return (
    <>
      <PageHeader
        title="Design"
        description="Choose how your storefront looks. Templates change layout, typography and presentation only — your products, orders, customers and settings stay exactly as they are."
        actions={
          storefrontUrl ? (
            <a href={storefrontUrl} target="_blank" rel="noreferrer" className={buttonClass("secondary")}>
              <ExternalLink className="h-4 w-4" aria-hidden />
              View storefront
            </a>
          ) : undefined
        }
      />

      {readOnly && <Notice tone="warning" className="mb-6">This store is read-only right now, so its design can&apos;t be changed.</Notice>}
      {notice && (
        <Notice tone={notice.tone} className="mb-6">
          <span role="status">{notice.text}</span>
        </Notice>
      )}

      <p className="mb-4 text-sm text-slate-700">
        Current template: <strong className="font-semibold text-slate-900">{current?.manifest.name ?? design.templateKey}</strong>
      </p>

      <fieldset disabled={readOnly || saving} className="space-y-8">
        <legend className="sr-only">Template</legend>
        <div role="radiogroup" aria-label="Template" className="grid gap-4 lg:grid-cols-2">
          {templates.map((template) => {
            const active = template.key === templateKey;
            const { manifest } = template;
            return (
              <Card key={template.key} className={`p-0 ${active ? "ring-2 ring-teal-600" : ""}`}>
                <label className="block cursor-pointer p-5 sm:p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">{manifest.visualCategory}</p>
                      <p className="mt-1 text-lg font-semibold text-slate-900">{manifest.name}</p>
                    </div>
                    <input
                      type="radio"
                      name="template"
                      value={template.key}
                      checked={active}
                      onChange={() => chooseTemplate(template.key)}
                      className="mt-1 h-4 w-4 accent-teal-700"
                    />
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{manifest.description}</p>
                  <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-slate-600">
                    <div>
                      <dt className="font-medium text-slate-900">Typography</dt>
                      <dd>{manifest.design.typography.heading} / {manifest.design.typography.body}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-slate-900">Product images</dt>
                      <dd>{manifest.design.cardImageRatio}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-slate-900">Cart</dt>
                      <dd>{cartDescription(manifest.design.cartPresentation)}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-slate-900">Best for</dt>
                      <dd>{manifest.bestFor.slice(0, 2).join(", ")}</dd>
                    </div>
                  </dl>
                  {design.templateKey === template.key && (
                    <p className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                      <Check className="h-3.5 w-3.5" aria-hidden /> Current template
                    </p>
                  )}
                </label>
                {template.demos.length > 0 && (
                  <div className="border-t border-slate-200 px-5 py-3 sm:px-6">
                    {template.demos.map((demo) => (
                      <a key={demo.url} href={demo.url} target="_blank" rel="noreferrer" className="mr-4 inline-flex items-center gap-1 text-sm font-semibold text-teal-700 hover:underline">
                        Live demo: {demo.name} <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                      </a>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>

        {selected.options.length > 0 && (
          <Card className="p-5 sm:p-6">
            <h2 className="text-lg font-semibold">{selected.manifest.name} options</h2>
            <div className="mt-4 grid gap-6 md:grid-cols-2">
              {selected.options.map((option) => (
                <fieldset key={option.key}>
                  <legend className="text-sm font-medium text-slate-900">{option.label}</legend>
                  <p className="mt-0.5 text-xs text-slate-500">{option.description}</p>
                  <div className="mt-3 space-y-2">
                    {option.choices.map((choice) => (
                      <label key={choice.value} className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3 text-sm has-[:checked]:border-teal-600 has-[:checked]:bg-teal-50/50">
                        <input
                          type="radio"
                          name={`option-${option.key}`}
                          value={choice.value}
                          checked={(theme[option.key] ?? option.default) === choice.value}
                          onChange={() => setTheme((current) => ({ ...current, [option.key]: choice.value }))}
                          className="mt-0.5 h-4 w-4 accent-teal-700"
                        />
                        <span>
                          <span className="block font-medium text-slate-900">{choice.label}</span>
                          {choice.description && <span className="text-slate-500">{choice.description}</span>}
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              ))}
            </div>
            <p className="mt-4 text-xs text-slate-500">Buttons and links use the store&apos;s accent colour from Store settings.</p>
          </Card>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={requestSave} disabled={!changed || readOnly || saving} className={buttonClass("primary")}>
            {saving ? "Saving…" : "Save design"}
          </button>
          {changed && !saving && <p className="text-sm text-slate-500">Unsaved changes</p>}
        </div>
      </fieldset>

      <ConfirmDialog
        open={confirming}
        title={`Switch to ${selected.manifest.name}?`}
        confirmLabel={saving ? "Switching…" : `Switch to ${selected.manifest.name}`}
        onCancel={() => setConfirming(false)}
        onConfirm={save}
      >
        <p>
          Changing the template changes the Store&apos;s presentation only. Your products, orders, customers, inventory, payments and
          other Store data remain preserved.
        </p>
        <p className="mt-2">
          {current?.manifest.name ?? "The current template"} → {selected.manifest.name}. You can switch back at any time.
        </p>
      </ConfirmDialog>

      {platform && (
        <StoreDemoControls
          storeId={storeId}
          isDemo={design.isDemo}
          workServiceSlug={design.workServiceSlug}
          workOrder={design.workOrder}
        />
      )}
    </>
  );
}
