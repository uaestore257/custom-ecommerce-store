import "server-only";
import { Prisma, type PrismaClient } from "@/lib/generated/prisma/client";
import { DEFAULT_CATEGORIES } from "@/lib/config";
import { fromMinorUnits } from "@/lib/money";
import { storeFormatLocale } from "@/lib/standards";
import type { ActionResult, AdminStoreDetail, AdminStoreSummary, DbStoreStatus } from "@/lib/admin/types";
import {
  hasErrors,
  PAYMENT_METHOD_IDS,
  STORE_STATUS_VALUES,
  validateStoreBase,
  validateStoreSettings,
  type CleanStoreBase,
} from "@/lib/admin/validation";
import type { StoreType } from "@/lib/types";
import { archiveStore, restoreStore } from "../store-scope";
import { fail, INVALID, letterLabels, NOT_FOUND, ok, toSlug, uniqueSlug, uniqueViolation, type Client } from "./common";
import { getStoreReference } from "./reference";

// ---------------------------------------------------------------
// STORES (platform-level: which stores exist and their settings)
// ---------------------------------------------------------------

const summarySelect = {
  id: true,
  name: true,
  slug: true,
  businessType: true,
  status: true,
  countryCode: true,
  baseCurrency: true,
  logoUrl: true,
  accentColor: true,
  createdAt: true,
  archivedAt: true,
  _count: { select: { products: true } },
} satisfies Prisma.StoreSelect;

type SummaryRow = Prisma.StoreGetPayload<{ select: typeof summarySelect }>;

function toSummary(row: SummaryRow, labels: Map<string, string>): AdminStoreSummary {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    businessType: row.businessType,
    status: row.status,
    countryCode: row.countryCode,
    baseCurrency: row.baseCurrency,
    logoUrl: row.logoUrl,
    accentColor: row.accentColor,
    createdAt: row.createdAt.toISOString(),
    archivedAt: row.archivedAt?.toISOString() ?? null,
    productCount: row._count.products,
    letterLabel: labels.get(row.id) ?? "Client Store",
  };
}

export async function listAdminStores(client: Client, options: { includeArchived?: boolean } = {}) {
  const [rows, labels] = await Promise.all([
    client.store.findMany({
      where: options.includeArchived ? {} : { archivedAt: null },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: summarySelect,
    }),
    letterLabels(client),
  ]);
  return rows.map((row) => toSummary(row, labels));
}

/** A non-archived store, or null. */
export async function getAdminStore(client: Client, storeId: string): Promise<AdminStoreSummary | null> {
  const row = await client.store.findFirst({ where: { id: storeId, archivedAt: null }, select: summarySelect });
  if (!row) return null;
  return toSummary(row, await letterLabels(client));
}

/** Everything the settings form needs, or null if the store is missing/archived. */
export async function getAdminStoreDetail(client: Client, storeId: string): Promise<AdminStoreDetail | null> {
  const store = await client.store.findFirst({
    where: { id: storeId, archivedAt: null },
    include: {
      currency: true,
      languages: { where: { enabled: true }, select: { languageCode: true } },
      memberships: { where: { role: "OWNER" }, include: { user: true }, take: 1 },
      paymentMethods: { orderBy: { position: "asc" } },
      shippingZones: { orderBy: { id: "asc" }, take: 1, include: { rates: { orderBy: { id: "asc" }, take: 1 } } },
      _count: { select: { products: true, categories: true, variants: true, shippingRates: true } },
    },
  });
  if (!store) return null;
  const content = await client.storeContentTranslation.findUnique({
    where: { storeId_locale: { storeId, locale: store.defaultLanguage } },
  });
  const minor = store.currency.minorUnits;
  const rate = store.shippingZones[0]?.rates[0];
  const address = (store.businessAddress ?? {}) as { line1?: string };
  const owner = store.memberships[0]?.user;
  const labels = await letterLabels(client);

  return {
    ...toSummary({ ...store, _count: { products: store._count.products } }, labels),
    timezone: store.timezone,
    defaultLanguage: store.defaultLanguage,
    languages: store.languages.map((l) => l.languageCode),
    currencyMinorUnits: minor,
    formatLocale: storeFormatLocale(store),
    contactEmail: store.contactEmail ?? "",
    contactPhone: store.contactPhone ?? "",
    contactAddress: address.line1 ?? "",
    ownerName: owner?.name ?? "",
    ownerEmail: owner?.email ?? "",
    content: {
      tagline: content?.tagline ?? "",
      heroTitle: content?.heroTitle ?? "",
      heroText: content?.heroText ?? "",
      aboutText: content?.aboutText ?? "",
    },
    delivery: {
      fee: rate ? fromMinorUnits(rate.priceMinor, minor) : "",
      freeOver: rate?.freeOverMinor ? fromMinorUnits(rate.freeOverMinor, minor) : "",
    },
    paymentMethods: PAYMENT_METHOD_IDS.map((method) => ({
      method,
      enabled: store.paymentMethods.find((m) => m.method === method)?.enabled ?? false,
    })),
    categoryCount: store._count.categories,
    hasPrices: store._count.variants > 0 || store._count.shippingRates > 0,
  };
}

