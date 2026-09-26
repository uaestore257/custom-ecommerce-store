import type {
  CurrencyCode,
  OrderStatus,
  PaymentMethodId,
  ProductStatus,
  StoreStatus,
  StoreType,
} from "./types";

// ---------------------------------------------------------------
// DEMO CONFIGURATION
// The public storefront (/, /shop, /cart ...) shows this store by
// default. Change it to point the storefront at another client store.
// ---------------------------------------------------------------
export const DEFAULT_STOREFRONT_STORE_ID = "store-a";

export const STORE_TYPES: { value: StoreType; label: string }[] = [
  { value: "furniture", label: "Furniture shop" },
  { value: "fashion", label: "Fashion shop" },
  { value: "electronics", label: "Electronics shop" },
  { value: "beauty", label: "Beauty shop" },
  { value: "grocery", label: "Grocery shop" },
  { value: "other", label: "Other" },
];

/** Starter categories given to a newly created store of each type. */
export const DEFAULT_CATEGORIES: Record<StoreType, string[]> = {
  furniture: ["Living Room", "Bedroom", "Storage"],
  fashion: ["Women", "Men", "Accessories"],
  electronics: ["Audio", "Computers", "Accessories"],
  beauty: ["Skincare", "Makeup", "Fragrance"],
  grocery: ["Fresh", "Pantry", "Drinks"],
  other: ["General"],
};

export const STORE_STATUSES: { value: StoreStatus; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
];

export const PRODUCT_STATUSES: { value: ProductStatus; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "draft", label: "Draft" },
];

export const ORDER_STATUSES: { value: OrderStatus; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "processing", label: "Processing" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

export const CURRENCIES: { value: CurrencyCode; label: string }[] = [
  { value: "AED", label: "AED — UAE Dirham" },
  { value: "SAR", label: "SAR — Saudi Riyal" },
  { value: "USD", label: "USD — US Dollar" },
  { value: "EUR", label: "EUR — Euro" },
  { value: "GBP", label: "GBP — British Pound" },
];

export const COUNTRIES = [
  "United Arab Emirates",
  "Saudi Arabia",
  "Qatar",
  "Kuwait",
  "Bahrain",
  "Oman",
  "Other",
];

export const UAE = "United Arab Emirates";

export const UAE_EMIRATES = [
  "Abu Dhabi",
  "Dubai",
  "Sharjah",
  "Ajman",
  "Umm Al Quwain",
  "Ras Al Khaimah",
  "Fujairah",
];

export const PAYMENT_METHODS: {
  id: PaymentMethodId;
  label: string;
  description: string;
  /** Online methods need a real payment provider, which this demo does not have. */
  requiresProvider: boolean;
}[] = [
  {
    id: "cash_on_delivery",
    label: "Cash on delivery",
    description: "Customer pays the courier in cash.",
    requiresProvider: false,
  },
  {
    id: "card_on_delivery",
    label: "Card on delivery",
    description: "Customer pays by card machine at the door.",
    requiresProvider: false,
  },
  {
    id: "bank_transfer",
    label: "Bank transfer",
    description: "Store shares bank details after the order is placed.",
    requiresProvider: false,
  },
  {
    id: "online_card",
    label: "Online card payment",
    description: "Needs a payment provider (not connected in this demo).",
    requiresProvider: true,
  },
];

export function labelFor<T extends string>(
  list: { value: T; label: string }[],
  value: T,
) {
  return list.find((item) => item.value === value)?.label ?? value;
}

export function paymentMethodLabel(id: PaymentMethodId) {
  return PAYMENT_METHODS.find((method) => method.id === id)?.label ?? id;
}
