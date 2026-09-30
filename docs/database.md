# Database foundation

PostgreSQL + Prisma 7.

**What uses the database:** the admin's store list, create store, store
overview and settings (including archive/restore), products (list, add,
edit, delete/archive) and categories (add, rename, reorder, delete); and the
public storefront's reads — store branding and content, categories, active
products, prices and stock (`lib/server/storefront/catalog.ts`, which only
ever returns ACTIVE, non-archived stores and ACTIVE products, through
`storeScope()`); checkout's orders (`lib/server/orders.ts`, see
[Orders](#orders)); and the admin's order management
([Order management](#order-management)).

**Still browser demo data** (`lib/demo-db.ts`, localStorage): the cart's item
list (product ids and quantities only — never prices), admin customers,
agency settings and old demo order details. These are connected in later
phases.

## Orders

Checkout calls `placeOrderAction` (`app/(storefront)/actions.ts`), which
resolves the store on the server (store cookie or configured default, ACTIVE
only) and calls `placeOrder()`:

* **Nothing about money, stock or ownership is trusted from the browser.**
  Prices, delivery and totals are recalculated from the database in the
  store's currency (minor units). The browser sends the total it showed only
  so the server can refuse the order if it differs; the cart's storeId is
  only compared with the resolved store.
* **One transaction** holds every write: stock decrements, customer, order
  number, order and items. Any failure rolls all of it back.
* **No overselling.** The transaction locks the store row first
  (`SELECT … FOR UPDATE`), so orders for one store are placed one at a
  time; stock is reduced with a conditional update (`stock >= quantity`),
  and the database's `stock >= 0` CHECK is a second safety net.
* **Idempotency.** Each checkout attempt sends a random key. A repeat with
  the same key returns the first order (only if the request is identical,
  compared by a SHA-256 fingerprint); `@@unique([storeId, idempotencyKey])`
  is the final backstop.
* **Payment.** Only `cash_on_delivery` and `bank_transfer`, and only if the
  store enabled them; every order starts `status PENDING` and
  `paymentStatus UNPAID`.
* **Rate limit** before any lookup: 10 per 10 minutes per store and IP,
  40 per 10 minutes per store for visitors without a trusted IP.
* Customers are created once per store and email and never overwritten from
  the public form; each order keeps its own copy of the submitted details.
* Adding to the cart never reserves stock.

## Order management

The admin's order page (`/admin/stores/[storeId]/orders/[orderId]`) calls
`setOrderStatusAction`, `cancelOrderAction` and `setOrderPaymentAction`
(`app/admin/actions.ts`), which call `lib/server/admin/orders.ts`. The rules
live in `lib/admin/order-rules.ts`:

* **Status only moves forward, one step:** `PENDING → PROCESSING → SHIPPED →
  DELIVERED`. `DELIVERED` and `CANCELLED` are final.
* **Cancelling** is allowed from `PENDING` or `PROCESSING`, only while
  `paymentStatus` is `UNPAID` (a paid order is refunded outside the system
  and marked unpaid first). It returns each item's quantity to its variant's
  stock in the same transaction. Seeded sample orders (`isDemo`) never
  reduced stock, so cancelling one returns none.
* **Payment** can be marked `PAID` or back to `UNPAID` on any order that
  isn't cancelled, for `cash_on_delivery` and `bank_transfer` only.
* **No double changes.** Every call names the state the page showed
  (`from`). The write is a conditional update (`WHERE status = from`, or
  `paymentStatus = from`), so a stale page, a double click or two admins at
  once apply a change at most once — a cancellation can't return stock twice,
  and "mark paid" and "cancel" can't both succeed.
* **Scoped to the route's store:** another store's order is "not found";
  archived stores are refused.
* **Audited** in the same transaction: `order.status_change`,
  `order.cancel` (with `stockReturned`) and `order.payment_change`, with the
  before/after values and the acting user. No customer details are logged.

## Admin data flow

```
page.tsx (Server Component)  ──>  lib/server/admin/*  ──>  PostgreSQL
   │  requireAdminPage()             data-access layer:
   ▼                                 - verifies the store exists
Client component (props only)        - scopes by (id, storeId)
   │  calls                          - validates input (lib/admin/validation.ts)
   ▼                                 - returns plain view types (lib/admin/types.ts)
app/admin/actions.ts ("use server") ──┘
   - checks argument types, requirePlatformOwner(), revalidates /admin
```

* Client components only receive plain view objects: money as exact
  decimal strings plus a server-formatted display string. No Prisma
  records, BigInt values or credentials reach the browser.
* The `storeId` always comes from the URL (`/admin/stores/[storeId]`). Form
  data never decides which store is changed; unknown fields, including a
  smuggled `storeId`, are ignored by the validators.
* Products and categories are looked up with both `id` and `storeId`;
  updates and deletes use the compound key `{ id_storeId: { id, storeId } }`.
  A product of another store is "not found" (404 page), and no data of the
  other store is returned in errors.
* Categories chosen for a product must belong to the same store (checked in
  the data layer and by the composite foreign key).
* A store's currency cannot change while prices exist (checked in the data
  layer and enforced by the database).
* Products with past orders are archived instead of deleted; stores are
  archived (soft delete) and can be restored from the store list.
* **Signed-in platform owner only.** Every page calls `requireAdminPage()`
  and every Server Action `requirePlatformOwner()` (lib/server/auth), which
  validate the Better Auth session and re-read the user. See
  [authentication.md](authentication.md).
* Unexpected errors are logged on the server; the browser only receives a
  generic message.

## International by design

Nothing in the schema assumes a country, currency or language. Every
store chooses its own; the platform only holds reference lists.

| Setting | Standard | Stored as | Example |
| --- | --- | --- | --- |
| Country | ISO 3166-1 alpha-2 | `Store.countryCode` → `Country` | `AE`, `US`, `GB`, `SA` |
| Currency | ISO 4217 | `Store.baseCurrency` → `Currency` (with `minorUnits`) | `AED` (2), `JPY` (0), `KWD` (3) |
| Languages | BCP 47 | `Store.defaultLanguage` + `StoreLanguage` rows | `en`, `ar` |
| Formatting locale | BCP 47 | `Store.formatLocale`, else language + country | `ar-AE`, `en-US` |
| Timezone | IANA | `Store.timezone` (validated in `lib/standards.ts`) | `Asia/Dubai` |
| Phone | E.164 | CHECK constraint | `+971500000000` |
| Dates | UTC | `timestamp` columns | |

**Platform-level:** `PlatformSettings` (name, contact email), users and
the platform-owner flag, and the `Country` / `Currency` / `Language`
reference tables. There is deliberately **no** platform currency,
country, language, tax, shipping or payment default.

**Store-level:** everything commercial — localisation, branding,
contact and business details, tax settings (`pricesIncludeTax`,
`TaxRule`), shipping (`ShippingZone`, `ShippingRate`), payments
(`PaymentProviderAccount`, `StorePaymentMethod`), catalogue, customers
and orders.

## Money

* Amounts are `BigInt` **minor units** (cents, fils…) with a currency
  code next to every amount: `priceMinor` + `currency`.
* Minor units come from ISO 4217 via the `Currency` table: JPY has 0,
  USD/AED/GBP have 2, KWD/BHD/OMR have 3.
* `lib/money.ts` converts exactly (string/BigInt, never floating point)
  and refuses input with more decimals than the currency allows.
* Orders store a **snapshot**: currency, prices, totals, customer and
  address at purchase time. Later store changes never alter an order.
* Product and shipping prices must be in the store's base currency
  (composite foreign key). Changing a store's base currency is blocked
  while prices exist, so it needs a deliberate repricing step.
* No exchange rates in Phase 1. Multi-currency prices can be added
  later as extra price rows without changing existing data.

## Localised content

Translatable text lives in translation tables, one row per language:
`ProductTranslation`, `CategoryTranslation`, `StoreContentTranslation`.

* A store chooses its languages (`StoreLanguage`). Content can only be
  written in a language that store has enabled (foreign key). Nothing is
  auto-translated.
* Reading falls back: requested language → store default language → any
  existing translation (`pickTranslation()` in `lib/server/store-scope.ts`).
* `Language.direction` marks right-to-left languages (Arabic, Urdu,
  Persian, Hebrew) for the future RTL layout.

## Products and variants

Every product has **at least one variant and exactly one default
variant**. Price, compare-at price, SKU and stock live on the variant,
so options such as size or colour can be added later as extra variants
(plus option tables) without moving any data.

How the demo products map:

| Demo field (`lib/demo-data.ts`) | New location |
| --- | --- |
| `price` (e.g. `2499`) | default `ProductVariant.priceMinor` (`249900`) in the store's base currency |
| `compareAtPrice` (e.g. `2999`) | `ProductVariant.compareAtMinor` (`299900`), or null when not on sale |
| `stock`, `sku` | `ProductVariant.stock`, `ProductVariant.sku` |
| `name`, `description` | `ProductTranslation` (`locale = "en"`) |
| `imageUrl` | `ProductImage` (position 0), if set |
| `status`, `featured`, `categoryId` | `Product` |

The default variant has `isDefault = true`, `position = 0`, `title = null`
and id `<productId>-default`.

## How stores are kept apart

Two independent layers, so a bug in one is caught by the other.

### 1. Database constraints (cannot be bypassed by application code)

* Every store-owned table has a required `storeId`.
* Parent tables expose a composite key `(id, storeId)`; children
  reference it with a **composite foreign key**, so both must match:

  | Child | References |
  | --- | --- |
  | `Product (categoryId, storeId)` | `Category (id, storeId)` |
  | `ProductVariant`, `ProductTranslation`, `ProductImage (productId, storeId)` | `Product (id, storeId)` |
  | `CategoryTranslation (categoryId, storeId)` | `Category (id, storeId)` |
  | `OrderItem (orderId, storeId, currency)` | `Order (id, storeId, currency)` |
  | `OrderItem (variantId, storeId)` | `ProductVariant (id, storeId)` |
  | `Order`, `CustomerAddress (customerId, storeId)` | `Customer (id, storeId)` |
  | `ShippingZoneCountry`, `ShippingRate (zoneId, storeId)` | `ShippingZone (id, storeId)` |
  | `StorePaymentMethod (providerAccountId, storeId)` | `PaymentProviderAccount (id, storeId)` |
  | `ProductVariant`, `ShippingRate (storeId, currency)` | `Store (id, baseCurrency)` |
  | `*Translation (storeId, locale)` | `StoreLanguage (storeId, languageCode)` |

* All composite keys are `ON UPDATE RESTRICT`, and a trigger makes
  `storeId` immutable on every store-owned table: records can never be
  moved to another store.
* Commit-time (deferred) triggers: every product has a default variant;
  every store's default language is one of its enabled languages.
* A partial unique index allows only one default variant per product.
* CHECK constraints: code formats (ISO/BCP 47), non-negative money and
  stock, positive quantities, E.164 phones, lower-case customer emails.

These hand-written rules are at the end of
`prisma/migrations/*_init/migration.sql`. Prisma does not manage them,
so later migrations leave them in place (verified: a follow-up
`prisma migrate dev` produces an empty migration).

### 2. Server-side access

* `lib/server/db.ts` and `lib/server/store-scope.ts` are `server-only`:
  importing them from browser code fails the build.
* All store data is read and written through `storeScope(db, storeId)`,
  which adds `storeId` to every query. Asking for another store's
  record returns `null`.
* The `storeId` always comes from the route (e.g.
  `/admin/stores/[storeId]`), never from a request body.
* Access checks: `User.isPlatformOwner` (at most one) is the
  platform-level administrator. Store Owners authenticate with Better
  Auth credentials in `Account` and require `StoreMembership` role `OWNER`
  for the exact store resolved from the request hostname and route.
  `MANAGER` and `STAFF` stay in the enum but are not used for authorization.
* Customers belong to one store (`@@unique([storeId, email])`): the same
  person shopping at two stores is two separate customer records.

## Soft delete and order numbers

* Stores are archived (`archivedAt`), never hard-deleted by default;
  `archiveStore()` / `restoreStore()`. Orders block accidental hard
  deletes (`ON DELETE RESTRICT`).
* Order numbers are a per-store sequence (`Store.nextOrderNumber`,
  shown as `<orderNumberPrefix>-<number>`, e.g. `NO-1004`).
  `allocateOrderNumber()` locks the store row, so concurrent checkouts
  get different numbers.

## Not in Phase 1 (to verify or build later)

* Email-based password recovery. Manager/Staff assignment, role-scoped access
  and hashed, expiring store invitations are implemented.
* Tax calculation and per-country legal requirements (which tax IDs,
  invoices and registrations each country needs) — to be verified per
  country; nothing here claims compliance.
* Shipping-rate calculation, payment provider integration. Payment
  **secrets are never stored in the database**: `secretRef` points to a
  secret manager or environment variable.
* Language switcher UI and right-to-left layout.
* Domain routing (the storefront's store choice is a temporary cookie plus a
  configured default); refunds, returns and editing orders; order emails;
  moving admin customers from localStorage to the database; importing any
  data saved in browsers.
* Data-residency rules differ by country (e.g. GDPR, Saudi PDPL); this
  phase uses a single database.

## Commands

See the [Windows local development guide](local-development.md) for safe
PostgreSQL setup and dependency installation. Verify `DATABASE_URL` points to
the intended local database before running `npm run db:migrate` (schema
changes) or `npm run db:seed` (data writes).

`npm run test:unit` does not need a database. **`npm run test:db` resets the
database in `TEST_DATABASE_URL` and deletes its existing data**; only use it
with a disposable test database whose target has been verified. Do not use
`npm run db:reset` for normal setup; it drops data in `DATABASE_URL`.
