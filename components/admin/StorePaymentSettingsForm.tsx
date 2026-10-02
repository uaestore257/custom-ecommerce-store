"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { updateOwnStoreSettingsAction } from "@/app/admin/actions";
import { buttonClass, Card, Field, inputClass, Notice } from "@/components/ui";
import type { AdminStorePaymentSettings } from "@/lib/admin/types";

type ManualValues = {
  cash_on_delivery: boolean;
  card_on_delivery: boolean;
  bank_transfer: boolean;
  cash_on_pickup: boolean;
};

type BankFields = AdminStorePaymentSettings["bankTransfer"];

function initialMethods(store: AdminStorePaymentSettings): ManualValues {
  return {
    cash_on_delivery: store.paymentMethods.find((entry) => entry.method === "cash_on_delivery")?.enabled ?? false,
    card_on_delivery: store.paymentMethods.find((entry) => entry.method === "card_on_delivery")?.enabled ?? false,
    bank_transfer: store.paymentMethods.find((entry) => entry.method === "bank_transfer")?.enabled ?? false,
    cash_on_pickup: store.paymentMethods.find((entry) => entry.method === "cash_on_pickup")?.enabled ?? false,
  };
}

const manualMethods: { id: keyof ManualValues; label: string; description: string }[] = [
  { id: "cash_on_delivery", label: "Cash on delivery", description: "Customer pays the courier in cash." },
  { id: "card_on_delivery", label: "Card on delivery", description: "Customer pays by card machine at the door." },
  { id: "bank_transfer", label: "Bank transfer", description: "Customer transfers payment to this store's bank account." },
  { id: "cash_on_pickup", label: "Pay on pickup", description: "Customer pays in person when collecting the order." },
];

