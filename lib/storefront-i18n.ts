// ---------------------------------------------------------------
// STOREFRONT UI LOCALIZATION (P6 foundation) — pure, no React
//
// Two kinds of text reach a storefront:
//   * store CONTENT (product names, categories, hero copy, policies) —
//     written by the store in its own language; untouched here;
//   * interface LABELS ("Add to cart", "Subtotal", "Sort by") — written by
//     the platform, translated here.
//
// The interface language of a page is resolved per store and template:
// the store's content language, if the active template declares it in
// manifest.capabilities.uiLocales AND a dictionary exists for it here;
// otherwise English. Every template that declares only ["en"] therefore
// renders exactly the English it always has, whatever the store's language.
//
// Dictionaries are typed objects: a locale missing any key is a type
// error. Shared labels live here (STOREFRONT_MESSAGES); a template's own
// copy lives with the template and uses the same UiLocale type.
// ---------------------------------------------------------------
import { PAYMENT_METHODS, UAE_EMIRATES } from "./config";
import { PLACEHOLDER_NOTICE, POLICIES, type PolicyId } from "./policies";
import { getTemplateDefinition } from "./templates/registry";
import type { StorefrontStore } from "./storefront-types";
import type { PaymentMethodId } from "./types";

export const UI_LOCALES = ["en", "ar"] as const;
export type UiLocale = (typeof UI_LOCALES)[number];
export const DEFAULT_UI_LOCALE: UiLocale = "en";

function isUiLocale(value: string): value is UiLocale {
  return (UI_LOCALES as readonly string[]).includes(value);
}

/**
 * The interface language for a store language (BCP 47, e.g. "ar" or
 * "ar-AE") under a template's declared UI locales.
 */
export function resolveUiLocale(storeLanguage: string, templateUiLocales: readonly string[]): UiLocale {
  const base = storeLanguage.trim().toLowerCase().split(/[-_]/)[0] ?? "";
  return isUiLocale(base) && templateUiLocales.includes(base) ? base : DEFAULT_UI_LOCALE;
}

/** The interface language of a storefront page for this store. */
export function storefrontUiLocale(store: Pick<StorefrontStore, "language" | "templateKey">): UiLocale {
  return resolveUiLocale(store.language, getTemplateDefinition(store.templateKey).manifest.capabilities.uiLocales);
}

/**
 * A count in words with the locale's plural rules (Intl.PluralRules), e.g.
 * English one/other, Arabic zero/one/two/few/many/other. Missing forms
 * fall back to "other".
 */
export type PluralForms = Partial<Record<Intl.LDMLPluralRule, (n: number) => string>> & { other: (n: number) => string };
export function plural(locale: UiLocale, n: number, forms: PluralForms): string {
  const rule = new Intl.PluralRules(locale).select(n);
  return (forms[rule] ?? forms.other)(n);
}

/** Shared commerce labels used by components/storefront/* and any template. */
export interface StorefrontMessages {
  quantity: string;
  decreaseQuantity: string;
  increaseQuantity: string;
  addToCart: string;
  added: string;
  addedToCart: string;
  outOfStock: string;
  maxInCart: string;
  allStockInCart: string;
  noMoreStock: string;
  otherStoreProduct: string;
  alreadyInCart: (n: number) => string;
  items: (n: number) => string;
  subtotal: string;
  delivery: string;
  pickup: string;
  noDeliveryFee: string;
  free: string;
  total: string;
  notReserved: string;
  cartUpdatedTitle: string;
  pricesChanged: (n: number) => string;
  quantitiesReduced: (n: number) => string;
  noLongerAvailable: (n: number) => string;
  totalsUseCurrentPrices: string;
  acceptCartChanges: string;
  priceChanged: (was: string, now: string) => string;
  onlyAvailable: (available: number, requested: number) => string;
  sortBy: string;
  sort: { featured: string; newest: string; "price-asc": string; "price-desc": string };
  searchProducts: string;
  searchPlaceholder: string;
  pagination: string;
  previous: string;
  next: string;
  pageOf: (page: number, count: number) => string;
  breadcrumb: string;
  /** "Contact details have not been added yet." (contact and about pages). */
  noContactDetails: string;
  checkout: CheckoutMessages;
  confirmation: ConfirmationMessages;
  /** Field messages of the checkout and contact forms (lib/checkout.ts, lib/inquiry.ts). */
  validation: ValidationMessages;
  /** Messages the storefront server actions return (matched by their English text). */
  serverErrors: ServerErrorMessages;
  /** Application-owned payment option labels; provider brand names stay as they are. */
  payments: Record<PaymentMethodId, { label: string; description: string }>;
  /** Display names of the UAE emirates; the submitted value stays the English name. */
  emirates: Record<string, string>;
  contact: ContactMessages;
  about: AboutMessages;
  policies: PolicyMessages;
  /** The banner on demonstration stores. */
  demoNotice: (templateName: string) => string;
  notFound: { title: string; description: string; backToShop: string };
  /** Browser titles and descriptions of shared storefront pages. */
  meta: MetaMessages;
}

