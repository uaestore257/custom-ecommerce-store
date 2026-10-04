"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition, type FormEvent } from "react";
import { CircleCheck, ShoppingCart } from "lucide-react";
import { placeOrderAction } from "@/app/(storefront)/actions";
import {
  sfButtonClass,
  SfEmptyState,
  sfErrorProps as errorProps,
  SfField as Field,
  sfInputClass,
  SfLinkButton,
  SfLoading,
  SfNotice as Notice,
} from "@/components/storefront/primitives";
import {
  CHECKOUT_PAYMENT_METHODS,
  validateCheckoutFields,
  type CheckoutFieldErrors,
  type CheckoutFulfillmentMethod,
  type CheckoutPaymentMethod,
  type PlacedOrder,
} from "@/lib/checkout";
import { PAYMENT_METHODS, UAE_EMIRATES } from "@/lib/config";
import { clearCart, useCart, useStorefrontMessages } from "@/lib/storefront";
import { formatStoreMoney, hasCartChanges } from "@/lib/storefront-cart";
import { countryDisplayName, leftToRightValueDir, storefrontUiLocale, type StorefrontMessages } from "@/lib/storefront-i18n";
import type { StorefrontStore } from "@/lib/storefront-types";
import { CartChangesNotice } from "./CartChanges";
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

/**
 * The ONE checkout every template uses (templates restyle it through their
 * tokens; they never fork it). Prices, stock and totals come from a fresh
 * server read of the cart's products, and the server re-checks everything
 * again when the order is placed (lib/server/orders.ts).
 */