export function StorePaymentSettingsForm({
  store,
  readOnly,
}: {
  store: AdminStorePaymentSettings;
  readOnly: boolean;
}) {
  const router = useRouter();
  const [methods, setMethods] = useState(() => initialMethods(store));
  const [bank, setBank] = useState<BankFields>(store.bankTransfer);
  const [stripe, setStripe] = useState({ enabled: store.stripe.enabled, accountId: store.stripe.accountId, secretRef: "" });
  const [jazzcash, setJazzcash] = useState({
    enabled: store.jazzcash.enabled,
    merchantId: store.jazzcash.merchantId,
    secretRef: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await updateOwnStoreSettingsAction({
        paymentMethods: methods,
        bankTransfer: bank,
        stripe,
        jazzcash,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <Card className="p-5 sm:p-6">
        <h2 className="text-lg font-semibold">Manual payment methods</h2>
        <p className="mt-1 text-sm text-slate-600">These options are configured independently for this store.</p>
        <fieldset disabled={readOnly || pending} className="mt-4 space-y-3">
          <legend className="sr-only">Manual payment methods</legend>
          {manualMethods.map((method) => (
            <label key={method.id} className="flex items-start gap-3 rounded-xl border border-slate-200 p-4">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 accent-teal-700"
                checked={methods[method.id]}
                onChange={(event) => setMethods((current) => ({ ...current, [method.id]: event.target.checked }))}
              />
              <span>
                <span className="block font-medium">{method.label}</span>
                <span className="mt-1 block text-sm text-slate-600">{method.description}</span>
              </span>
            </label>
          ))}
        </fieldset>

        {methods.bank_transfer && (
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="Bank name" htmlFor="payment-bank-name" required>
              <input id="payment-bank-name" value={bank.bankName} onChange={(event) => setBank((value) => ({ ...value, bankName: event.target.value }))} className={inputClass()} maxLength={100} />
            </Field>
            <Field label="Account holder name" htmlFor="payment-account-name" required>
              <input id="payment-account-name" value={bank.accountName} onChange={(event) => setBank((value) => ({ ...value, accountName: event.target.value }))} className={inputClass()} maxLength={100} />
            </Field>
            <Field label="Account number" htmlFor="payment-account-number">
              <input id="payment-account-number" value={bank.accountNumber} onChange={(event) => setBank((value) => ({ ...value, accountNumber: event.target.value }))} className={inputClass()} maxLength={80} autoComplete="off" />
            </Field>
            <Field label="IBAN" htmlFor="payment-iban">
              <input id="payment-iban" value={bank.iban} onChange={(event) => setBank((value) => ({ ...value, iban: event.target.value }))} className={inputClass()} maxLength={80} autoComplete="off" />
            </Field>
            <Field label="SWIFT / BIC" htmlFor="payment-swift">
              <input id="payment-swift" value={bank.swiftCode} onChange={(event) => setBank((value) => ({ ...value, swiftCode: event.target.value }))} className={inputClass()} maxLength={30} />
            </Field>
            <Field label="Payment instructions" htmlFor="payment-bank-instructions">
              <textarea id="payment-bank-instructions" value={bank.instructions} onChange={(event) => setBank((value) => ({ ...value, instructions: event.target.value }))} className={inputClass()} rows={3} maxLength={500} />
            </Field>
            <p className="text-sm text-slate-600 sm:col-span-2">Enter an account number or an IBAN. Bank details are shown to the customer only after they place a bank-transfer order.</p>
          </div>
        )}
      </Card>

      <Card className="p-5 sm:p-6">
        <h2 className="text-lg font-semibold">Stripe Connect — test mode</h2>
        <p className="mt-1 text-sm text-slate-600">
          UAE stores can use Stripe Checkout with a connected account. Charges are created on that connected account; payout details remain with that store&apos;s Stripe account.
        </p>
        {!store.stripe.available && (
          <Notice tone="warning" className="mt-4">
            Stripe Checkout remains unavailable until this store&apos;s test credentials resolve through a server-side secret manager. No credentials are stored in the database or sent to the browser.
          </Notice>
        )}
        <fieldset disabled={readOnly || pending} className="mt-4 grid gap-4 sm:grid-cols-2">
          <legend className="sr-only">Stripe test configuration</legend>
          <Field label="Connected account ID" htmlFor="stripe-account-id">
            <input
              id="stripe-account-id"
              value={stripe.accountId}
              onChange={(event) => setStripe((value) => ({ ...value, accountId: event.target.value }))}
              className={inputClass()}
              autoComplete="off"
              placeholder="acct_…"
            />
          </Field>
          <Field label="Test credential reference" htmlFor="stripe-secret-reference">
            <input
              id="stripe-secret-reference"
              value={stripe.secretRef}
              onChange={(event) => setStripe((value) => ({ ...value, secretRef: event.target.value }))}
              className={inputClass()}
              autoComplete="off"
              placeholder={
                store.stripe.hasCredentialReference
                  ? "Leave blank to keep existing reference"
                  : `vault:${store.id}/stripe/account-key`
              }
            />
          </Field>
          <label className="flex items-start gap-3 text-sm sm:col-span-2">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 accent-teal-700"
              checked={stripe.enabled}
              onChange={(event) => setStripe((value) => ({ ...value, enabled: event.target.checked }))}
            />
            <span>Enable Stripe Checkout for this store when its test credentials are available.</span>
          </label>
          <p className="text-xs text-slate-500 sm:col-span-2">
            Enter only an opaque secret-manager reference, never an API key or webhook secret. Live mode is not supported in this phase.
          </p>
        </fieldset>
      </Card>

      <Card className="p-5 sm:p-6">
        <h2 className="text-lg font-semibold">JazzCash — sandbox</h2>
        <p className="mt-1 text-sm text-slate-600">
          JazzCash settings are store-scoped to Pakistan, but checkout remains disabled because its current browser-post flow would expose the merchant password. A credential-safe server-side handoff is required.
        </p>
        {!store.jazzcash.available && (
          <Notice tone="warning" className="mt-4">
            JazzCash checkout is unavailable until a credential-safe server-side handoff is supported. No credential values are stored here or sent to the browser.
          </Notice>
        )}
        <fieldset disabled={readOnly || pending} className="mt-4 grid gap-4 sm:grid-cols-2">
          <legend className="sr-only">JazzCash sandbox configuration</legend>
          <Field label="Merchant ID" htmlFor="jazzcash-merchant-id">
            <input
              id="jazzcash-merchant-id"
              value={jazzcash.merchantId}
              onChange={(event) => setJazzcash((value) => ({ ...value, merchantId: event.target.value }))}
              className={inputClass()}
              autoComplete="off"
              maxLength={80}
            />
          </Field>
          <Field label="Sandbox credential reference" htmlFor="jazzcash-secret-reference">
            <input
              id="jazzcash-secret-reference"
              value={jazzcash.secretRef}
              onChange={(event) => setJazzcash((value) => ({ ...value, secretRef: event.target.value }))}
              className={inputClass()}
              autoComplete="off"
              placeholder={
                store.jazzcash.hasCredentialReference
                  ? "Leave blank to keep existing reference"
                  : `vault:${store.id}/jazzcash/merchant-key`
              }
            />
          </Field>
          <label className="flex items-start gap-3 text-sm sm:col-span-2">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 accent-teal-700"
              checked={jazzcash.enabled}
              onChange={(event) => setJazzcash((value) => ({ ...value, enabled: event.target.checked }))}
            />
            <span>Save this store&apos;s JazzCash sandbox preference. Checkout remains blocked until a credential-safe server-side handoff is supported.</span>
          </label>
          <p className="text-xs text-slate-500 sm:col-span-2">
            Enter only an opaque store-scoped reference and the merchant ID; never enter a password or secure-hash key. Easypaisa remains unavailable.
          </p>
        </fieldset>
      </Card>

      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {saved && <p role="status" className="text-sm text-emerald-700">Payment settings saved.</p>}
      {!readOnly && (
        <button type="submit" className={buttonClass()} disabled={pending}>
          {pending ? "Saving…" : "Save payment settings"}
        </button>
      )}
    </form>
  );
}
