// Cross-store isolation, enforced by the DATABASE itself.
// Each test writes through Prisma directly — bypassing storeScope(), as
// a buggy piece of code would — and expects Postgres to refuse.
//
// Seed fixtures: store-a (AE, AED, en+ar), store-b (AE, AED, en),
// store-c (SA, SAR, en).
import assert from "node:assert/strict";
import { after, test } from "node:test";
import { FK, rejects, testDb, uid } from "./helpers";

const db = testDb();
after(() => db.$disconnect());

/** A valid product of store A, created with its default variant. */
async function productInStoreA() {
  const id = `iso-${uid()}`;
  await db.product.create({
    data: {
      id,
      storeId: "store-a",
      variants: { create: [{ id: `${id}-v`, sku: `SKU-${id}`, isDefault: true, currency: "AED", priceMinor: 1000n }] },
    },
  });
  return id;
}

test("a product cannot use another store's category", async () => {
  await rejects(
    () =>
      db.product.create({
        data: {
          storeId: "store-a",
          categoryId: "store-b-cat-1", // belongs to store B
          variants: { create: [{ sku: `X-${uid()}`, isDefault: true, currency: "AED", priceMinor: 100n }] },
        },
      }),
    FK,
  );
});

test("a variant cannot belong to another store's product", async () => {
  const productId = await productInStoreA();
  await rejects(
    () =>
      db.productVariant.create({
        data: { storeId: "store-b", productId, sku: `X-${uid()}`, currency: "AED", priceMinor: 100n },
      }),
    FK,
  );
});

test("a variant's currency must be its store's base currency", async () => {
  const productId = await productInStoreA();
  await rejects(
    () =>
      db.productVariant.create({
        data: { storeId: "store-a", productId, sku: `X-${uid()}`, currency: "SAR", priceMinor: 100n },
      }),
    FK,
  );
});

test("a store's base currency cannot change while prices exist in it", async () => {
  await rejects(() => db.store.update({ where: { id: "store-a" }, data: { baseCurrency: "USD" } }), FK);
});

test("an order item cannot reference another store's variant", async () => {
  await rejects(
    () =>
      db.orderItem.create({
        data: {
          storeId: "store-a",
          orderId: "store-a-ord-1001",
          currency: "AED",
          variantId: "fas-001-default", // store B's variant
          productName: "x",
          sku: "x",
          unitPriceMinor: 1n,
          quantity: 1,
          lineTotalMinor: 1n,
        },
      }),
    FK,
  );
});

test("an order item must be in its order's store and currency", async () => {
  const item = {
    orderId: "store-a-ord-1001",
    productName: "x",
    sku: "x",
    unitPriceMinor: 1n,
    quantity: 1,
    lineTotalMinor: 1n,
  };
  await rejects(() => db.orderItem.create({ data: { ...item, storeId: "store-b", currency: "AED" } }), FK);
  await rejects(() => db.orderItem.create({ data: { ...item, storeId: "store-a", currency: "SAR" } }), FK);
});

test("an order cannot belong to another store's customer", async () => {
  await rejects(
    () =>
      db.order.create({
        data: {
          storeId: "store-a",
          number: 90001,
          customerId: "store-b-cus-1", // store B's customer
          currency: "AED",
          locale: "en",
          pricesIncludeTax: false,
          subtotalMinor: 0n,
          totalMinor: 0n,
          customerName: "x",
          customerEmail: "x@example.com",
          shippingAddress: {},
        },
      }),
    FK,
  );
});

test("a customer address cannot point at another store's customer", async () => {
  await rejects(
    () =>
      db.customerAddress.create({
        data: {
          storeId: "store-b",
          customerId: "store-a-cus-1",
          recipientName: "x",
          line1: "x",
          city: "x",
          countryCode: "AE",
        },
      }),
    FK,
  );
});

test("translations can only use languages enabled for THAT store", async () => {
  // Store A enables Arabic, so an Arabic category name is allowed...
  await db.categoryTranslation.create({
    data: { categoryId: "store-a-cat-1", storeId: "store-a", locale: "ar", name: "غرفة المعيشة", slug: `ar-${uid()}` },
  });
  // ...store B only enables English, so Arabic content is refused.
  await rejects(
    () =>
      db.categoryTranslation.create({
        data: { categoryId: "store-b-cat-1", storeId: "store-b", locale: "ar", name: "x", slug: `ar-${uid()}` },
      }),
    FK,
  );
});

test("a translation cannot be attached to another store's product", async () => {
  // A fresh store-A product with no translations, so only the store check
  // (not the one-translation-per-language key) can reject this.
  const productId = await productInStoreA();
  await rejects(
    () =>
      db.productTranslation.create({
        data: { productId, storeId: "store-b", locale: "en", name: "x", slug: `x-${uid()}` },
      }),
    FK,
  );
  // The same translation in the product's own store is accepted.
  await db.productTranslation.create({
    data: { productId, storeId: "store-a", locale: "en", name: "x", slug: `x-${uid()}` },
  });
});

test("a payment method cannot use another store's provider account", async () => {
  const account = await db.paymentProviderAccount.create({
    data: { storeId: "store-b", provider: "example", displayName: "Store B test account" },
  });
  await rejects(
    () =>
      db.storePaymentMethod.create({
        data: { storeId: "store-a", method: `online_${uid()}`, providerAccountId: account.id },
      }),
    FK,
  );
});

test("a shipping rate must be in its store's currency and zone", async () => {
  const zoneA = await db.shippingZone.findFirstOrThrow({ where: { storeId: "store-a" } });
  await rejects(
    () => db.shippingRate.create({ data: { storeId: "store-a", zoneId: zoneA.id, name: "x", currency: "SAR", priceMinor: 1n } }),
    FK,
  );
  await rejects(
    () => db.shippingRate.create({ data: { storeId: "store-c", zoneId: zoneA.id, name: "x", currency: "SAR", priceMinor: 1n } }),
    FK,
  );
});

test("records can never be moved to another store (storeId is immutable)", async () => {
  await rejects(
    () => db.customer.update({ where: { id: "store-a-cus-1" }, data: { storeId: "store-b" } }),
    /storeId of Customer cannot be changed/,
  );
  await rejects(
    () => db.category.update({ where: { id: "store-a-cat-4" }, data: { storeId: "store-b" } }),
    /storeId of Category cannot be changed|_fkey/,
  );
  const stillA = await db.customer.findUniqueOrThrow({ where: { id: "store-a-cus-1" } });
  assert.equal(stillA.storeId, "store-a");
});
