"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition, type FormEvent, type ReactNode } from "react";
import { createStoreAction, updateStoreAction } from "@/app/admin/actions";
import { buttonClass, errorProps, Field, inputClass, Notice } from "@/components/ui";
import { PAYMENT_METHODS, STORE_STATUSES, STORE_TYPES } from "@/lib/config";
import { slugify } from "@/lib/format";
import type { AdminStoreDetail, ReferenceOptions } from "@/lib/admin/types";
import {
  hasErrors,
  PAYMENT_METHOD_IDS,
  validateStoreBase,
  validateStoreSettings,
  type StoreReference,
} from "@/lib/admin/validation";
import { isHexColor } from "@/lib/validation";

type PaymentMethodId = (typeof PAYMENT_METHOD_IDS)[number];

interface StoreFormValues {
  name: string;
  businessType: string;
  status: string;
  ownerName: string;
  ownerEmail: string;
  countryCode: string;
  baseCurrency: string;
  timezone: string;
  defaultLanguage: string;
  languages: string[];
  slug: string;
  accentColor: string;
  // Edit-only fields
  logoUrl: string;
  deliveryFee: string;
  freeDeliveryThreshold: string;
  paymentMethods: Record<PaymentMethodId, boolean>;
  tagline: string;
  heroTitle: string;
  heroText: string;
  aboutText: string;
  contactEmail: string;
  contactPhone: string;
  contactAddress: string;
}

// New stores start with NO country, currency, timezone or language chosen:
// the platform is international, so the owner picks them explicitly.
function initialValues(store?: AdminStoreDetail): StoreFormValues {
  const methods = Object.fromEntries(PAYMENT_METHOD_IDS.map((id) => [id, id === "cash_on_delivery"])) as Record<PaymentMethodId, boolean>;
  if (!store) {
    return {
      name: "", businessType: "", status: "DRAFT", ownerName: "", ownerEmail: "",
      countryCode: "", baseCurrency: "", timezone: "", defaultLanguage: "", languages: [],
      slug: "", accentColor: "#0f766e",
      logoUrl: "", deliveryFee: "", freeDeliveryThreshold: "", paymentMethods: methods,
      tagline: "", heroTitle: "", heroText: "", aboutText: "", contactEmail: "", contactPhone: "", contactAddress: "",
    };
  }
  for (const m of store.paymentMethods) methods[m.method as PaymentMethodId] = m.enabled;
  return {
    name: store.name, businessType: store.businessType ?? "", status: store.status,
    ownerName: store.ownerName, ownerEmail: store.ownerEmail,
    countryCode: store.countryCode, baseCurrency: store.baseCurrency, timezone: store.timezone,
    defaultLanguage: store.defaultLanguage, languages: store.languages,
    slug: store.slug, accentColor: store.accentColor ?? "#0f766e",
    logoUrl: store.logoUrl ?? "", deliveryFee: store.delivery.fee, freeDeliveryThreshold: store.delivery.freeOver,
    paymentMethods: methods, ...store.content,
    contactEmail: store.contactEmail, contactPhone: store.contactPhone, contactAddress: store.contactAddress,
  };
}

/**
 * Create mode: the basic fields needed to start a new client store.
 * Edit mode: every per-store setting the database supports.
 * Saves through Server Actions; the server validates everything again.
 */