export function CheckoutView() {
  const view = useCart();
  const m = useStorefrontMessages();
  const t = m.checkout;
  const router = useRouter();
  const [form, setForm] = useState<CheckoutForm>(emptyForm);
  const [errors, setErrors] = useState<CheckoutFieldErrors>({});
  const [serverError, setServerError] = useState("");
  const [placed, setPlaced] = useState<PlacedOrder | null>(null);
  const [submitting, startSubmit] = useTransition();
  // One idempotency key per checkout attempt: reused if the same attempt is
  // retried (double click, lost response), replaced after a refusal or success.
  const attemptKey = useRef<string | null>(null);

  if (!view) return null;
  const { context: { store }, cart, status, refresh } = view;
  const checking = status !== "ready";
  const isUae = store.countryCode === "AE";
  // Email addresses and phone numbers read left to right in every interface language.
  const ltrField = leftToRightValueDir(store);
  const fulfillmentMethod = cart.requiresPickup ? "PICKUP" : form.fulfillmentMethod;

  const paymentOptions = PAYMENT_METHODS.filter(
    (method): method is (typeof PAYMENT_METHODS)[number] & { id: CheckoutPaymentMethod } =>
      (CHECKOUT_PAYMENT_METHODS as readonly string[]).includes(method.id) &&
      store.paymentMethods.includes(method.id) &&
      (method.id !== "cash_on_delivery" || fulfillmentMethod === "DELIVERY") &&
      (method.id !== "cash_on_pickup" || fulfillmentMethod === "PICKUP"),
  );

  if (placed) {
    return <OrderConfirmation order={placed} store={store} m={m} />;
  }

  if (status === "error") {
    return (
      <main className="mx-auto max-w-xl px-4 py-20 sm:px-6">
        <Notice tone="error">
          {t.pricesCheckFailed}{" "}
          <button type="button" className="font-semibold underline" onClick={refresh}>
            {t.tryAgain}
          </button>
        </Notice>
      </main>
    );
  }

  if (status === "loading" && cart.lines.length === 0) {
    return (
      <main className="mx-auto max-w-xl px-4 py-20 sm:px-6">
        <SfLoading label={t.loadingCart} />
      </main>
    );
  }

  if (cart.lines.length === 0) {
    return (
      <main className="mx-auto max-w-xl px-4 py-20 sm:px-6">
        <SfEmptyState
          icon={ShoppingCart}
          title={t.emptyTitle}
          description={t.emptyDescription}
          action={<SfLinkButton href="/shop">{t.goToShop}</SfLinkButton>}
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
    const found = validateCheckoutFields({ ...form, fulfillmentMethod }, store.countryCode, m.validation);
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
      refresh();
    });
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-12 md:py-16">
      <h1 className="font-heading text-2xl font-bold tracking-tight sm:text-4xl">{t.title}</h1>

      <Notice className="mt-6">
        {t.noCardDetails}
        {paymentOptions.some((method) => method.id === "cash_on_delivery") && t.cashOnDeliveryNote}
        {paymentOptions.some((method) => method.id === "bank_transfer") && t.bankTransferNote(store.name)}{" "}
        {t.recheckNote}
      </Notice>

      <p className="mt-3 text-sm text-muted-foreground" aria-live="polite">
        {checking ? t.checking : t.checked}
      </p>
      <CartChangesNotice cart={cart} store={store} className="mt-4" />
      {cart.requiresPickup && (
        <Notice tone="warning" className="mt-4">
          {t.pickupOnlyWarning}
        </Notice>
      )}
      {paymentOptions.length === 0 && (
        <Notice tone="warning" className="mt-4">
          {t.noPaymentMethodsWarning}
        </Notice>
      )}
      {serverError && (
        <Notice tone="error" className="mt-4">
          {serverError}
        </Notice>
      )}

      <form onSubmit={handleSubmit} noValidate className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-8">
          <fieldset className="min-w-0 rounded-card border border-border bg-surface p-4 sm:p-6">
            <legend className="px-1 font-heading text-lg font-semibold">{t.contactDetails}</legend>
            <div className="mt-2 grid gap-4 sm:grid-cols-2">
              <Field label={t.fullName} htmlFor="checkout-name" required error={errors.name} className="sm:col-span-2">
                <input
                  {...errorProps("checkout-name", errors.name)}
                  autoComplete="name"
                  value={form.name}
                  onChange={(e) => update("name", e.target.value)}
                  className={sfInputClass(!!errors.name)}
                />
              </Field>
              <Field label={t.email} htmlFor="checkout-email" required error={errors.email}>
                <input
                  {...errorProps("checkout-email", errors.email)}
                  type="email"
                  dir={ltrField}
                  autoComplete="email"
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                  className={sfInputClass(!!errors.email)}
                />
              </Field>
              <Field label={t.phone} htmlFor="checkout-phone" required error={errors.phone}>
                <input
                  {...errorProps("checkout-phone", errors.phone)}
                  type="tel"
                  dir={ltrField}
                  autoComplete="tel"
                  placeholder={isUae ? "050 123 4567" : ""}
                  value={form.phone}
                  onChange={(e) => update("phone", e.target.value)}
                  className={sfInputClass(!!errors.phone)}
                />
              </Field>
            </div>
          </fieldset>

          <fieldset className="min-w-0 rounded-card border border-border bg-surface p-4 sm:p-6">
            <legend className="px-1 font-heading text-lg font-semibold">{t.fulfillment}</legend>
            <div className="mt-2 space-y-3">
              {([
                ["DELIVERY", t.deliveryOption],
                ["PICKUP", t.pickupOption],
              ] as const).map(([method, label]) => (
                <label key={method} className="flex items-start gap-3 rounded-control border border-border p-4">
                  <input
                    type="radio"
                    name="fulfillmentMethod"
                    value={method}
                    checked={fulfillmentMethod === method}
                    disabled={cart.requiresPickup && method === "DELIVERY"}
                    onChange={() => update("fulfillmentMethod", method)}
                    className="mt-1 accent-[var(--sf-accent)]"
                  />
                  <span className="font-medium">{label}</span>
                </label>
              ))}
            </div>
            {fulfillmentMethod === "DELIVERY" && (
            <>
            <h2 className="mt-5 font-heading text-lg font-semibold">{isUae ? t.uaeDeliveryAddress : t.deliveryAddress}</h2>
            <div className="mt-2 grid gap-4 sm:grid-cols-2">
              <Field
                label={t.address}
                htmlFor="checkout-address"
                required
                error={errors.address}
                hint={t.addressHint}
                className="sm:col-span-2"
              >
                <textarea
                  {...errorProps("checkout-address", errors.address)}
                  rows={2}
                  autoComplete="street-address"
                  value={form.address}
                  onChange={(e) => update("address", e.target.value)}
                  className={sfInputClass(!!errors.address)}
                />
              </Field>
              <Field label={isUae ? t.emirate : t.city} htmlFor="checkout-city" required error={errors.city}>
                {isUae ? (
                  <select
                    {...errorProps("checkout-city", errors.city)}
                    value={form.city}
                    onChange={(e) => update("city", e.target.value)}
                    className={sfInputClass(!!errors.city)}
                  >
                    <option value="">{t.chooseEmirate}</option>
                    {UAE_EMIRATES.map((emirate) => (
                      <option key={emirate} value={emirate}>{m.emirates[emirate] ?? emirate}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    {...errorProps("checkout-city", errors.city)}
                    autoComplete="address-level2"
                    value={form.city}
                    onChange={(e) => update("city", e.target.value)}
                    className={sfInputClass(!!errors.city)}
                  />
                )}
              </Field>
              <div className="text-sm text-muted-foreground sm:self-end sm:pb-3">
                {t.country} <span className="font-medium text-foreground">{countryDisplayName(storefrontUiLocale(store), store.countryCode, store.countryName)}</span>
              </div>
            </div>
            </>
            )}
          </fieldset>

          <fieldset className="min-w-0 rounded-card border border-border bg-surface p-4 sm:p-6">
            <legend className="px-1 font-heading text-lg font-semibold">{t.paymentMethod}</legend>
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
                  className={`flex cursor-pointer items-start gap-3 rounded-control border p-4 ${
                    form.paymentMethod === method.id ? "border-accent bg-accent/5" : "border-border"
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value={method.id}
                    checked={form.paymentMethod === method.id}
                    onChange={() => update("paymentMethod", method.id)}
                    className="mt-1 accent-[var(--sf-accent)]"
                  />
                  <span>
                    <span className="block font-medium">{m.payments[method.id]?.label ?? method.label}</span>
                    <span className="text-sm text-muted-foreground">{m.payments[method.id]?.description ?? method.description}</span>
                  </span>
                </label>
              ))}
              {paymentOptions.length === 0 && (
                <p className="text-sm text-muted-foreground">{t.noPaymentOptions}</p>
              )}
            </div>
            {errors.paymentMethod && (
              <p id="checkout-paymentMethod-error" className="mt-2 text-sm text-destructive">
                {errors.paymentMethod}
              </p>
            )}
          </fieldset>
        </div>

        <aside className="h-fit rounded-card border border-border bg-surface-elevated p-6 lg:sticky lg:top-24">
          <h2 className="font-heading text-lg font-semibold">{t.orderSummary}</h2>
          <ul className="mt-4 space-y-3 border-b border-border pb-4 text-sm">
            {cart.lines.map(({ product, quantity, lineTotalMinor }) => (
              <li key={product.id} className="flex justify-between gap-3">
                <span>
                  {product.name} <span className="text-muted-foreground">× {quantity}</span>
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
            className={`${sfButtonClass("primary", "lg")} mt-6 w-full`}
          >
            {submitting ? t.placing : checking ? t.checkingPrices : t.placeOrder}
          </button>
          {cartChanged && (
            <p className="mt-2 text-xs text-warning">{t.reviewChanges}</p>
          )}
          <p className="mt-2 text-xs text-muted-foreground">{m.notReserved}</p>
          <Link href="/cart" className="mt-3 block text-center text-sm font-medium text-muted-foreground hover:underline">
            {t.backToCart}
          </Link>
        </aside>
      </form>
    </main>
  );
}

/** Shown after the SERVER placed the order; every figure comes from its response. */
function OrderConfirmation({ order, store, m }: { order: PlacedOrder; store: StorefrontStore; m: StorefrontMessages }) {
  const money = (minor: string) => formatStoreMoney(store, minor);
  const t = m.confirmation;
  return (
    <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-16">
      <div className="rounded-card border border-border bg-surface p-5 text-center sm:p-8">
        <CircleCheck className="mx-auto h-12 w-12 text-success" aria-hidden />
        <h1 className="mt-4 font-heading text-2xl font-bold tracking-tight sm:text-3xl">{t.title}</h1>
        <p className="mt-2 text-muted-foreground">
          {t.thanks.before}<strong className="text-foreground">{order.orderNumber}</strong>{t.thanks.after}
        </p>
        <Notice className="mt-6 text-start">
          {order.paymentMethod === "bank_transfer" ? (
            <>
              <strong>{t.bankTransferTitle}</strong>{" "}
              {t.bankTransferInstructions(store.name, order.orderNumber)}
              {order.paymentInfo?.map((item) => (
                <span key={item.label} className="mt-1 block text-sm">
                  <strong>{t.paymentInfoLabel(item.label)}:</strong>{" "}
                  {item.value}
                </span>
              ))}
            </>
          ) : order.paymentMethod === "cash_on_pickup" ? (
            <>
              <strong>{t.payOnPickupTitle}</strong> {t.payOnPickupBody}
            </>
          ) : order.paymentMethod === "stripe_checkout" ? (
            <>
              <strong>{t.stripeTitle}</strong> {t.stripeBody}
            </>
          ) : (
            <>
              <strong>{t.cashOnDeliveryTitle}</strong>{" "}
              {t.cashOnDeliveryBody}
            </>
          )}
        </Notice>

        <ul className="mt-6 space-y-2 border-y border-border py-4 text-start text-sm">
          {order.lines.map((line, index) => (
            <li key={index} className="flex justify-between gap-3">
              <span>{line.name} × {line.quantity}</span>
              <span className="tabular-nums">{money(line.lineTotalMinor)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-4 space-y-2 text-start text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">{m.subtotal}</dt>
            <dd className="font-medium tabular-nums">{money(order.subtotalMinor)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">{order.fulfillmentMethod === "PICKUP" ? m.pickup : m.delivery}</dt>
            <dd className="font-medium tabular-nums">
              {order.fulfillmentMethod === "PICKUP"
                ? m.noDeliveryFee
                : order.shippingMinor === "0"
                  ? m.free
                  : money(order.shippingMinor)}
            </dd>
          </div>
          <div className="flex justify-between border-t border-border pt-3 text-base">
            <dt className="font-semibold">{t.totalToPay}</dt>
            <dd className="font-bold tabular-nums">{money(order.totalMinor)}</dd>
          </div>
        </dl>
        <p className="mt-4 text-start text-sm text-muted-foreground">
          {order.fulfillmentMethod === "PICKUP" ? t.pickupAtStore : t.deliveryTo(order.deliveryTo)}
          {t.paymentLine(m.payments[order.paymentMethod]?.label ?? order.paymentMethod)}
        </p>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <SfLinkButton href="/shop">{t.continueShopping}</SfLinkButton>
        </div>
      </div>
    </main>
  );
}