export interface CheckoutMessages {
  title: string;
  pricesCheckFailed: string;
  tryAgain: string;
  loadingCart: string;
  emptyTitle: string;
  emptyDescription: string;
  goToShop: string;
  noCardDetails: string;
  /** Appended to noCardDetails; starts with a space. */
  cashOnDeliveryNote: string;
  /** Appended to noCardDetails; starts with a space. */
  bankTransferNote: (storeName: string) => string;
  recheckNote: string;
  checking: string;
  checked: string;
  pickupOnlyWarning: string;
  noPaymentMethodsWarning: string;
  contactDetails: string;
  fullName: string;
  email: string;
  phone: string;
  fulfillment: string;
  deliveryOption: string;
  pickupOption: string;
  uaeDeliveryAddress: string;
  deliveryAddress: string;
  address: string;
  addressHint: string;
  emirate: string;
  city: string;
  chooseEmirate: string;
  /** Includes its colon. */
  country: string;
  paymentMethod: string;
  noPaymentOptions: string;
  orderSummary: string;
  placing: string;
  checkingPrices: string;
  placeOrder: string;
  reviewChanges: string;
  backToCart: string;
}

export interface ConfirmationMessages {
  title: string;
  /** Around the order number: before + <number> + after. */
  thanks: { before: string; after: string };
  bankTransferTitle: string;
  bankTransferInstructions: (storeName: string, orderNumber: string) => string;
  /** Label of a bank detail the store configured (bankName, iban, ...). */
  paymentInfoLabel: (key: string) => string;
  payOnPickupTitle: string;
  payOnPickupBody: string;
  stripeTitle: string;
  stripeBody: string;
  cashOnDeliveryTitle: string;
  cashOnDeliveryBody: string;
  totalToPay: string;
  pickupAtStore: string;
  deliveryTo: (address: string) => string;
  /** Starts with " · " when shown after the fulfillment line. */
  paymentLine: (label: string) => string;
  continueShopping: string;
}

export interface ValidationMessages {
  fullName: string;
  tooLong: (max: number) => string;
  email: string;
  phoneUae: string;
  phoneInternational: string;
  fulfillment: string;
  address: string;
  emirate: string;
  city: string;
  paymentMethod: string;
  pickupNeedsPayOnPickup: string;
  payOnPickupOnlyForPickup: string;
  name: string;
  messageTooShort: string;
}

export const SERVER_ERROR_KEYS = [
  "orderTooMany",
  "orderStoreUnavailable",
  "otherStore",
  "pickupOnly",
  "paymentUnavailable",
  "paymentCredentialsUnavailable",
  "unavailable",
  "stock",
  "priceChanged",
  "keyReused",
  "fixFields",
  "busy",
  "badRequest",
  "orderGeneric",
  "inquiryStoreUnavailable",
  "inquiryTooMany",
  "inquiryGeneric",
  "stalePage",
  "invalidRequest",
] as const;
export type ServerErrorKey = (typeof SERVER_ERROR_KEYS)[number];
export type ServerErrorMessages = Record<ServerErrorKey, string>;

export interface ContactMessages {
  title: (storeName: string) => string;
  intro: string;
  email: string;
  phone: string;
  address: string;
  sent: string;
  name: string;
  subject: string;
  message: string;
  sending: string;
  send: string;
}

export interface AboutMessages {
  eyebrow: string;
  browseShop: string;
  contactUs: string;
  collections: string;
  reachUs: string;
}

export interface PolicyMessages {
  /** "{store}" is replaced with the store's name (lib/policies.ts policyText). */
  pages: Record<PolicyId, { title: string; sections: string[]; description: string }>;
  placeholderNotice: string;
  questions: (storeName: string, contact: string) => string;
}

export interface MetaMessages {
  checkout: string;
  cart: string;
  contact: string;
  contactDescription: string;
  about: (storeName: string) => string;
  aboutDescription: (storeName: string) => string;
  shop: string;
  browseAll: (storeName: string) => string;
  browseCategory: (category: string, storeName: string) => string;
}

// English: character-for-character the text these pages always showed.
// Where the text already lives in a shared module (payment methods,
// policies) it is read from there, so the two can never drift apart.

const prettifyKey = (key: string) => key.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase());

const POLICY_DESCRIPTIONS: Record<PolicyId, string> = {
  privacy: "Privacy information for this storefront.",
  terms: "Terms and conditions for using this storefront.",
  delivery: "Delivery and collection information for this store.",
  returns: "Returns and refunds information for this store.",
};

