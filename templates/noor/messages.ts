// Noor's own interface copy, English and Arabic, typed so a locale missing
// a key is a compile error. Shared commerce labels (add to cart, totals,
// sort, pagination) come from lib/storefront-i18n.ts; this file holds only
// what Noor itself says. It never states facts about a store: anything
// store-specific (names, story, products) is the store's own content.
import type { PolicyId } from "@/lib/policies";
import type { UiLocale } from "@/lib/storefront-i18n";

export interface NoorMessages {
  home: string;
  shop: string;
  allProducts: string;
  collections: string;
  about: string;
  contact: string;
  search: string;
  cart: string;
  cartLabel: (count: string) => string;
  menu: string;
  closeMenu: string;
  mainNavigation: string;
  purchase: string;
  shopTheCollection: string;
  ourStory: string;
  featured: string;
  discover: string;
  viewAll: string;
  aboutStore: (store: string) => string;
  closingTitle: string;
  closingText: string;
  contactUs: string;
  sale: string;
  originalPrice: string;
  salePrice: string;
  inStock: string;
  onlyLeft: (n: number) => string;
  soldOut: string;
  description: string;
  details: string;
  reference: string;
  deliveryAndPickup: string;
  freeDelivery: string;
  deliveryFee: (fee: string) => string;
  pickupOnly: string;
  pickupAlso: (store: string) => string;
  pickupOnlyNote: (store: string) => string;
  related: string;
  showImage: (i: number, n: number) => string;
  imageOf: (name: string, i: number, n: number) => string;
  images: (name: string) => string;
  noMatches: string;
  noMatchesText: string;
  clearFilters: string;
  resultsFor: (q: string) => string;
  yourCart: string;
  cartEmpty: string;
  cartEmptyText: string;
  checkout: string;
  continueShopping: string;
  remove: string;
  quantityFor: (name: string) => string;
  checking: string;
  couldNotCheck: string;
  tryAgain: string;
  summary: string;
  chosenAtCheckout: string;
  each: (price: string) => string;
  storePolicies: string;
  policies: Record<PolicyId, string>;
  footerShop: string;
  footerHelp: string;
}

const en: NoorMessages = {
  home: "Home",
  shop: "Shop",
  allProducts: "All products",
  collections: "Collections",
  about: "About",
  contact: "Contact",
  search: "Search",
  cart: "Cart",
  cartLabel: (count) => `Cart, ${count}`,
  menu: "Menu",
  closeMenu: "Close menu",
  mainNavigation: "Main navigation",
  purchase: "Purchase",
  shopTheCollection: "Shop the collection",
  ourStory: "Our story",
  featured: "Featured pieces",
  discover: "Discover by collection",
  viewAll: "View all",
  aboutStore: (store) => `About ${store}`,
  closingTitle: "Explore the full collection",
  closingText: "Browse every piece, or contact us about an order or a gift.",
  contactUs: "Contact us",
  sale: "Sale",
  originalPrice: "Original price",
  salePrice: "Sale price",
  inStock: "In stock",
  onlyLeft: (n) => `Only ${n} left`,
  soldOut: "Sold out",
  description: "Description",
  details: "Details",
  reference: "Reference",
  deliveryAndPickup: "Delivery & pickup",
  freeDelivery: "Free delivery",
  deliveryFee: (fee) => `Delivery: ${fee}`,
  pickupOnly: "Pickup only",
  pickupAlso: (store) => `You can also choose pickup from ${store} at checkout.`,
  pickupOnlyNote: (store) => `This piece is collected from ${store}; it cannot be delivered.`,
  related: "You may also like",
  showImage: (i, n) => `Show image ${i} of ${n}`,
  imageOf: (name, i, n) => (n > 1 ? `${name}, image ${i} of ${n}` : name),
  images: (name) => `${name} images`,
  noMatches: "No products match",
  noMatchesText: "Try a different search or collection.",
  clearFilters: "Clear filters",
  resultsFor: (q) => `Results for “${q}”`,
  yourCart: "Your cart",
  cartEmpty: "Your cart is empty.",
  cartEmptyText: "Browse the collection and add something you love.",
  checkout: "Checkout",
  continueShopping: "Continue shopping",
  remove: "Remove",
  quantityFor: (name) => `Quantity for ${name}`,
  checking: "Checking current prices and stock…",
  couldNotCheck: "We couldn't check current prices and stock.",
  tryAgain: "Try again",
  summary: "Summary",
  chosenAtCheckout: "Delivery or pickup is chosen at checkout.",
  each: (price) => `${price} each`,
  storePolicies: "Store policies",
  policies: { privacy: "Privacy policy", terms: "Terms and conditions", delivery: "Delivery information", returns: "Returns and refunds" },
  footerShop: "Shop",
  footerHelp: "Help",
};

