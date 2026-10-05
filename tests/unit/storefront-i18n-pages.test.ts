// P6: the customer journey's shared pages (checkout, order confirmation,
// contact, about, policies), their validation and server messages,
// payment labels and the demo notice, in English and Arabic.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { CHECKOUT_LIMITS, validateCheckoutFields, type PlaceOrderResult } from "../../lib/checkout";
import { PAYMENT_METHODS, UAE_EMIRATES } from "../../lib/config";
import { validateInquiry } from "../../lib/inquiry";
import { paymentInstructions } from "../../lib/payment-instructions";
import { PLACEHOLDER_NOTICE, POLICIES } from "../../lib/policies";
import { ORDER_MESSAGES } from "../../lib/server/orders";
import { localizeInquiryResult, localizeOrderResult } from "../../lib/storefront-action-messages";
import {
  countryDisplayName,
  leftToRightValueDir,
  localizeFieldErrors,
  localizeServerMessage,
  messagesFor,
  SERVER_ERROR_KEYS,
  STOREFRONT_MESSAGES,
  storefrontMessages,
  UI_LOCALES,
  type UiLocale,
} from "../../lib/storefront-i18n";
import { TEMPLATE_KEYS, getTemplateDefinition } from "../../lib/templates/registry";

const en = messagesFor("en");
const ar = messagesFor("ar");
const ARABIC = /[؀-ۿ]/;

/** The shape of a dictionary: nested keys, functions and array lengths. */
function shape(value: unknown): unknown {
  if (typeof value === "function") return "function";
  if (Array.isArray(value)) return value.map(shape);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, shape((value as Record<string, unknown>)[key])]));
  }
  return typeof value;
}

/** Every string of a dictionary, with sample arguments for its functions. */
function strings(value: unknown, path = ""): [string, string][] {
  if (typeof value === "string") return [[path, value]];
  if (typeof value === "function") return strings((value as (...args: unknown[]) => unknown)("Sample", "Sample"), `${path}()`);
  if (Array.isArray(value)) return value.flatMap((item, i) => strings(item, `${path}[${i}]`));
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, item]) => strings(item, path ? `${path}.${key}` : key));
  }
  return [];
}

test("every locale has the complete dictionary, nested groups included", () => {
  const reference = shape(STOREFRONT_MESSAGES.en);
  for (const locale of UI_LOCALES) assert.deepEqual(shape(STOREFRONT_MESSAGES[locale]), reference, locale);
  assert.deepEqual(Object.keys(en.serverErrors).sort(), [...SERVER_ERROR_KEYS].sort());
  assert.deepEqual(Object.keys(en.payments).sort(), PAYMENT_METHODS.map((method) => method.id).sort());
  assert.deepEqual(Object.keys(ar.emirates).sort(), [...UAE_EMIRATES].sort());
});

test("an unknown locale falls back to English instead of failing", () => {
  assert.equal(messagesFor("fr" as UiLocale), en);
  assert.equal(storefrontMessages({ language: "ar", templateKey: "classic" }).checkout.title, "Checkout");
});

test("every Arabic page label is Arabic; only provider brand names stay as they are", () => {
  // paymentInfoLabel() of an unknown key falls back to English (tested below).
  const brandOnly = new Set(["payments.jazzcash.label", "payments.easypaisa.label", "confirmation.paymentInfoLabel()"]);
  for (const [path, value] of strings(ar)) {
    if (brandOnly.has(path)) continue;
    assert.match(value, ARABIC, `${path}: ${value}`);
  }
  assert.equal(ar.payments.jazzcash.label, "JazzCash");
  assert.equal(ar.payments.easypaisa.label, "Easypaisa");
  assert.match(ar.payments.stripe_checkout.label, /Stripe Checkout/, "the provider's product name is kept");
});

test("the Arabic copy makes no guarantees, certifications or security claims", () => {
  const text = strings(ar).map(([, value]) => value).join("\n");
  for (const claim of ["مضمون", "ضمان", "نضمن", "معتمد", "آمن", "مرخص", "أفضل", "الأفضل", "100%"]) {
    assert.ok(!text.includes(claim), claim);
  }
});

