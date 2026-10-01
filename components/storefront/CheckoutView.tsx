"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition, type FormEvent } from "react";
import { CircleCheck, ShoppingCart } from "lucide-react";
import { placeOrderAction } from "@/app/(storefront)/actions";
import { EmptyState, LoadingState } from "@/components/EmptyState";
import { buttonClass, errorProps, Field, inputClass, LinkButton, Notice } from "@/components/ui";
import {
  CHECKOUT_PAYMENT_METHODS,
  validateCheckoutFields,
  type CheckoutFieldErrors,
  type CheckoutFulfillmentMethod,
  type CheckoutPaymentMethod,
  type PlacedOrder,
} from "@/lib/checkout";
import { PAYMENT_METHODS, paymentMethodLabel, UAE_EMIRATES } from "@/lib/config";
import { paymentInstructions } from "@/lib/payment-instructions";
import { clearCart, useStorefront } from "@/lib/storefront";
import { formatStoreMoney, hasCartChanges } from "@/lib/storefront-cart";
import type { StorefrontStore } from "@/lib/storefront-types";
import { CartChangesNotice, NOT_RESERVED_NOTE, useCatalogRefreshOnOpen } from "./CartChanges";
import { CartTotals } from "./OrderSummary";

interface CheckoutForm {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  fulfillmentMethod: CheckoutFulfillmentMethod;
  paymentMethod: CheckoutPaymentMethod | "";
}

const emptyForm: CheckoutForm = {
  name: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  fulfillmentMethod: "DELIVERY",
  paymentMethod: "",
};

