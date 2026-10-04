import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

// ---------------------------------------------------------------
// STOREFRONT PRIMITIVES — shared by every template and the shared pages
// (checkout, contact, policies). They use ONLY the semantic storefront
// tokens (app/globals.css), never a fixed palette, so each template's
// colours, radii, fonts and control language (button case, tracking,
// weight, heights, border width, boxed or underlined inputs — the
// --sf-control-* / --sf-input-* tokens from lib/templates/theme.ts) flow
// through automatically. The admin keeps its own primitives in
// components/ui.tsx.
// ---------------------------------------------------------------

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: "min-h-[var(--sf-control-height-sm)] px-3 text-sm",
  md: "min-h-[var(--sf-control-height-md)] px-4 text-sm",
  lg: "min-h-[var(--sf-control-height-lg)] px-6 text-base",
};

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-accent text-accent-foreground hover:opacity-90",
  secondary: "border-[length:var(--sf-control-border-width)] border-border bg-surface text-foreground hover:bg-muted",
  ghost: "text-foreground hover:bg-muted",
  danger: "bg-destructive text-white hover:opacity-90",
};

export function sfButtonClass(variant: ButtonVariant = "primary", size: ButtonSize = "md") {
  return `inline-flex items-center justify-center gap-2 rounded-control font-[number:var(--sf-control-font-weight)] [text-transform:var(--sf-control-text-transform)] tracking-[var(--sf-control-letter-spacing)] rtl:tracking-normal transition focus:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 ${BUTTON_SIZES[size]} ${BUTTON_VARIANTS[variant]}`;
}

export function SfLinkButton({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <Link className={`${sfButtonClass(variant, size)} ${className}`} {...props} />;
}

export function sfInputClass(hasError = false) {
  return `block w-full min-w-0 rounded-[var(--sf-input-radius)] border-[length:var(--sf-input-border-width)] bg-[color:var(--sf-input-background)] px-[var(--sf-input-padding-x)] py-2.5 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-focus/30 sm:text-sm ${
    hasError ? "border-destructive" : "border-border focus:border-focus"
  }`;
}

/** Props that connect an input to its SfField error message. */
export function sfErrorProps(id: string, error?: string) {
  return {
    id,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error ? `${id}-error` : undefined,
  } as const;
}

export function SfField({
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
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-foreground">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} className="mt-1.5 text-sm text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

const NOTICE_TONES = {
  info: "border-border bg-muted text-foreground",
  warning: "border-warning/40 bg-warning/10 text-foreground",
  success: "border-success/40 bg-success/10 text-foreground",
  error: "border-destructive/40 bg-destructive/10 text-foreground",
} as const;

export function SfNotice({
  tone = "info",
  children,
  className = "",
}: {
  tone?: keyof typeof NOTICE_TONES;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div role={tone === "error" ? "alert" : undefined} className={`rounded-card border px-4 py-3 text-sm ${NOTICE_TONES[tone]} ${className}`}>
      {children}
    </div>
  );
}

export function SfEmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-card border border-dashed border-border bg-surface px-6 py-14 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="h-6 w-6" aria-hidden />
      </div>
      <h2 className="mt-4 font-heading text-lg font-semibold text-foreground">{title}</h2>
      {description && <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function SfLoading({ label = "Loading…" }: { label?: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-3 py-20 text-sm text-muted-foreground">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-accent" aria-hidden />
      {label}
    </div>
  );
}

export interface SfCrumb {
  label: string;
  href?: string;
}

/** Breadcrumb trail; the separator mirrors under dir="rtl". */
export function SfBreadcrumbs({ items, className = "", label = "Breadcrumb" }: { items: SfCrumb[]; className?: string; label?: string }) {
  return (
    <nav aria-label={label} className={className}>
      <ol className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
        {items.map((item, index) => (
          <li key={`${item.label}-${index}`} className="flex items-center gap-1">
            {index > 0 && <span aria-hidden className="px-1 rtl:-scale-x-100">/</span>}
            {item.href ? (
              <Link href={item.href} className="hover:text-foreground hover:underline">
                {item.label}
              </Link>
            ) : (
              <span aria-current="page" className="text-foreground">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
