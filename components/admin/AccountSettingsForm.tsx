"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { updateMyAccountAction } from "@/app/admin/actions";
import { buttonClass, Card, errorProps, Field, inputClass, Notice, PageHeader } from "@/components/ui";

export function AccountSettingsForm({ name, email }: { name: string; email: string }) {
  const router = useRouter();
  const [values, setValues] = useState({ name, email, currentPassword: "", newPassword: "", confirmPassword: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(event: FormEvent) {
    event.preventDefault();
    setErrors({});
    setMessage(null);
    setFormError(null);
    const submitted = values;
    setValues((current) => ({ ...current, currentPassword: "", newPassword: "", confirmPassword: "" }));
    startTransition(async () => {
      const result = await updateMyAccountAction(submitted);
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        setFormError(result.error);
        return;
      }
      setMessage(result.message ?? "Account updated.");
      if (result.data.requiresSignIn) {
        router.replace("/login");
        router.refresh();
      } else {
        router.refresh();
      }
    });
  }

  const text = (key: keyof typeof values, label: string, type = "text", autoComplete?: string) => (
    <Field label={label} htmlFor={`account-${key}`} required error={errors[key]}>
      <input
        {...errorProps(`account-${key}`, errors[key])}
        type={type}
        autoComplete={autoComplete}
        value={values[key]}
        onChange={(event) => setValues((current) => ({ ...current, [key]: event.target.value }))}
        className={inputClass(!!errors[key])}
      />
    </Field>
  );

  return (
    <>
      <PageHeader title="Account settings" description="Update the account you use to sign in." />
      <Card className="max-w-2xl p-5 sm:p-6">
        <p className="mb-5 text-sm text-slate-600">
          Confirm every change with your current password. Changing your email or password signs out all sessions.
        </p>
        {formError && <Notice tone="warning" className="mb-4">{formError}</Notice>}
        {message && <p role="status" className="mb-4 text-sm text-emerald-700">{message}</p>}
        <form onSubmit={submit} noValidate className="space-y-4">
          {text("name", "Name", "text", "name")}
          {text("email", "Email", "email", "email")}
          {text("currentPassword", "Current password", "password", "current-password")}
          <hr className="border-slate-200" />
          {text("newPassword", "New password (optional)", "password", "new-password")}
          {text("confirmPassword", "Confirm new password", "password", "new-password")}
          <button type="submit" disabled={pending} className={buttonClass("primary")}>
            {pending ? "Saving…" : "Save account"}
          </button>
        </form>
      </Card>
    </>
  );
}
