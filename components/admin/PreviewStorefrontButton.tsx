import { ExternalLink } from "lucide-react";
import { buttonClass } from "@/components/ui";

/**
 * Opens this store's hostname, where the request host selects the storefront.
 * Only ACTIVE stores are shown publicly.
 */
export function PreviewStorefrontButton({
  store,
  previewUrl,
}: {
  store: { name: string; status: string };
  previewUrl: string | null;
}) {
  const isActive = store.status === "ACTIVE";
  const canPreview = isActive && previewUrl !== null;

  return (
    <div className="flex flex-col items-start gap-1">
      {canPreview ? (
        <a href={previewUrl} className={buttonClass("secondary")}>
          <ExternalLink className="h-4 w-4" aria-hidden />
          Preview storefront
        </a>
      ) : (
        <button type="button" className={buttonClass("secondary")} disabled>
          <ExternalLink className="h-4 w-4" aria-hidden />
          Preview storefront
        </button>
      )}
      {!isActive && <p className="text-xs text-slate-500">Preview is available once the store is active.</p>}
      {isActive && !previewUrl && (
        <p className="text-xs text-slate-500">Storefront preview is unavailable because its host is not configured.</p>
      )}
    </div>
  );
}
