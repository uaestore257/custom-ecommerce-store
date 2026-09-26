import { DEFAULT_CATEGORIES, PAYMENT_METHODS } from "./config";
import type {
  AgencySettings,
  Category,
  Customer,
  DemoState,
  Order,
  PaymentMethodId,
  Product,
  Store,
  StoreData,
  StoreSettings,
  StoreType,
} from "./types";

// ---------------------------------------------------------------
// SEED DATA
// This is the starting demo data. Changes made in the admin are saved
// in the browser (localStorage) on top of this. "Reset demo data" in
// Agency Settings returns everything to this state.
// ---------------------------------------------------------------

export const seedAgency: AgencySettings = {
  agencyName: "Your Agency",
  contactEmail: "hello@youragency.example",
  defaultCurrency: "AED",
  defaultCountry: "United Arab Emirates",
  showPausedStores: true,
};

function paymentMethods(enabled: PaymentMethodId[]) {
  return PAYMENT_METHODS.map((method) => ({
    id: method.id,
    enabled: enabled.includes(method.id),
  }));
}

/** Settings used when the agency creates a brand new client store. */
export function defaultStoreSettings(
  overrides: Partial<StoreSettings> = {},
): StoreSettings {
  return {
    logoUrl: "",
    accentColor: "#0f766e",
    currency: "AED",
    country: "United Arab Emirates",
    domain: "",
    deliveryFee: 25,
    freeDeliveryThreshold: 0,
    paymentMethods: paymentMethods(["cash_on_delivery"]),
    tagline: "Quality products, delivered.",
    heroTitle: "Welcome to our store",
    heroText: "Browse our collection and find something you'll love.",
    aboutText:
      "We are a small, independent shop. Tell your customers who you are, what you sell and why they can trust you.",
    contactEmail: "",
    contactPhone: "",
    contactAddress: "",
    ...overrides,
  };
}

export function defaultCategories(storeId: string, type: StoreType): Category[] {
  return DEFAULT_CATEGORIES[type].map((name, index) => ({
    id: `${storeId}-cat-${index + 1}`,
    storeId,
    name,
  }));
}

// ---------------- Stores ----------------

const seedStores: Store[] = [
  {
    id: "store-a",
    name: "Nest & Oak Home",
    slug: "nest-and-oak",
    type: "furniture",
    status: "active",
    ownerName: "Sara Al Mansoori",
    ownerEmail: "sara@nestandoak.example",
    createdAt: "2026-06-02T09:00:00.000Z",
    settings: defaultStoreSettings({
      accentColor: "#0f766e",
      domain: "nestandoak.example",
      deliveryFee: 30,
      freeDeliveryThreshold: 750,
      paymentMethods: paymentMethods(["cash_on_delivery", "card_on_delivery"]),
      tagline: "Furniture and storage for calm, tidy homes.",
      heroTitle: "Good things for your home, picked with care",
      heroText:
        "Solid wood furniture and clever storage that keeps every room calm. Delivered across the UAE.",
      aboutText:
        "Nest & Oak Home started in Dubai with one idea: furniture should be beautiful, practical and built to last. We choose every piece ourselves, test it at home, and only sell what we would keep. Our small team delivers across all seven emirates.",
      contactEmail: "hello@nestandoak.example",
      contactPhone: "+971 4 000 0000",
      contactAddress: "Warehouse 12, Al Quoz Industrial Area 3, Dubai, UAE",
    }),
  },
  {
    id: "store-b",
    name: "Threadline Boutique",
    slug: "threadline",
    type: "fashion",
    status: "active",
    ownerName: "Omar Haddad",
    ownerEmail: "omar@threadline.example",
    createdAt: "2026-07-14T09:00:00.000Z",
    settings: defaultStoreSettings({
      accentColor: "#be185d",
      domain: "threadline.example",
      deliveryFee: 20,
      freeDeliveryThreshold: 300,
      paymentMethods: paymentMethods(["cash_on_delivery", "bank_transfer"]),
      tagline: "Everyday fashion with a modern edge.",
      heroTitle: "New season, new favourites",
      heroText: "Breathable fabrics and easy shapes made for UAE weather.",
      aboutText:
        "Threadline Boutique designs comfortable everyday clothing in small batches, with a focus on natural fabrics.",
      contactEmail: "care@threadline.example",
      contactPhone: "+971 2 000 0000",
      contactAddress: "Shop 4, Al Raha Mall, Abu Dhabi, UAE",
    }),
  },
  {
    id: "store-c",
    name: "VoltBox Electronics",
    slug: "voltbox",
    type: "electronics",
    status: "draft",
    ownerName: "Khalid Rahman",
    ownerEmail: "khalid@voltbox.example",
    createdAt: "2026-09-01T09:00:00.000Z",
    settings: defaultStoreSettings({
      accentColor: "#1d4ed8",
      currency: "SAR",
      country: "Saudi Arabia",
      domain: "",
      deliveryFee: 35,
      paymentMethods: paymentMethods(["cash_on_delivery"]),
      tagline: "Smart gadgets without the jargon.",
      heroTitle: "Tech that just works",
      heroText: "Headphones, laptops and accessories with honest advice.",
      aboutText:
        "VoltBox is a new electronics store preparing to launch in Riyadh.",
      contactEmail: "support@voltbox.example",
      contactPhone: "+966 11 000 0000",
      contactAddress: "Olaya Street, Riyadh, Saudi Arabia",
    }),
  },
];

