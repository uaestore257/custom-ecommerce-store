// ---------------------------------------------------------------
// SEED: platform reference data + the three demo stores.
// Run with `npm run db:seed` (or `npm run db:reset` for a clean start).
//
// The demo stores are read from lib/demo-data.ts — the same data the
// browser demo uses — and mapped to the international schema:
//   demo Product.price / compareAtPrice / stock / sku
//     -> one DEFAULT ProductVariant (isDefault = true) holding
//        priceMinor, compareAtMinor, stock and sku, in the store's base
//        currency and ISO 4217 minor units.
//   demo Product.name / description -> ProductTranslation ("en")
//   demo Category.name              -> CategoryTranslation ("en")
//   demo country name               -> ISO 3166-1 code
//   demo delivery fee / threshold   -> ShippingZone + ShippingRate
//   demo payment methods            -> StorePaymentMethod rows
//   demo order "NO-1001"            -> prefix "NO" + number 1001
// UAE/AED appear here only because the demo stores are in the UAE and
// Saudi Arabia; nothing becomes a platform default.
// ---------------------------------------------------------------
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";
import { createSeedState } from "../lib/demo-data";
import { slugify } from "../lib/format";
import { legacyNumberToMinorUnits } from "../lib/money";
import type { Store as DemoStore } from "../lib/types";
import { countryRows, currencyRows, CURRENCIES, languageRows } from "./reference-data";

/** Demo country names -> ISO 3166-1 alpha-2. */
const DEMO_COUNTRY_CODES: Record<string, string> = {
  "United Arab Emirates": "AE",
  "Saudi Arabia": "SA",
  Qatar: "QA",
  Kuwait: "KW",
  Bahrain: "BH",
  Oman: "OM",
};

/**
 * Settings the browser demo does not have yet, chosen per demo store.
 * Store A offers English and Arabic (Arabic content to be added later;
 * nothing is auto-translated). The others start with English only.
 */
const DEMO_STORE_EXTRAS: Record<string, { timezone: string; languages: string[] }> = {
  "store-a": { timezone: "Asia/Dubai", languages: ["en", "ar"] },
  "store-b": { timezone: "Asia/Dubai", languages: ["en"] },
  "store-c": { timezone: "Asia/Riyadh", languages: ["en"] },
};

const DEFAULT_LANGUAGE = "en"; // the demo content is written in English

/** "+971 50 000 0001" -> "+971500000001" (E.164). */
function toE164(phone: string) {
  const compact = phone.replace(/[\s()-]/g, "");
  return compact ? compact : null;
}

function minorUnitsOf(currency: string) {
  const found = CURRENCIES.find((c) => c.code === currency);
  if (!found) throw new Error(`Currency ${currency} is missing from reference data`);
  return found.minorUnits;
}

function countryCodeOf(store: DemoStore) {
  const code = DEMO_COUNTRY_CODES[store.settings.country];
  if (!code) throw new Error(`No ISO code mapped for demo country "${store.settings.country}"`);
  return code;
}

/** Same rule as the browser demo: prefix of existing orders, else initials. */
function orderPrefix(store: DemoStore, orderNumbers: string[]) {
  const existing = orderNumbers.at(-1)?.split("-").slice(0, -1).join("-");
  if (existing) return existing;
  return (
    store.name
      .split(/\s+/)
      .map((w) => w.replace(/[^a-z0-9]/gi, "")[0])
      .filter(Boolean)
      .join("")
      .toUpperCase()
      .slice(0, 3) || "ORD"
  );
}

async function seedReferenceData(db: PrismaClient) {
  for (const row of countryRows()) {
    await db.country.upsert({ where: { code: row.code }, create: row, update: { name: row.name } });
  }
  for (const row of currencyRows()) {
    await db.currency.upsert({ where: { code: row.code }, create: row, update: row });
  }
  for (const row of languageRows()) {
    await db.language.upsert({ where: { code: row.code }, create: row, update: row });
  }
}

