// ---------------------------------------------------------------
// ADMIN VIEW TYPES
// Plain, serializable shapes that the database-backed admin pages pass
// from the server to client components. Components never see Prisma
// records, BigInt values or database details — money is sent as exact
// decimal strings plus a display string formatted on the server.
// ---------------------------------------------------------------

export type DbStoreStatus = "DRAFT" | "ACTIVE" | "PAUSED" | "SUSPENDED";
export type DbProductStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";

export interface ReferenceOptions {
  countries: { code: string; name: string }[];
  currencies: { code: string; name: string; minorUnits: number }[];
  languages: { code: string; name: string; nativeName: string; direction: "LTR" | "RTL" }[];
  timeZones: string[];
}

/** One row in store lists, cards and the store selector. */
export interface AdminStoreSummary {
  id: string;
  name: string;
  slug: string;
  businessType: string | null;
  status: DbStoreStatus;
  countryCode: string;
  baseCurrency: string;
  logoUrl: string | null;
  accentColor: string | null;
  createdAt: string; // ISO
  archivedAt: string | null; // ISO
  productCount: number;
  /** "Client Store A", "Client Store B", … by creation order. */
  letterLabel: string;
}

/** Everything the store settings form edits. */
export interface AdminStoreDetail extends AdminStoreSummary {
  timezone: string;
  defaultLanguage: string;
  languages: string[]; // enabled languages
  currencyMinorUnits: number;
  formatLocale: string;
  contactEmail: string;
  contactPhone: string;
  contactAddress: string;
  ownerName: string;
  ownerEmail: string;
  content: { tagline: string; heroTitle: string; heroText: string; aboutText: string };
  paymentMethods: { method: string; enabled: boolean }[];
  categoryCount: number;
  hasPrices: boolean; // products have prices -> currency is locked
}

export interface AdminStorePaymentSettings {
  id: string;
  name: string;
  paymentMethods: { method: string; enabled: boolean }[];
  bankTransfer: {
    bankName: string;
    accountName: string;
    accountNumber: string;
    iban: string;
    swiftCode: string;
    instructions: string;
  };
  stripe: {
    accountId: string;
    hasCredentialReference: boolean;
    enabled: boolean;
    available: boolean;
  };
}

export interface AdminCustomerSummary {
  id: string;
  name: string;
  email: string;
  phone: string;
  orderCount: number;
  createdAt: string;
}

export interface AdminCategory {
  id: string;
  name: string;
  imageUrl: string;
  position: number;
  productCount: number;
}

export interface AdminProduct {
  id: string;
  name: string;
  description: string;
  sku: string;
  categoryId: string;
  categoryName: string;
  /** Exact decimal strings in the store currency, e.g. "2499.00". */
  price: string;
  compareAtPrice: string;
  deliveryFee: string;
  priceDisplay: string;
  compareAtDisplay: string;
  deliveryFeeDisplay: string;
  freeDelivery: boolean;
  pickupOnly: boolean;
  imageUrl: string;
  stock: number;
  status: DbProductStatus;
  featured: boolean;
  /** Products with past orders are archived instead of deleted. */
  hasOrders: boolean;
}

export type DbOrderStatus = "PENDING" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED";
export type DbPaymentStatus = "UNPAID" | "PAID";
export type DbInquiryStatus = "NEW" | "READ" | "ARCHIVED";

/** One contact message in the admin's inbox for a store (from the database). */
export interface AdminInquiry {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: DbInquiryStatus;
  createdAt: string; // ISO
}

/** One row of the admin's read-only orders list (from the database). */
export interface AdminOrderSummary {
  id: string;
  /** e.g. "NO-1004" */
  number: string;
  placedAt: string; // ISO
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  itemCount: number;
  /** Formatted in the order's own currency, e.g. "AED 2,499.00". */
  totalDisplay: string;
  paymentMethod: string;
  paymentStatus: DbPaymentStatus;
  status: DbOrderStatus;
  /** Seeded sample orders are marked so they aren't mistaken for real ones. */
  isSample: boolean;
}

/** One order with everything the admin's order page shows (from the database). */
export interface AdminOrderDetail extends AdminOrderSummary {
  fulfillmentMethod: "DELIVERY" | "PICKUP";
  address: {
    recipientName: string;
    line1: string;
    city: string;
    region: string;
    countryCode: string;
  };
  items: {
    id: string;
    name: string;
    variantTitle: string;
    sku: string;
    quantity: number;
    unitPriceDisplay: string;
    lineTotalDisplay: string;
  }[];
  subtotalDisplay: string;
  shippingDisplay: string;
  taxDisplay: string;
  /** Empty when there is no discount. */
  discountDisplay: string;
}

export type ActionResult<T = undefined> =
  | { ok: true; data: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };
