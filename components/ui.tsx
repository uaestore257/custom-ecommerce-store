import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { ChevronRight } from "lucide-react";

// ---------------------------------------------------------------
// Small shared building blocks: buttons, cards, form fields.
// Buttons use the admin teal by default; storefront pages pass
// tone="brand" so each client store's accent colour is used.
// ---------------------------------------------------------------

type Variant = "primary" | "secondary" | "danger" | "ghost";
type Tone = "teal" | "brand";

export function buttonClass(
  variant: Variant = "primary",
  { size = "md", tone = "teal" }: { size?: "sm" | "md" | "lg"; tone?: Tone } = {},
) {
  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2.5 text-sm",
    lg: "px-6 py-3 text-base",
  };
  const primary =
    tone === "brand"
      ? "bg-brand text-white hover:bg-brand/90 focus-visible:ring-brand"
      : "bg-teal-700 text-white hover:bg-teal-800 focus-visible:ring-teal-600";
  const variants: Record<Variant, string> = {
    primary,
    secondary:
      "border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 focus-visible:ring-teal-600",
    danger: "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-600",
    ghost: "text-slate-700 hover:bg-slate-100 focus-visible:ring-teal-600",
  };
  return `inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${sizes[size]} ${variants[variant]}`;
}

export function Card({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function inputClass(hasError = false) {
  return `block w-full min-w-0 rounded-lg border bg-white px-3 py-2.5 text-base text-slate-900 sm:text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
    hasError
      ? "border-red-400 focus:border-red-500 focus:ring-red-200"
      : "border-slate-300 focus:border-teal-600 focus:ring-teal-100"
  }`;
}

export function Field({
  label,
  htmlFor,
  error,
  hint,
  required,
  children,
  className = "",
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: ReactNode;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="text-red-600"> *</span>}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} className="mt-1.5 text-sm text-red-600">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}

/** Props that connect an input to its Field error message. */
export function errorProps(id: string, error?: string) {
  return {
    id,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error ? `${id}-error` : undefined,
  } as const;
}

export function Notice({
  tone = "info",
  children,
  className = "",
}: {
  tone?: "info" | "warning" | "success";
  children: ReactNode;
  className?: string;
}) {
  const tones = {
    info: "border-sky-200 bg-sky-50 text-sky-900",
    warning: "border-amber-200 bg-amber-50 text-amber-900",
    success: "border-emerald-200 bg-emerald-50 text-emerald-900",
  };
  return (
    <div className={`rounded-xl border px-4 py-3 text-sm ${tones[tone]} ${className}`}>
      {children}
    </div>
  );
}

export interface Crumb {
  label: string;
  href?: string;
}

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-2">
      <ol className="flex flex-wrap items-center gap-1 text-sm text-slate-500">
        {items.map((item, index) => (
          <li key={`${item.label}-${index}`} className="flex items-center gap-1">
            {index > 0 && <ChevronRight className="h-3.5 w-3.5" aria-hidden />}
            {item.href ? (
              <Link href={item.href} className="hover:text-teal-700 hover:underline">
                {item.label}
              </Link>
            ) : (
              <span aria-current="page" className="text-slate-700">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
}: {
  title: string;
  description?: ReactNode;
  breadcrumbs?: Crumb[];
  actions?: ReactNode;
}) {
  return (
    <div className="mb-8">
      {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {title}
          </h1>
          {description && <p className="mt-2 max-w-2xl text-slate-600">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export function LinkButton({
  variant = "primary",
  size,
  tone,
  className = "",
  ...props
}: ComponentProps<typeof Link> & {
  variant?: Variant;
  size?: "sm" | "md" | "lg";
  tone?: Tone;
}) {
  return <Link className={`${buttonClass(variant, { size, tone })} ${className}`} {...props} />;
}
