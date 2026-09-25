"use client";

import { useState, type FormEvent } from "react";
import { RotateCcw } from "lucide-react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { LoadingState } from "@/components/EmptyState";
import { buttonClass, Card, errorProps, Field, inputClass, Notice, PageHeader } from "@/components/ui";
import { COUNTRIES, CURRENCIES, DEFAULT_STOREFRONT_STORE_ID } from "@/lib/config";
import { resetDemoData, updateAgency, useDemoState } from "@/lib/demo-db";
import { switchStorefrontStore } from "@/lib/storefront";
import type { AgencySettings } from "@/lib/types";
import { hasErrors, isEmail, type FieldErrors } from "@/lib/validation";

export function AgencySettingsView() {
  const state = useDemoState();
  const [resetCount, setResetCount] = useState(0);
  const [confirmReset, setConfirmReset] = useState(false);
  if (!state) return <LoadingState />;

  return (
    <>
      {/* key: start the form again with fresh values after a reset */}
      <AgencySettingsForm key={resetCount} agency={state.agency} />

      <Card className="mt-10 p-5 sm:p-6">
        <h2 className="text-lg font-semibold">Demo data</h2>
        <Notice className="mt-3">
          This is a frontend demo. There is no login, no database and no server: all stores, products,
          orders and settings are saved in this browser&apos;s localStorage only.
        </Notice>
        <button type="button" className={`${buttonClass("secondary")} mt-4`} onClick={() => setConfirmReset(true)}>
          <RotateCcw className="h-4 w-4" aria-hidden />
          Reset demo data
        </button>
      </Card>

      <ConfirmDialog
        open={confirmReset}
        title="Reset all demo data?"
        confirmLabel="Reset everything"
        danger
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => {
          resetDemoData();
          switchStorefrontStore(DEFAULT_STOREFRONT_STORE_ID);
          setConfirmReset(false);
          setResetCount((n) => n + 1);
        }}
      >
        All stores, products, orders, customers, settings and the demo cart go back to the original sample data.
      </ConfirmDialog>
    </>
  );
}

function AgencySettingsForm({ agency }: { agency: AgencySettings }) {
  const [values, setValues] = useState(agency);
  const [errors, setErrors] = useState<FieldErrors<AgencySettings>>({});
  const [saved, setSaved] = useState(false);

  function set<K extends keyof AgencySettings>(key: K, value: AgencySettings[K]) {
    setSaved(false);
    setValues((v) => ({ ...v, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const e: FieldErrors<AgencySettings> = {};
    if (values.agencyName.trim().length < 2) e.agencyName = "Enter your agency name.";
    if (!isEmail(values.contactEmail)) e.contactEmail = "Enter a valid email address.";
    setErrors(e);
    if (hasErrors(e)) return;
    updateAgency({ ...values, agencyName: values.agencyName.trim(), contactEmail: values.contactEmail.trim() });
    setSaved(true);
  }

  return (
    <>
      <PageHeader
        title="Agency settings"
        description="Your agency profile and defaults for new client stores."
        breadcrumbs={[{ label: "Agency Admin", href: "/admin" }, { label: "Settings" }]}
      />

      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        <Card className="p-5 sm:p-6">
          <h2 className="text-lg font-semibold">Agency profile</h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <Field label="Agency name" htmlFor="agency-name" required error={errors.agencyName}>
              <input {...errorProps("agency-name", errors.agencyName)} value={values.agencyName} onChange={(e) => set("agencyName", e.target.value)} className={inputClass(!!errors.agencyName)} />
            </Field>
            <Field label="Contact email" htmlFor="agency-email" required error={errors.contactEmail}>
              <input {...errorProps("agency-email", errors.contactEmail)} type="email" value={values.contactEmail} onChange={(e) => set("contactEmail", e.target.value)} className={inputClass(!!errors.contactEmail)} />
            </Field>
          </div>
        </Card>

        <Card className="p-5 sm:p-6">
          <h2 className="text-lg font-semibold">Preferences</h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <Field label="Default currency for new stores" htmlFor="agency-currency">
              <select id="agency-currency" value={values.defaultCurrency} onChange={(e) => set("defaultCurrency", e.target.value as AgencySettings["defaultCurrency"])} className={inputClass()}>
                {CURRENCIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </Field>
            <Field label="Default country for new stores" htmlFor="agency-country">
              <select id="agency-country" value={values.defaultCountry} onChange={(e) => set("defaultCountry", e.target.value)} className={inputClass()}>
                {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 sm:col-span-2">
              <input type="checkbox" checked={values.showPausedStores} onChange={(e) => set("showPausedStores", e.target.checked)} className="h-4 w-4 accent-teal-700" />
              Show paused stores on the dashboard
            </label>
          </div>
        </Card>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
          {saved && <p role="status" className="text-sm font-medium text-emerald-700">Saved in this browser.</p>}
          <button type="submit" className={buttonClass("primary")}>Save changes</button>
        </div>
      </form>
    </>
  );
}
