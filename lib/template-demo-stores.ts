// ---------------------------------------------------------------
// TEMPLATE DEMO STORES (pure data: no React, no database)
//
// One demonstration store per registered template, so visitors to the
// public Work page can open a live store in every design direction and
// judge what their own store could look like. These are NOT client stores:
// they are created with Store.isDemo = true (the storefront shows a
// "Demonstration store" notice and they are never indexed), they have no
// owner account, and their products, contacts and prices are illustrative.
// Copy is plain and factual: no certifications, guarantees or "best" claims.
//
// Record<TemplateKey, …>: registering a template without a demo store here
// is a type error. Classic and Atelier reuse the seeded Threadline and
// Nest & Oak content (lib/demo-data.ts) so the two never drift apart.
// Provisioning: lib/server/template-demo-stores.ts.
// ---------------------------------------------------------------
import { createSeedState } from "./demo-data";
import { SERVICE_CATEGORIES } from "./platform/services";
import type { TemplateKey } from "./templates/registry";
import type { StoreType } from "./types";

export type DemoWorkServiceSlug = (typeof SERVICE_CATEGORIES)[number]["slug"];

export interface DemoStoreProduct {
  name: string;
  /** URL segment; required when the name has no Latin letters (e.g. Arabic). */
  slug?: string;
  sku: string;
  /** Name of one of the store's categories. */
  category: string;
  description: string;
  /** Major units as typed in the admin, e.g. "549.00". */
  price: string;
  compareAtPrice?: string;
  stock: number;
  featured: boolean;
  status?: "ACTIVE" | "DRAFT";
  deliveryFee?: string;
}

export interface DemoStoreSpec {
  slug: string;
  name: string;
  businessType: StoreType;
  /** Explicit canonical Services category used to list this demo on Work. */
  workServiceSlug: DemoWorkServiceSlug;
  countryCode: string;
  currency: string;
  timezone: string;
  /** The store's content language; must be in `languages`. */
  defaultLanguage: string;
  languages: readonly string[];
  accentColor: string;
  contactEmail: string;
  /** E.164, e.g. "+97140000000". */
  contactPhone: string;
  contactAddress: string;
  content: { tagline: string; heroTitle: string; heroText: string; aboutText: string };
  /** Category names in display order, with a URL segment for non-Latin names. */
  categories: readonly { name: string; slug?: string }[];
  products: readonly DemoStoreProduct[];
}

const e164 = (phone: string) => phone.replace(/[^\d+]/g, "");

/** A seeded demo store (lib/demo-data.ts), as a spec. */
function fromSeed(slug: string): DemoStoreSpec {
  const seed = createSeedState();
  const store = seed.stores.find((candidate) => candidate.slug === slug);
  if (!store) throw new Error(`Seeded demo store "${slug}" is missing.`);
  const data = seed.storeData[store.id];
  const categoryName = new Map(data.categories.map((category) => [category.id, category.name]));
  const s = store.settings;
  return {
    slug: store.slug,
    name: store.name,
    businessType: store.type,
    workServiceSlug: "ecommerce",
    countryCode: "AE",
    currency: s.currency,
    timezone: "Asia/Dubai",
    defaultLanguage: "en",
    languages: ["en"],
    accentColor: s.accentColor,
    contactEmail: s.contactEmail,
    contactPhone: e164(s.contactPhone),
    contactAddress: s.contactAddress,
    content: { tagline: s.tagline, heroTitle: s.heroTitle, heroText: s.heroText, aboutText: s.aboutText },
    categories: data.categories.map((category) => ({ name: category.name })),
    products: data.products.map((product) => ({
      name: product.name,
      sku: product.sku,
      category: categoryName.get(product.categoryId) ?? "",
      description: product.description,
      price: product.price.toFixed(2),
      ...(product.compareAtPrice && product.compareAtPrice > product.price ? { compareAtPrice: product.compareAtPrice.toFixed(2) } : {}),
      stock: product.stock,
      featured: product.featured,
      status: product.status === "active" ? "ACTIVE" : "DRAFT",
    })),
  };
}

const UAE = { countryCode: "AE", currency: "AED", timezone: "Asia/Dubai" } as const;

