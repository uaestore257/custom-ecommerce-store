import { labelFor, ORDER_STATUSES, PRODUCT_STATUSES, STORE_STATUSES } from "@/lib/config";
import type { OrderStatus, ProductStatus, StoreStatus } from "@/lib/types";

type Status = StoreStatus | ProductStatus | OrderStatus;

const colours: Record<Status, string> = {
  active: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  draft: "bg-slate-100 text-slate-700 ring-slate-500/20",
  paused: "bg-amber-50 text-amber-800 ring-amber-600/20",
  pending: "bg-amber-50 text-amber-800 ring-amber-600/20",
  processing: "bg-sky-50 text-sky-700 ring-sky-600/20",
  shipped: "bg-indigo-50 text-indigo-700 ring-indigo-600/20",
  delivered: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  cancelled: "bg-red-50 text-red-700 ring-red-600/20",
};

const allLabels = [...STORE_STATUSES, ...PRODUCT_STATUSES, ...ORDER_STATUSES];

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${colours[status]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      {labelFor(allLabels, status)}
    </span>
  );
}