const enCheckout: CheckoutMessages = {
  title: "Checkout",
  pricesCheckFailed: "We couldn't check your cart's current prices and stock.",
  tryAgain: "Try again",
  loadingCart: "Loading your cart…",
  emptyTitle: "Your cart is empty",
  emptyDescription: "Add some products before checking out.",
  goToShop: "Go to shop",
  noCardDetails: "Card details are never collected by this store.",
  cashOnDeliveryNote: " Cash on delivery: pay the courier when your order arrives.",
  bankTransferNote: (storeName) => ` Bank transfer: ${storeName} will send you the transfer details after you order.`,
  recheckNote: "Prices and stock are checked again when you place your order.",
  checking: "Checking current prices and stock…",
  checked: "Prices and stock checked with the store just now.",
  pickupOnlyWarning: "Your cart contains pickup-only products. Choose pickup at checkout; these products cannot be delivered.",
  noPaymentMethodsWarning: "This store has no payment methods available yet, so orders can't be placed.",
  contactDetails: "Contact details",
  fullName: "Full name",
  email: "Email",
  phone: "Phone",
  fulfillment: "Fulfillment",
  deliveryOption: "Delivery",
  pickupOption: "Pickup at the store",
  uaeDeliveryAddress: "UAE delivery address",
  deliveryAddress: "Delivery address",
  address: "Address",
  addressHint: "Building / villa, street and area",
  emirate: "Emirate",
  city: "City",
  chooseEmirate: "Choose emirate…",
  country: "Country:",
  paymentMethod: "Payment method",
  noPaymentOptions: "No payment methods are available.",
  orderSummary: "Order summary",
  placing: "Placing your order…",
  checkingPrices: "Checking prices…",
  placeOrder: "Place order",
  reviewChanges: "Review the cart updates above before placing your order.",
  backToCart: "Back to cart",
};

const enConfirmation: ConfirmationMessages = {
  title: "Order placed",
  thanks: { before: "Thank you. Your order number is ", after: ". Please keep it for your records." },
  bankTransferTitle: "Payment: bank transfer — not paid yet.",
  bankTransferInstructions: (storeName, orderNumber) =>
    `Pay by bank transfer: ${storeName} will send you its bank account details. ` +
    `Please use ${orderNumber} as the payment reference. Your order is processed once the payment arrives.`,
  paymentInfoLabel: prettifyKey,
  payOnPickupTitle: "Payment: pay on pickup — not paid yet.",
  payOnPickupBody: "Pay in cash when you collect your order.",
  stripeTitle: "Payment: Stripe Checkout.",
  stripeBody: "Complete payment in the hosted Stripe window.",
  cashOnDeliveryTitle: "Payment: cash on delivery — not paid yet.",
  cashOnDeliveryBody: "Please pay the courier when your order is delivered.",
  totalToPay: "Total to pay",
  pickupAtStore: "Pickup at the store",
  deliveryTo: (address) => `Delivery to ${address}`,
  paymentLine: (label) => ` · Payment: ${label} (unpaid)`,
  continueShopping: "Continue shopping",
};

const enValidation: ValidationMessages = {
  fullName: "Please enter your full name.",
  tooLong: (max) => `Keep this under ${max} characters.`,
  email: "Please enter a valid email address.",
  phoneUae: "Please enter a UAE phone number, e.g. 050 123 4567.",
  phoneInternational: "Please enter your phone number with the country code, e.g. +44 20 7946 0000.",
  fulfillment: "Choose delivery or pickup.",
  address: "Please enter your delivery address.",
  emirate: "Please choose your emirate.",
  city: "Please enter your city.",
  paymentMethod: "Please choose a payment method.",
  pickupNeedsPayOnPickup: "Choose Pay on pickup for pickup orders.",
  payOnPickupOnlyForPickup: "Pay on pickup is only available for pickup orders.",
  name: "Please enter your name.",
  messageTooShort: "Please write at least 10 characters.",
};

const enServerErrors: ServerErrorMessages = {
  orderTooMany: "Too many orders were placed recently. Please try again in a few minutes.",
  orderStoreUnavailable: "This store isn't accepting orders right now.",
  otherStore: "Your cart is from a different store. Please review your cart and try again.",
  pickupOnly: "Your cart contains a pickup-only product. Choose pickup to place this order.",
  paymentUnavailable: "This payment method isn't available for this store.",
  paymentCredentialsUnavailable: "This store's online payment credentials are not configured on the server. Choose another payment method or contact the store.",
  unavailable: "Some items in your cart are no longer available. Please review your cart.",
  stock: "There isn't enough stock for some items in your cart. Please review your cart.",
  priceChanged: "Prices or delivery changed since you opened checkout. Please review your cart and try again.",
  keyReused: "This checkout was already submitted with different details. Please review your order and try again.",
  fixFields: "Please fix the highlighted fields.",
  busy: "The store is busy right now. Please try again in a moment.",
  badRequest: "This checkout couldn't be read. Please refresh the page and try again.",
  orderGeneric: "Something went wrong while placing your order. Please try again.",
  inquiryStoreUnavailable: "This store isn't accepting messages right now.",
  inquiryTooMany: "Too many messages sent recently. Please try again later.",
  inquiryGeneric: "Something went wrong while sending your message. Please try again.",
  stalePage: "This page is out of date. Please reload it and try again.",
  invalidRequest: "Invalid request.",
};

