"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent, type ReactNode } from "react";
import { ExternalLink, Plus, RotateCcw, Trash2 } from "lucide-react";
import { updateAgencySettingsAction } from "@/app/admin/actions";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { buttonClass, Card, errorProps, Field, inputClass, Notice, PageHeader } from "@/components/ui";
import {
  AGENCY_DEFAULTS,
  AGENCY_LIMITS,
  SOCIAL_PLATFORMS,
  type AgencySettingsInput,
  type SocialPlatform,
} from "@/lib/agency/profile";
import { COUNTRIES, CURRENCIES } from "@/lib/config";
import { resetDemoData, updateAgency, useDemoState } from "@/lib/demo-db";
import { resetStorefrontStore } from "@/lib/storefront";
import type { AgencySettings } from "@/lib/types";

// ---------------------------------------------------------------
// AGENCY SETTINGS — the single source of truth for the public agency
// website (header, footer, every page and its metadata). Saved in the
// database through updateAgencySettingsAction (platform owner only).
// Empty fields are simply not shown publicly. The small "Admin
// preferences" card below remains browser-only, as before.
// ---------------------------------------------------------------

type TextKey = Exclude<keyof AgencySettingsInput, "team" | "socialLinks" | "logoIsWordmark">;
type Values = Record<TextKey, string> & {
  logoIsWordmark: boolean;
  team: { name: string; title: string; bio: string; imageUrl: string }[];
  socialLinks: { platform: SocialPlatform; url: string; label: string }[];
};

const SECTIONS = [
  { id: "identity", label: "Identity" },
  { id: "about", label: "About" },
  { id: "contact", label: "Contact" },
  { id: "social", label: "Social" },
  { id: "website", label: "Website & SEO" },
] as const;

function toValues(initial: AgencySettingsInput | null, fallbackName: string): Values {
  const text = (value: string | null | undefined) => value ?? "";
  return {
    platformName: initial?.platformName ?? fallbackName,
    contactEmail: text(initial?.contactEmail),
    tagline: text(initial?.tagline),
    description: text(initial?.description),
    logoUrl: text(initial?.logoUrl),
    logoIsWordmark: initial?.logoIsWordmark ?? false,
    brandMarkUrl: text(initial?.brandMarkUrl),
    aboutTitle: text(initial?.aboutTitle),
    aboutBody: text(initial?.aboutBody),
    phone: text(initial?.phone),
    whatsapp: text(initial?.whatsapp),
    addressLine: text(initial?.addressLine),
    city: text(initial?.city),
    region: text(initial?.region),
    country: text(initial?.country),
    postalCode: text(initial?.postalCode),
    businessHours: text(initial?.businessHours),
    enquiryEmail: text(initial?.enquiryEmail),
    seoTitle: text(initial?.seoTitle),
    seoDescription: text(initial?.seoDescription),
    ogImageUrl: text(initial?.ogImageUrl),
    team: (initial?.team ?? []).map((member) => ({ name: member.name, title: member.title, bio: member.bio ?? "", imageUrl: member.imageUrl ?? "" })),
    socialLinks: (initial?.socialLinks ?? []).map((link) => ({ platform: link.platform, url: link.url, label: link.label ?? "" })),
  };
}