export const TEMPLATE_DEMO_STORES: Readonly<Record<TemplateKey, DemoStoreSpec>> = {
  classic: fromSeed("threadline"),
  atelier: fromSeed("nest-and-oak"),

  kinetic: {
    slug: "pulse-audio",
    name: "Pulse Audio",
    businessType: "electronics",
    workServiceSlug: "ecommerce",
    ...UAE,
    defaultLanguage: "en",
    languages: ["en"],
    accentColor: "#2b59ff",
    contactEmail: "hello@pulseaudio.example",
    contactPhone: "+97140000003",
    contactAddress: "Unit 4, Dubai Design District, Dubai, UAE",
    content: {
      tagline: "Headphones and speakers for every day.",
      heroTitle: "Sound that keeps up with you",
      heroText: "Wireless headphones, earbuds and speakers, with delivery across the UAE.",
      aboutText:
        "Pulse Audio is a small audio brand. We make a short range of headphones and speakers and sell them directly, so every product is one we can explain and support ourselves.",
    },
    categories: [{ name: "Headphones" }, { name: "Speakers" }, { name: "Accessories" }],
    products: [
      { name: "Pulse One Wireless Headphones", sku: "PA-HP-001", category: "Headphones", description: "Over-ear wireless headphones with active noise cancelling, a 30-hour battery and USB-C charging.", price: "549.00", compareAtPrice: "649.00", stock: 25, featured: true, deliveryFee: "15.00" },
      { name: "Pulse Buds True Wireless Earbuds", sku: "PA-HP-002", category: "Headphones", description: "Compact earbuds with touch controls and a pocket charging case, up to 24 hours of listening in total.", price: "299.00", stock: 40, featured: true, deliveryFee: "15.00" },
      { name: "Pulse Go Portable Speaker", sku: "PA-SP-003", category: "Speakers", description: "Splash-resistant Bluetooth speaker with a fabric finish and up to 12 hours of playback.", price: "249.00", stock: 30, featured: true, deliveryFee: "15.00" },
      { name: "Pulse Home Smart Speaker", sku: "PA-SP-004", category: "Speakers", description: "Room-filling speaker with Wi-Fi streaming and a built-in voice assistant.", price: "449.00", stock: 12, featured: false, deliveryFee: "15.00" },
      { name: "Braided USB-C Cable, 2 m", sku: "PA-AC-005", category: "Accessories", description: "Braided USB-C to USB-C cable for charging and data, two metres long.", price: "49.00", stock: 120, featured: false, deliveryFee: "10.00" },
      { name: "Hard-Shell Headphone Case", sku: "PA-AC-006", category: "Accessories", description: "Zip-around hard case with a mesh pocket for cables, sized for over-ear headphones.", price: "79.00", stock: 60, featured: false, deliveryFee: "10.00" },
    ],
  },

  maison: {
    slug: "maison-lumiere",
    name: "Maison Lumière",
    businessType: "fashion",
    workServiceSlug: "ecommerce",
    ...UAE,
    defaultLanguage: "en",
    languages: ["en"],
    accentColor: "#1c1917",
    contactEmail: "contact@maisonlumiere.example",
    contactPhone: "+97140000004",
    contactAddress: "Boutique 7, Jumeirah Beach Road, Dubai, UAE",
    content: {
      tagline: "Ready-to-wear, fragrance and leather goods.",
      heroTitle: "The new collection",
      heroText: "Considered pieces in silk, wool and leather, and two house fragrances.",
      aboutText:
        "Maison Lumière designs a small seasonal collection of ready-to-wear and leather goods, with two fragrances made for the house. Every piece is offered in limited quantities.",
    },
    categories: [{ name: "Ready-to-Wear" }, { name: "Fragrance" }, { name: "Leather Goods" }],
    products: [
      { name: "Silk Column Dress", sku: "ML-RTW-001", category: "Ready-to-Wear", description: "Floor-length dress cut from fluid silk crepe, with a draped neckline and a concealed back zip.", price: "1850.00", stock: 6, featured: true },
      { name: "Tailored Wool Blazer", sku: "ML-RTW-002", category: "Ready-to-Wear", description: "Single-breasted blazer in fine wool with structured shoulders and horn-effect buttons.", price: "1450.00", stock: 8, featured: true },
      { name: "Pleated Wide-Leg Trousers", sku: "ML-RTW-003", category: "Ready-to-Wear", description: "High-waisted trousers with pressed pleats and a fluid wide leg.", price: "890.00", stock: 10, featured: false },
      { name: "Ambre Nuit Eau de Parfum, 100 ml", sku: "ML-FRA-004", category: "Fragrance", description: "A warm evening fragrance with notes of amber, vanilla and cedarwood.", price: "620.00", stock: 20, featured: true },
      { name: "Fleur Blanche Eau de Parfum, 50 ml", sku: "ML-FRA-005", category: "Fragrance", description: "A soft floral fragrance built around white flowers and musk.", price: "420.00", stock: 24, featured: false },
      { name: "Structured Leather Tote", sku: "ML-LEA-006", category: "Leather Goods", description: "Calf leather tote with a structured base, an inside zip pocket and rolled handles.", price: "2150.00", stock: 5, featured: true },
      { name: "Leather Card Holder", sku: "ML-LEA-007", category: "Leather Goods", description: "Slim card holder in grained calf leather with four card slots.", price: "340.00", compareAtPrice: "390.00", stock: 30, featured: false },
    ],
  },

  market: {
    slug: "daily-basket",
    name: "Daily Basket",
    businessType: "grocery",
    workServiceSlug: "ecommerce",
    ...UAE,
    defaultLanguage: "en",
    languages: ["en"],
    accentColor: "#15803d",
    contactEmail: "orders@dailybasket.example",
    contactPhone: "+97140000005",
    contactAddress: "Shop 3, Al Barsha 1, Dubai, UAE",
    content: {
      tagline: "Your weekly shop, delivered.",
      heroTitle: "Groceries for the whole week",
      heroText: "Fruit and vegetables, bakery, dairy and pantry staples in one basket.",
      aboutText:
        "Daily Basket is a neighbourhood grocery. Order your everyday essentials online and collect them from the shop or have them delivered.",
    },
    categories: [{ name: "Fruit & Vegetables" }, { name: "Bakery" }, { name: "Dairy & Eggs" }, { name: "Pantry" }, { name: "Drinks" }],
    products: [
      { name: "Bananas, 1 kg", sku: "DB-FV-001", category: "Fruit & Vegetables", description: "Ripe yellow bananas, sold by the kilogram.", price: "7.50", stock: 80, featured: true, deliveryFee: "2.00" },
      { name: "Tomatoes, 1 kg", sku: "DB-FV-002", category: "Fruit & Vegetables", description: "Round red tomatoes for salads and cooking.", price: "6.95", stock: 70, featured: false, deliveryFee: "2.00" },
      { name: "Cucumbers, 500 g", sku: "DB-FV-003", category: "Fruit & Vegetables", description: "Crisp mini cucumbers, about 500 grams.", price: "4.50", stock: 60, featured: false, deliveryFee: "2.00" },
      { name: "Fresh Mint, bunch", sku: "DB-FV-004", category: "Fruit & Vegetables", description: "A bunch of fresh mint for tea and salads.", price: "2.50", stock: 50, featured: false, deliveryFee: "2.00" },
      { name: "Arabic Bread, 6 pieces", sku: "DB-BK-005", category: "Bakery", description: "Soft round Arabic bread, six pieces per pack.", price: "3.00", stock: 90, featured: true, deliveryFee: "2.00" },
      { name: "Wholemeal Sandwich Loaf", sku: "DB-BK-006", category: "Bakery", description: "Sliced wholemeal loaf for sandwiches and toast.", price: "8.50", stock: 40, featured: false, deliveryFee: "2.00" },
      { name: "Fresh Full-Fat Milk, 1 L", sku: "DB-DE-007", category: "Dairy & Eggs", description: "Fresh full-fat milk in a one-litre bottle.", price: "6.50", stock: 60, featured: true, deliveryFee: "2.00" },
      { name: "Large Brown Eggs, 12", sku: "DB-DE-008", category: "Dairy & Eggs", description: "A tray of twelve large brown eggs.", price: "14.95", stock: 45, featured: false, deliveryFee: "2.00" },
      { name: "Greek-Style Yogurt, 500 g", sku: "DB-DE-009", category: "Dairy & Eggs", description: "Thick, creamy plain yogurt in a 500 gram tub.", price: "9.95", stock: 40, featured: false, deliveryFee: "2.00" },
      { name: "Basmati Rice, 5 kg", sku: "DB-PA-010", category: "Pantry", description: "Long-grain basmati rice in a five-kilogram bag.", price: "42.00", compareAtPrice: "48.00", stock: 30, featured: true, deliveryFee: "3.00" },
      { name: "Extra Virgin Olive Oil, 1 L", sku: "DB-PA-011", category: "Pantry", description: "Extra virgin olive oil for dressings and cooking, one litre.", price: "39.95", stock: 25, featured: false, deliveryFee: "3.00" },
      { name: "Rolled Oats, 1 kg", sku: "DB-PA-012", category: "Pantry", description: "Rolled oats for porridge and baking, one kilogram.", price: "12.50", stock: 35, featured: false, deliveryFee: "2.00" },
      { name: "Mineral Water, 6 × 1.5 L", sku: "DB-DR-013", category: "Drinks", description: "A pack of six 1.5-litre bottles of still mineral water.", price: "9.00", stock: 50, featured: true, deliveryFee: "3.00" },
      { name: "Orange Juice, 1 L", sku: "DB-DR-014", category: "Drinks", description: "Chilled orange juice in a one-litre carton.", price: "8.95", stock: 40, featured: false, deliveryFee: "2.00" },
    ],
  },

  noor: {
    slug: "dar-al-oud",
    name: "دار العود",
    businessType: "beauty",
    workServiceSlug: "ecommerce",
    ...UAE,
    defaultLanguage: "ar",
    languages: ["ar", "en"],
    accentColor: "#8a5a2e",
    contactEmail: "hello@daralood.example",
    contactPhone: "+97140000006",
    contactAddress: "محل ١٢، سوق البستكية، دبي، الإمارات",
    content: {
      tagline: "عود وبخور وعطور وتمور للإهداء",
      heroTitle: "هدايا تُختار بعناية",
      heroText: "عود وبخور وعطور وتمور، مغلّفة وجاهزة للإهداء، مع التوصيل داخل الإمارات.",
      aboutText:
        "دار العود متجر صغير للعود والبخور والعطور والتمور. نختار كل قطعة بأنفسنا ونغلّفها لتكون جاهزة للإهداء في المناسبات وزيارات الأهل والأصدقاء.",
    },
    categories: [
      { name: "العود ودهن العود", slug: "oud" },
      { name: "البخور", slug: "bakhoor" },
      { name: "العطور", slug: "perfumes" },
      { name: "التمور والحلويات", slug: "dates-and-sweets" },
      { name: "الهدايا", slug: "gifts" },
    ],
    products: [
      { name: "دهن عود، ٣ مل", slug: "oud-oil-3ml", sku: "DO-OUD-001", category: "العود ودهن العود", description: "دهن عود مركّز في عبوة زجاجية صغيرة، يكفي منه القليل على المعصم أو خلف الأذن.", price: "450.00", stock: 15, featured: true },
      { name: "عود للتبخير، ٢٥ غرام", slug: "oud-chips-25g", sku: "DO-OUD-002", category: "العود ودهن العود", description: "قطع عود للتبخير في عبوة محكمة الإغلاق تحفظ رائحتها.", price: "320.00", stock: 20, featured: false },
      { name: "بخور معمول، ٥٠ غرام", slug: "mamoul-bakhoor-50g", sku: "DO-BKH-003", category: "البخور", description: "بخور معمول بخلطة من العود والورد والمسك، يناسب المجالس والمناسبات.", price: "95.00", stock: 40, featured: true },
      { name: "مبخرة نحاسية", slug: "brass-incense-burner", sku: "DO-BKH-004", category: "البخور", description: "مبخرة من النحاس بنقوش تقليدية وقاعدة ثابتة.", price: "180.00", stock: 12, featured: false },
      { name: "عطر الورد والعنبر، ٥٠ مل", slug: "rose-amber-50ml", sku: "DO-PER-005", category: "العطور", description: "ماء عطر بنفحات الورد والعنبر في زجاجة بغطاء ذهبي.", price: "280.00", stock: 18, featured: true },
      { name: "عطر المسك الأبيض، ١٠٠ مل", slug: "white-musk-100ml", sku: "DO-PER-006", category: "العطور", description: "عطر ناعم بنفحات المسك الأبيض للاستخدام اليومي.", price: "220.00", stock: 22, featured: false },
      { name: "تمر مجدول محشو باللوز، ٥٠٠ غرام", slug: "almond-stuffed-medjool-500g", sku: "DO-DAT-007", category: "التمور والحلويات", description: "تمر مجدول محشو باللوز في علبة هدايا أنيقة.", price: "120.00", stock: 30, featured: true },
      { name: "شوكولاتة بالتمر، ٢٤ قطعة", slug: "date-chocolates-24", sku: "DO-DAT-008", category: "التمور والحلويات", description: "قطع شوكولاتة محشوة بعجينة التمر في علبة من طبقتين.", price: "150.00", stock: 25, featured: false },
      { name: "صندوق هدية العود والبخور", slug: "oud-and-bakhoor-gift-box", sku: "DO-GFT-009", category: "الهدايا", description: "صندوق هدية يضم دهن عود ٣ مل وبخور معمول ٥٠ غرام ومبخرة صغيرة.", price: "650.00", compareAtPrice: "720.00", stock: 10, featured: true },
    ],
  },
};
