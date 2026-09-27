"use client";

import { ChevronDown } from "lucide-react";
import { PLATFORM_CONTACT } from "@/lib/platform-contact";

const summaryStyles = {
  toolbar:
    "inline-flex cursor-pointer list-none items-center gap-1 rounded px-2 py-1 font-medium text-white underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white [&::-webkit-details-marker]:hidden",
  footer:
    "inline-flex cursor-pointer list-none items-center gap-1 font-medium text-slate-700 underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 [&::-webkit-details-marker]:hidden",
} as const;

export function PlatformContactDisclosure({
  label,
  variant = "toolbar",
}: {
  label: string;
  variant?: keyof typeof summaryStyles;
}) {
  const email = PLATFORM_CONTACT.email.trim();
  const phone = PLATFORM_CONTACT.phone.trim();
  const whatsapp = PLATFORM_CONTACT.whatsapp.trim();
  const address = PLATFORM_CONTACT.address.trim();
  const whatsappDigits = whatsapp.replace(/\D/g, "");
  const hasContact = Boolean(email || phone || whatsappDigits || address);

  return (
    <details className="group relative block w-full sm:inline-block sm:w-auto">
      <summary className={summaryStyles[variant]}>
        {label}
        <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" aria-hidden />
      </summary>
      <section
        aria-label="Platform admin contact information"
        className="relative mt-2 w-full rounded-xl border border-slate-200 bg-white p-4 text-left text-sm text-slate-700 shadow-xl sm:absolute sm:right-0 sm:top-full sm:z-50 sm:mt-2 sm:w-80 sm:p-5"
      >
        <h2 className="font-semibold text-slate-900">Want your own online store?</h2>
        <p className="mt-1">Contact us to request one.</p>
        {hasContact ? (
          <dl className="mt-4 space-y-2 break-words">
            {email && (
              <div>
                <dt className="sr-only">Email</dt>
                <dd><a className="text-teal-800 underline underline-offset-2" href={`mailto:${email}`}>{email}</a></dd>
              </div>
            )}
            {phone && (
              <div>
                <dt className="sr-only">Phone</dt>
                <dd><a className="text-teal-800 underline underline-offset-2" href={`tel:${phone.replace(/[^\d+]/g, "")}`}>{phone}</a></dd>
              </div>
            )}
            {whatsappDigits && (
              <div>
                <dt className="sr-only">WhatsApp</dt>
                <dd>
                  <a
                    className="text-teal-800 underline underline-offset-2"
                    href={`https://wa.me/${whatsappDigits}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    WhatsApp: {whatsapp}
                  </a>
                </dd>
              </div>
            )}
            {address && (
              <div>
                <dt className="sr-only">Address</dt>
                <dd>{address}</dd>
              </div>
            )}
          </dl>
        ) : (
          <p className="mt-3 text-slate-500">Contact details have not been configured yet.</p>
        )}
      </section>
    </details>
  );
}
