// Order email content (lib/server/order-emails.ts) and payment wording
// (lib/payment-instructions.ts). No database and no email is sent.
import assert from "node:assert/strict";
import { mock, test } from "node:test";
import { paymentInstructions } from "../../lib/payment-instructions";
import type { Client } from "../../lib/server/admin/common";
import { getMailer } from "../../lib/server/mailer";
import { buildOrderEmails, sendOrderEmails, type OrderEmailData } from "../../lib/server/order-emails";

const data = (overrides: Partial<OrderEmailData> = {}): OrderEmailData => ({
  storeName: "Nest & Oak",
  storeEmail: "orders@store.example",
  storeContact: "orders@store.example · +971500000000",
  orderNumber: "NO-1005",
  adminOrderUrl: "https://admin.example/admin/stores/s1/orders/o1",
  customerName: "Jane Visitor",
  customerEmail: "jane@example.com",
  customerPhone: "+971501234567",
  fulfillmentMethod: "DELIVERY",
  deliveryTo: "Villa 12, Dubai",
  paymentMethod: "cash_on_delivery",
  lines: [{ name: "Oak chair", quantity: 2, total: "AED 200.00" }],
  subtotal: "AED 200.00",
  shipping: "AED 25.00",
  total: "AED 225.00",
  ...overrides,
});

test("the customer gets a confirmation with the order, totals and how to pay", () => {
  const [customer] = buildOrderEmails(data());
  assert.equal(customer.kind, "customer");
  assert.equal(customer.message.to, "jane@example.com");
  assert.equal(customer.message.replyTo, "orders@store.example");
  assert.match(customer.message.subject, /NO-1005/);
  for (const part of ["Hello Jane Visitor", "2 × Oak chair — AED 200.00", "Total: AED 225.00", "Cash on delivery", "Villa 12, Dubai"]) {
    assert.ok(customer.message.text.includes(part), part);
  }
  assert.ok(!customer.message.text.includes("admin"), "no admin link for the customer");
});

test("the store gets an alert with the customer's details and the admin link", () => {
  const emails = buildOrderEmails(data());
  const store = emails.find((e) => e.kind === "store")!;
  assert.equal(store.message.to, "orders@store.example");
  for (const part of ["jane@example.com", "+971501234567", "Villa 12, Dubai", "(unpaid)", "https://admin.example/admin/stores/s1/orders/o1"]) {
    assert.ok(store.message.text.includes(part), part);
  }
});

test("pickup order emails do not describe a delivery address", () => {
  const emails = buildOrderEmails(data({ fulfillmentMethod: "PICKUP", deliveryTo: "Store pickup" }));
  for (const email of emails) {
    assert.ok(email.message.text.includes("Pickup at the store"));
    assert.ok(!email.message.text.includes("Delivery to:"));
  }
});

test("no store address means only the customer's email", () => {
  assert.deepEqual(buildOrderEmails(data({ storeEmail: null })).map((e) => e.kind), ["customer"]);
});

test("bank transfer tells the customer the store sends its details, with the order number as reference — no invented account", () => {
  const text = paymentInstructions("bank_transfer", "Nest & Oak", "NO-1005");
  assert.match(text, /Nest & Oak will send you its bank account details/);
  assert.match(text, /NO-1005 as the payment reference/);
  assert.doesNotMatch(text, /IBAN|account number|\bAE\d{2}/i);
  const [customer] = buildOrderEmails(data({ paymentMethod: "bank_transfer" }));
  assert.ok(customer.message.text.includes(text));
  assert.match(paymentInstructions("cash_on_delivery", "Nest & Oak", "NO-1005"), /cash/i);
});

test("without an email provider nothing is sent, the database isn't read, and the log has no personal data", async () => {
  assert.equal(getMailer({} as NodeJS.ProcessEnv), null);
  const client = new Proxy({}, { get: () => { throw new Error("database must not be used"); } }) as unknown as Client;
  const info = mock.method(console, "info", () => {});
  try {
    await sendOrderEmails(client, "store-1", "NO-1005", null);
    assert.equal(info.mock.callCount(), 1);
    const line = String(info.mock.calls[0].arguments[0]);
    assert.match(line, /NO-1005/);
    assert.doesNotMatch(line, /@|jane/i);
  } finally {
    info.mock.restore();
  }
});

test("a failing mailer never throws, and its log line names no address", async () => {
  const order = {
    id: "o1", number: 1005, currency: "AED", currencyRef: { minorUnits: 2 }, customerName: "Jane", customerEmail: "jane@example.com",
    customerPhone: null, shippingAddress: { line1: "Villa 12", city: "Dubai" }, paymentMethod: "cash_on_delivery",
    items: [{ productName: "Chair", quantity: 1, lineTotalMinor: BigInt(10000) }],
    subtotalMinor: BigInt(10000), shippingMinor: BigInt(0), totalMinor: BigInt(10000),
  };
  const store = { name: "Nest & Oak", contactEmail: "orders@store.example", contactPhone: null, defaultLanguage: "en", countryCode: "AE", formatLocale: null, memberships: [] };
  const client = { order: { findFirst: async () => order }, store: { findFirst: async () => store } } as unknown as Client;
  const failing = { send: async () => { throw new Error("rejected for jane@example.com"); } };
  const error = mock.method(console, "error", () => {});
  try {
    await sendOrderEmails(client, "store-1", "NO-1005", failing);
    assert.equal(error.mock.callCount(), 2, "one line per failed email");
    for (const call of error.mock.calls) assert.doesNotMatch(String(call.arguments[0]), /@|jane/i);
  } finally {
    error.mock.restore();
  }
});