test("English checkout and confirmation labels are the text the checkout always showed", () => {
  const source = readFileSync(new URL("../../components/storefront/CheckoutView.tsx", import.meta.url), "utf8");
  assert.ok(!/>\s*(Checkout|Place order|Order summary|Order placed|Continue shopping)\s*</.test(source), "no hard-coded English left");
  assert.equal(en.checkout.title, "Checkout");
  assert.equal(en.checkout.noCardDetails + en.checkout.cashOnDeliveryNote + en.checkout.bankTransferNote("Voltbox") + " " + en.checkout.recheckNote,
    "Card details are never collected by this store. Cash on delivery: pay the courier when your order arrives. Bank transfer: Voltbox will send you the transfer details after you order. Prices and stock are checked again when you place your order.");
  assert.equal(en.checkout.addressHint, "Building / villa, street and area");
  assert.equal(en.checkout.placeOrder, "Place order");
  assert.equal(en.checkout.country, "Country:");
  assert.equal(`${en.confirmation.thanks.before}VB-1001${en.confirmation.thanks.after}`, "Thank you. Your order number is VB-1001. Please keep it for your records.");
  assert.equal(en.confirmation.pickupAtStore + en.confirmation.paymentLine("Pay on pickup"), "Pickup at the store · Payment: Pay on pickup (unpaid)");
  assert.equal(en.confirmation.deliveryTo("Villa 1, Dubai"), "Delivery to Villa 1, Dubai");
  assert.equal(en.confirmation.bankTransferInstructions("Voltbox", "VB-1"), paymentInstructions("bank_transfer", "Voltbox", "VB-1"));
  for (const [key, label] of [["bankName", "Bank Name"], ["iban", "Iban"], ["swiftCode", "Swift Code"], ["accountNumber", "Account Number"]]) {
    assert.equal(en.confirmation.paymentInfoLabel(key), label);
  }
  assert.equal(ar.confirmation.paymentInfoLabel("iban"), "رقم الآيبان (IBAN)");
  assert.equal(ar.confirmation.paymentInfoLabel("somethingNew"), "Something New", "unknown keys fall back to the English label");
});

test("English payment labels come from PAYMENT_METHODS; Arabic labels are the application's own", () => {
  for (const method of PAYMENT_METHODS) {
    assert.deepEqual(en.payments[method.id], { label: method.label, description: method.description });
  }
  assert.equal(ar.payments.cash_on_delivery.label, "الدفع نقدًا عند التوصيل");
  assert.equal(ar.payments.bank_transfer.label, "تحويل بنكي");
  assert.equal(ar.payments.cash_on_pickup.label, "الدفع عند الاستلام من المتجر");
  assert.ok(ar.validation.pickupNeedsPayOnPickup.includes(ar.payments.cash_on_pickup.label), "messages name the option as it is labelled");
});

test("emirate names are localized for display only; the submitted value stays the English name", () => {
  for (const emirate of UAE_EMIRATES) assert.equal(en.emirates[emirate], emirate);
  assert.equal(ar.emirates.Dubai, "دبي");
  assert.equal(ar.emirates["Ras Al Khaimah"], "رأس الخيمة");
  const errors = validateCheckoutFields(
    { name: "Test Name", email: "a@example.com", phone: "0501234567", fulfillmentMethod: "DELIVERY", address: "Villa 1, Street 2", city: "Dubai", paymentMethod: "cash_on_delivery" },
    "AE",
    ar.validation,
  );
  assert.deepEqual(errors, {});
});

test("checkout validation in English is unchanged, and Arabic uses the same rules", () => {
  const empty = { fulfillmentMethod: "DELIVERY" };
  assert.deepEqual(validateCheckoutFields(empty, "AE"), {
    name: "Please enter your full name.",
    email: "Please enter a valid email address.",
    phone: "Please enter a UAE phone number, e.g. 050 123 4567.",
    address: "Please enter your delivery address.",
    city: "Please choose your emirate.",
    paymentMethod: "Please choose a payment method.",
  });
  assert.equal(validateCheckoutFields(empty, "PK").phone, "Please enter your phone number with the country code, e.g. +44 20 7946 0000.");
  assert.equal(validateCheckoutFields(empty, "PK").city, "Please enter your city.");
  assert.equal(validateCheckoutFields({}, "AE").fulfillmentMethod, "Choose delivery or pickup.");
  assert.equal(validateCheckoutFields({ fulfillmentMethod: "PICKUP", paymentMethod: "cash_on_delivery" }, "AE").paymentMethod, "Choose Pay on pickup for pickup orders.");
  assert.equal(validateCheckoutFields({ fulfillmentMethod: "DELIVERY", paymentMethod: "cash_on_pickup" }, "AE").paymentMethod, "Pay on pickup is only available for pickup orders.");
  assert.equal(validateCheckoutFields({ name: "x".repeat(81) }, "AE").name, "Keep this under 80 characters.");

  const arabic = validateCheckoutFields(empty, "AE", ar.validation);
  assert.deepEqual(Object.keys(arabic).sort(), Object.keys(validateCheckoutFields(empty, "AE")).sort());
  for (const message of Object.values(arabic)) assert.match(message!, ARABIC);
  assert.ok(arabic.phone!.includes("⁦050 123 4567⁩"), "the example number keeps its order inside RTL text");
  assert.equal(ar.validation.tooLong(CHECKOUT_LIMITS.name), "يجب ألا يتجاوز النص 80 حرفًا.");
  assert.equal(ar.validation.tooLong(CHECKOUT_LIMITS.address), "يجب ألا يتجاوز النص 300 حرف.");
  assert.equal(ar.validation.tooLong(3), "يجب ألا يتجاوز النص 3 أحرف.");
});

