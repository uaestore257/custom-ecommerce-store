"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { Ban, PlayCircle, UserRound } from "lucide-react";
import { setStoreOwnerAction, setStoreStatusAction } from "@/app/admin/actions";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { StatusBadge } from "@/components/StatusBadge";
import { buttonClass, Card, errorProps, Field, inputClass } from "@/components/ui";
import type { AdminStoreDetail } from "@/lib/admin/types";
import { hasErrors, validateStoreOwner } from "@/lib/admin/validation";

// Platform-owner controls for a store: its owner and its suspension.
// These are separate Server Actions from the settings form, so saving
// settings can never change the owner or lift a suspension.

export function StoreOwnerCard({ store }: { store: AdminStoreDetail }) {
  const router = useRouter();
  const [values, setValues] = useState({
    ownerName: store.ownerName,
    ownerEmail: store.ownerEmail,
    ownerPassword: "",
    ownerPasswordConfirm: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(event: FormEvent) {
    event.preventDefault();
    setMessage(null);
    const found = validateStoreOwner(values).errors;
    if (values.ownerPassword && values.ownerPassword !== values.ownerPasswordConfirm) {
      found.ownerPasswordConfirm = "The passwords don't match.";
    }
    setErrors(found);
    if (hasErrors(found)) return;
    startTransition(async () => {
      const submitted = { ...values };
      setValues((current) => ({ ...current, ownerPassword: "", ownerPasswordConfirm: "" }));
      const result = await setStoreOwnerAction(store.id, submitted);
      if (result.ok) {
        setMessage({ ok: true, text: result.message ?? "Saved." });
        router.refresh();
      } else {
        setErrors(result.fieldErrors ?? {});
        setMessage({ ok: false, text: result.error });
      }
    });
  }

  return (
    <Card className="p-5 sm:p-6">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <UserRound className="h-5 w-5 text-slate-500" aria-hidden />
        Store owner
      </h2>
      <p className="mt-1 text-sm text-slate-600">
        The assigned Store Owner can sign in on this store&apos;s hostname. Leave the password blank to keep an existing password;
        set one to provision a legacy owner or reset access.
      </p>
      <form onSubmit={submit} noValidate className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label="Owner name" htmlFor="owner-name" required error={errors.ownerName}>
          <input
            {...errorProps("owner-name", errors.ownerName)}
            value={values.ownerName}
            onChange={(e) => setValues({ ...values, ownerName: e.target.value })}
            className={inputClass(!!errors.ownerName)}
          />
        </Field>
        <Field label="Owner email" htmlFor="owner-email" required error={errors.ownerEmail}>
          <input
            {...errorProps("owner-email", errors.ownerEmail)}
            type="email"
            value={values.ownerEmail}
            onChange={(e) => setValues({ ...values, ownerEmail: e.target.value })}
            className={inputClass(!!errors.ownerEmail)}
          />
        </Field>
        <Field label="New owner password" htmlFor="owner-password" error={errors.ownerPassword} hint="Required when provisioning or changing the owner; blank keeps the current password.">
          <input
            {...errorProps("owner-password", errors.ownerPassword)}
            type="password"
            autoComplete="new-password"
            value={values.ownerPassword}
            onChange={(e) => setValues({ ...values, ownerPassword: e.target.value })}
            className={inputClass(!!errors.ownerPassword)}
          />
        </Field>
        <Field label="Confirm new password" htmlFor="owner-password-confirm" error={errors.ownerPasswordConfirm}>
          <input
            {...errorProps("owner-password-confirm", errors.ownerPasswordConfirm)}
            type="password"
            autoComplete="new-password"
            value={values.ownerPasswordConfirm}
            onChange={(e) => setValues({ ...values, ownerPasswordConfirm: e.target.value })}
            className={inputClass(!!errors.ownerPasswordConfirm)}
          />
        </Field>
        <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
          <button type="submit" disabled={pending} className={buttonClass("secondary")}>
            {pending ? "Saving…" : "Save owner"}
          </button>
          {message && (
            <p role={message.ok ? "status" : "alert"} className={`text-sm ${message.ok ? "text-emerald-700" : "text-red-600"}`}>
              {message.text}
            </p>
          )}
        </div>
      </form>
    </Card>
  );
}

export function StoreSuspensionCard({ store }: { store: AdminStoreDetail }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const suspended = store.status === "SUSPENDED";

  function change(status: "SUSPENDED" | "ACTIVE") {
    setError(null);
    startTransition(async () => {
      const result = await setStoreStatusAction(store.id, status);
      setConfirming(false);
      if (result.ok) router.refresh();
      else setError(result.error);
    });
  }

  return (
    <Card className="border-amber-200 p-5 sm:p-6">
      <h2 className="flex flex-wrap items-center gap-2 text-lg font-semibold">
        Suspension <StatusBadge status={store.status} />
      </h2>
      <p className="mt-1 text-sm text-slate-600">
        {suspended
          ? "This store is suspended. Nothing has been deleted; reactivating it makes it active again."
          : "Suspending blocks the store without deleting anything: products, settings, owners and orders are kept."}
      </p>
      {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
      {suspended ? (
        <button type="button" disabled={pending} className={`${buttonClass("primary")} mt-4`} onClick={() => change("ACTIVE")}>
          <PlayCircle className="h-4 w-4" aria-hidden />
          {pending ? "Reactivating…" : "Reactivate store"}
        </button>
      ) : (
        <button type="button" disabled={pending} className={`${buttonClass("secondary")} mt-4`} onClick={() => setConfirming(true)}>
          <Ban className="h-4 w-4" aria-hidden />
          Suspend store
        </button>
      )}
      <ConfirmDialog
        open={confirming}
        title={`Suspend ${store.name}?`}
        confirmLabel={pending ? "Suspending…" : "Suspend store"}
        danger
        onCancel={() => setConfirming(false)}
        onConfirm={() => change("SUSPENDED")}
      >
        The store is blocked but nothing is deleted. You can reactivate it here at any time.
      </ConfirmDialog>
    </Card>
  );
}
