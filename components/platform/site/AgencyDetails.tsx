import type { ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";
import { telHref, whatsappHref, type AgencyProfile } from "@/lib/agency/profile";
import { focusRing } from "./styles";

// Agency contact details and social accounts, exactly as configured in
// Agency settings. Every row is optional: an empty field renders nothing —
// no label, no icon, no placeholder.

const link = `break-words transition-colors hover:text-accent ${focusRing}`;

export function hasContactDetails(contact: AgencyProfile["contact"]) {
  return Boolean(contact.email || contact.phone || contact.whatsapp || contact.address.length > 0 || contact.businessHours);
}

/** Configured contact details as a definition list (labels are visible only to screen readers unless `labelled`). */
export function ContactDetails({
  contact,
  labelled = false,
  className = "space-y-3",
}: {
  contact: AgencyProfile["contact"];
  labelled?: boolean;
  className?: string;
}) {
  const whatsapp = contact.whatsapp ? whatsappHref(contact.whatsapp) : null;
  const rows: { label: string; content: ReactNode }[] = [];
  if (contact.email) rows.push({ label: "Email", content: <a href={`mailto:${contact.email}`} className={link}>{contact.email}</a> });
  if (contact.phone) rows.push({ label: "Phone", content: <a href={telHref(contact.phone)} className={link}>{contact.phone}</a> });
  if (contact.whatsapp && whatsapp) {
    rows.push({
      label: "WhatsApp",
      content: (
        <a href={whatsapp} target="_blank" rel="noopener" className={link}>
          {contact.whatsapp}
          <span className="sr-only"> on WhatsApp (opens in a new tab)</span>
        </a>
      ),
    });
  }
  if (contact.address.length > 0) {
    rows.push({ label: "Address", content: <address className="not-italic">{contact.address.map((line) => <span key={line} className="block">{line}</span>)}</address> });
  }
  if (contact.businessHours) rows.push({ label: "Hours", content: contact.businessHours });
  if (rows.length === 0) return null;
  return (
    <dl className={`text-sm ${className}`}>
      {rows.map((row) => (
        <div key={row.label}>
          <dt className={labelled ? "font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground rtl:tracking-normal" : "sr-only"}>{row.label}</dt>
          <dd className={labelled ? "mt-1 text-foreground/85" : "text-foreground/85"}>{row.content}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Configured social accounts; nothing when none are set. */
export function SocialLinks({ social, className = "" }: { social: AgencyProfile["social"]; className?: string }) {
  if (social.length === 0) return null;
  return (
    <ul className={className}>
      {social.map((account) => (
        <li key={`${account.platform}-${account.url}`}>
          <a href={account.url} target="_blank" rel="noopener me" className={`group inline-flex min-h-9 items-center gap-1.5 text-sm text-foreground/85 ${link}`}>
            {account.displayLabel}
            <span className="sr-only"> (opens in a new tab)</span>
            <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 rtl:-scale-x-100" aria-hidden />
          </a>
        </li>
      ))}
    </ul>
  );
}
