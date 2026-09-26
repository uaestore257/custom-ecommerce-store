import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function EmptyState({
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
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
        <Icon className="h-6 w-6" aria-hidden />
      </div>
      <h2 className="mt-4 text-lg font-semibold text-slate-900">{title}</h2>
      {description && <p className="mt-1 max-w-md text-sm text-slate-600">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-3 py-20 text-sm text-slate-500">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-teal-600" />
      {label}
    </div>
  );
}
