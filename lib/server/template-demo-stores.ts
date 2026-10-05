import "server-only";
import { randomUUID } from "node:crypto";
import type { PrismaClient } from "@/lib/generated/prisma/client";
import { hasErrors, PAYMENT_METHOD_IDS, validateProduct } from "@/lib/admin/validation";
import { SERVICE_CATEGORIES } from "@/lib/platform/services";
import { TEMPLATE_DEMO_STORES, type DemoStoreSpec } from "@/lib/template-demo-stores";
import { TEMPLATE_KEYS, type TemplateKey } from "@/lib/templates/registry";
import { isSlug } from "@/lib/validation";
import { toSlug, uniqueSlug } from "./admin/common";
import { recordAudit } from "./audit";

// ---------------------------------------------------------------
// Creates the missing template demo stores (lib/template-demo-stores.ts).
//
// Safe to run more than once and against any database the operator
// chooses (scripts/provision-template-demos.ts asks for confirmation):
//   * a store whose slug already exists is never changed — if it is a
//     client store, the demo gets a separate available slug;
//   * a template that already has a demo store (any slug) is skipped;
//   * every spec is validated with the admin's own rules before anything
//     is written, and each store is created in one transaction;
//   * nothing is ever updated or deleted.
// ---------------------------------------------------------------

export type DemoProvisionOutcome =
  | "created"
  | "would-create"
  | "exists"
  | "template-has-demo"
  | "invalid"
  | "failed";

export interface DemoProvisionResult {
  template: TemplateKey;
  slug: string;
  outcome: DemoProvisionOutcome;
  detail?: string;
}

interface Reference {
  minorUnits: number;
}

/** Problems with a spec, checked against the database's reference data and the admin's product rules. */
async function specProblems(db: PrismaClient, spec: DemoStoreSpec): Promise<{ problems: string[]; reference: Reference | null }> {
  const problems: string[] = [];
  const [currency, country, languages] = await Promise.all([
    db.currency.findUnique({ where: { code: spec.currency }, select: { minorUnits: true } }),
    db.country.findUnique({ where: { code: spec.countryCode }, select: { code: true } }),
    db.language.findMany({ where: { code: { in: [...spec.languages] } }, select: { code: true } }),
  ]);
  if (!currency) problems.push(`unknown currency ${spec.currency}`);
  if (!country) problems.push(`unknown country ${spec.countryCode}`);
  if (languages.length !== new Set(spec.languages).size) problems.push("unknown language");
  if (!spec.languages.includes(spec.defaultLanguage)) problems.push("default language is not a store language");
  if (!SERVICE_CATEGORIES.some((category) => category.slug === spec.workServiceSlug)) {
    problems.push(`invalid Work service category ${spec.workServiceSlug}`);
  }
  if (!isSlug(spec.slug)) problems.push(`invalid store slug ${spec.slug}`);
  const categoryNames = spec.categories.map((category) => category.name);
  if (new Set(categoryNames).size !== categoryNames.length) problems.push("duplicate category name");
  for (const category of spec.categories) {
    if (category.slug !== undefined && !isSlug(category.slug)) problems.push(`invalid category slug ${category.slug}`);
  }
  const skus = new Set<string>();
  for (const product of spec.products) {
    if (!categoryNames.includes(product.category)) problems.push(`${product.sku}: unknown category`);
    if (skus.has(product.sku)) problems.push(`${product.sku}: duplicate SKU`);
    skus.add(product.sku);
    if (product.slug !== undefined && !isSlug(product.slug)) problems.push(`${product.sku}: invalid slug`);
    if (currency) {
      const { errors } = validateProduct(productInput(product, "category"), currency.minorUnits);
      if (hasErrors(errors)) problems.push(`${product.sku}: ${Object.values(errors).filter(Boolean).join(" ")}`);
    }
  }
  return { problems, reference: currency ? { minorUnits: currency.minorUnits } : null };
}

/** A spec product as the admin product form would submit it. */
function productInput(product: DemoStoreSpec["products"][number], categoryId: string) {
  return {
    name: product.name,
    sku: product.sku,
    categoryId,
    description: product.description,
    price: product.price,
    compareAtPrice: product.compareAtPrice ?? "",
    imageUrl: "",
    stock: String(product.stock),
    deliveryFee: product.deliveryFee ?? "0",
    freeDelivery: false,
    pickupOnly: false,
    status: product.status ?? "ACTIVE",
    featured: product.featured,
  };
}

/** Order-number prefix from the Latin letters of the slug ("pulse-audio" → "PA"). */
function orderPrefix(slug: string) {
  return slug
    .split("-")
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase()
    .slice(0, 4) || "DM";
}

