"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Store } from "lucide-react";
import { provisionTemplateDemoStoresAction } from "@/app/admin/actions";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { buttonClass, Card, Notice } from "@/components/ui";
import type { DemoProvisionResult } from "@/lib/server/template-demo-stores";

const OUTCOME: Record<DemoProvisionResult["outcome"], (result: DemoProvisionResult) => string> = {
  created: () => "Created",
  "would-create": () => "Ready to create",
  exists: () => "Already exists",
  "template-has-demo": (result) => `Already has a demo store${result.detail ? ` (${result.detail})` : ""}`,
  "slug-used-by-client-store": (result) => `Skipped: the address “${result.slug}” belongs to a client store`,
  invalid: (result) => `Skipped: ${result.detail ?? "invalid demo data"}`,
};

/**
 * Platform owner: one click creates a demo store for every template that has
 * none (lib/template-demo-stores.ts), so the public Work page can show a
 * live store for each template. Safe to repeat; never touches client stores.
 */
export function TemplateDemoStoresCard({ templateNames, withDemo }: { templateNames: Record<string, string>; withDemo: number }) {
  const router = useRouter();
  const total = Object.keys(templateNames).length;
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const [outcome, setOutcome] = useState<{ ok: boolean; message: string; results: DemoProvisionResult[] } | null>(null);

  function run() {
    setConfirming(false);
    startTransition(async () => {
      const result = await provisionTemplateDemoStoresAction();
      if (result.ok) {
        setOutcome({ ok: true, message: result.message ?? "Done.", results: result.data.results });
        router.refresh();
      } else {
        setOutcome({ ok: false, message: result.error, results: [] });
      }
    });
  }

  return (
    <Card className="mb-8 p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <h2 className="text-lg font-semibold">Demo stores for the Work page</h2>
          <p className="mt-1 text-sm text-slate-600">
            <strong className="text-slate-900">
              {withDemo} of {total}
            </strong>{" "}
            templates have a live demo store. Create the missing ones with sample products: they are marked as demos, show a
            demonstration notice, are never indexed, have no owner account and take cash on delivery only. Client stores are
            never changed, and it is safe to click again.
          </p>
        </div>
        <button type="button" onClick={() => setConfirming(true)} disabled={pending} className={buttonClass("primary")}>
          <Store className="h-4 w-4" aria-hidden />
          {pending ? "Creating…" : "Create demo stores"}
        </button>
      </div>

      {outcome && (
        <div className="mt-5" role="status">
          <Notice tone={outcome.ok ? "success" : "warning"}>{outcome.message}</Notice>
          {outcome.results.length > 0 && (
            <ul className="mt-4 divide-y divide-slate-200 rounded-xl border border-slate-200 text-sm">
              {outcome.results.map((result) => (
                <li key={result.template} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
                  <span className="font-medium text-slate-900">{templateNames[result.template] ?? result.template}</span>
                  <span className={result.outcome === "created" ? "font-semibold text-emerald-700" : "text-slate-600"}>
                    {OUTCOME[result.outcome](result)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <ConfirmDialog
        open={confirming}
        title="Create the missing demo stores?"
        confirmLabel="Create demo stores"
        onCancel={() => setConfirming(false)}
        onConfirm={run}
      >
        Every template without a demo store gets one, with sample products, on its own web address. Existing stores — demo or
        client — are not changed.
      </ConfirmDialog>
    </Card>
  );
}
