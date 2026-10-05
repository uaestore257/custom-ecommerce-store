"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition, type FormEvent, type ReactNode } from "react";
import { createStoreAction, updateStoreAction } from "@/app/admin/actions";
import { buttonClass, errorProps, Field, inputClass, Notice } from "@/components/ui";
import { SearchableLanguageList } from "@/components/admin/SearchableLanguageList";
import { SearchableSelect } from "@/components/admin/SearchableSelect";
import { PAYMENT_METHODS, STORE_STATUSES, STORE_TYPES } from "@/lib/config";
import { slugify } from "@/lib/format";
import type { AdminStoreDetail, ReferenceOptions } from "@/lib/admin/types";
import { toggleSelectedOption } from "@/lib/admin/search-options";
import {
  hasErrors,
  PAYMENT_METHOD_IDS,
  validateStoreBase,
  validateStoreSettings,
  type StoreReference,
} from "@/lib/admin/validation";
import { DEFAULT_TEMPLATE_KEY, getTemplateDefinition, TEMPLATE_KEYS } from "@/lib/templates/registry";
import { isHexColor } from "@/lib/validation";

type PaymentMethodId = (typeof PAYMENT_METHODS)[number]["id"];

interface StoreFormValues {
  name: string;
  businessType: string;
  status: string;
  ownerName: string;
  ownerEmail: string;
  ownerPassword: string;
  ownerPasswordConfirm: string;
  countryCode: string;
  baseCurrency: string;
  timezone: string;
  defaultLanguage: string;
  languages: string[];
  slug: string;
  accentColor: string;
  // Create-only: the storefront template (later changes happen on the Design page).
  templateKey: string;
  // Edit-only fields
  logoUrl: string;
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
      name: "", businessType: "", status: "DRAFT", ownerName: "", ownerEmail: "", ownerPassword: "", ownerPasswordConfirm: "",
      countryCode: "", baseCurrency: "", timezone: "", defaultLanguage: "", languages: [],
      slug: "", accentColor: "#0f766e", templateKey: DEFAULT_TEMPLATE_KEY,
      logoUrl: "", paymentMethods: methods,
      tagline: "", heroTitle: "", heroText: "", aboutText: "", contactEmail: "", contactPhone: "", contactAddress: "",
    };
  }
  for (const m of store.paymentMethods) methods[m.method as PaymentMethodId] = m.enabled;
  return {
    name: store.name, businessType: store.businessType ?? "", status: store.status,
    ownerName: store.ownerName, ownerEmail: store.ownerEmail, ownerPassword: "", ownerPasswordConfirm: "",
    countryCode: store.countryCode, baseCurrency: store.baseCurrency, timezone: store.timezone,
    defaultLanguage: store.defaultLanguage, languages: store.languages,
    slug: store.slug, accentColor: store.accentColor ?? "#0f766e", templateKey: "",
    logoUrl: store.logoUrl ?? "",
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

  const languageOptions = useMemo(() => {
    const availableCodes = new Set(reference.languages.map((language) => language.code));
    const existingLanguages = (store?.languages ?? [])
      .filter((code) => !availableCodes.has(code))
      .map((code) => ({ code, name: code, nativeName: code, direction: "LTR" as const }));
    return [...reference.languages, ...existingLanguages];
  }, [reference.languages, store?.languages]);

  // Lookup sets for the shared validators (the server has its own copy).
  const lookup: StoreReference = useMemo(
    () => ({
      countries: new Set(reference.countries.map((c) => c.code)),
      currencies: new Map(reference.currencies.map((c) => [c.code, c.minorUnits])),
      languages: new Set(languageOptions.map((language) => language.code)),
    }),
    [languageOptions, reference],
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
    const languages = toggleSelectedOption(values.languages, code, checked);
    set("languages", languages);
    if (!checked && values.defaultLanguage === code) set("defaultLanguage", "");
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    const found = isEdit ? validateStoreSettings(values, lookup).errors : validateStoreBase(values, lookup).errors;
    if (!isEdit && values.ownerPassword !== values.ownerPasswordConfirm) {
      found.ownerPasswordConfirm = "The passwords don't match.";
    }
    setErrors(found);
    if (hasErrors(found)) {
      document.getElementById(`store-${Object.keys(found)[0]}`)?.focus();
      return;
    }
    startTransition(async () => {
      const submittedValues = values;
      if (!isEdit) setValues((current) => ({ ...current, ownerPassword: "", ownerPasswordConfirm: "" }));
      const result = isEdit && store
        ? await updateStoreAction(store.id, submittedValues)
        : await createStoreAction(submittedValues);
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
    opts: {
      required?: boolean;
      hint?: ReactNode;
      type?: string;
      placeholder?: string;
      className?: string;
      inputMode?: "decimal";
      autoComplete?: string;
    } = {},
  ) => (
    <Field label={label} htmlFor={`store-${key}`} required={opts.required} error={errors[key]} hint={opts.hint} className={opts.className}>
      <input
        {...errorProps(`store-${key}`, errors[key])}
        type={opts.type ?? "text"}
        autoComplete={opts.autoComplete}
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
    opts: { required?: boolean; hint?: ReactNode; placeholder?: string; disabled?: boolean; searchable?: boolean } = {},
  ) => (
    <Field label={label} htmlFor={`store-${key}`} required={opts.required} error={errors[key]} hint={opts.hint}>
      {opts.searchable ? (
        <SearchableSelect
          id={`store-${key}`}
          label={label}
          value={values[key] as string}
          options={options}
          placeholder={opts.placeholder ?? "Search options…"}
          disabled={opts.disabled}
          required={opts.required}
          invalid={!!errors[key]}
          describedBy={errors[key] ? `store-${key}-error` : undefined}
          onChange={(value) => set(key, value as never)}
        />
      ) : (
        <select
          {...errorProps(`store-${key}`, errors[key])}
          value={values[key] as string}
          disabled={opts.disabled}
          onChange={(event) => set(key, event.target.value as never)}
          className={`${inputClass(!!errors[key])} disabled:bg-slate-100 disabled:text-slate-500`}
        >
          {opts.placeholder !== undefined && <option value="">{opts.placeholder}</option>}
          {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      )}
    </Field>
  );

  const languageName = (code: string) => {
    const l = languageOptions.find((x) => x.code === code);
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
        {!isEdit &&
          select(
            "status",
            "Status",
            STORE_STATUSES.map((s) => ({ value: s.value.toUpperCase(), label: s.label })),
            { hint: "Draft and paused stores are not open for business." },
          )}
      </Section>

      {!isEdit && (
        <Section
          title="Store Owner"
          description="Create the Store Owner's sign-in credentials. The password is hashed and never shown again."
        >
          {text("ownerName", "Owner name", { required: true })}
          {text("ownerEmail", "Owner email", { required: true, type: "email" })}
          {text("ownerPassword", "Owner password", { required: true, type: "password", autoComplete: "new-password" })}
          {text("ownerPasswordConfirm", "Confirm password", { required: true, type: "password", autoComplete: "new-password" })}
        </Section>
      )}

      {!isEdit && (
        <Section
          title="Storefront template"
          description="How the store's storefront looks. Presentation only — it can be changed at any time on the store's Design page without touching products, orders or settings."
        >
          <fieldset className="sm:col-span-2">
            <legend className="sr-only">Storefront template</legend>
            <div id="store-templateKey" tabIndex={-1} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {TEMPLATE_OPTIONS.map((template) => {
                const active = values.templateKey === template.key;
                return (
                  <label
                    key={template.key}
                    className={`flex cursor-pointer gap-3 rounded-xl border p-4 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-teal-600 ${
                      active ? "border-teal-600 bg-teal-50/60" : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="templateKey"
                      value={template.key}
                      checked={active}
                      onChange={() => set("templateKey", template.key)}
                      className="mt-1 h-4 w-4 shrink-0 accent-teal-700"
                    />
                    <span className="min-w-0">
                      <span className="block font-medium text-slate-900">
                        {template.name}
                        {template.key === DEFAULT_TEMPLATE_KEY && <span className="ms-2 text-xs font-normal text-slate-500">Default</span>}
                      </span>
                      <span className="mt-0.5 block text-sm text-slate-600">{template.visualCategory}</span>
                    </span>
                  </label>
                );
              })}
            </div>
            {errors.templateKey && <p className="mt-1.5 text-sm text-red-600">{errors.templateKey}</p>}
          </fieldset>
        </Section>
      )}

      <Section title="Country, currency & time" description="Each store has its own settings; nothing is assumed for you.">
        {select("countryCode", "Country / region", reference.countries.map((c) => ({ value: c.code, label: `${c.name} (${c.code})` })), {
          required: true,
          placeholder: "Choose country…",
          searchable: true,
        })}
        {select(
          "baseCurrency",
          "Currency",
          reference.currencies.map((c) => ({ value: c.code, label: `${c.code} — ${c.name}` })),
          {
            required: true,
            placeholder: "Choose currency…",
            searchable: true,
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
          searchable: true,
        })}
      </Section>

      <Section title="Languages" description="Choose which languages this store supports. Nothing is translated automatically.">
        <fieldset className="sm:col-span-2">
          <legend className="mb-2 text-sm font-medium text-slate-700">
            Store languages <span className="text-red-600">*</span>
          </legend>
          <div
            id="store-languages"
            tabIndex={-1}
            aria-invalid={!!errors.languages}
            aria-describedby={errors.languages ? "store-languages-error" : undefined}
          >
            <SearchableLanguageList
              id="store-languages"
              options={languageOptions}
              selected={values.languages}
              invalid={!!errors.languages}
              describedBy={errors.languages ? "store-languages-error" : undefined}
              onChange={toggleLanguage}
            />
          </div>
          {errors.languages && <p id="store-languages-error" className="mt-1.5 text-sm text-red-600">{errors.languages}</p>}
        </fieldset>
        {select(
          "defaultLanguage",
          "Default language",
          values.languages.map((code) => ({ value: code, label: languageName(code) })),
          {
            required: true,
            placeholder: values.languages.length ? "Choose default language…" : "Enable a store language first…",
            searchable: true,
            disabled: values.languages.length === 0,
            hint: values.languages.length
              ? "Store text below is written in this language."
              : "Choose one or more store languages above to enable this list.",
          },
        )}
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
        <p className="text-xs text-slate-500 sm:col-span-2">
          Custom hostnames are managed by the Store Owner from their store admin.
        </p>
      </Section>

      {isEdit && (
        <>
          <Section title="Payment methods" description="Choose which payment options customers will see at checkout.">
            <div className="sm:col-span-2">
              <Notice tone="warning" className="mb-4">
                Provider accounts and store-specific payment configuration are managed by the Store Owner.
                This Platform Admin form does not accept payment credentials.
              </Notice>
              <ul className="space-y-3">
                {PAYMENT_METHODS.filter((m) =>
                  ["cash_on_delivery", "card_on_delivery", "bank_transfer", "online_card"].includes(m.id),
                ).map((m) => (
                  <li key={m.id}>
                    <label className={`flex items-start gap-3 rounded-xl border border-slate-200 p-4 ${m.requiresProvider ? "cursor-not-allowed bg-slate-50 opacity-70" : "cursor-pointer"}`}>
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4 accent-teal-700"
                        disabled={m.requiresProvider}
                        checked={m.requiresProvider ? false : values.paymentMethods[m.id]}
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

/** Every registered template, in registry order (lib/templates/registry.ts is the only source). */
const TEMPLATE_OPTIONS = TEMPLATE_KEYS.map((key) => {
  const { name, visualCategory } = getTemplateDefinition(key).manifest;
  return { key, name, visualCategory };
});

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-lg font-semibold">{title}</h2>
      {description && <p className="mt-1 text-sm text-slate-600">{description}</p>}
      <div className="mt-5 grid gap-5 sm:grid-cols-2">{children}</div>
    </section>
  );
}
