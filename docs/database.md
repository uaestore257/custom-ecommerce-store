# Database foundation (Phase 1)

PostgreSQL + Prisma 7. This phase adds the database **alongside** the
existing browser demo: no page reads from the database yet, and the demo
(`lib/demo-db.ts`, localStorage) is unchanged.

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
* **Phase 2** adds `requireStoreAccess(user, storeId, role)` using
  `StoreMembership` before `storeScope()` is created. Roles:
  platform owner (`User.isPlatformOwner`), `OWNER`, `MANAGER`, `STAFF`.
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

* Authentication, sessions and permission checks (Phase 2).
* Tax calculation and per-country legal requirements (which tax IDs,
  invoices and registrations each country needs) — to be verified per
  country; nothing here claims compliance.
* Shipping-rate calculation, payment provider integration. Payment
  **secrets are never stored in the database**: `secretRef` points to a
  secret manager or environment variable.
* Language switcher UI and right-to-left layout.
* Domain routing; moving the admin and storefront from localStorage to
  the database; importing any data saved in browsers.
* Data-residency rules differ by country (e.g. GDPR, Saudi PDPL); this
  phase uses a single database.

## Commands

```bash
docker compose up -d     # local PostgreSQL 16 (or use your own)
cp .env.example .env
npm install              # also runs `prisma generate`
npm run db:migrate       # apply migrations to the dev database
npm run db:seed          # reference data + 3 demo stores
npm run test:unit        # money and standards (no database needed)
npm run test:db          # RESETS the test database, then runs DB tests
```