test("contact validation in English is unchanged, and Arabic follows the same rules", () => {
  assert.deepEqual(validateInquiry({}).errors, {
    name: "Please enter your name.",
    email: "Please enter a valid email address.",
    subject: undefined,
    message: "Please write at least 10 characters.",
  });
  assert.equal(validateInquiry({ subject: "x".repeat(151) }).errors.subject, "Keep this under 150 characters.");
  const arabic = validateInquiry({ subject: "x".repeat(151) }, ar.validation).errors;
  for (const key of ["name", "email", "subject", "message"] as const) assert.match(arabic[key]!, ARABIC, key);
});

test("server messages: English is exactly what the services return; known messages translate, unknown pass through", () => {
  const orderKeys: Record<keyof typeof ORDER_MESSAGES, (typeof SERVER_ERROR_KEYS)[number]> = {
    tooMany: "orderTooMany",
    storeUnavailable: "orderStoreUnavailable",
    otherStore: "otherStore",
    pickupOnly: "pickupOnly",
    paymentUnavailable: "paymentUnavailable",
    paymentCredentialsUnavailable: "paymentCredentialsUnavailable",
    unavailable: "unavailable",
    stock: "stock",
    priceChanged: "priceChanged",
    keyReused: "keyReused",
    invalid: "fixFields",
    busy: "busy",
  };
  for (const [orderKey, key] of Object.entries(orderKeys)) {
    assert.equal(en.serverErrors[key], ORDER_MESSAGES[orderKey as keyof typeof ORDER_MESSAGES], orderKey);
    assert.equal(localizeServerMessage(ORDER_MESSAGES[orderKey as keyof typeof ORDER_MESSAGES], "ar"), ar.serverErrors[key]);
  }
  const actions = readFileSync(new URL("../../app/(storefront)/actions.ts", import.meta.url), "utf8");
  const inquiries = readFileSync(new URL("../../lib/server/inquiries.ts", import.meta.url), "utf8");
  for (const key of ["inquiryStoreUnavailable", "inquiryGeneric", "stalePage", "orderGeneric", "invalidRequest"] as const) {
    assert.ok(actions.includes(JSON.stringify(en.serverErrors[key])), key);
  }
  for (const key of ["inquiryStoreUnavailable", "inquiryTooMany", "fixFields"] as const) {
    assert.ok(inquiries.includes(JSON.stringify(en.serverErrors[key])), key);
  }
  assert.equal(new Set(Object.values(ar.serverErrors)).size, SERVER_ERROR_KEYS.length, "no two Arabic messages are the same");
  assert.equal(localizeServerMessage("Something only the provider says.", "ar"), "Something only the provider says.");
  assert.equal(localizeServerMessage(ORDER_MESSAGES.stock, "en"), ORDER_MESSAGES.stock);
});