function initials(name: string) {
  const letters = name
    .split(/\s+/)
    .map((w) => w.replace(/[^a-z0-9]/gi, "")[0])
    .filter(Boolean)
    .join("")
    .toUpperCase()
    .slice(0, 3);
  return letters || null;
}

/** Makes `userEmail` the store's OWNER (creating the user if needed). */
async function setOwner(tx: Prisma.TransactionClient, storeId: string, name: string, email: string) {
  const user = await tx.user.upsert({ where: { email }, create: { email, name }, update: { name } });
  const current = await tx.storeMembership.findMany({ where: { storeId, role: "OWNER" } });
  // Remove previous owners (ownership moves to the new email).
  await tx.storeMembership.deleteMany({ where: { storeId, role: "OWNER", userId: { not: user.id } } });
  if (!current.some((m) => m.userId === user.id)) {
    await tx.storeMembership.upsert({
      where: { userId_storeId: { userId: user.id, storeId } },
      create: { userId: user.id, storeId, role: "OWNER" },
      update: { role: "OWNER" },
    });
  }
}

/** Enables exactly `languages` (others are disabled, never deleted, to keep content). */
async function setLanguages(tx: Prisma.TransactionClient, storeId: string, languages: string[]) {
  for (const languageCode of languages) {
    await tx.storeLanguage.upsert({
      where: { storeId_languageCode: { storeId, languageCode } },
      create: { storeId, languageCode },
      update: { enabled: true },
    });
  }
  await tx.storeLanguage.updateMany({
    where: { storeId, languageCode: { notIn: languages } },
    data: { enabled: false },
  });
}

async function slugTaken(client: Client, slug: string, exceptStoreId?: string) {
  const existing = await client.store.findUnique({ where: { slug }, select: { id: true } });
  return Boolean(existing && existing.id !== exceptStoreId);
}

function slugConflict(): ActionResult<never> {
  return fail(INVALID, { slug: "Another store already uses this slug." });
}

export async function createAdminStore(client: PrismaClient, input: unknown): Promise<ActionResult<{ id: string }>> {
  const reference = await getStoreReference(client);
  const { values, errors } = validateStoreBase(input, reference);
  if (hasErrors(errors)) return fail(INVALID, errors);
  if (await slugTaken(client, values.slug)) return slugConflict();

  try {
    const store = await client.$transaction((tx) => createStoreRecords(tx, values));
    return ok({ id: store.id });
  } catch (error) {
    if (uniqueViolation(error)?.includes("slug")) return slugConflict();
    throw error;
  }
}

async function createStoreRecords(tx: Prisma.TransactionClient, v: CleanStoreBase) {
  const store = await tx.store.create({
    data: {
      name: v.name,
      slug: v.slug,
      businessType: v.businessType,
      status: v.status,
      countryCode: v.countryCode,
      baseCurrency: v.baseCurrency,
      timezone: v.timezone,
      defaultLanguage: v.defaultLanguage,
      accentColor: v.accentColor,
      contactEmail: v.ownerEmail,
      orderNumberPrefix: initials(v.name),
      languages: { create: v.languages.map((languageCode) => ({ languageCode })) },
    },
  });
  await tx.storeContentTranslation.create({
    data: { storeId: store.id, locale: v.defaultLanguage, heroTitle: `Welcome to ${v.name}` },
  });
  await setOwner(tx, store.id, v.ownerName, v.ownerEmail);

  // Starter categories for the store type, like the demo, in the store's
  // default language. They are English words: only add them when English
  // is the default language, otherwise the owner names categories themselves.
  const starter = v.defaultLanguage === "en" ? (DEFAULT_CATEGORIES[v.businessType as StoreType] ?? []) : [];
  const taken = new Set<string>();
  for (const [position, name] of starter.entries()) {
    const slug = uniqueSlug(toSlug(name, `category-${position + 1}`), taken);
    taken.add(slug);
    await tx.category.create({
      data: {
        storeId: store.id,
        position,
        translations: { create: [{ locale: v.defaultLanguage, name, slug }] },
      },
    });
  }

  // Payment methods start disabled except cash on delivery; online card
  // payment stays disabled until a payment provider is connected.
  await tx.storePaymentMethod.createMany({
    data: PAYMENT_METHOD_IDS.map((method, position) => ({
      storeId: store.id,
      method,
      enabled: method === "cash_on_delivery",
      position,
    })),
  });
  return store;
}