const enPolicies: PolicyMessages = {
  pages: Object.fromEntries(
    POLICIES.map((policy) => [policy.id, { title: policy.title, sections: policy.sections, description: POLICY_DESCRIPTIONS[policy.id] }]),
  ) as PolicyMessages["pages"],
  placeholderNotice: PLACEHOLDER_NOTICE,
  questions: (storeName, contact) => `Questions? Contact ${storeName}: ${contact}`,
};

const en: StorefrontMessages = {
  quantity: "Quantity",
  decreaseQuantity: "Decrease quantity",
  increaseQuantity: "Increase quantity",
  addToCart: "Add to cart",
  added: "Added",
  addedToCart: "Added to cart",
  outOfStock: "Out of stock",
  maxInCart: "Max in cart",
  allStockInCart: "All stock in cart",
  noMoreStock: "No more stock available",
  otherStoreProduct: "This product belongs to another store",
  alreadyInCart: (n) => `${n} already in your cart.`,
  items: (n) => `${n} ${n === 1 ? "item" : "items"}`,
  subtotal: "Subtotal",
  delivery: "Delivery",
  pickup: "Pickup",
  noDeliveryFee: "No delivery fee",
  free: "Free",
  total: "Total",
  notReserved: "Items in your cart are not reserved — stock can change at any time.",
  cartUpdatedTitle: "Your cart was updated to match the store's current prices and stock.",
  pricesChanged: (n) => `${en.items(n)} changed price since you added ${n === 1 ? "it" : "them"}.`,
  quantitiesReduced: (n) => `${en.items(n)} had ${n === 1 ? "its" : "their"} quantity reduced to what is in stock.`,
  noLongerAvailable: (n) => `${en.items(n)} ${n === 1 ? "is" : "are"} no longer available and ${n === 1 ? "was" : "were"} left out.`,
  totalsUseCurrentPrices: "The totals shown already use the current prices.",
  acceptCartChanges: "OK, update my cart",
  priceChanged: (was, now) => `Price changed: was ${was}, now ${now}.`,
  onlyAvailable: (available, requested) => `Only ${available} available — you asked for ${requested}.`,
  sortBy: "Sort by",
  sort: { featured: "Featured", newest: "Newest", "price-asc": "Price: low to high", "price-desc": "Price: high to low" },
  searchProducts: "Search products",
  searchPlaceholder: "Search products…",
  pagination: "Pagination",
  previous: "Previous",
  next: "Next",
  pageOf: (page, count) => `Page ${page} of ${count}`,
  breadcrumb: "Breadcrumb",
  noContactDetails: "Contact details have not been added yet.",
  checkout: enCheckout,
  confirmation: enConfirmation,
  validation: enValidation,
  serverErrors: enServerErrors,
  payments: Object.fromEntries(PAYMENT_METHODS.map((m) => [m.id, { label: m.label, description: m.description }])) as StorefrontMessages["payments"],
  emirates: Object.fromEntries(UAE_EMIRATES.map((emirate) => [emirate, emirate])),
  contact: {
    title: (storeName) => `Contact ${storeName}`,
    intro: "Questions about a product, delivery or an order? Get in touch.",
    email: "Email",
    phone: "Phone",
    address: "Address",
    sent: "Thanks! Your message has been sent to the store.",
    name: "Name",
    subject: "Subject",
    message: "Message",
    sending: "Sending…",
    send: "Send message",
  },
  about: {
    eyebrow: "About us",
    browseShop: "Browse the shop",
    contactUs: "Contact us",
    collections: "Collections",
    reachUs: "Visit or reach us",
  },
  policies: enPolicies,
  demoNotice: (templateName) => `Demonstration store — products and orders here are for showcasing the ${templateName} template.`,
  notFound: {
    title: "Not found",
    description: "We couldn't find this in the store. It may have been removed, or the link may be wrong.",
    backToShop: "Back to shop",
  },
  meta: {
    checkout: "Checkout",
    cart: "Cart",
    contact: "Contact",
    contactDescription: "Contact the store for product and order enquiries.",
    about: (storeName) => `About ${storeName}`,
    aboutDescription: (storeName) => `Learn about ${storeName}.`,
    shop: "Shop",
    browseAll: (storeName) => `Browse all products from ${storeName}.`,
    browseCategory: (category, storeName) => `Browse ${category} from ${storeName}.`,
  },
};

const arItems = (n: number) =>
  plural("ar", n, {
    zero: () => "لا منتجات",
    one: () => "منتج واحد",
    two: () => "منتجان",
    few: (k) => `${k} منتجات`,
    many: (k) => `${k} منتجًا`,
    other: (k) => `${k} منتج`,
  });

// Arabic. Phone examples are wrapped in Unicode isolates (LRI … PDI) so
// that "050 123 4567" and "+44 …" keep their order inside RTL text.
const ltr = (text: string) => `⁦${text}⁩`;