export function AgencySettingsView({
  initial,
  fallbackName,
  publicSiteUrl,
}: {
  initial: AgencySettingsInput | null;
  fallbackName: string;
  publicSiteUrl: string | null;
}) {
  const router = useRouter();
  const [values, setValues] = useState<Values>(() => toValues(initial, fallbackName));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const set = <K extends keyof Values>(key: K, value: Values[K]) => {
    setMessage(null);
    setValues((current) => ({ ...current, [key]: value }));
  };

  function submit(event: FormEvent) {
    event.preventDefault();
    setErrors({});
    setFormError(null);
    setMessage(null);
    const submitted = values;
    startTransition(async () => {
      const result = await updateAgencySettingsAction(submitted);
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        setFormError(result.error);
        return;
      }
      setValues(toValues(result.data, fallbackName));
      setMessage(result.message ?? "Saved.");
      router.refresh();
    });
  }

  const text = (key: TextKey, label: string, options: { hint?: ReactNode; required?: boolean; type?: string; multiline?: number; placeholder?: string; max?: number; className?: string } = {}) => (
    <Field label={label} htmlFor={`agency-${key}`} required={options.required} error={errors[key]} hint={options.hint} className={options.className}>
      {options.multiline ? (
        <textarea
          {...errorProps(`agency-${key}`, errors[key])}
          rows={options.multiline}
          maxLength={options.max}
          placeholder={options.placeholder}
          value={values[key]}
          onChange={(event) => set(key, event.target.value)}
          className={`${inputClass(!!errors[key])} resize-y`}
        />
      ) : (
        <input
          {...errorProps(`agency-${key}`, errors[key])}
          type={options.type ?? "text"}
          maxLength={options.max}
          placeholder={options.placeholder}
          value={values[key]}
          onChange={(event) => set(key, event.target.value)}
          className={inputClass(!!errors[key])}
        />
      )}
    </Field>
  );

  const imageHint = "An https:// image URL, or a file in public/brand/ referenced as /brand/logo.svg.";

  return (
    <>
      <PageHeader
        title="Agency settings"
        description="The single source of truth for your public agency website: its name, logo, story, people, contact details, social accounts and search appearance."
        breadcrumbs={[{ label: "Agency Admin", href: "/admin" }, { label: "Settings" }]}
        actions={
          publicSiteUrl ? (
            <a href={publicSiteUrl} target="_blank" rel="noreferrer" className={buttonClass("secondary")}>
              View public website <ExternalLink className="h-4 w-4" aria-hidden />
            </a>
          ) : undefined
        }
      />

      <nav aria-label="Agency settings sections" className="mb-6 flex flex-wrap gap-2">
        {SECTIONS.map((section) => (
          <a key={section.id} href={`#${section.id}`} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:border-teal-600 hover:text-teal-800">
            {section.label}
          </a>
        ))}
      </nav>

      <Notice className="mb-6">
        Everything here is public once filled in. Empty fields are simply not shown on the website — nothing is invented in
        their place. Store and client information is never part of these settings.
      </Notice>

      <form onSubmit={submit} noValidate className="space-y-6">
        <Section id="identity" title="Identity" description="How the agency appears in the header, footer and browser.">
          <div className="grid gap-5 sm:grid-cols-2">
            {text("platformName", "Agency name", { required: true, max: AGENCY_LIMITS.name, hint: "Also the public website's name." })}
            {text("tagline", "Tagline", { max: AGENCY_LIMITS.tagline, placeholder: AGENCY_DEFAULTS.tagline, hint: "Shown above the homepage headline." })}
            {text("description", "Short description", { multiline: 3, max: AGENCY_LIMITS.description, placeholder: AGENCY_DEFAULTS.description, className: "sm:col-span-2", hint: "Used in the footer and, unless set below, as the search description." })}
            {text("logoUrl", "Logo", { max: AGENCY_LIMITS.url, hint: imageHint })}
            {text("brandMarkUrl", "Brand mark / website icon", { max: AGENCY_LIMITS.url, hint: "A square mark, used as the browser icon. " + imageHint })}
            <label className="flex items-start gap-2 text-sm text-slate-700 sm:col-span-2">
              <input type="checkbox" checked={values.logoIsWordmark} onChange={(event) => set("logoIsWordmark", event.target.checked)} className="mt-0.5 h-4 w-4 accent-teal-700" />
              <span>The logo already includes the agency name (don&apos;t repeat the name beside it).</span>
            </label>
          </div>
        </Section>

        <Section id="about" title="About" description="The story and people on the About page.">
          <div className="grid gap-5">
            {text("aboutTitle", "About title", { max: AGENCY_LIMITS.aboutTitle, placeholder: AGENCY_DEFAULTS.aboutTitle })}
            {text("aboutBody", "Story", { multiline: 6, max: AGENCY_LIMITS.aboutBody, placeholder: AGENCY_DEFAULTS.aboutBody.join("\n\n"), hint: "Separate paragraphs with a blank line." })}
          </div>
          <h3 className="mt-8 text-sm font-semibold text-slate-900">Founders &amp; team</h3>
          {errors.team && <p className="mt-2 text-sm text-red-600">{errors.team}</p>}
          <ul className="mt-3 space-y-4">
            {values.team.map((member, index) => {
              const update = (patch: Partial<Values["team"][number]>) => set("team", values.team.map((m, i) => (i === index ? { ...m, ...patch } : m)));
              const field = (key: keyof Values["team"][number], label: string, extra: { multiline?: boolean; required?: boolean; hint?: string; max: number }) => {
                const id = `agency-team-${index}-${key}`;
                const error = errors[`team.${index}.${key}`];
                return (
                  <Field label={label} htmlFor={id} required={extra.required} error={error} hint={extra.hint} className={extra.multiline ? "sm:col-span-2" : ""}>
                    {extra.multiline ? (
                      <textarea {...errorProps(id, error)} rows={3} maxLength={extra.max} value={member[key]} onChange={(event) => update({ [key]: event.target.value })} className={`${inputClass(!!error)} resize-y`} />
                    ) : (
                      <input {...errorProps(id, error)} maxLength={extra.max} value={member[key]} onChange={(event) => update({ [key]: event.target.value })} className={inputClass(!!error)} />
                    )}
                  </Field>
                );
              };
              return (
                <li key={index} className="rounded-xl border border-slate-200 p-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    {field("name", "Name", { required: true, max: AGENCY_LIMITS.memberName })}
                    {field("title", "Role", { max: AGENCY_LIMITS.memberTitle, hint: "For example: Founder, Co-Founder." })}
                    {field("bio", "Bio", { multiline: true, max: AGENCY_LIMITS.memberBio })}
                    {field("imageUrl", "Profile image", { max: AGENCY_LIMITS.url, hint: imageHint })}
                  </div>
                  <button type="button" onClick={() => set("team", values.team.filter((_, i) => i !== index))} className={`${buttonClass("ghost", { size: "sm" })} mt-3 text-red-700`}>
                    <Trash2 className="h-4 w-4" aria-hidden /> Remove {member.name || "person"}
                  </button>
                </li>
              );
            })}
          </ul>
          {values.team.length < AGENCY_LIMITS.team && (
            <button type="button" onClick={() => set("team", [...values.team, { name: "", title: "", bio: "", imageUrl: "" }])} className={`${buttonClass("secondary", { size: "sm" })} mt-4`}>
              <Plus className="h-4 w-4" aria-hidden /> Add a person
            </button>
          )}
        </Section>

        <Section id="contact" title="Contact" description="Shown in the footer and on the Contact page when filled in.">
          <div className="grid gap-5 sm:grid-cols-2">
            {text("contactEmail", "Business email", { type: "email", max: AGENCY_LIMITS.email })}
            {text("enquiryEmail", "Project enquiries go to", { type: "email", max: AGENCY_LIMITS.email, hint: "The Contact page's brief is addressed here (it is visible to the visitor). Defaults to the business email." })}
            {text("phone", "Phone", { type: "tel", max: AGENCY_LIMITS.phone })}
            {text("whatsapp", "WhatsApp", { type: "tel", max: AGENCY_LIMITS.phone })}
            {text("addressLine", "Address", { max: AGENCY_LIMITS.addressLine, className: "sm:col-span-2" })}
            {text("city", "City", { max: AGENCY_LIMITS.addressPart })}
            {text("region", "State / province", { max: AGENCY_LIMITS.addressPart })}
            {text("postalCode", "Postal / ZIP code", { max: AGENCY_LIMITS.postalCode })}
            {text("country", "Country", { max: AGENCY_LIMITS.addressPart })}
            {text("businessHours", "Business hours", { max: AGENCY_LIMITS.businessHours, className: "sm:col-span-2", placeholder: "e.g. Sunday–Thursday, 9:00–18:00" })}
          </div>
        </Section>

        <Section id="social" title="Social accounts" description="Only accounts listed here appear on the website.">
          {errors.socialLinks && <p className="mb-3 text-sm text-red-600">{errors.socialLinks}</p>}
          <ul className="space-y-3">
            {values.socialLinks.map((link, index) => {
              const update = (patch: Partial<Values["socialLinks"][number]>) => set("socialLinks", values.socialLinks.map((l, i) => (i === index ? { ...l, ...patch } : l)));
              const urlError = errors[`socialLinks.${index}.url`];
              const labelError = errors[`socialLinks.${index}.label`];
              return (
                <li key={index} className="grid gap-3 rounded-xl border border-slate-200 p-4 sm:grid-cols-[10rem_1fr_12rem_auto] sm:items-start">
                  <Field label="Platform" htmlFor={`agency-social-${index}-platform`}>
                    <select id={`agency-social-${index}-platform`} value={link.platform} onChange={(event) => update({ platform: event.target.value as SocialPlatform })} className={inputClass()}>
                      {SOCIAL_PLATFORMS.map((platform) => (
                        <option key={platform.key} value={platform.key}>{platform.label}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Profile URL" htmlFor={`agency-social-${index}-url`} required error={urlError}>
                    <input {...errorProps(`agency-social-${index}-url`, urlError)} type="url" inputMode="url" placeholder="https://" maxLength={AGENCY_LIMITS.url} value={link.url} onChange={(event) => update({ url: event.target.value })} className={inputClass(!!urlError)} />
                  </Field>
                  <Field label={link.platform === "custom" ? "Name" : "Label (optional)"} htmlFor={`agency-social-${index}-label`} required={link.platform === "custom"} error={labelError}>
                    <input {...errorProps(`agency-social-${index}-label`, labelError)} maxLength={AGENCY_LIMITS.socialLabel} value={link.label} onChange={(event) => update({ label: event.target.value })} className={inputClass(!!labelError)} />
                  </Field>
                  <button type="button" onClick={() => set("socialLinks", values.socialLinks.filter((_, i) => i !== index))} className={`${buttonClass("ghost", { size: "sm" })} text-red-700 sm:mt-7`} aria-label={`Remove social account ${index + 1}`}>
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </button>
                </li>
              );
            })}
          </ul>
          {values.socialLinks.length < AGENCY_LIMITS.social && (
            <button type="button" onClick={() => set("socialLinks", [...values.socialLinks, { platform: "linkedin", url: "", label: "" }])} className={`${buttonClass("secondary", { size: "sm" })} mt-4`}>
              <Plus className="h-4 w-4" aria-hidden /> Add a social account
            </button>
          )}
        </Section>

        <Section id="website" title="Website & SEO" description="The website's name is always the agency name.">
          <div className="grid gap-5 sm:grid-cols-2">
            {text("seoTitle", "Homepage SEO title", { max: AGENCY_LIMITS.seoTitle, placeholder: values.platformName || fallbackName, hint: "Defaults to the agency name. Other pages use “Page | Agency name”." })}
            {text("ogImageUrl", "Social sharing image", { max: AGENCY_LIMITS.url, hint: "Shown when the website is shared. 1200 × 630 works best. " + imageHint })}
            {text("seoDescription", "SEO description", { multiline: 3, max: AGENCY_LIMITS.seoDescription, className: "sm:col-span-2", hint: "Defaults to the short description." })}
          </div>
        </Section>

        <div className="sticky bottom-0 z-10 -mx-1 flex flex-col-reverse gap-3 rounded-xl border border-slate-200 bg-white/95 p-3 backdrop-blur sm:flex-row sm:items-center sm:justify-end">
          {formError && <p role="alert" className="text-sm font-medium text-red-700 sm:me-auto">{formError}</p>}
          {message && <p role="status" className="text-sm font-medium text-emerald-700 sm:me-auto">{message}</p>}
          <button type="submit" disabled={pending} className={buttonClass("primary")}>
            {pending ? "Saving…" : "Save agency settings"}
          </button>
        </div>
      </form>

      <BrowserPreferences />
    </>
  );
}

function Section({ id, title, description, children }: { id: string; title: string; description: string; children: ReactNode }) {
  return (
    <Card className="scroll-mt-6 p-5 sm:p-6">
      <section id={id} aria-labelledby={`${id}-title`}>
        <h2 id={`${id}-title`} className="text-lg font-semibold">{title}</h2>
        <p className="mb-5 mt-1 text-sm text-slate-600">{description}</p>
        {children}
      </section>
    </Card>
  );
}

/** Admin-only conveniences that still live in this browser (not agency data). */
function BrowserPreferences() {
  const state = useDemoState();
  const [resetCount, setResetCount] = useState(0);
  const [confirmReset, setConfirmReset] = useState(false);
  if (!state) return null;
  return (
    <>
      <PreferencesForm key={resetCount} agency={state.agency} />
      <ConfirmDialog
        open={confirmReset}
        title="Reset browser-only settings?"
        confirmLabel="Reset"
        danger
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => {
          resetDemoData();
          resetStorefrontStore();
          setConfirmReset(false);
          setResetCount((n) => n + 1);
        }}
      >
        The admin preferences and this browser&apos;s storefront cart go back to their defaults. Nothing in the database changes.
      </ConfirmDialog>
      <button type="button" className={`${buttonClass("secondary", { size: "sm" })} mt-4`} onClick={() => setConfirmReset(true)}>
        <RotateCcw className="h-4 w-4" aria-hidden />
        Reset browser-only settings
      </button>
    </>
  );
}

function PreferencesForm({ agency }: { agency: AgencySettings }) {
  const [values, setValues] = useState(agency);
  const [saved, setSaved] = useState(false);
  const set = <K extends keyof AgencySettings>(key: K, value: AgencySettings[K]) => {
    setSaved(false);
    setValues((v) => ({ ...v, [key]: value }));
  };
  return (
    <Card className="mt-10 p-5 sm:p-6">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          updateAgency(values);
          setSaved(true);
        }}
      >
        <h2 className="text-lg font-semibold">Admin preferences</h2>
        <p className="mt-1 text-sm text-slate-600">Saved in this browser only. They are not agency information and never appear on the website.</p>
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
        <div className="mt-5 flex items-center justify-end gap-3">
          {saved && <p role="status" className="text-sm font-medium text-emerald-700">Saved in this browser.</p>}
          <button type="submit" className={buttonClass("secondary")}>Save preferences</button>
        </div>
      </form>
    </Card>
  );
}