async function createDemoStore(db: PrismaClient, template: TemplateKey, spec: DemoStoreSpec, reference: Reference, actorUserId: string | null) {
  const categoryIds = new Map<string, string>();
  const categorySlugs = new Set<string>();
  const categories = spec.categories.map((category, position) => {
    const id = randomUUID();
    const slug = uniqueSlug(category.slug ?? toSlug(category.name, `category-${position + 1}`), categorySlugs);
    categorySlugs.add(slug);
    categoryIds.set(category.name, id);
    return {
      id,
      position,
      translation: { locale: spec.defaultLanguage, name: category.name, slug },
    };
  });

  const productSlugs = new Set<string>();
  const products = spec.products.map((product, position) => {
    const id = randomUUID();
    const categoryId = categoryIds.get(product.category);
    if (!categoryId) throw new Error(`${product.sku}: unknown category`);
    const { values } = validateProduct(productInput(product, categoryId), reference.minorUnits);
    const slug = uniqueSlug(product.slug ?? toSlug(product.name, `product-${position + 1}`), productSlugs);
    productSlugs.add(slug);
    return {
      id,
      categoryId: values.categoryId,
      status: values.status,
      featured: values.featured,
      deliveryFeeMinor: values.deliveryFeeMinor,
      freeDelivery: values.freeDelivery,
      pickupOnly: values.pickupOnly,
      translation: {
        locale: spec.defaultLanguage,
        name: values.name,
        description: values.description,
        slug,
      },
      variant: {
        id: randomUUID(),
        sku: values.sku,
        isDefault: true,
        position: 0,
        currency: spec.currency,
        priceMinor: values.priceMinor,
        compareAtMinor: values.compareAtMinor,
        stock: values.stock,
      },
    };
  });

  await db.$transaction(async (tx) => {
    const store = await tx.store.create({
      data: {
        slug: spec.slug,
        name: spec.name,
        businessType: spec.businessType,
        workServiceSlug: spec.workServiceSlug,
        status: "ACTIVE",
        isDemo: true,
        templateKey: template,
        countryCode: spec.countryCode,
        baseCurrency: spec.currency,
        timezone: spec.timezone,
        defaultLanguage: spec.defaultLanguage,
        accentColor: spec.accentColor,
        contactEmail: spec.contactEmail,
        contactPhone: spec.contactPhone,
        businessAddress: { line1: spec.contactAddress, countryCode: spec.countryCode },
        orderNumberPrefix: orderPrefix(spec.slug),
        languages: { create: spec.languages.map((languageCode) => ({ languageCode })) },
      },
      select: { id: true },
    });
    await tx.storeContentTranslation.create({
      data: { storeId: store.id, locale: spec.defaultLanguage, ...spec.content },
    });

    await tx.category.createMany({
      data: categories.map(({ id, position }) => ({ id, storeId: store.id, position })),
    });
    await tx.categoryTranslation.createMany({
      data: categories.map(({ id: categoryId, translation }) => ({ categoryId, storeId: store.id, ...translation })),
    });

    await tx.product.createMany({
      data: products.map(({ id, categoryId, status, featured, deliveryFeeMinor, freeDelivery, pickupOnly }) => ({
        id,
        storeId: store.id,
        categoryId,
        status,
        featured,
        deliveryFeeMinor,
        freeDelivery,
        pickupOnly,
      })),
    });
    await tx.productTranslation.createMany({
      data: products.map(({ id: productId, translation }) => ({ productId, storeId: store.id, ...translation })),
    });
    await tx.productVariant.createMany({
      data: products.map(({ id: productId, variant }) => ({ ...variant, productId, storeId: store.id })),
    });

    // Like a new store: cash on delivery only; online payment stays off.
    await tx.storePaymentMethod.createMany({
      data: PAYMENT_METHOD_IDS.map((method, position) => ({ storeId: store.id, method, enabled: method === "cash_on_delivery", position })),
    });
    await recordAudit(tx, {
      action: "store.demo_provision",
      actorUserId,
      storeId: store.id,
      targetType: "store",
      targetId: store.id,
      metadata: { templateKey: template, slug: spec.slug, products: spec.products.length },
    });
  });
}

/** Creates every missing template demo store; see the rules at the top of this file. */
export async function provisionTemplateDemoStores(
  db: PrismaClient,
  options: {
    dryRun?: boolean;
    specs?: Readonly<Record<TemplateKey, DemoStoreSpec>>;
    /** The platform owner who asked (admin button); null from the command line. */
    actorUserId?: string | null;
  } = {},
): Promise<DemoProvisionResult[]> {
  const specs = options.specs ?? TEMPLATE_DEMO_STORES;
  const results: DemoProvisionResult[] = [];
  for (const template of TEMPLATE_KEYS) {
    const spec = specs[template];
    try {
      const bySlug = await db.store.findUnique({ where: { slug: spec.slug }, select: { isDemo: true, templateKey: true } });
      if (bySlug?.isDemo && bySlug.templateKey === template) {
        results.push({ template, slug: spec.slug, outcome: "exists", detail: `demo store on ${bySlug.templateKey}` });
        continue;
      }
      const otherDemo = await db.store.findFirst({
        where: { isDemo: true, archivedAt: null, templateKey: template },
        select: { slug: true },
      });
      if (otherDemo) {
        results.push({ template, slug: spec.slug, outcome: "template-has-demo", detail: otherDemo.slug });
        continue;
      }
      let createSpec = spec;
      if (bySlug) {
        const baseSlug = `${spec.slug}-demo`;
        let candidate = baseSlug;
        let suffix = 2;
        while (await db.store.findUnique({ where: { slug: candidate }, select: { isDemo: true } })) {
          candidate = `${baseSlug}-${suffix++}`;
        }
        createSpec = { ...spec, slug: candidate };
      }
      const { problems, reference } = await specProblems(db, createSpec);
      if (problems.length > 0 || !reference) {
        results.push({ template, slug: createSpec.slug, outcome: "invalid", detail: problems.join("; ") });
        continue;
      }
      if (options.dryRun) {
        results.push({ template, slug: createSpec.slug, outcome: "would-create", detail: `${spec.products.length} products` });
        continue;
      }
      await createDemoStore(db, template, createSpec, reference, options.actorUserId ?? null);
      results.push({
        template,
        slug: createSpec.slug,
        outcome: "created",
        detail: bySlug ? `separate demo created; preferred address ${spec.slug} remains untouched` : `${spec.products.length} products`,
      });
    } catch (error) {
      console.error(`[template demo provisioning] ${template} (${spec.slug}) failed`, error);
      results.push({
        template,
        slug: spec.slug,
        outcome: "failed",
        detail: "Could not create this demo store; see server logs for details.",
      });
    }
  }
  return results;
}
