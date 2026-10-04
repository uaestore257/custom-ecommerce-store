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
import { getTemplateDefinition } from "./templates/registry";
import type { StorefrontStore } from "./storefront-types";

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
}

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
};

export const STOREFRONT_MESSAGES: Readonly<Record<UiLocale, StorefrontMessages>> = { en, ar };

/** Shared labels in a UI locale. */
export function messagesFor(locale: UiLocale): StorefrontMessages {
  return STOREFRONT_MESSAGES[locale];
}

/** Shared labels for a store's storefront pages (server or client, given the store). */
export function storefrontMessages(store: Pick<StorefrontStore, "language" | "templateKey">): StorefrontMessages {
  return messagesFor(storefrontUiLocale(store));
}
