"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import { buttonClass, errorProps, Field, inputClass, Notice } from "@/components/ui";
import { COUNTRIES, CURRENCIES, PAYMENT_METHODS, STORE_STATUSES, STORE_TYPES } from "@/lib/config";
import { createStore, isSlugTaken, updateStore, useDemoState } from "@/lib/demo-db";
import { slugify } from "@/lib/format";
import type { CurrencyCode, PaymentMethodId, Store, StoreStatus, StoreType } from "@/lib/types";
import {
  hasErrors,
  isDomain,
  isEmail,
  isHexColor,
  isHttpUrl,
  isSlug,
  type FieldErrors,
} from "@/lib/validation";

interface StoreFormValues {
  name: string;
  type: StoreType | "";
  status: StoreStatus;
  ownerName: string;
  ownerEmail: string;
  currency: CurrencyCode;
  country: string;
  slug: string;
  accentColor: string;
  domain: string;
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

function initialValues(store: Store | undefined, defaults: { currency: CurrencyCode; country: string }): StoreFormValues {
  const methods = Object.fromEntries(PAYMENT_METHODS.map((m) => [m.id, m.id === "cash_on_delivery"])) as Record<PaymentMethodId, boolean>;
  if (!store) {
    return {
      name: "", type: "", status: "draft", ownerName: "", ownerEmail: "",
      currency: defaults.currency, country: defaults.country, slug: "", accentColor: "#0f766e", domain: "",
      logoUrl: "", deliveryFee: "25", freeDeliveryThreshold: "0", paymentMethods: methods,
      tagline: "", heroTitle: "", heroText: "", aboutText: "", contactEmail: "", contactPhone: "", contactAddress: "",
    };
  }
  const s = store.settings;
  for (const m of s.paymentMethods) methods[m.id] = m.enabled;
  return {
    name: store.name, type: store.type, status: store.status, ownerName: store.ownerName, ownerEmail: store.ownerEmail,
    currency: s.currency, country: s.country, slug: store.slug, accentColor: s.accentColor, domain: s.domain,
    logoUrl: s.logoUrl, deliveryFee: String(s.deliveryFee), freeDeliveryThreshold: String(s.freeDeliveryThreshold),
    paymentMethods: methods, tagline: s.tagline, heroTitle: s.heroTitle, heroText: s.heroText, aboutText: s.aboutText,
    contactEmail: s.contactEmail, contactPhone: s.contactPhone, contactAddress: s.contactAddress,
  };
}

function isMoney(value: string) {
  return value.trim() !== "" && Number.isFinite(Number(value)) && Number(value) >= 0;
}

/**
 * Create mode: the basic fields needed to start a new client store.
 * Edit mode: every per-store setting (used on the Store settings page).
 */
export function StoreForm({ mode, store }: { mode: "create" | "edit"; store?: Store }) {
  const router = useRouter();
  const state = useDemoState();
  const [values, setValues] = useState(() =>
    initialValues(store, {
      currency: state?.agency.defaultCurrency ?? "AED",
      country: state?.agency.defaultCountry ?? "United Arab Emirates",
    }),
  );
  const [slugEdited, setSlugEdited] = useState(mode === "edit");
  const [errors, setErrors] = useState<FieldErrors<StoreFormValues>>({});
  const [saved, setSaved] = useState(false);
  const isEdit = mode === "edit";

  function set<K extends keyof StoreFormValues>(key: K, value: StoreFormValues[K]) {
    setSaved(false);
    if (key === "slug") setSlugEdited(true);
    setValues((v) => {
      const next = { ...v, [key]: value };
      // Suggest a slug from the store name until the slug is edited by hand.
      if (key === "name" && !slugEdited) next.slug = slugify(String(value));
      return next;
    });
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function validate(v: StoreFormValues) {
    const e: FieldErrors<StoreFormValues> = {};
    if (v.name.trim().length < 2) e.name = "Enter the store name.";
    if (!v.type) e.type = "Choose the store category.";
    if (v.ownerName.trim().length < 2) e.ownerName = "Enter the owner or contact name.";
    if (!isEmail(v.ownerEmail)) e.ownerEmail = "Enter a valid email address.";
    if (!v.country) e.country = "Choose a country or region.";
    if (!isSlug(v.slug)) e.slug = "Use lowercase letters, numbers and single hyphens, e.g. my-store.";
    else if (state && isSlugTaken(state, v.slug, store?.id)) e.slug = "Another store already uses this slug.";
    if (!isHexColor(v.accentColor)) e.accentColor = "Use a hex colour such as #0f766e.";
    if (v.domain.trim()) {
      if (!isDomain(v.domain)) e.domain = "Enter a domain like shop.example.com (no https://).";
      else if (state?.stores.some((s) => s.id !== store?.id && s.settings.domain.toLowerCase() === v.domain.trim().toLowerCase())) {
        e.domain = "Another store already uses this domain.";
      }
    }
    if (isEdit) {
      if (v.logoUrl.trim() && !isHttpUrl(v.logoUrl.trim())) e.logoUrl = "Enter a full URL starting with https://";
      if (!isMoney(v.deliveryFee)) e.deliveryFee = "Enter 0 or a positive amount.";
      if (!isMoney(v.freeDeliveryThreshold)) e.freeDeliveryThreshold = "Enter 0 or a positive amount.";
      if (!v.heroTitle.trim()) e.heroTitle = "Enter a homepage headline.";
      if (v.contactEmail.trim() && !isEmail(v.contactEmail)) e.contactEmail = "Enter a valid email address.";
    }
    return e;
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const found = validate(values);
    setErrors(found);
    if (hasErrors(found)) {
      document.getElementById(`store-${Object.keys(found)[0]}`)?.focus();
      return;
    }
    const base = {
      name: values.name.trim(),
      slug: values.slug,
      type: values.type as StoreType,
      status: values.status,
      ownerName: values.ownerName.trim(),
      ownerEmail: values.ownerEmail.trim(),
    };
    const coreSettings = {
      currency: values.currency,
      country: values.country,
      accentColor: values.accentColor.toLowerCase(),
      domain: values.domain.trim().toLowerCase(),
    };

    if (!isEdit) {
      const created = createStore({ ...base, settings: coreSettings });
      router.push(`/admin/stores/${created.id}?created=1`);
      return;
    }
    if (!store) return;
    updateStore(store.id, {
      ...base,
      settings: {
        ...coreSettings,
        logoUrl: values.logoUrl.trim(),
        deliveryFee: Number(values.deliveryFee),
        freeDeliveryThreshold: Number(values.freeDeliveryThreshold),
        paymentMethods: PAYMENT_METHODS.map((m) => ({
          id: m.id,
          // Online card payment cannot be switched on without a real provider.
          enabled: m.requiresProvider ? false : values.paymentMethods[m.id],
        })),
        tagline: values.tagline.trim(),
        heroTitle: values.heroTitle.trim(),
        heroText: values.heroText.trim(),
        aboutText: values.aboutText.trim(),
        contactEmail: values.contactEmail.trim(),
        contactPhone: values.contactPhone.trim(),
        contactAddress: values.contactAddress.trim(),
      },
    });
    setSaved(true);
  }

  const text = (key: keyof StoreFormValues, label: string, opts: { required?: boolean; hint?: ReactNode; type?: string; placeholder?: string; className?: string } = {}) => (
    <Field label={label} htmlFor={`store-${key}`} required={opts.required} error={errors[key]} hint={opts.hint} className={opts.className}>
      <input
        {...errorProps(`store-${key}`, errors[key])}
        type={opts.type ?? "text"}
        placeholder={opts.placeholder}
        value={values[key] as string}
        onChange={(e) => set(key, e.target.value as never)}
        className={inputClass(!!errors[key])}
      />
    </Field>
  );

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      {hasErrors(errors) && (
        <Notice tone="warning">Please fix the highlighted fields.</Notice>
      )}

      <Section title="Store details" description="Basic information about this client store.">
        {text("name", "Store name", { required: true, placeholder: "e.g. Nest & Oak Home" })}
        <Field label="Store category / type" htmlFor="store-type" required error={errors.type}>
          <select
            {...errorProps("store-type", errors.type)}
            value={values.type}
            onChange={(e) => set("type", e.target.value as StoreType)}
            className={inputClass(!!errors.type)}
          >
            <option value="">Choose category…</option>
            {STORE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </Field>
        {text("ownerName", "Owner / contact name", { required: true })}
        {text("ownerEmail", "Contact email", { required: true, type: "email" })}
        <Field label="Status" htmlFor="store-status" hint="Draft and paused stores do not accept storefront orders.">
          <select id="store-status" value={values.status} onChange={(e) => set("status", e.target.value as StoreStatus)} className={inputClass()}>
            {STORE_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </Field>
      </Section>

      <Section title="Region & currency">
        <Field label="Currency" htmlFor="store-currency" required>
          <select id="store-currency" value={values.currency} onChange={(e) => set("currency", e.target.value as CurrencyCode)} className={inputClass()}>
            {CURRENCIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </Field>
        <Field label="Country / region" htmlFor="store-country" required error={errors.country}>
          <select {...errorProps("store-country", errors.country)} value={values.country} onChange={(e) => set("country", e.target.value)} className={inputClass(!!errors.country)}>
            {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
      </Section>

      <Section title="Branding & web address">
        {text("slug", "Store slug", {
          required: true,
          hint: "Short unique name used in links and IDs, e.g. nest-and-oak.",
        })}
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
        {text("domain", "Domain", {
          placeholder: "shop.example.com",
          className: "sm:col-span-2",
          hint: "Configuration only. This demo does not register domains or connect DNS.",
        })}
        {isEdit && text("logoUrl", "Logo image URL", {
          placeholder: "https://…",
          className: "sm:col-span-2",
          hint: "Optional. If empty or broken, the store's initial is shown in its accent colour.",
        })}
      </Section>

      {isEdit && (
        <>
          <Section title="Delivery" description={`Amounts in ${values.currency}.`}>
            {text("deliveryFee", "Delivery fee", { required: true, type: "number" })}
            {text("freeDeliveryThreshold", "Free delivery over", { type: "number", hint: "Use 0 for no free delivery." })}
          </Section>

          <Section
            title="Payment methods"
            description="Choose which payment options customers see at checkout."
          >
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

          <Section title="Storefront content" description="Text shown on this store's homepage, About and Contact pages.">
            {text("tagline", "Tagline", { className: "sm:col-span-2" })}
            {text("heroTitle", "Homepage headline", { required: true, className: "sm:col-span-2" })}
            <Field label="Homepage intro" htmlFor="store-heroText" className="sm:col-span-2">
              <textarea id="store-heroText" rows={2} value={values.heroText} onChange={(e) => set("heroText", e.target.value)} className={inputClass()} />
            </Field>
            <Field label="About page text" htmlFor="store-aboutText" className="sm:col-span-2" hint="Leave a blank line between paragraphs.">
              <textarea id="store-aboutText" rows={5} value={values.aboutText} onChange={(e) => set("aboutText", e.target.value)} className={inputClass()} />
            </Field>
            {text("contactEmail", "Public contact email", { type: "email" })}
            {text("contactPhone", "Public phone", { type: "tel" })}
            {text("contactAddress", "Address", { className: "sm:col-span-2" })}
          </Section>
        </>
      )}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
        {saved && (
          <p role="status" className="text-sm font-medium text-emerald-700">
            Settings saved in this browser.
          </p>
        )}
        <button
          type="button"
          className={buttonClass("secondary")}
          onClick={() => router.push(isEdit && store ? `/admin/stores/${store.id}` : "/admin/stores")}
        >
          Cancel
        </button>
        <button type="submit" className={buttonClass("primary")}>
          {isEdit ? "Save settings" : "Create store"}
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