// ---------------- Store A: furniture ----------------

const storeACategories: Category[] = [
  { id: "store-a-cat-1", storeId: "store-a", name: "Living Room" },
  { id: "store-a-cat-2", storeId: "store-a", name: "Bedroom" },
  { id: "store-a-cat-3", storeId: "store-a", name: "Storage" },
  { id: "store-a-cat-4", storeId: "store-a", name: "Office" },
];

const storeAProducts: Product[] = [
  {
    id: "fur-001",
    storeId: "store-a",
    name: "Oakline 3-Seater Sofa",
    sku: "NO-SOF-001",
    categoryId: "store-a-cat-1",
    description:
      "A deep, comfortable three-seater with a solid oak frame and washable linen-blend covers. Seat height 45 cm, width 210 cm.",
    price: 2499,
    imageUrl: "",
    stock: 6,
    status: "active",
    featured: true,
  },
  {
    id: "fur-002",
    storeId: "store-a",
    name: "Cube Storage Shelf (9 compartments)",
    sku: "NO-STO-002",
    categoryId: "store-a-cat-3",
    description:
      "Nine open cubes for books, baskets and display pieces. Can stand upright or lie flat as a low sideboard.",
    price: 449,
    imageUrl: "",
    stock: 24,
    status: "active",
    featured: true,
  },
  {
    id: "fur-003",
    storeId: "store-a",
    name: "Linen Bed Frame — Queen",
    sku: "NO-BED-003",
    categoryId: "store-a-cat-2",
    description:
      "Upholstered queen bed frame with a padded headboard and slatted base. Mattress not included.",
    price: 1899,
    imageUrl: "",
    stock: 4,
    status: "active",
    featured: true,
  },
  {
    id: "fur-004",
    storeId: "store-a",
    name: "Under-Bed Storage Drawers (set of 2)",
    sku: "NO-STO-004",
    categoryId: "store-a-cat-3",
    description:
      "Two rolling drawers that slide under most beds. Soft-close lids keep out dust.",
    price: 189,
    imageUrl: "",
    stock: 40,
    status: "active",
    featured: false,
  },
  {
    id: "fur-005",
    storeId: "store-a",
    name: "Walnut Coffee Table",
    sku: "NO-TAB-005",
    categoryId: "store-a-cat-1",
    description:
      "Low round coffee table in walnut veneer with a hidden shelf for remotes and magazines.",
    price: 699,
    imageUrl: "",
    stock: 10,
    status: "active",
    featured: false,
  },
  {
    id: "fur-006",
    storeId: "store-a",
    name: "Two-Door Wardrobe",
    sku: "NO-WAR-006",
    categoryId: "store-a-cat-2",
    description:
      "Wardrobe with a full-width hanging rail, top shelf and two internal drawers. 100 × 58 × 200 cm.",
    price: 1299,
    imageUrl: "",
    stock: 0,
    status: "active",
    featured: false,
  },
  {
    id: "fur-007",
    storeId: "store-a",
    name: "Fabric Storage Baskets (set of 3)",
    sku: "NO-STO-007",
    categoryId: "store-a-cat-3",
    description:
      "Foldable woven baskets that fit standard cube shelves. Handles on both sides.",
    price: 79,
    imageUrl: "",
    stock: 60,
    status: "active",
    featured: false,
  },
  {
    id: "fur-008",
    storeId: "store-a",
    name: "Compact Writing Desk",
    sku: "NO-OFF-008",
    categoryId: "store-a-cat-4",
    description:
      "A small desk for home offices and bedrooms, with one drawer and cable hole. 100 × 50 cm.",
    price: 549,
    imageUrl: "",
    stock: 12,
    status: "active",
    featured: false,
  },
];