export function StoreForm({
  mode,
  store,
  reference,
}: {
  mode: "create" | "edit";
  store?: AdminStoreDetail;
  reference: ReferenceOptions;
}) {
  const router = useRouter();
  const [values, setValues] = useState(() => initialValues(store));
  const [slugEdited, setSlugEdited] = useState(mode === "edit");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();
  const isEdit = mode === "edit";
  const currencyLocked = Boolean(isEdit && store?.hasPrices);

  // Lookup sets for the shared validators (the server has its own copy).
  const lookup: StoreReference = useMemo(
    () => ({
      countries: new Set(reference.countries.map((c) => c.code)),
      currencies: new Map(reference.currencies.map((c) => [c.code, c.minorUnits])),
      languages: new Set(reference.languages.map((l) => l.code)),
    }),
    [reference],
  );
  const minorUnits = lookup.currencies.get(values.baseCurrency);

  function set<K extends keyof StoreFormValues>(key: K, value: StoreFormValues[K]) {
    setSaved(false);
    if (key === "slug") setSlugEdited(true);
    setValues((v) => {
      const next = { ...v, [key]: value };
      // Suggest a slug from the store name until the slug is edited by hand.
      if (key === "name" && !slugEdited) next.slug = slugify(String(value));
      return next;
    });
    if (errors[key]) setErrors((e) => ({ ...e, [key]: "" }));
  }

  function toggleLanguage(code: string, checked: boolean) {
    const languages = checked ? [...values.languages, code] : values.languages.filter((l) => l !== code);
    set("languages", languages);
    if (!checked && values.defaultLanguage === code) set("defaultLanguage", "");
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    const found = isEdit ? validateStoreSettings(values, lookup).errors : validateStoreBase(values, lookup).errors;
    setErrors(found);
    if (hasErrors(found)) {
      document.getElementById(`store-${Object.keys(found)[0]}`)?.focus();
      return;
    }
    startTransition(async () => {
      const result = isEdit && store ? await updateStoreAction(store.id, values) : await createStoreAction(values);
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        setFormError(result.error);
        return;
      }
      if (isEdit) setSaved(true);
      else router.push(`/admin/stores/${result.data.id}?created=1`);
    });
  }

  const text = (
    key: keyof StoreFormValues,
    label: string,
    opts: { required?: boolean; hint?: ReactNode; type?: string; placeholder?: string; className?: string; inputMode?: "decimal" } = {},
  ) => (
    <Field label={label} htmlFor={`store-${key}`} required={opts.required} error={errors[key]} hint={opts.hint} className={opts.className}>
      <input
        {...errorProps(`store-${key}`, errors[key])}
        type={opts.type ?? "text"}
        inputMode={opts.inputMode}
        placeholder={opts.placeholder}
        value={values[key] as string}
        onChange={(e) => set(key, e.target.value as never)}
        className={inputClass(!!errors[key])}
      />
    </Field>
  );

  const select = (
    key: keyof StoreFormValues,
    label: string,
    options: { value: string; label: string }[],
    opts: { required?: boolean; hint?: ReactNode; placeholder?: string; disabled?: boolean } = {},
  ) => (
    <Field label={label} htmlFor={`store-${key}`} required={opts.required} error={errors[key]} hint={opts.hint}>
      <select
        {...errorProps(`store-${key}`, errors[key])}
        value={values[key] as string}
        disabled={opts.disabled}
        onChange={(e) => set(key, e.target.value as never)}
        className={`${inputClass(!!errors[key])} disabled:bg-slate-100 disabled:text-slate-500`}
      >
        {opts.placeholder !== undefined && <option value="">{opts.placeholder}</option>}
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </Field>
  );

  const languageName = (code: string) => {
    const l = reference.languages.find((x) => x.code === code);
    return l ? `${l.name}${l.nativeName && l.nativeName !== l.name ? ` — ${l.nativeName}` : ""}` : code;
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      {(formError || hasErrors(Object.fromEntries(Object.entries(errors).filter(([, m]) => m)))) && (
        <Notice tone="warning">{formError ?? "Please fix the highlighted fields."}</Notice>
      )}

      <Section title="Store details" description="Basic information about this client store.">
        {text("name", "Store name", { required: true, placeholder: "e.g. Nest & Oak Home" })}
        {select("businessType", "Store category / type", STORE_TYPES, { placeholder: "Choose category…" })}
        {text("ownerName", "Owner / contact name", { required: true })}
        {text("ownerEmail", "Owner email", { required: true, type: "email" })}
        {select(
          "status",
          "Status",
          STORE_STATUSES.map((s) => ({ value: s.value.toUpperCase(), label: s.label })),
          { hint: "Draft and paused stores are not open for business." },
        )}
      </Section>

      <Section title="Country, currency & time" description="Each store has its own settings; nothing is assumed for you.">
        {select("countryCode", "Country / region", reference.countries.map((c) => ({ value: c.code, label: `${c.name} (${c.code})` })), {
          required: true,
          placeholder: "Choose country…",
        })}
        {select(
          "baseCurrency",
          "Currency",
          reference.currencies.map((c) => ({ value: c.code, label: `${c.code} — ${c.name}` })),
          {
            required: true,
            placeholder: "Choose currency…",
            disabled: currencyLocked,
            hint: currencyLocked
              ? "Locked: products or delivery rates already have prices in this currency."
              : minorUnits !== undefined
                ? `Prices use ${minorUnits} decimal place${minorUnits === 1 ? "" : "s"}.`
                : undefined,
          },
        )}
        {select("timezone", "Timezone", reference.timeZones.map((t) => ({ value: t, label: t.replaceAll("_", " ") })), {
          required: true,
          placeholder: "Choose timezone…",
        })}
      </Section>

      <Section title="Languages" description="Choose which languages this store supports. Nothing is translated automatically.">
        <fieldset className="sm:col-span-2">
          <legend className="mb-2 text-sm font-medium text-slate-700">
            Store languages <span className="text-red-600">*</span>
          </legend>
          <div id="store-languages" tabIndex={-1} className="grid gap-2 sm:grid-cols-3">
            {reference.languages.map((l) => (
              <label key={l.code} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-teal-700"
                  checked={values.languages.includes(l.code)}
                  onChange={(e) => toggleLanguage(l.code, e.target.checked)}
                />
                <span>
                  {l.name}
                  {l.direction === "RTL" && <span className="ml-1 text-xs text-slate-500">(right-to-left)</span>}
                </span>
              </label>
            ))}
          </div>
          {errors.languages && <p className="mt-1.5 text-sm text-red-600">{errors.languages}</p>}
        </fieldset>
        {select("defaultLanguage", "Default language", values.languages.map((code) => ({ value: code, label: languageName(code) })), {
          required: true,
          placeholder: values.languages.length ? "Choose default language…" : "Choose store languages first",
          hint: "Store text below is written in this language.",
        })}
      </Section>

      <Section title="Branding & web address">
        {text("slug", "Store slug", { required: true, hint: "Short unique name used in links, e.g. nest-and-oak." })}
        <Field label="Theme / accent colour" htmlFor="store-accentColor" required error={errors.accentColor}>
          <div className="flex gap-2">
            <input
              type="color"
              aria-label="Pick accent colour"
              value={isHexColor(values.accentColor) ? values.accentColor : "#0f766e"}
              onChange={(e) => set("accentColor", e.target.value)}
              className="h-[42px] w-14 shrink-0 cursor-pointer rounded-lg border border-slate-300 bg-white p-1"
            />
            <input
              {...errorProps("store-accentColor", errors.accentColor)}
              value={values.accentColor}
              onChange={(e) => set("accentColor", e.target.value)}
              className={inputClass(!!errors.accentColor)}
            />
          </div>
        </Field>
        {isEdit &&
          text("logoUrl", "Logo image URL", {
            placeholder: "https://…",
            className: "sm:col-span-2",
            hint: "Optional. If empty or broken, the store's initial is shown in its accent colour.",
          })}
        <p className="text-xs text-slate-500 sm:col-span-2">Custom domains are planned for a later phase.</p>
      </Section>

      {isEdit && (
        <>
          <Section title="Delivery" description={`Amounts in ${values.baseCurrency}. Saved as a setting; nothing is calculated yet.`}>
            {text("deliveryFee", "Delivery fee", { required: true, inputMode: "decimal", placeholder: "0" })}
            {text("freeDeliveryThreshold", "Free delivery over", { inputMode: "decimal", hint: "Leave empty for no free delivery." })}
          </Section>

          <Section title="Payment methods" description="Choose which payment options customers will see at checkout.">
            <div className="sm:col-span-2">
              <Notice tone="warning" className="mb-4">
                Payment configuration is <strong>not connected to a real payment provider</strong>.
                Offline methods only record the customer&apos;s choice; no money is collected.
              </Notice>
              <ul className="space-y-3">
                {PAYMENT_METHODS.map((m) => (
                  <li key={m.id}>
                    <label className={`flex items-start gap-3 rounded-xl border border-slate-200 p-4 ${m.requiresProvider ? "cursor-not-allowed bg-slate-50 opacity-70" : "cursor-pointer"}`}>
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4 accent-teal-700"
                        checked={m.requiresProvider ? false : values.paymentMethods[m.id]}
                        disabled={m.requiresProvider}
                        onChange={(e) => set("paymentMethods", { ...values.paymentMethods, [m.id]: e.target.checked })}
                      />
                      <span>
                        <span className="block font-medium">
                          {m.label}
                          {m.requiresProvider && (
                            <span className="ml-2 rounded bg-slate-200 px-1.5 py-0.5 text-xs font-semibold text-slate-600">
                              Unavailable in demo
                            </span>
                          )}
                        </span>
                        <span className="text-sm text-slate-500">{m.description}</span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          </Section>

          <Section
            title="Storefront content"
            description={`Text for the homepage, About and Contact pages, in ${languageName(values.defaultLanguage) || "the default language"}.`}
          >
            {text("tagline", "Tagline", { className: "sm:col-span-2" })}
            {text("heroTitle", "Homepage headline", { required: true, className: "sm:col-span-2" })}
            <Field label="Homepage intro" htmlFor="store-heroText" error={errors.heroText} className="sm:col-span-2">
              <textarea id="store-heroText" rows={2} value={values.heroText} onChange={(e) => set("heroText", e.target.value)} className={inputClass(!!errors.heroText)} />
            </Field>
            <Field label="About page text" htmlFor="store-aboutText" error={errors.aboutText} className="sm:col-span-2" hint="Leave a blank line between paragraphs.">
              <textarea id="store-aboutText" rows={5} value={values.aboutText} onChange={(e) => set("aboutText", e.target.value)} className={inputClass(!!errors.aboutText)} />
            </Field>
            {text("contactEmail", "Public contact email", { type: "email" })}
            {text("contactPhone", "Public phone", { type: "tel", hint: "International format, e.g. +971 4 000 0000 or +1 415 555 0123." })}
            {text("contactAddress", "Address", { className: "sm:col-span-2" })}
          </Section>
        </>
      )}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
        {saved && (
          <p role="status" className="text-sm font-medium text-emerald-700">
            Settings saved.
          </p>
        )}
        <button
          type="button"
          className={buttonClass("secondary")}
          onClick={() => router.push(isEdit && store ? `/admin/stores/${store.id}` : "/admin/stores")}
        >
          Cancel
        </button>
        <button type="submit" disabled={pending} className={buttonClass("primary")}>
          {pending ? "Saving…" : isEdit ? "Save settings" : "Create store"}
        </button>
      </div>
    </form>
  );
}

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-lg font-semibold">{title}</h2>
      {description && <p className="mt-1 text-sm text-slate-600">{description}</p>}
      <div className="mt-5 grid gap-5 sm:grid-cols-2">{children}</div>
    </section>
  );
}
