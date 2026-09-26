"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { CircleCheck, ShoppingCart } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { buttonClass, errorProps, Field, inputClass, LinkButton, Notice } from "@/components/ui";
import { labelFor, PAYMENT_METHODS, paymentMethodLabel, STORE_STATUSES, UAE, UAE_EMIRATES } from "@/lib/config";
import { placeDemoOrder } from "@/lib/demo-db";
import { formatMoney } from "@/lib/format";
import { clearCart, useStorefront } from "@/lib/storefront";
import type { Order, PaymentMethodId } from "@/lib/types";
import { hasErrors, isEmail, isPhone, isUaePhone, type FieldErrors } from "@/lib/validation";
import { OrderTotals } from "./OrderSummary";

interface CheckoutForm {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  paymentMethod: PaymentMethodId | "";
}

const emptyForm: CheckoutForm = {
  name: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  paymentMethod: "",
};

export function CheckoutView() {
  const view = useStorefront();
  const [form, setForm] = useState<CheckoutForm>(emptyForm);
  const [errors, setErrors] = useState<FieldErrors<CheckoutForm>>({});
  const [placedOrder, setPlacedOrder] = useState<Order | null>(null);

  if (!view) return null;
  const { store, cartLines, subtotal, deliveryFee, total } = view;
  const { settings } = store;
  const isUae = settings.country === UAE;

  // Only offline methods can be chosen: no payment provider is connected.
  const paymentOptions = PAYMENT_METHODS.filter(
    (method) =>
      !method.requiresProvider &&
      settings.paymentMethods.some((m) => m.id === method.id && m.enabled),
  );

  if (placedOrder) {
    return <OrderConfirmation order={placedOrder} storeName={store.name} />;
  }

  if (cartLines.length === 0) {
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

  const acceptingOrders = store.status === "active" && paymentOptions.length > 0;

  function update<K extends keyof CheckoutForm>(key: K, value: CheckoutForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function validate(values: CheckoutForm): FieldErrors<CheckoutForm> {
    const e: FieldErrors<CheckoutForm> = {};
    if (values.name.trim().length < 2) e.name = "Please enter your full name.";
    if (!isEmail(values.email)) e.email = "Please enter a valid email address.";
    if (isUae ? !isUaePhone(values.phone) : !isPhone(values.phone)) {
      e.phone = isUae
        ? "Please enter a UAE phone number, e.g. 050 123 4567."
        : "Please enter a valid phone number.";
    }
    if (values.address.trim().length < 5) e.address = "Please enter your delivery address.";
    if (!values.city.trim()) e.city = isUae ? "Please choose your emirate." : "Please enter your city.";
    if (!values.paymentMethod) e.paymentMethod = "Please choose a payment method.";
    return e;
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!acceptingOrders) return;
    const found = validate(form);
    setErrors(found);
    if (hasErrors(found)) {
      const first = Object.keys(found)[0];
      document.getElementById(`checkout-${first}`)?.focus();
      return;
    }
    const order = placeDemoOrder(store.id, {
      customerName: form.name,
      customerEmail: form.email,
      customerPhone: form.phone,
      address: form.address,
      city: form.city,
      paymentMethod: form.paymentMethod as PaymentMethodId,
      deliveryFee,
      // Totals are always recalculated from current prices and quantities.
      items: cartLines.map(({ product, quantity }) => ({
        productId: product.id,
        name: product.name,
        sku: product.sku,
        unitPrice: product.price,
        quantity,
      })),
    });
    clearCart();
    setPlacedOrder(order);
    window.scrollTo({ top: 0 });
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 md:py-16">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Checkout</h1>

      <Notice className="mt-6">
        <strong>Demo checkout.</strong> No payment is taken and no card details are collected.
        Your order is saved only in this browser so it appears in the agency admin — it is not sent
        to {store.name}. Please use made-up details.
      </Notice>

      {store.status !== "active" && (
        <Notice tone="warning" className="mt-4">
          {store.name} is {labelFor(STORE_STATUSES, store.status).toLowerCase()} and is not accepting orders.
        </Notice>
      )}
      {store.status === "active" && paymentOptions.length === 0 && (
        <Notice tone="warning" className="mt-4">
          This store has no payment methods enabled yet, so orders can&apos;t be placed.
        </Notice>
      )}

      <form onSubmit={handleSubmit} noValidate className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-8">
          <fieldset className="rounded-2xl border border-slate-200 p-6">
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

          <fieldset className="rounded-2xl border border-slate-200 p-6">
            <legend className="px-1 text-lg font-semibold">
              {isUae ? "UAE delivery address" : "Delivery address"}
            </legend>
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
                Country: <span className="font-medium text-slate-900">{settings.country}</span>
              </div>
            </div>
          </fieldset>

          <fieldset className="rounded-2xl border border-slate-200 p-6">
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
            {cartLines.map(({ product, quantity, lineTotal }) => (
              <li key={product.id} className="flex justify-between gap-3">
                <span>
                  {product.name} <span className="text-slate-500">× {quantity}</span>
                </span>
                <span className="shrink-0 tabular-nums">{formatMoney(lineTotal, settings.currency)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4">
            <OrderTotals
              subtotal={subtotal}
              deliveryFee={deliveryFee}
              total={total}
              currency={settings.currency}
              freeDeliveryThreshold={settings.freeDeliveryThreshold}
            />
          </div>
          <button
            type="submit"
            disabled={!acceptingOrders}
            className={`${buttonClass("primary", { size: "lg", tone: "brand" })} mt-6 w-full`}
          >
            Place demo order
          </button>
          <Link href="/cart" className="mt-3 block text-center text-sm font-medium text-slate-600 hover:underline">
            Back to cart
          </Link>
        </aside>
      </form>
    </main>
  );
}

function OrderConfirmation({ order, storeName }: { order: Order; storeName: string }) {
  return (
    <main className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <div className="rounded-3xl border border-slate-200 p-8 text-center">
        <CircleCheck className="mx-auto h-12 w-12 text-emerald-600" aria-hidden />
        <h1 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">Demo order placed</h1>
        <p className="mt-2 text-slate-600">
          Thank you, {order.customerName}. Your demo order number is{" "}
          <strong className="text-slate-900">{order.orderNumber}</strong>.
        </p>
        <Notice className="mt-6 text-left">
          This is a demonstration. The order was saved in this browser only: it was not sent to{" "}
          {storeName}, no payment was taken and no confirmation email was sent.
        </Notice>

        <ul className="mt-6 space-y-2 border-y border-slate-200 py-4 text-left text-sm">
          {order.items.map((item) => (
            <li key={item.productId} className="flex justify-between gap-3">
              <span>{item.name} × {item.quantity}</span>
              <span className="tabular-nums">{formatMoney(item.unitPrice * item.quantity, order.currency)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 text-left">
          <OrderTotals subtotal={order.subtotal} deliveryFee={order.deliveryFee} total={order.total} currency={order.currency} />
        </div>
        <p className="mt-4 text-left text-sm text-slate-600">
          Delivery to {order.address}, {order.city} · Payment: {paymentMethodLabel(order.paymentMethod)} (not collected — demo)
        </p>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <LinkButton href="/shop" tone="brand">Continue shopping</LinkButton>
          <LinkButton href={`/admin/stores/${order.storeId}/orders/${order.id}`} variant="secondary">
            View in agency admin
          </LinkButton>
        </div>
      </div>
    </main>
  );
}
