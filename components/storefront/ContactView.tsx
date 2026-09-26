"use client";

import { useState, type FormEvent } from "react";
import { Mail, MapPin, Phone } from "lucide-react";
import { buttonClass, errorProps, Field, inputClass, Notice } from "@/components/ui";
import { useStorefront } from "@/lib/storefront";
import { hasErrors, isEmail, type FieldErrors } from "@/lib/validation";

interface ContactForm {
  name: string;
  email: string;
  subject: string;
  message: string;
}

const emptyForm: ContactForm = { name: "", email: "", subject: "", message: "" };

export function ContactView() {
  const view = useStorefront();
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<FieldErrors<ContactForm>>({});
  const [submitted, setSubmitted] = useState(false);
  if (!view) return null;
  const { store } = view;
  const { settings } = store;

  function update(key: keyof ContactForm, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const e: FieldErrors<ContactForm> = {};
    if (form.name.trim().length < 2) e.name = "Please enter your name.";
    if (!isEmail(form.email)) e.email = "Please enter a valid email address.";
    if (form.message.trim().length < 10) e.message = "Please write at least 10 characters.";
    setErrors(e);
    if (hasErrors(e)) {
      document.getElementById(`contact-${Object.keys(e)[0]}`)?.focus();
      return;
    }
    // Demo only: the message is not sent or stored anywhere.
    setSubmitted(true);
    setForm(emptyForm);
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 md:py-16">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Contact {store.name}</h1>
      <p className="mt-3 max-w-xl text-slate-600">
        Questions about a product, delivery or an order? Get in touch.
      </p>

      <div className="mt-10 grid gap-10 md:grid-cols-[2fr_3fr]">
        <ul className="space-y-4">
          {settings.contactEmail && (
            <ContactItem icon={Mail} label="Email">
              <a href={`mailto:${settings.contactEmail}`} className="hover:text-brand hover:underline">
                {settings.contactEmail}
              </a>
            </ContactItem>
          )}
          {settings.contactPhone && (
            <ContactItem icon={Phone} label="Phone">
              <a href={`tel:${settings.contactPhone.replace(/\s/g, "")}`} className="hover:text-brand hover:underline">
                {settings.contactPhone}
              </a>
            </ContactItem>
          )}
          {settings.contactAddress && (
            <ContactItem icon={MapPin} label="Address">{settings.contactAddress}</ContactItem>
          )}
          {!settings.contactEmail && !settings.contactPhone && !settings.contactAddress && (
            <li className="text-sm text-slate-500">Contact details have not been added yet.</li>
          )}
        </ul>

        <div className="rounded-2xl border border-slate-200 p-6">
          <Notice className="mb-6">
            <strong>Demo form.</strong> Messages are checked for errors but are not sent to a
            server or email inbox, and are not saved.
          </Notice>
          {submitted && (
            <Notice tone="success" className="mb-6">
              Thanks! Your message passed validation. In this demo it was not sent anywhere.
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
              <button type="submit" className={buttonClass("primary", { tone: "brand" })}>
                Send message (demo)
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
    <li className="flex gap-4 rounded-2xl border border-slate-200 p-5">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand">
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <span className="min-w-0 text-sm">
        <span className="block font-semibold text-slate-900">{label}</span>
        <span className="break-words text-slate-600">{children}</span>
      </span>
    </li>
  );
}