const arCheckout: CheckoutMessages = {
  title: "إتمام الطلب",
  pricesCheckFailed: "تعذّر التحقق من الأسعار والكميات الحالية لسلتك.",
  tryAgain: "حاول مجددًا",
  loadingCart: "جارٍ تحميل سلتك…",
  emptyTitle: "سلتك فارغة",
  emptyDescription: "أضف بعض المنتجات قبل إتمام الطلب.",
  goToShop: "تصفّح المتجر",
  noCardDetails: "لا يجمع هذا المتجر بيانات البطاقات إطلاقًا.",
  cashOnDeliveryNote: " الدفع نقدًا عند التوصيل: ادفع لمندوب التوصيل عند وصول طلبك.",
  bankTransferNote: (storeName) => ` التحويل البنكي: يرسل لك ${storeName} بيانات التحويل بعد تقديم طلبك.`,
  recheckNote: "نتحقق من الأسعار والكميات مجددًا عند تأكيد طلبك.",
  checking: "نتحقق من الأسعار والكميات الحالية…",
  checked: "تم التحقق من الأسعار والكميات مع المتجر للتو.",
  pickupOnlyWarning: "تحتوي سلتك على منتجات متاحة للاستلام من المتجر فقط. اختر الاستلام عند إتمام الطلب، إذ لا يمكن توصيل هذه المنتجات.",
  noPaymentMethodsWarning: "لا تتوفر لدى هذا المتجر طرق دفع حاليًا، لذا لا يمكن تقديم الطلبات.",
  contactDetails: "بيانات التواصل",
  fullName: "الاسم الكامل",
  email: "البريد الإلكتروني",
  phone: "رقم الهاتف",
  fulfillment: "التوصيل أو الاستلام",
  deliveryOption: "التوصيل",
  pickupOption: "الاستلام من المتجر",
  uaeDeliveryAddress: "عنوان التوصيل في الإمارات",
  deliveryAddress: "عنوان التوصيل",
  address: "العنوان",
  addressHint: "المبنى أو الفيلا، والشارع، والمنطقة",
  emirate: "الإمارة",
  city: "المدينة",
  chooseEmirate: "اختر الإمارة…",
  country: "الدولة:",
  paymentMethod: "طريقة الدفع",
  noPaymentOptions: "لا تتوفر طرق دفع.",
  orderSummary: "ملخص الطلب",
  placing: "جارٍ تأكيد طلبك…",
  checkingPrices: "نتحقق من الأسعار…",
  placeOrder: "تأكيد الطلب",
  reviewChanges: "راجع تحديثات السلة أعلاه قبل تأكيد طلبك.",
  backToCart: "العودة إلى السلة",
};

const AR_PAYMENT_INFO_LABELS: Record<string, string> = {
  bankName: "اسم البنك",
  accountName: "اسم صاحب الحساب",
  accountNumber: "رقم الحساب",
  iban: "رقم الآيبان (IBAN)",
  swiftCode: "رمز السويفت (SWIFT)",
  instructions: "تعليمات",
};

const arConfirmation: ConfirmationMessages = {
  title: "تم استلام طلبك",
  thanks: { before: "شكرًا لك. رقم طلبك ", after: "، يُرجى الاحتفاظ به للرجوع إليه." },
  bankTransferTitle: "الدفع: تحويل بنكي — لم يُدفع بعد.",
  bankTransferInstructions: (storeName, orderNumber) =>
    `ادفع عبر التحويل البنكي: يرسل لك ${storeName} بيانات حسابه البنكي. ` +
    `يُرجى استخدام ${ltr(orderNumber)} مرجعًا للدفع. تبدأ معالجة طلبك فور وصول المبلغ.`,
  paymentInfoLabel: (key) => AR_PAYMENT_INFO_LABELS[key] ?? prettifyKey(key),
  payOnPickupTitle: "الدفع: عند الاستلام من المتجر — لم يُدفع بعد.",
  payOnPickupBody: "ادفع نقدًا عند استلام طلبك.",
  stripeTitle: "الدفع: Stripe Checkout.",
  stripeBody: "أكمل الدفع في صفحة الدفع لدى Stripe.",
  cashOnDeliveryTitle: "الدفع: نقدًا عند التوصيل — لم يُدفع بعد.",
  cashOnDeliveryBody: "يُرجى الدفع لمندوب التوصيل عند تسليم طلبك.",
  totalToPay: "المبلغ المستحق",
  pickupAtStore: "الاستلام من المتجر",
  // First-strong isolate: the address may be written in Arabic or in Latin script.
  deliveryTo: (address) => `التوصيل إلى \u2068${address}\u2069`,
  paymentLine: (label) => ` · الدفع: ${label} (غير مدفوع)`,
  continueShopping: "متابعة التسوق",
};