test("refused orders and inquiries are localized at the action boundary; English and successes are untouched", () => {
  const input = { fulfillmentMethod: "DELIVERY", name: "A" };
  const refused: PlaceOrderResult = {
    ok: false,
    error: ORDER_MESSAGES.invalid,
    fieldErrors: validateCheckoutFields(input, "AE"),
    retrySameKey: false,
  };
  assert.equal(localizeOrderResult(refused, input, "AE", "en"), refused);
  const arabic = localizeOrderResult(refused, input, "AE", "ar");
  assert.ok(!arabic.ok);
  assert.equal(arabic.error, ar.serverErrors.fixFields);
  assert.equal(arabic.retrySameKey, false);
  assert.deepEqual(Object.keys(arabic.fieldErrors!).sort(), Object.keys(refused.fieldErrors!).sort());
  assert.equal(arabic.fieldErrors!.name, ar.validation.fullName);
  const placed = { ok: true, duplicate: false } as unknown as PlaceOrderResult;
  assert.equal(localizeOrderResult(placed, input, "AE", "ar"), placed);

  const inquiry = { ok: false as const, error: en.serverErrors.fixFields, fieldErrors: { message: en.validation.messageTooShort } };
  const localized = localizeInquiryResult(inquiry, { message: "short" }, "ar");
  assert.ok(!localized.ok);
  assert.equal(localized.error, ar.serverErrors.fixFields);
  assert.deepEqual(localized.fieldErrors, { message: ar.validation.messageTooShort });
  assert.deepEqual(localizeFieldErrors({ name: "Server says" }, {}), { name: "Server says" }, "a field the client rules don't flag keeps the server message");
});

test("policy pages: English is lib/policies.ts verbatim; Arabic keeps the {store} placeholder and the not-legal-text notice", () => {
  for (const policy of POLICIES) {
    assert.equal(en.policies.pages[policy.id].title, policy.title);
    assert.deepEqual(en.policies.pages[policy.id].sections, policy.sections);
    assert.equal(ar.policies.pages[policy.id].sections.length, policy.sections.length);
  }
  assert.equal(en.policies.placeholderNotice, PLACEHOLDER_NOTICE);
  assert.equal(en.policies.questions("Voltbox", "a@b.c · 04 000 0000"), "Questions? Contact Voltbox: a@b.c · 04 000 0000");
  assert.ok(ar.policies.placeholderNotice.includes("{store}"));
  assert.ok(ar.policies.placeholderNotice.includes("ليس وثيقة قانونية"));
  assert.ok(ar.policies.pages.privacy.sections[0].includes("{store}"));
  assert.equal(en.policies.pages.terms.description, "Terms and conditions for using this storefront.");
});

test("contact, about, demo notice and not-found labels", () => {
  assert.equal(en.contact.title("Voltbox"), "Contact Voltbox");
  assert.equal(en.contact.send, "Send message");
  assert.equal(en.noContactDetails, "Contact details have not been added yet.");
  assert.equal(en.about.reachUs, "Visit or reach us");
  assert.equal(en.demoNotice("Noor"), "Demonstration store — products and orders here are for showcasing the Noor template.");
  assert.equal(en.notFound.backToShop, "Back to shop");
  assert.equal(en.meta.browseAll("Voltbox"), "Browse all products from Voltbox.");
  assert.ok(ar.contact.title("Voltbox").includes("Voltbox"), "the store name is kept as written");
  assert.ok(ar.demoNotice("Noor").includes("Noor"));
  assert.match(ar.demoNotice("Noor"), /تجريبي/);
});

test("email and phone values read left to right only on localized RTL pages", () => {
  assert.equal(leftToRightValueDir({ language: "ar", templateKey: "noor", direction: "rtl" }), "ltr");
  assert.equal(leftToRightValueDir({ language: "en", templateKey: "noor", direction: "ltr" }), undefined);
  for (const key of TEMPLATE_KEYS) {
    if (getTemplateDefinition(key).manifest.capabilities.uiLocales.includes("ar")) continue;
    assert.equal(leftToRightValueDir({ language: "ar", templateKey: key, direction: "rtl" }), undefined, `${key} behaves as before`);
  }
});

test("country names: the stored name in English, the CLDR name in Arabic", () => {
  assert.equal(countryDisplayName("en", "AE", "United Arab Emirates"), "United Arab Emirates");
  assert.match(countryDisplayName("ar", "AE", "United Arab Emirates"), ARABIC);
  assert.equal(countryDisplayName("ar", "not a code", "Stored"), "Stored");
});

test("the shared pages read their labels from the dictionary", () => {
  for (const file of ["ContactView.tsx", "AboutView.tsx", "PolicyView.tsx", "StorefrontRoot.tsx"]) {
    const source = readFileSync(new URL(`../../components/storefront/${file}`, import.meta.url), "utf8");
    for (const literal of ["Send message", "Browse the shop", "Visit or reach us", "Questions? Contact", "Demonstration store", "Contact details have not been added yet."]) {
      assert.ok(!source.includes(literal), `${file} still hard-codes "${literal}"`);
    }
  }
});
