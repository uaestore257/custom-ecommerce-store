"use client";

import { useId, useState, type FormEvent } from "react";
import { ArrowUpRight } from "lucide-react";
import { focusRing } from "../styles";

const TIMELINES = ["As soon as possible", "Within 3 months", "3–6 months", "Just exploring"];

/**
 * A project brief that becomes an email in the visitor's own mail app
 * (mailto:). Nothing is sent or stored by this site — the button says so —
 * so no new backend, data store or spam surface is introduced.
 */
export function EnquiryComposer({ email, platformName, services }: { email: string; platformName: string; services: readonly string[] }) {
  const id = useId();
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (service: string) =>
    setSelected((current) => (current.includes(service) ? current.filter((item) => item !== service) : [...current, service]));

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const field = (name: string) => String(data.get(name) ?? "").trim();
    const details = [
      `Name: ${field("name")}`,
      field("company") && `Company: ${field("company")}`,
      field("website") && `Website: ${field("website")}`,
      selected.length > 0 && `Interested in: ${selected.join(", ")}`,
      field("timeline") && `Timeline: ${field("timeline")}`,
    ].filter(Boolean);
    const body = `${details.join("\n")}\n\n${field("message")}`;
    const subject = `Project enquiry${field("company") ? ` — ${field("company")}` : ""} (${platformName})`;
    window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const input = `block w-full min-w-0 border-0 border-b border-border bg-transparent px-0 py-3 text-base text-foreground placeholder:text-muted-foreground/70 transition-colors focus:border-accent focus:outline-none focus:ring-0`;
  const label = "font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground rtl:tracking-normal";

  return (
    <form onSubmit={onSubmit} className="space-y-10" aria-describedby={`${id}-note`}>
      <div className="grid gap-8 sm:grid-cols-2">
        <div>
          <label htmlFor={`${id}-name`} className={label}>
            Your name
          </label>
          <input id={`${id}-name`} name="name" required autoComplete="name" className={input} />
        </div>
        <div>
          <label htmlFor={`${id}-company`} className={label}>
            Company
          </label>
          <input id={`${id}-company`} name="company" autoComplete="organization" className={input} />
        </div>
      </div>
      <div>
        <label htmlFor={`${id}-website`} className={label}>
          Current website <span className="normal-case tracking-normal">(optional)</span>
        </label>
        <input id={`${id}-website`} name="website" type="url" inputMode="url" placeholder="https://" className={input} />
      </div>

      <fieldset>
        <legend className={label}>What do you need?</legend>
        <div className="mt-4 flex flex-wrap gap-2">
          {services.map((service) => {
            const on = selected.includes(service);
            return (
              <button
                key={service}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(service)}
                className={`min-h-11 border px-4 text-sm transition-colors duration-300 ${focusRing} ${
                  on ? "border-accent bg-accent text-accent-foreground" : "border-border text-foreground/85 hover:border-foreground/60"
                }`}
              >
                {service}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div>
        <label htmlFor={`${id}-timeline`} className={label}>
          Timeline
        </label>
        <select id={`${id}-timeline`} name="timeline" defaultValue="" className={`${input} [&>option]:bg-background`}>
          <option value="">Choose one</option>
          {TIMELINES.map((timeline) => (
            <option key={timeline}>{timeline}</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor={`${id}-message`} className={label}>
          Tell us about the project
        </label>
        <textarea
          id={`${id}-message`}
          name="message"
          required
          rows={5}
          placeholder="What you sell or do, who your customers are, and what you want this project to achieve."
          className={`${input} resize-y`}
        />
      </div>

      <div className="flex flex-wrap items-center gap-6">
        <button
          type="submit"
          className={`studio-shine group relative inline-flex min-h-12 items-center gap-3 overflow-hidden bg-accent px-7 text-sm font-medium text-accent-foreground transition-[filter,transform] hover:brightness-110 active:scale-[0.98] ${focusRing}`}
        >
          Compose email
          <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 rtl:-scale-x-100" aria-hidden />
        </button>
        <p id={`${id}-note`} className="max-w-sm text-xs leading-relaxed text-muted-foreground">
          Opens your email app with this brief addressed to {email}. Nothing is sent until you press send there.
        </p>
      </div>
    </form>
  );
}