async function seedDemoStores(db: PrismaClient) {
  const demo = createSeedState();

  await db.$transaction(
    async (tx) => {
      await tx.platformSettings.upsert({
        where: { id: 1 },
        // No platform-wide currency, country or language on purpose.
        create: { id: 1, platformName: demo.agency.agencyName, contactEmail: demo.agency.contactEmail },
        update: {},
      });

      await tx.user.create({
        data: { email: demo.agency.contactEmail.toLowerCase(), name: demo.agency.agencyName, isPlatformOwner: true },
      });

      for (const store of demo.stores) {
        const data = demo.storeData[store.id];
        const extras = DEMO_STORE_EXTRAS[store.id];
        const s = store.settings;
        const countryCode = countryCodeOf(store);
        const minor = minorUnitsOf(s.currency);
        const money = (amount: number) => legacyNumberToMinorUnits(amount, minor);
        const orderNumbers = data.orders.map((o) => o.orderNumber);
        const lastNumber = Math.max(1000, ...orderNumbers.map((n) => Number(n.split("-").pop())));

        await tx.store.create({
          data: {
            id: store.id,
            slug: store.slug,
            name: store.name,
            businessType: store.type,
            status: store.status.toUpperCase() as "DRAFT" | "ACTIVE" | "PAUSED",
            countryCode,
            baseCurrency: s.currency,
            timezone: extras.timezone,
            defaultLanguage: DEFAULT_LANGUAGE,
            pricesIncludeTax: false,
            logoUrl: s.logoUrl || null,
            accentColor: s.accentColor,
            contactEmail: s.contactEmail || null,
            contactPhone: toE164(s.contactPhone),
            businessAddress: s.contactAddress ? { line1: s.contactAddress, countryCode } : undefined,
            orderNumberPrefix: orderPrefix(store, orderNumbers),
            nextOrderNumber: lastNumber + 1,
            createdAt: new Date(store.createdAt),
            languages: { create: extras.languages.map((languageCode) => ({ languageCode })) },
          },
        });

        await tx.storeContentTranslation.create({
          data: {
            storeId: store.id,
            locale: DEFAULT_LANGUAGE,
            tagline: s.tagline,
            heroTitle: s.heroTitle,
            heroText: s.heroText,
            aboutText: s.aboutText,
          },
        });

        // Store owner account + membership
        const owner = await tx.user.upsert({
          where: { email: store.ownerEmail.toLowerCase() },
          create: { email: store.ownerEmail.toLowerCase(), name: store.ownerName },
          update: {},
        });
        await tx.storeMembership.create({ data: { userId: owner.id, storeId: store.id, role: "OWNER" } });

        // Categories (+ English translation)
        for (const [position, category] of data.categories.entries()) {
          await tx.category.create({
            data: {
              id: category.id,
              storeId: store.id,
              position,
              imageUrl: category.imageUrl || null,
              translations: {
                create: [{ locale: DEFAULT_LANGUAGE, name: category.name, slug: slugify(category.name) }],
              },
            },
          });
        }

        // Products -> product + English translation + ONE default variant.
        // Nested records get storeId from the product (composite relations).
        for (const product of data.products) {
          await tx.product.create({
            data: {
              id: product.id,
              storeId: store.id,
              categoryId: product.categoryId,
              status: product.status === "active" ? "ACTIVE" : "DRAFT",
              featured: product.featured,
              translations: {
                create: [{
                  locale: DEFAULT_LANGUAGE,
                  name: product.name,
                  description: product.description,
                  slug: slugify(product.name),
                }],
              },
              variants: {
                create: [{
                  id: `${product.id}-default`,
                  sku: product.sku,
                  isDefault: true,
                  position: 0,
                  currency: s.currency,
                  priceMinor: money(product.price),
                  compareAtMinor:
                    product.compareAtPrice && product.compareAtPrice > product.price
                      ? money(product.compareAtPrice)
                      : null,
                  stock: product.stock,
                }],
              },
              images: product.imageUrl
                ? { create: [{ url: product.imageUrl, position: 0 }] }
                : undefined,
            },
          });
        }

        // Customers (separate per store)
        for (const customer of data.customers) {
          await tx.customer.create({
            data: {
              id: customer.id,
              storeId: store.id,
              email: customer.email.toLowerCase(),
              name: customer.name,
              phone: toE164(customer.phone),
              preferredLocale: DEFAULT_LANGUAGE,
              createdAt: new Date(customer.createdAt),
            },
          });
        }

        // Demo orders, with a snapshot of prices and address
        for (const order of data.orders) {
          const items = order.items.map((item) => {
            const unitPriceMinor = money(item.unitPrice);
            // storeId and currency come from the order (composite relation).
            return {
              variantId: `${item.productId}-default`,
              productName: item.name,
              sku: item.sku,
              unitPriceMinor,
              quantity: item.quantity,
              lineTotalMinor: unitPriceMinor * BigInt(item.quantity),
            };
          });
          const subtotalMinor = items.reduce((sum, i) => sum + i.lineTotalMinor, 0n);
          if (subtotalMinor !== money(order.subtotal)) {
            throw new Error(`Order ${order.orderNumber}: item totals do not match the subtotal`);
          }
          await tx.order.create({
            data: {
              id: order.id,
              storeId: store.id,
              number: Number(order.orderNumber.split("-").pop()),
              customerId: order.customerId,
              status: order.status.toUpperCase() as "PENDING",
              currency: order.currency,
              locale: DEFAULT_LANGUAGE,
              pricesIncludeTax: false,
              subtotalMinor,
              shippingMinor: money(order.deliveryFee),
              totalMinor: money(order.total),
              customerName: order.customerName,
              customerEmail: order.customerEmail.toLowerCase(),
              customerPhone: toE164(order.customerPhone),
              shippingAddress: {
                recipientName: order.customerName,
                line1: order.address,
                city: order.city,
                countryCode,
              },
              paymentMethod: order.paymentMethod,
              isDemo: true,
              placedAt: new Date(order.createdAt),
              items: { create: items },
            },
          });
        }

        // Delivery settings -> one domestic shipping zone and rate (data only)
        await tx.shippingZone.create({
          data: {
            storeId: store.id,
            name: "Domestic",
            countries: { create: [{ countryCode }] },
            rates: {
              create: [{
                name: "Standard delivery",
                currency: s.currency,
                priceMinor: money(s.deliveryFee),
                freeOverMinor: s.freeDeliveryThreshold > 0 ? money(s.freeDeliveryThreshold) : null,
              }],
            },
          },
        });

        // Payment methods (configuration only, no provider connected)
        await tx.storePaymentMethod.createMany({
          data: s.paymentMethods.map((m, position) => ({
            storeId: store.id,
            method: m.id,
            enabled: m.enabled,
            position,
          })),
        });
      }
    },
    { timeout: 60_000 },
  );
}

async function main() {
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
  try {
    await seedReferenceData(db);
    if ((await db.store.count()) > 0) {
      console.log("Stores already exist — skipped demo stores. Use `npm run db:reset` for a clean database.");
    } else {
      await seedDemoStores(db);
      console.log("Seeded reference data and 3 demo stores.");
    }
  } finally {
    await db.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