export function CheckoutView() {
  const view = useStorefront();
  const router = useRouter();
  const { checking } = useCatalogRefreshOnOpen();
  const [form, setForm] = useState<CheckoutForm>(emptyForm);
  const [errors, setErrors] = useState<CheckoutFieldErrors>({});
  const [serverError, setServerError] = useState("");
  const [placed, setPlaced] = useState<PlacedOrder | null>(null);
  const [submitting, startSubmit] = useTransition();
  // One idempotency key per checkout attempt: reused if the same attempt is
  // retried (double click, lost response), replaced after a refusal or success.
  const attemptKey = useRef<string | null>(null);

  if (!view) return null;
  const { store, cart, cartLoaded } = view;
  const isUae = store.countryCode === "AE";
  const fulfillmentMethod = cart.requiresPickup ? "PICKUP" : form.fulfillmentMethod;

  const paymentOptions = PAYMENT_METHODS.filter(
    (method): method is (typeof PAYMENT_METHODS)[number] & { id: CheckoutPaymentMethod } =>
      (CHECKOUT_PAYMENT_METHODS as readonly string[]).includes(method.id) &&
      store.paymentMethods.includes(method.id) &&
      (method.id !== "cash_on_delivery" || fulfillmentMethod === "DELIVERY") &&
      (method.id !== "cash_on_pickup" || fulfillmentMethod === "PICKUP"),
  );

  if (placed) {
    return <OrderConfirmation order={placed} store={store} />;
  }

  if (!cartLoaded) {
    return (
      <main className="mx-auto max-w-xl px-4 py-20 sm:px-6">
        <LoadingState label="Loading your cart…" />
      </main>
    );
  }

  if (cart.lines.length === 0) {
    return (
      <main className="mx-auto max-w-xl px-4 py-20 sm:px-6">
        <EmptyState
          icon={ShoppingCart}
          title="Your cart is empty"
          description="Add some products before checking out."
          action={<LinkButton href="/shop" tone="brand">Go to shop</LinkButton>}
        />
      </main>
    );
  }

  // Only ACTIVE stores ever reach the storefront (the server filters them).
  const acceptingOrders = paymentOptions.length > 0;
  const cartChanged = hasCartChanges(cart);
  const canPlace = acceptingOrders && !checking && !cartChanged && !submitting;

  function update<K extends keyof CheckoutForm>(key: K, value: CheckoutForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
    if (serverError) setServerError("");
  }

  function focusFirst(found: CheckoutFieldErrors) {
    const first = Object.keys(found).find((key) => found[key as keyof CheckoutFieldErrors]);
    if (first) document.getElementById(`checkout-${first}`)?.focus();
    return Boolean(first);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canPlace) return;
    // Instant feedback; the server checks everything again.
    const found = validateCheckoutFields({ ...form, fulfillmentMethod }, store.countryCode);
    setErrors(found);
    setServerError("");
    if (focusFirst(found)) return;

    attemptKey.current ??= crypto.randomUUID();
    const request = {
      ...form,
      fulfillmentMethod,
      storeId: store.id,
      idempotencyKey: attemptKey.current,
      // Only compared by the server (a difference refuses the order); never used as the price.
      expectedTotalMinor: (cart.subtotalMinor + (fulfillmentMethod === "PICKUP" ? BigInt(0) : cart.deliveryMinor)).toString(),
      items: cart.lines.map((line) => ({ productId: line.product.id, quantity: line.quantity })),
    };
    startSubmit(async () => {
      const result = await placeOrderAction(request);
      if (result.ok) {
        attemptKey.current = null;
        clearCart();
        if (result.checkout?.kind === "redirect") {
          window.location.assign(result.checkout.url);
          return;
        }
        if (result.checkout?.kind === "post") {
          const redirectForm = document.createElement("form");
          redirectForm.method = "POST";
          redirectForm.action = result.checkout.action;
          redirectForm.hidden = true;
          for (const [name, value] of Object.entries(result.checkout.fields)) {
            const field = document.createElement("input");
            field.type = "hidden";
            field.name = name;
            field.value = value;
            redirectForm.append(field);
          }
          document.body.append(redirectForm);
          redirectForm.submit();
          return;
        }
        setPlaced(result.order);
        router.refresh();
        window.scrollTo({ top: 0 });
        return;
      }
      if (!result.retrySameKey) attemptKey.current = null;
      setServerError(result.error);
      if (result.fieldErrors) {
        setErrors(result.fieldErrors);
        focusFirst(result.fieldErrors);
      }
      // Prices, stock or availability may have changed: re-check the cart.
      router.refresh();
    });
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-12 md:py-16">
      <h1 className="text-2xl font-bold tracking-tight sm:text-4xl">Checkout</h1>

      <Notice className="mt-6">
        Card details are never collected by this store.
        {paymentOptions.some((m) => m.id === "cash_on_delivery") &&
          " Cash on delivery: pay the courier when your order arrives."}
        {paymentOptions.some((m) => m.id === "bank_transfer") &&
          ` Bank transfer: ${store.name} will send you the transfer details after you order.`}{" "}
        Prices and stock are checked again when you place your order.
      </Notice>

      <p className="mt-3 text-sm text-slate-500" aria-live="polite">
        {checking ? "Checking current prices and stock…" : "Prices and stock checked with the store just now."}
      </p>
      <CartChangesNotice cart={cart} store={store} className="mt-4" />
      {cart.requiresPickup && (
        <Notice tone="warning" className="mt-4">
          Your cart contains pickup-only products. Choose pickup at checkout; these products cannot be delivered.
        </Notice>
      )}
      {paymentOptions.length === 0 && (
        <Notice tone="warning" className="mt-4">
          This store has no payment methods available yet, so orders can&apos;t be placed.
        </Notice>
      )}
      {serverError && (
        <Notice tone="error" className="mt-4">
          {serverError}
        </Notice>
      )}

      <form onSubmit={handleSubmit} noValidate className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-8">
          <fieldset className="min-w-0 rounded-2xl border border-slate-200 p-4 sm:p-6">
            <legend className="px-1 text-lg font-semibold">Contact details</legend>
            <div className="mt-2 grid gap-4 sm:grid-cols-2">
              <Field label="Full name" htmlFor="checkout-name" required error={errors.name} className="sm:col-span-2">
                <input
                  {...errorProps("checkout-name", errors.name)}
                  autoComplete="name"
                  value={form.name}
                  onChange={(e) => update("name", e.target.value)}
                  className={inputClass(!!errors.name)}
                />
              </Field>
              <Field label="Email" htmlFor="checkout-email" required error={errors.email}>
                <input
                  {...errorProps("checkout-email", errors.email)}
                  type="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                  className={inputClass(!!errors.email)}
                />
              </Field>
              <Field label="Phone" htmlFor="checkout-phone" required error={errors.phone}>
                <input
                  {...errorProps("checkout-phone", errors.phone)}
                  type="tel"
                  autoComplete="tel"
                  placeholder={isUae ? "050 123 4567" : ""}
                  value={form.phone}
                  onChange={(e) => update("phone", e.target.value)}
                  className={inputClass(!!errors.phone)}
                />
              </Field>
            </div>
          </fieldset>

          <fieldset className="min-w-0 rounded-2xl border border-slate-200 p-4 sm:p-6">
            <legend className="px-1 text-lg font-semibold">Fulfillment</legend>
            <div className="mt-2 space-y-3">
              {([
                ["DELIVERY", "Delivery"],
                ["PICKUP", "Pickup at the store"],
              ] as const).map(([method, label]) => (
                <label key={method} className="flex items-start gap-3 rounded-xl border border-slate-200 p-4">
                  <input
                    type="radio"
                    name="fulfillmentMethod"
                    value={method}
                    checked={fulfillmentMethod === method}
                    disabled={cart.requiresPickup && method === "DELIVERY"}
                    onChange={() => update("fulfillmentMethod", method)}
                    className="mt-1 accent-[var(--brand)]"
                  />
                  <span className="font-medium">{label}</span>
                </label>
              ))}
            </div>
            {fulfillmentMethod === "DELIVERY" && (
            <>
            <h2 className="mt-5 text-lg font-semibold">{isUae ? "UAE delivery address" : "Delivery address"}</h2>
            <div className="mt-2 grid gap-4 sm:grid-cols-2">
              <Field
                label="Address"
                htmlFor="checkout-address"
                required
                error={errors.address}
                hint="Building / villa, street and area"
                className="sm:col-span-2"
              >
                <textarea
                  {...errorProps("checkout-address", errors.address)}
                  rows={2}
                  autoComplete="street-address"
                  value={form.address}
                  onChange={(e) => update("address", e.target.value)}
                  className={inputClass(!!errors.address)}
                />
              </Field>
              <Field label={isUae ? "Emirate" : "City"} htmlFor="checkout-city" required error={errors.city}>
                {isUae ? (
                  <select
                    {...errorProps("checkout-city", errors.city)}
                    value={form.city}
                    onChange={(e) => update("city", e.target.value)}
                    className={inputClass(!!errors.city)}
                  >
                    <option value="">Choose emirate…</option>
                    {UAE_EMIRATES.map((emirate) => (
                      <option key={emirate} value={emirate}>{emirate}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    {...errorProps("checkout-city", errors.city)}
                    autoComplete="address-level2"
                    value={form.city}
                    onChange={(e) => update("city", e.target.value)}
                    className={inputClass(!!errors.city)}
                  />
                )}
              </Field>
              <div className="text-sm text-slate-600 sm:self-end sm:pb-3">
                Country: <span className="font-medium text-slate-900">{store.countryName}</span>
              </div>
            </div>
            </>
            )}
          </fieldset>

          <fieldset className="min-w-0 rounded-2xl border border-slate-200 p-4 sm:p-6">
            <legend className="px-1 text-lg font-semibold">Payment method</legend>
            <div
              id="checkout-paymentMethod"
              tabIndex={-1}
              role="radiogroup"
              aria-invalid={errors.paymentMethod ? true : undefined}
              aria-describedby={errors.paymentMethod ? "checkout-paymentMethod-error" : undefined}
              className="mt-2 space-y-3 focus:outline-none"
            >
              {paymentOptions.map((method) => (
                <label
                  key={method.id}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 ${
                    form.paymentMethod === method.id ? "border-brand bg-brand/5" : "border-slate-200"
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value={method.id}
                    checked={form.paymentMethod === method.id}
                    onChange={() => update("paymentMethod", method.id)}
                    className="mt-1 accent-[var(--brand)]"
                  />
                  <span>
                    <span className="block font-medium">{method.label}</span>
                    <span className="text-sm text-slate-500">{method.description}</span>
                  </span>
                </label>
              ))}
              {paymentOptions.length === 0 && (
                <p className="text-sm text-slate-500">No payment methods are available.</p>
              )}
            </div>
            {errors.paymentMethod && (
              <p id="checkout-paymentMethod-error" className="mt-2 text-sm text-red-600">
                {errors.paymentMethod}
              </p>
            )}
          </fieldset>
        </div>

        <aside className="h-fit rounded-2xl border border-slate-200 bg-slate-50 p-6 lg:sticky lg:top-24">
          <h2 className="text-lg font-semibold">Order summary</h2>
          <ul className="mt-4 space-y-3 border-b border-slate-200 pb-4 text-sm">
            {cart.lines.map(({ product, quantity, lineTotalMinor }) => (
              <li key={product.id} className="flex justify-between gap-3">
                <span>
                  {product.name} <span className="text-slate-500">× {quantity}</span>
                </span>
                <span className="shrink-0 tabular-nums">{formatStoreMoney(store, lineTotalMinor)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4">
            <CartTotals cart={cart} store={store} fulfillmentMethod={fulfillmentMethod} />
          </div>
          <button
            type="submit"
            disabled={!canPlace}
            className={`${buttonClass("primary", { size: "lg", tone: "brand" })} mt-6 w-full`}
          >
            {submitting ? "Placing your order…" : checking ? "Checking prices…" : "Place order"}
          </button>
          {cartChanged && (
            <p className="mt-2 text-xs text-amber-800">Review the cart updates above before placing your order.</p>
          )}
          <p className="mt-2 text-xs text-slate-500">{NOT_RESERVED_NOTE}</p>
          <Link href="/cart" className="mt-3 block text-center text-sm font-medium text-slate-600 hover:underline">
            Back to cart
          </Link>
        </aside>
      </form>
    </main>
  );
}

/** Shown after the SERVER placed the order; every figure comes from its response. */
function OrderConfirmation({ order, store }: { order: PlacedOrder; store: StorefrontStore }) {
  const money = (minor: string) => formatStoreMoney(store, minor);
  return (
    <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-16">
      <div className="rounded-3xl border border-slate-200 p-5 text-center sm:p-8">
        <CircleCheck className="mx-auto h-12 w-12 text-emerald-600" aria-hidden />
        <h1 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">Order placed</h1>
        <p className="mt-2 text-slate-600">
          Thank you. Your order number is <strong className="text-slate-900">{order.orderNumber}</strong>.
          Please keep it for your records — no confirmation email is sent yet.
        </p>
        <Notice className="mt-6 text-left">
          {order.paymentMethod === "bank_transfer" ? (
            <>
              <strong>Payment: bank transfer — not paid yet.</strong>{" "}
              {paymentInstructions("bank_transfer", store.name, order.orderNumber)}
              {order.paymentInfo?.map((item) => (
                <span key={item.label} className="mt-1 block text-sm">
                  <strong>{item.label.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase())}:</strong>{" "}
                  {item.value}
                </span>
              ))}
            </>
          ) : order.paymentMethod === "cash_on_pickup" ? (
            <>
              <strong>Payment: pay on pickup — not paid yet.</strong> Pay in cash when you collect your order.
            </>
          ) : order.paymentMethod === "stripe_checkout" ? (
            <>
              <strong>Payment: Stripe Checkout.</strong> Complete payment in the hosted Stripe window.
            </>
          ) : (
            <>
              <strong>Payment: cash on delivery — not paid yet.</strong>{" "}
              Please pay the courier when your order is delivered.
            </>
          )}
        </Notice>

        <ul className="mt-6 space-y-2 border-y border-slate-200 py-4 text-left text-sm">
          {order.lines.map((line, index) => (
            <li key={index} className="flex justify-between gap-3">
              <span>{line.name} × {line.quantity}</span>
              <span className="tabular-nums">{money(line.lineTotalMinor)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-4 space-y-2 text-left text-sm">
          <div className="flex justify-between">
            <dt className="text-slate-600">Subtotal</dt>
            <dd className="font-medium tabular-nums">{money(order.subtotalMinor)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-600">{order.fulfillmentMethod === "PICKUP" ? "Pickup" : "Delivery"}</dt>
            <dd className="font-medium tabular-nums">
              {order.fulfillmentMethod === "PICKUP"
                ? "No delivery fee"
                : order.shippingMinor === "0"
                  ? "Free"
                  : money(order.shippingMinor)}
            </dd>
          </div>
          <div className="flex justify-between border-t border-slate-200 pt-3 text-base">
            <dt className="font-semibold">Total to pay</dt>
            <dd className="font-bold tabular-nums">{money(order.totalMinor)}</dd>
          </div>
        </dl>
        <p className="mt-4 text-left text-sm text-slate-600">
          {order.fulfillmentMethod === "PICKUP" ? "Pickup at the store" : `Delivery to ${order.deliveryTo}`} · Payment: {paymentMethodLabel(order.paymentMethod)} (unpaid)
        </p>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <LinkButton href="/shop" tone="brand">Continue shopping</LinkButton>
        </div>
      </div>
    </main>
  );
}