export async function updateAdminStore(
  client: PrismaClient,
  storeId: string,
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const existing = await getAdminStoreDetail(client, storeId);
  if (!existing) return fail(NOT_FOUND.store);

  const reference = await getStoreReference(client);
  const { values, errors } = validateStoreSettings(input, reference);
  if (existing.hasPrices && values.baseCurrency !== existing.baseCurrency) {
    errors.baseCurrency = "The currency can't change while products or delivery rates have prices. Repricing is not supported yet.";
  }
  if (hasErrors(errors)) return fail(INVALID, errors);
  if (await slugTaken(client, values.slug, storeId)) return slugConflict();

  try {
    await client.$transaction(async (tx) => {
      await setLanguages(tx, storeId, values.languages);
      await tx.store.update({
        where: { id: storeId },
        data: {
          name: values.name,
          slug: values.slug,
          businessType: values.businessType,
          status: values.status,
          countryCode: values.countryCode,
          baseCurrency: values.baseCurrency,
          timezone: values.timezone,
          defaultLanguage: values.defaultLanguage,
          accentColor: values.accentColor,
          logoUrl: values.logoUrl,
          contactEmail: values.contactEmail,
          contactPhone: values.contactPhone,
          businessAddress: values.contactAddress
            ? { line1: values.contactAddress, countryCode: values.countryCode }
            : Prisma.DbNull,
        },
      });
      await tx.storeContentTranslation.upsert({
        where: { storeId_locale: { storeId, locale: values.defaultLanguage } },
        create: { storeId, locale: values.defaultLanguage, ...values.content },
        update: values.content,
      });
      await setOwner(tx, storeId, values.ownerName, values.ownerEmail);

      // Delivery: one domestic zone (the store's country) with one rate.
      // This only stores the setting; no shipping is calculated here.
      const zone =
        (await tx.shippingZone.findFirst({ where: { storeId }, orderBy: { id: "asc" } })) ??
        (await tx.shippingZone.create({ data: { storeId, name: "Domestic" } }));
      await tx.shippingZoneCountry.deleteMany({ where: { zoneId: zone.id, storeId } });
      await tx.shippingZoneCountry.create({ data: { storeId, zoneId: zone.id, countryCode: values.countryCode } });
      const rate = await tx.shippingRate.findFirst({ where: { storeId, zoneId: zone.id }, orderBy: { id: "asc" } });
      const rateData = {
        priceMinor: values.deliveryFeeMinor,
        freeOverMinor: values.freeDeliveryOverMinor,
        currency: values.baseCurrency,
      };
      if (rate) await tx.shippingRate.update({ where: { id: rate.id }, data: rateData });
      else await tx.shippingRate.create({ data: { storeId, zoneId: zone.id, name: "Standard delivery", ...rateData } });

      for (const [position, method] of PAYMENT_METHOD_IDS.entries()) {
        await tx.storePaymentMethod.upsert({
          where: { storeId_method: { storeId, method } },
          create: { storeId, method, position, enabled: values.paymentMethods[method] },
          update: { enabled: values.paymentMethods[method] },
        });
      }
    });
  } catch (error) {
    if (uniqueViolation(error)?.includes("slug")) return slugConflict();
    throw error;
  }
  return ok({ id: storeId }, "Settings saved.");
}

export async function setAdminStoreStatus(client: Client, storeId: string, status: unknown) {
  if (typeof status !== "string" || !STORE_STATUS_VALUES.includes(status as DbStoreStatus)) {
    return fail("Choose a valid status.");
  }
  const result = await client.store.updateMany({
    where: { id: storeId, archivedAt: null },
    data: { status: status as DbStoreStatus },
  });
  return result.count === 1 ? ok({ id: storeId }) : fail(NOT_FOUND.store);
}

/** Soft delete. The store and all its data stay in the database. */
export async function archiveAdminStore(client: Client, storeId: string) {
  const store = await client.store.findFirst({ where: { id: storeId, archivedAt: null }, select: { id: true } });
  if (!store) return fail(NOT_FOUND.store);
  await archiveStore(client, storeId);
  return ok({ id: storeId }, "Store archived. You can restore it from the store list.");
}

export async function restoreAdminStore(client: Client, storeId: string) {
  const store = await client.store.findFirst({ where: { id: storeId, archivedAt: { not: null } }, select: { id: true } });
  if (!store) return fail("This store is not archived.");
  await restoreStore(client, storeId);
  return ok({ id: storeId }, "Store restored.");
}
