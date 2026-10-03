import "server-only";
import type { CheckoutPaymentMethod } from "@/lib/checkout";
import { paymentMethodLabel } from "@/lib/config";
import { formatMinorUnits } from "@/lib/money";
import { paymentInstructions } from "@/lib/payment-instructions";
import { storeFormatLocale } from "@/lib/standards";
import { platformRootUrl, storeHostConfig } from "@/lib/store-host";
import type { PaymentMethodId } from "@/lib/types";
import type { Client } from "./admin/common";
import { getMailer, type EmailMessage, type Mailer } from "./mailer";

// ---------------------------------------------------------------
// ORDER EMAILS: a confirmation to the customer and a new-order alert to
// the store. Sent AFTER the order is committed (placeOrderAction schedules
// sendOrderEmails() to run after the response), so a failed or missing
// email never undoes, delays or blocks a valid order. Logs name only the
// order number and the kind of email — never addresses or other customer
// details.
// ---------------------------------------------------------------

export interface OrderEmailData {
  storeName: string;
  storeEmail: string | null;
  storeContact: string;
  orderNumber: string;
  adminOrderUrl: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  fulfillmentMethod: "DELIVERY" | "PICKUP";
  deliveryTo: string;
  paymentMethod: string;
  lines: { name: string; quantity: number; total: string }[];
  subtotal: string;
  shipping: string;
  total: string;
}

function orderLines(data: OrderEmailData) {
  return [
    ...data.lines.map((line) => `${line.quantity} × ${line.name} — ${line.total}`),
    "",
    `Subtotal: ${data.subtotal}`,
    `Delivery: ${data.shipping}`,
    `Total: ${data.total}`,
  ];
}

/** The customer's confirmation and, if the store has an address, the store's alert. */
export function buildOrderEmails(data: OrderEmailData): { kind: "customer" | "store"; message: EmailMessage }[] {
  const method = paymentMethodLabel(data.paymentMethod as PaymentMethodId);
  const customer: EmailMessage = {
    to: data.customerEmail,
    subject: `Your order ${data.orderNumber} at ${data.storeName}`,
    replyTo: data.storeEmail ?? undefined,
    text: [
      `Hello ${data.customerName},`,
      "",
      `Thank you for your order at ${data.storeName}. We have received it and will contact you about fulfillment.`,
      "",
      `Order ${data.orderNumber}`,
      ...orderLines(data),
      "",
      `Payment: ${method}. ${paymentInstructions(data.paymentMethod as CheckoutPaymentMethod, data.storeName, data.orderNumber)}`,
      data.fulfillmentMethod === "PICKUP" ? "Pickup at the store" : `Delivery to: ${data.deliveryTo}`,
      "",
      data.storeContact ? `Questions? Contact ${data.storeName}: ${data.storeContact}` : `Questions? Reply to this email.`,
    ].join("\n"),
  };
  const emails: { kind: "customer" | "store"; message: EmailMessage }[] = [{ kind: "customer", message: customer }];
  if (data.storeEmail) {
    emails.push({
      kind: "store",
      message: {
        to: data.storeEmail,
        subject: `New order ${data.orderNumber} — ${data.total}`,
        text: [
          `A new order was placed at ${data.storeName}.`,
          "",
          `Order ${data.orderNumber}`,
          ...orderLines(data),
          "",
          `Payment: ${method} (unpaid)`,
          `Customer: ${data.customerName}`,
          `Email: ${data.customerEmail}`,
          `Phone: ${data.customerPhone || "—"}`,
          data.fulfillmentMethod === "PICKUP" ? "Pickup at the store" : `Delivery to: ${data.deliveryTo}`,
          ...(data.adminOrderUrl ? ["", `Manage it in the admin: ${data.adminOrderUrl}`] : []),
        ].join("\n"),
      },
    });
  }
  return emails;
}

const text = (value: unknown) => (typeof value === "string" ? value : "");

/** Loads the order and sends its emails. Never throws: failures are logged without personal data. */
export async function sendOrderEmails(
  client: Client,
  storeId: string,
  orderNumber: string,
  mailer: Mailer | null = getMailer(),
): Promise<void> {
  if (!mailer) {
    console.info(`[email] No email provider configured; emails for order ${orderNumber} were not sent.`);
    return;
  }
  try {
    const number = Number(/(\d+)$/.exec(orderNumber)?.[1]);
    const order = await client.order.findFirst({
      where: { storeId, number },
      include: { items: { orderBy: { id: "asc" } }, currencyRef: { select: { minorUnits: true } } },
    });
    const store = await client.store.findFirst({
      where: { id: storeId },
      select: {
        name: true, slug: true, contactEmail: true, contactPhone: true, defaultLanguage: true, countryCode: true, formatLocale: true,
        memberships: { where: { role: "OWNER" }, select: { user: { select: { email: true } } }, take: 1 },
      },
    });
    if (!order || !store) {
      console.error(`[email] Order ${orderNumber} not found; its emails were not sent.`);
      return;
    }
    const locale = storeFormatLocale(store);
    const money = (minor: bigint) => formatMinorUnits(minor, order.currency, order.currencyRef.minorUnits, locale);
    const address = (order.shippingAddress ?? {}) as Record<string, unknown>;
    const fulfillmentMethod = address.fulfillmentMethod === "PICKUP" ? "PICKUP" : "DELIVERY";
    const adminUrl = process.env.BETTER_AUTH_URL;
    const storeAdminUrl = adminUrl
      ? platformRootUrl(`/admin/stores/${storeId}/orders/${order.id}`, adminUrl, storeHostConfig())
      : null;
    const storeEmail = store.contactEmail || store.memberships[0]?.user.email || null;
    const emails = buildOrderEmails({
      storeName: store.name,
      storeEmail,
      storeContact: [store.contactEmail, store.contactPhone].filter(Boolean).join(" · "),
      orderNumber,
      adminOrderUrl: storeAdminUrl,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      customerPhone: order.customerPhone ?? "",
      fulfillmentMethod,
      deliveryTo:
        fulfillmentMethod === "PICKUP"
          ? "Store pickup"
          : [text(address.line1), text(address.city)].filter(Boolean).join(", "),
      paymentMethod: order.paymentMethod ?? "",
      lines: order.items.map((item) => ({ name: item.productName, quantity: item.quantity, total: money(item.lineTotalMinor) })),
      subtotal: money(order.subtotalMinor),
      shipping: money(order.shippingMinor),
      total: money(order.totalMinor),
    });
    for (const { kind, message } of emails) {
      try {
        await mailer.send(message);
      } catch (error) {
        // The error's name only: provider messages can contain addresses.
        console.error(`[email] Sending the ${kind} email for order ${orderNumber} failed (${error instanceof Error ? error.name : "error"}).`);
      }
    }
  } catch (error) {
    console.error(`[email] Preparing emails for order ${orderNumber} failed (${error instanceof Error ? error.name : "error"}).`);
  }
}
