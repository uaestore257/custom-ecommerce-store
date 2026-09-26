"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { buttonClass } from "./ui";

/**
 * Accessible confirmation dialog built on the native <dialog> element
 * (handles focus trapping and the Escape key for us).
 */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  children?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
      onClick={(event) => {
        // Clicking the backdrop closes the dialog.
        if (event.target === ref.current) onCancel();
      }}
      aria-labelledby="confirm-dialog-title"
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-slate-200 bg-white p-0 text-slate-900 shadow-xl"
    >
      {open && (
        <div className="p-6">
          <h2 id="confirm-dialog-title" className="text-lg font-semibold">
            {title}
          </h2>
          {children && <div className="mt-2 text-sm text-slate-600">{children}</div>}
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" className={buttonClass("secondary")} onClick={onCancel}>
              {cancelLabel}
            </button>
            <button
              type="button"
              className={buttonClass(danger ? "danger" : "primary")}
              onClick={onConfirm}
              autoFocus
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      )}
    </dialog>
  );
}