const storeACustomers: Customer[] = [
  {
    id: "store-a-cus-1",
    storeId: "store-a",
    name: "Aisha Khan",
    email: "aisha.demo@example.com",
    phone: "+971 50 000 0001",
    createdAt: "2026-08-03T10:00:00.000Z",
  },
  {
    id: "store-a-cus-2",
    storeId: "store-a",
    name: "Daniel Roberts",
    email: "daniel.demo@example.com",
    phone: "+971 55 000 0002",
    createdAt: "2026-08-19T10:00:00.000Z",
  },
  {
    id: "store-a-cus-3",
    storeId: "store-a",
    name: "Fatima Noor",
    email: "fatima.demo@example.com",
    phone: "+971 52 000 0003",
    createdAt: "2026-09-10T10:00:00.000Z",
  },
];

const storeAOrders: Order[] = [
  {
    id: "store-a-ord-1001",
    storeId: "store-a",
    orderNumber: "NO-1001",
    customerId: "store-a-cus-1",
    customerName: "Aisha Khan",
    customerEmail: "aisha.demo@example.com",
    customerPhone: "+971 50 000 0001",
    address: "Villa 8, Street 14, Al Barsha 2",
    city: "Dubai",
    items: [
      { productId: "fur-002", name: "Cube Storage Shelf (9 compartments)", sku: "NO-STO-002", unitPrice: 449, quantity: 1 },
      { productId: "fur-007", name: "Fabric Storage Baskets (set of 3)", sku: "NO-STO-007", unitPrice: 79, quantity: 2 },
    ],
    subtotal: 607,
    deliveryFee: 30,
    total: 637,
    currency: "AED",
    paymentMethod: "cash_on_delivery",
    status: "delivered",
    createdAt: "2026-08-03T10:15:00.000Z",
    isDemo: true,
  },
  {
    id: "store-a-ord-1002",
    storeId: "store-a",
    orderNumber: "NO-1002",
    customerId: "store-a-cus-2",
    customerName: "Daniel Roberts",
    customerEmail: "daniel.demo@example.com",
    customerPhone: "+971 55 000 0002",
    address: "Apartment 1204, Marina Heights",
    city: "Dubai",
    items: [
      { productId: "fur-001", name: "Oakline 3-Seater Sofa", sku: "NO-SOF-001", unitPrice: 2499, quantity: 1 },
    ],
    subtotal: 2499,
    deliveryFee: 0,
    total: 2499,
    currency: "AED",
    paymentMethod: "card_on_delivery",
    status: "shipped",
    createdAt: "2026-08-19T16:40:00.000Z",
    isDemo: true,
  },
  {
    id: "store-a-ord-1003",
    storeId: "store-a",
    orderNumber: "NO-1003",
    customerId: "store-a-cus-3",
    customerName: "Fatima Noor",
    customerEmail: "fatima.demo@example.com",
    customerPhone: "+971 52 000 0003",
    address: "Building 3, Al Majaz 2",
    city: "Sharjah",
    items: [
      { productId: "fur-004", name: "Under-Bed Storage Drawers (set of 2)", sku: "NO-STO-004", unitPrice: 189, quantity: 2 },
    ],
    subtotal: 378,
    deliveryFee: 30,
    total: 408,
    currency: "AED",
    paymentMethod: "cash_on_delivery",
    status: "pending",
    createdAt: "2026-09-10T08:05:00.000Z",
    isDemo: true,
  },
];

// ---------------- Store B: fashion ----------------

const storeBCategories: Category[] = [
  { id: "store-b-cat-1", storeId: "store-b", name: "Women" },
  { id: "store-b-cat-2", storeId: "store-b", name: "Men" },
  { id: "store-b-cat-3", storeId: "store-b", name: "Accessories" },
];

const storeBProducts: Product[] = [
  {
    id: "fas-001",
    storeId: "store-b",
    name: "Linen Wrap Dress",
    sku: "TL-WOM-001",
    categoryId: "store-b-cat-1",
    description: "A lightweight linen wrap dress with a tie waist. Sizes XS–XL.",
    price: 289,
    imageUrl: "",
    stock: 18,
    status: "active",
    featured: true,
  },
  {
    id: "fas-002",
    storeId: "store-b",
    name: "Cotton Oxford Shirt",
    sku: "TL-MEN-002",
    categoryId: "store-b-cat-2",
    description: "Classic button-down oxford shirt in soft, breathable cotton.",
    price: 179,
    imageUrl: "",
    stock: 30,
    status: "active",
    featured: true,
  },
  {
    id: "fas-003",
    storeId: "store-b",
    name: "Woven Tote Bag",
    sku: "TL-ACC-003",
    categoryId: "store-b-cat-3",
    description: "Roomy hand-woven tote with leather handles.",
    price: 145,
    imageUrl: "",
    stock: 12,
    status: "active",
    featured: true,
  },
  {
    id: "fas-004",
    storeId: "store-b",
    name: "Relaxed Chino Trousers",
    sku: "TL-MEN-004",
    categoryId: "store-b-cat-2",
    description: "Relaxed-fit chinos with a hint of stretch.",
    price: 199,
    imageUrl: "",
    stock: 22,
    status: "draft",
    featured: false,
  },
];