const ar: NoorMessages = {
  home: "الرئيسية",
  shop: "المتجر",
  allProducts: "جميع المنتجات",
  collections: "المجموعات",
  about: "من نحن",
  contact: "تواصل معنا",
  search: "بحث",
  cart: "السلة",
  cartLabel: (count) => `السلة، ${count}`,
  menu: "القائمة",
  closeMenu: "إغلاق القائمة",
  mainNavigation: "التنقل الرئيسي",
  purchase: "الشراء",
  shopTheCollection: "تسوّق المجموعة",
  ourStory: "قصتنا",
  featured: "قطع مختارة",
  discover: "اكتشف حسب المجموعة",
  viewAll: "عرض الكل",
  aboutStore: (store) => `عن ${store}`,
  closingTitle: "اكتشف المجموعة كاملة",
  closingText: "تصفّح جميع القطع، أو تواصل معنا بخصوص طلب أو هدية.",
  contactUs: "تواصل معنا",
  sale: "تخفيض",
  originalPrice: "السعر الأصلي",
  salePrice: "سعر التخفيض",
  inStock: "متوفر",
  onlyLeft: (n) => `بقي ${n} فقط`,
  soldOut: "نفدت الكمية",
  description: "الوصف",
  details: "التفاصيل",
  reference: "رمز المنتج",
  deliveryAndPickup: "التوصيل والاستلام",
  freeDelivery: "توصيل مجاني",
  deliveryFee: (fee) => `رسوم التوصيل: ${fee}`,
  pickupOnly: "الاستلام من المتجر فقط",
  pickupAlso: (store) => `يمكنك أيضًا اختيار الاستلام من ${store} عند إتمام الطلب.`,
  pickupOnlyNote: (store) => `تُستلم هذه القطعة من ${store}، ولا يتوفر لها توصيل.`,
  related: "قد يعجبك أيضًا",
  showImage: (i, n) => `عرض الصورة ${i} من ${n}`,
  imageOf: (name, i, n) => (n > 1 ? `${name}، الصورة ${i} من ${n}` : name),
  images: (name) => `صور ${name}`,
  noMatches: "لا توجد منتجات مطابقة",
  noMatchesText: "جرّب بحثًا آخر أو مجموعة أخرى.",
  clearFilters: "مسح عوامل التصفية",
  resultsFor: (q) => `نتائج البحث عن «${q}»`,
  yourCart: "سلة التسوق",
  cartEmpty: "سلتك فارغة.",
  cartEmptyText: "تصفّح المجموعة وأضف ما يعجبك.",
  checkout: "إتمام الطلب",
  continueShopping: "متابعة التسوق",
  remove: "إزالة",
  quantityFor: (name) => `كمية ${name}`,
  checking: "نتحقق من الأسعار والكميات الحالية…",
  couldNotCheck: "تعذّر التحقق من الأسعار والكميات الحالية.",
  tryAgain: "حاول مجددًا",
  summary: "ملخص الطلب",
  chosenAtCheckout: "تختار التوصيل أو الاستلام عند إتمام الطلب.",
  each: (price) => `${price} للقطعة`,
  storePolicies: "سياسات المتجر",
  policies: { privacy: "سياسة الخصوصية", terms: "الشروط والأحكام", delivery: "معلومات التوصيل", returns: "الإرجاع والاسترداد" },
  footerShop: "المتجر",
  footerHelp: "المساعدة",
};

export const NOOR_MESSAGES: Readonly<Record<UiLocale, NoorMessages>> = { en, ar };

export function noorMessages(locale: UiLocale): NoorMessages {
  return NOOR_MESSAGES[locale];
}