const arValidation: ValidationMessages = {
  fullName: "يُرجى إدخال اسمك الكامل.",
  tooLong: (max) =>
    plural("ar", max, {
      few: (n) => `يجب ألا يتجاوز النص ${n} أحرف.`,
      many: (n) => `يجب ألا يتجاوز النص ${n} حرفًا.`,
      other: (n) => `يجب ألا يتجاوز النص ${n} حرف.`,
    }),
  email: "يُرجى إدخال بريد إلكتروني صحيح.",
  phoneUae: `يُرجى إدخال رقم هاتف إماراتي، مثل ${ltr("050 123 4567")}.`,
  phoneInternational: `يُرجى إدخال رقم هاتفك مع رمز الدولة، مثل ${ltr("+44 20 7946 0000")}.`,
  fulfillment: "اختر التوصيل أو الاستلام.",
  address: "يُرجى إدخال عنوان التوصيل.",
  emirate: "يُرجى اختيار الإمارة.",
  city: "يُرجى إدخال المدينة.",
  paymentMethod: "يُرجى اختيار طريقة الدفع.",
  pickupNeedsPayOnPickup: "اختر «الدفع عند الاستلام من المتجر» لطلبات الاستلام.",
  payOnPickupOnlyForPickup: "«الدفع عند الاستلام من المتجر» متاح لطلبات الاستلام فقط.",
  name: "يُرجى إدخال اسمك.",
  messageTooShort: "يُرجى كتابة 10 أحرف على الأقل.",
};

const arServerErrors: ServerErrorMessages = {
  orderTooMany: "تم تقديم عدد كبير من الطلبات مؤخرًا. يُرجى المحاولة مجددًا بعد بضع دقائق.",
  orderStoreUnavailable: "لا يستقبل هذا المتجر الطلبات حاليًا.",
  otherStore: "سلتك تابعة لمتجر آخر. يُرجى مراجعة سلتك والمحاولة مجددًا.",
  pickupOnly: "تحتوي سلتك على منتج متاح للاستلام من المتجر فقط. اختر الاستلام لتأكيد هذا الطلب.",
  paymentUnavailable: "طريقة الدفع هذه غير متاحة في هذا المتجر.",
  paymentCredentialsUnavailable: "الدفع الإلكتروني غير مُعدّ لهذا المتجر حاليًا. اختر طريقة دفع أخرى أو تواصل مع المتجر.",
  unavailable: "بعض المنتجات في سلتك لم تعد متوفرة. يُرجى مراجعة سلتك.",
  stock: "الكمية المتوفرة لا تكفي لبعض المنتجات في سلتك. يُرجى مراجعة سلتك.",
  priceChanged: "تغيّرت الأسعار أو رسوم التوصيل منذ فتحت صفحة إتمام الطلب. يُرجى مراجعة سلتك والمحاولة مجددًا.",
  keyReused: "سبق إرسال هذا الطلب ببيانات مختلفة. يُرجى مراجعة طلبك والمحاولة مجددًا.",
  fixFields: "يُرجى تصحيح الحقول المحددة.",
  busy: "المتجر مشغول حاليًا. يُرجى المحاولة مجددًا بعد قليل.",
  badRequest: "تعذّرت قراءة بيانات الطلب. يُرجى تحديث الصفحة والمحاولة مجددًا.",
  orderGeneric: "حدث خطأ أثناء تأكيد طلبك. يُرجى المحاولة مجددًا.",
  inquiryStoreUnavailable: "لا يستقبل هذا المتجر الرسائل حاليًا.",
  inquiryTooMany: "تم إرسال عدد كبير من الرسائل مؤخرًا. يُرجى المحاولة لاحقًا.",
  inquiryGeneric: "حدث خطأ أثناء إرسال رسالتك. يُرجى المحاولة مجددًا.",
  stalePage: "هذه الصفحة لم تعد محدّثة. يُرجى إعادة تحميلها والمحاولة مجددًا.",
  invalidRequest: "طلب غير صالح.",
};

