"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Mail, MapPin, Phone } from "lucide-react";
import {
  sfButtonClass,
  sfErrorProps as errorProps,
  SfField as Field,
  sfInputClass as inputClass,
  SfNotice as Notice,
} from "@/components/storefront/primitives";
import type { StorefrontStore } from "@/lib/storefront-types";
import { validateInquiry, type InquiryFieldErrors } from "@/lib/inquiry";
import { submitInquiryAction } from "@/app/(storefront)/actions";

interface ContactForm {
  name: string;
  email: string;
  subject: string;
  message: string;
}

const emptyForm: ContactForm = { name: "", email: "", subject: "", message: "" };

/** Shared contact page; the store comes from the server layout, and the action re-checks it against the host. */
export function ContactView({ store }: { store: StorefrontStore }) {
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<InquiryFieldErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState("");
  const [isPending, startTransition] = useTransition();
  function update(key: keyof ContactForm, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
    if (serverError) setServerError("");
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const { errors: fieldErrors } = validateInquiry(form);
    setErrors(fieldErrors);
    setServerError("");
    const firstError = Object.keys(fieldErrors).find((key) => fieldErrors[key as keyof InquiryFieldErrors]);
    if (firstError) {
      document.getElementById(`contact-${firstError}`)?.focus();
      return;
    }
    startTransition(async () => {
      const result = await submitInquiryAction(store.id, form);
      if (!result.ok) {
        setServerError(result.error);
        if (result.fieldErrors) setErrors(result.fieldErrors as InquiryFieldErrors);
        return;
      }
      setSubmitted(true);
      setForm(emptyForm);
    });
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-12 md:py-16">
      <h1 className="font-heading text-2xl font-bold tracking-tight sm:text-4xl">Contact {store.name}</h1>
      <p className="mt-3 max-w-xl text-muted-foreground">
        Questions about a product, delivery or an order? Get in touch.
      </p>

      <div className="mt-10 grid gap-10 md:grid-cols-[2fr_3fr]">
        <ul className="space-y-4">
          {store.contactEmail && (
            <ContactItem icon={Mail} label="Email">
              <a href={`mailto:${store.contactEmail}`} className="hover:text-accent hover:underline">
                {store.contactEmail}
              </a>
            </ContactItem>
          )}
          {store.contactPhone && (
            <ContactItem icon={Phone} label="Phone">
              <a href={`tel:${store.contactPhone.replace(/\s/g, "")}`} className="hover:text-accent hover:underline">
                {store.contactPhone}
              </a>
            </ContactItem>
          )}
          {store.contactAddress && (
            <ContactItem icon={MapPin} label="Address">{store.contactAddress}</ContactItem>
          )}
          {!store.contactEmail && !store.contactPhone && !store.contactAddress && (
            <li className="text-sm text-muted-foreground">Contact details have not been added yet.</li>
          )}
        </ul>

        <div className="rounded-card border border-border bg-surface p-4 sm:p-6">
          {submitted && (
            <Notice tone="success" className="mb-6">
              Thanks! Your message has been sent to the store.
            </Notice>
          )}
          {serverError && (
            <Notice tone="error" className="mb-6">
              {serverError}
            </Notice>
          )}
          <form onSubmit={handleSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" htmlFor="contact-name" required error={errors.name}>
              <input
                {...errorProps("contact-name", errors.name)}
                autoComplete="name"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                className={inputClass(!!errors.name)}
              />
            </Field>
            <Field label="Email" htmlFor="contact-email" required error={errors.email}>
              <input
                {...errorProps("contact-email", errors.email)}
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                className={inputClass(!!errors.email)}
              />
            </Field>
            <Field label="Subject" htmlFor="contact-subject" className="sm:col-span-2">
              <input
                id="contact-subject"
                value={form.subject}
                onChange={(e) => update("subject", e.target.value)}
                className={inputClass()}
              />
            </Field>
            <Field label="Message" htmlFor="contact-message" required error={errors.message} className="sm:col-span-2">
              <textarea
                {...errorProps("contact-message", errors.message)}
                rows={5}
                value={form.message}
                onChange={(e) => update("message", e.target.value)}
                className={inputClass(!!errors.message)}
              />
            </Field>
            <div className="sm:col-span-2">
              <button type="submit" disabled={isPending} className={sfButtonClass("primary")}>
                {isPending ? "Sending…" : "Send message"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}

function ContactItem({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Mail;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex gap-4 rounded-card border border-border bg-surface p-5">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <span className="min-w-0 text-sm">
        <span className="block font-semibold text-foreground">{label}</span>
        <span className="break-words text-muted-foreground">{children}</span>
      </span>
    </li>
  );
}
