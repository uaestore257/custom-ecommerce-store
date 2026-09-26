// ---------------------------------------------------------------
// DATA MODEL
// Every product, category, order and customer carries a `storeId`,
// and is also kept inside its own store's data collection
// (see lib/demo-db.ts). A real backend can keep the same shapes.
// ---------------------------------------------------------------

export type StoreStatus = "draft" | "active" | "paused";

export type StoreType =
  | "furniture"
  | "fashion"
  | "electronics"
  | "beauty"
  | "grocery"
  | "other";

export type CurrencyCode = "AED" | "SAR" | "USD" | "EUR" | "GBP";

export type PaymentMethodId =
  | "cash_on_delivery"
  | "card_on_delivery"
  | "bank_transfer"
  | "online_card";

export interface PaymentMethodSetting {
  id: PaymentMethodId;
  enabled: boolean;
}

/** Per-store configuration. Each client store has its own copy. */
export interface StoreSettings {
  logoUrl: string;
  accentColor: string; // hex, e.g. "#0f766e"
  currency: CurrencyCode;
  country: string;
  domain: string; // configuration only, nothing is registered or connected
  deliveryFee: number;
  freeDeliveryThreshold: number; // 0 = no free delivery
  paymentMethods: PaymentMethodSetting[];
  // Storefront content
  tagline: string;
  heroTitle: string;
  heroText: string;
  aboutText: string;
  contactEmail: string;
  contactPhone: string;
  contactAddress: string;
}

export interface Store {
  id: string;
  name: string;
  slug: string;
  type: StoreType;
  status: StoreStatus;
  ownerName: string;
  ownerEmail: string;
  createdAt: string; // ISO date
  settings: StoreSettings;
}

export interface Category {
  id: string;
  storeId: string;
  name: string;
  /** Optional banner image for "Shop by Category". Empty = styled placeholder. */
  imageUrl?: string;
}

export type ProductStatus = "active" | "draft";

export interface Product {
  id: string;
  storeId: string;
  name: string;
  sku: string;
  categoryId: string;
  description: string;
  price: number;
  /** Original price shown struck through when on sale. Empty/0 = not on sale. */
  compareAtPrice?: number;
  imageUrl: string; // optional, empty string = placeholder
  stock: number;
  status: ProductStatus;
  featured: boolean;
}

export interface CartItem {
  storeId: string;
  productId: string;
  quantity: number;
}

export type OrderStatus =
  | "pending"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled";

export interface OrderItem {
  productId: string;
  name: string;
  sku: string;
  unitPrice: number;
  quantity: number;
}

export interface Order {
  id: string;
  storeId: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  address: string;
  city: string;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  currency: CurrencyCode;
  paymentMethod: PaymentMethodId;
  status: OrderStatus;
  createdAt: string; // ISO date
  isDemo: true;
}

export interface Customer {
  id: string;
  storeId: string;
  name: string;
  email: string;
  phone: string;
  createdAt: string;
}

/** Everything that belongs to one client store. */
export interface StoreData {
  categories: Category[];
  products: Product[];
  orders: Order[];
  customers: Customer[];
}

export interface AgencySettings {
  agencyName: string;
  contactEmail: string;
  defaultCurrency: CurrencyCode;
  defaultCountry: string;
  showPausedStores: boolean;
}

export interface DemoState {
  agency: AgencySettings;
  stores: Store[];
  /** Store-specific collections, keyed by store ID. */
  storeData: Record<string, StoreData>;
}