const arPolicies: PolicyMessages = {
  pages: {
    privacy: {
      title: "سياسة الخصوصية",
      sections: [
        "ستوضّح هذه الصفحة كيف يجمع {store} المعلومات الشخصية ويستخدمها، مثل الاسم والبريد الإلكتروني ورقم الهاتف وعنوان التوصيل التي تُدخل عند إتمام الطلب أو في نموذج التواصل.",
        "وينبغي أن تبيّن سبب الحاجة إلى هذه المعلومات، والجهات التي تُشارَك معها (مثل شركات التوصيل)، ومدة الاحتفاظ بها، وكيف يمكن للعميل طلب الاطلاع عليها أو تصحيحها أو حذفها.",
      ],
      description: "معلومات الخصوصية الخاصة بهذا المتجر.",
    },
    terms: {
      title: "الشروط والأحكام",
      sections: [
        "ستحدد هذه الصفحة الشروط التي يبيع بها {store} منتجاته: تقديم الطلبات، والأسعار والعملة، والدفع (نقدًا عند التوصيل أو بالتحويل البنكي)، والإلغاء، والجهة التي يُتواصل معها لتقديم الشكاوى.",
      ],
      description: "الشروط والأحكام الخاصة باستخدام هذا المتجر.",
    },
    delivery: {
      title: "معلومات التوصيل",
      sections: [
        "ستوضّح هذه الصفحة المناطق التي يوصل إليها {store}، والمدة التي يستغرقها التوصيل عادةً، وكيفية احتساب رسوم التوصيل. تظهر رسوم التوصيل لكل طلب في صفحة إتمام الطلب قبل تأكيده.",
      ],
      description: "معلومات التوصيل والاستلام الخاصة بهذا المتجر.",
    },
    returns: {
      title: "الإرجاع والاسترداد",
      sections: [
        "ستوضّح هذه الصفحة ما إذا كان بالإمكان إرجاع المنتجات أو استبدالها ومتى، والحالة التي يجب أن تكون عليها، وكيفية رد المبالغ، والمدة التي يستغرقها ذلك.",
      ],
      description: "معلومات الإرجاع والاسترداد الخاصة بهذا المتجر.",
    },
  },
  placeholderNotice: "نص مؤقت: لم ينشر {store} هذه السياسة بعد. يصف النص أدناه ما ستتضمنه الصفحة فقط، وليس وثيقة قانونية.",
  questions: (storeName, contact) => `لديك استفسار؟ تواصل مع ${storeName}: ${ltr(contact)}`,
};

const ar: StorefrontMessages = {
  quantity: "الكمية",
  decreaseQuantity: "إنقاص الكمية",
  increaseQuantity: "زيادة الكمية",
  addToCart: "أضف إلى السلة",
  added: "تمت الإضافة",
  addedToCart: "تمت الإضافة إلى السلة",
  outOfStock: "نفدت الكمية",
  maxInCart: "الحد الأقصى في السلة",
  allStockInCart: "كل الكمية المتوفرة في سلتك",
  noMoreStock: "لا تتوفر كمية إضافية",
  otherStoreProduct: "هذا المنتج تابع لمتجر آخر",
  alreadyInCart: (n) => `في سلتك الآن: ${n}`,
  items: arItems,
  subtotal: "المجموع الفرعي",
  delivery: "التوصيل",
  pickup: "الاستلام",
  noDeliveryFee: "بدون رسوم توصيل",
  free: "مجاني",
  total: "الإجمالي",
  notReserved: "المنتجات في سلتك غير محجوزة، وقد تتغير الكمية المتوفرة في أي وقت.",
  cartUpdatedTitle: "حدّثنا سلتك لتطابق الأسعار والكميات الحالية في المتجر.",
  pricesChanged: (n) => `تغيّر سعر ${arItems(n)} منذ إضافتها.`,
  quantitiesReduced: (n) => `خُفّضت كمية ${arItems(n)} إلى المتوفر.`,
  noLongerAvailable: (n) => `${arItems(n)} لم تعد متوفرة وأُزيلت من الطلب.`,
  totalsUseCurrentPrices: "المجاميع المعروضة محسوبة بالأسعار الحالية.",
  acceptCartChanges: "حسنًا، حدّث سلتي",
  priceChanged: (was, now) => `تغيّر السعر: كان ${was}، وأصبح ${now}.`,
  onlyAvailable: (available, requested) => `المتوفر ${available} فقط، وقد طلبت ${requested}.`,
  sortBy: "ترتيب حسب",
  sort: { featured: "المميزة", newest: "الأحدث", "price-asc": "السعر: من الأقل إلى الأعلى", "price-desc": "السعر: من الأعلى إلى الأقل" },
  searchProducts: "ابحث في المنتجات",
  searchPlaceholder: "ابحث في المنتجات…",
  pagination: "التنقل بين الصفحات",
  previous: "السابق",
  next: "التالي",
  pageOf: (page, count) => `الصفحة ${page} من ${count}`,
  breadcrumb: "مسار التنقل",
  noContactDetails: "لم تُضف بيانات التواصل بعد.",
  checkout: arCheckout,
  confirmation: arConfirmation,
  validation: arValidation,
  serverErrors: arServerErrors,
  payments: {
    cash_on_delivery: { label: "الدفع نقدًا عند التوصيل", description: "ادفع نقدًا لمندوب التوصيل." },
    card_on_delivery: { label: "الدفع بالبطاقة عند التوصيل", description: "ادفع بالبطاقة عبر جهاز الدفع عند الباب." },
    bank_transfer: { label: "تحويل بنكي", description: "يرسل لك المتجر بيانات الحساب البنكي بعد تقديم الطلب." },
    online_card: { label: "الدفع الإلكتروني بالبطاقة", description: "يتطلب مزوّد خدمة دفع (غير متصل في هذا العرض التجريبي)." },
    cash_on_pickup: { label: "الدفع عند الاستلام من المتجر", description: "ادفع بنفسك عند استلام طلبك من المتجر." },
    stripe_checkout: { label: "بطاقة (Stripe Checkout)", description: "دفع بالبطاقة عبر صفحة دفع مستضافة لمتاجر الإمارات." },
    jazzcash: { label: "JazzCash", description: "دفع عبر صفحة دفع مستضافة لمتاجر باكستان." },
    easypaisa: { label: "Easypaisa", description: "غير متاح إلى أن تُنفَّذ واجهة التاجر الرسمية وآلية التحقق." },
  },
  emirates: {
    "Abu Dhabi": "أبوظبي",
    Dubai: "دبي",
    Sharjah: "الشارقة",
    Ajman: "عجمان",
    "Umm Al Quwain": "أم القيوين",
    "Ras Al Khaimah": "رأس الخيمة",
    Fujairah: "الفجيرة",
  },
  contact: {
    title: (storeName) => `تواصل مع ${storeName}`,
    intro: "لديك سؤال عن منتج أو التوصيل أو طلب؟ تواصل معنا.",
    email: "البريد الإلكتروني",
    phone: "الهاتف",
    address: "العنوان",
    sent: "شكرًا لك! تم إرسال رسالتك إلى المتجر.",
    name: "الاسم",
    subject: "الموضوع",
    message: "الرسالة",
    sending: "جارٍ الإرسال…",
    send: "إرسال الرسالة",
  },
  about: {
    eyebrow: "من نحن",
    browseShop: "تصفّح المتجر",
    contactUs: "تواصل معنا",
    collections: "المجموعات",
    reachUs: "زورونا أو تواصلوا معنا",
  },
  policies: arPolicies,
  demoNotice: (templateName) => `متجر تجريبي — المنتجات والطلبات هنا لعرض قالب ${templateName} فقط.`,
  notFound: {
    title: "لم نعثر على ما تبحث عنه",
    description: "لم نجد هذا في المتجر. ربما أُزيل، أو أن الرابط غير صحيح.",
    backToShop: "العودة إلى المتجر",
  },
  meta: {
    checkout: "إتمام الطلب",
    cart: "سلة التسوق",
    contact: "تواصل معنا",
    contactDescription: "تواصل مع المتجر للاستفسار عن المنتجات والطلبات.",
    about: (storeName) => `عن ${storeName}`,
    aboutDescription: (storeName) => `تعرّف على ${storeName}.`,
    shop: "المتجر",
    browseAll: (storeName) => `تصفّح جميع منتجات ${storeName}.`,
    browseCategory: (category, storeName) => `تصفّح ${category} من ${storeName}.`,
  },
};