const storeBCustomers: Customer[] = [
  {
    id: "store-b-cus-1",
    storeId: "store-b",
    name: "Layla Hassan",
    email: "layla.demo@example.com",
    phone: "+971 50 000 0011",
    createdAt: "2026-08-22T12:00:00.000Z",
  },
  {
    id: "store-b-cus-2",
    storeId: "store-b",
    name: "Ravi Menon",
    email: "ravi.demo@example.com",
    phone: "+971 56 000 0012",
    createdAt: "2026-09-05T12:00:00.000Z",
  },
];

const storeBOrders: Order[] = [
  {
    id: "store-b-ord-1001",
    storeId: "store-b",
    orderNumber: "TL-1001",
    customerId: "store-b-cus-1",
    customerName: "Layla Hassan",
    customerEmail: "layla.demo@example.com",
    customerPhone: "+971 50 000 0011",
    address: "Apartment 502, Al Reem Island",
    city: "Abu Dhabi",
    items: [
      { productId: "fas-001", name: "Linen Wrap Dress", sku: "TL-WOM-001", unitPrice: 289, quantity: 1 },
      { productId: "fas-003", name: "Woven Tote Bag", sku: "TL-ACC-003", unitPrice: 145, quantity: 1 },
    ],
    subtotal: 434,
    deliveryFee: 0,
    total: 434,
    currency: "AED",
    paymentMethod: "bank_transfer",
    status: "processing",
    createdAt: "2026-08-22T12:30:00.000Z",
    isDemo: true,
  },
  {
    id: "store-b-ord-1002",
    storeId: "store-b",
    orderNumber: "TL-1002",
    customerId: "store-b-cus-2",
    customerName: "Ravi Menon",
    customerEmail: "ravi.demo@example.com",
    customerPhone: "+971 56 000 0012",
    address: "Villa 21, Al Nahda",
    city: "Ajman",
    items: [
      { productId: "fas-002", name: "Cotton Oxford Shirt", sku: "TL-MEN-002", unitPrice: 179, quantity: 1 },
    ],
    subtotal: 179,
    deliveryFee: 20,
    total: 199,
    currency: "AED",
    paymentMethod: "cash_on_delivery",
    status: "cancelled",
    createdAt: "2026-09-05T18:20:00.000Z",
    isDemo: true,
  },
];

// ---------------- Store C: electronics (draft, no orders yet) ----------------

const storeCCategories: Category[] = defaultCategories("store-c", "electronics");

const storeCProducts: Product[] = [
  {
    id: "ele-001",
    storeId: "store-c",
    name: "Wireless Noise-Cancelling Headphones",
    sku: "VB-AUD-001",
    categoryId: "store-c-cat-1",
    description: "Over-ear headphones with 30-hour battery and active noise cancelling.",
    price: 599,
    imageUrl: "",
    stock: 15,
    status: "active",
    featured: true,
  },
  {
    id: "ele-002",
    storeId: "store-c",
    name: '14" Everyday Laptop',
    sku: "VB-COM-002",
    categoryId: "store-c-cat-2",
    description: "Light 14-inch laptop with 16 GB RAM and 512 GB SSD.",
    price: 2899,
    imageUrl: "",
    stock: 5,
    status: "active",
    featured: true,
  },
  {
    id: "ele-003",
    storeId: "store-c",
    name: "65W USB-C Fast Charger",
    sku: "VB-ACC-003",
    categoryId: "store-c-cat-3",
    description: "Compact charger with two USB-C ports and one USB-A port.",
    price: 129,
    imageUrl: "",
    stock: 50,
    status: "active",
    featured: true,
  },
];

// ---------------- Assemble ----------------

export function createSeedState(): DemoState {
  const storeData: Record<string, StoreData> = {
    "store-a": {
      categories: storeACategories,
      products: storeAProducts,
      orders: storeAOrders,
      customers: storeACustomers,
    },
    "store-b": {
      categories: storeBCategories,
      products: storeBProducts,
      orders: storeBOrders,
      customers: storeBCustomers,
    },
    "store-c": {
      categories: storeCCategories,
      products: storeCProducts,
      orders: [],
      customers: [],
    },
  };
  // Deep copy so edits never change the original seed objects.
  return structuredClone({ agency: seedAgency, stores: seedStores, storeData });
}