export const STOREFRONT_MESSAGES: Readonly<Record<UiLocale, StorefrontMessages>> = { en, ar };

/** Shared labels in a UI locale. */
export function messagesFor(locale: UiLocale): StorefrontMessages {
  return STOREFRONT_MESSAGES[locale] ?? en;
}

/** Shared labels for a store's storefront pages (server or client, given the store). */
export function storefrontMessages(store: Pick<StorefrontStore, "language" | "templateKey">): StorefrontMessages {
  return messagesFor(storefrontUiLocale(store));
}

/**
 * A storefront server message in a UI locale. Server code keeps returning
 * its English text (logs, tests and every English template rely on it);
 * the storefront action boundary translates a message it recognizes and
 * passes anything else through unchanged, so nothing is ever lost.
 */
export function localizeServerMessage(message: string, locale: UiLocale): string {
  if (locale === DEFAULT_UI_LOCALE) return message;
  const key = SERVER_ERROR_KEYS.find((candidate) => en.serverErrors[candidate] === message);
  return key ? messagesFor(locale).serverErrors[key] : message;
}

/**
 * Localized field errors: for each field the server flagged, the message
 * from `localized` (the same validator run with the locale's messages),
 * else the server's own message.
 */
export function localizeFieldErrors<K extends string>(
  serverErrors: Partial<Record<K, string>>,
  localized: Partial<Record<K, string>>,
): Partial<Record<K, string>> {
  const result: Partial<Record<K, string>> = {};
  for (const key of Object.keys(serverErrors) as K[]) {
    if (serverErrors[key]) result[key] = localized[key] || serverErrors[key];
  }
  return result;
}

/**
 * `dir` for values that always read left to right (email addresses, phone
 * numbers) on a localized right-to-left page; undefined everywhere else,
 * so English pages and English-only templates are unchanged.
 */
export function leftToRightValueDir(store: Pick<StorefrontStore, "language" | "templateKey" | "direction">): "ltr" | undefined {
  return store.direction === "rtl" && storefrontUiLocale(store) !== DEFAULT_UI_LOCALE ? "ltr" : undefined;
}

/** A country's name in the UI locale (CLDR via Intl), else the stored name. */
export function countryDisplayName(locale: UiLocale, countryCode: string, storedName: string): string {
  if (locale === DEFAULT_UI_LOCALE) return storedName;
  try {
    return new Intl.DisplayNames([locale], { type: "region" }).of(countryCode) ?? storedName;
  } catch {
    return storedName;
  }
}
