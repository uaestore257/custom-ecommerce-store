# Custom Ecommerce Store — Agency Platform Demo

A reusable ecommerce template run by an agency. Built with Next.js (App Router),
TypeScript and Tailwind CSS.

> **Partly connected to a database.** The admin's **stores, products and
> categories** are stored in PostgreSQL ([Database](#database-phase-1)), and
> the public storefront reads them from there (active stores and products
> only). Checkout places real orders in the database (cash on delivery or
> bank transfer, always unpaid until staff mark them paid), and the admin
> can move orders through their statuses, cancel them (returning stock) and
> record payment. The admin requires signing in as
> the platform owner ([docs/authentication.md](docs/authentication.md)).
> Admin customers and agency settings still use sample data saved in the
> browser's `localStorage`. There is no payment provider, email or domain/DNS
> integration. See [Demo limitations](#demo-limitations).

## Getting started

```bash
npm install
npm run dev      # a store: http://<store-slug>.localhost:3000 (e.g. nest-and-oak), admin http://admin.localhost:3000/admin
npm run lint
npm run build
```

## Database (Phase 1)

An international, multi-store PostgreSQL schema (Prisma 7) sits alongside the
demo: ISO country and currency codes, BigInt minor-unit money (0/2/3-decimal
currencies), per-store languages with translations, default product variants,
per-store customers and order numbers, and database-enforced store isolation.
Full details: [docs/database.md](docs/database.md).

```bash
docker compose up -d   # local PostgreSQL 16
cp .env.example .env
npm install            # also generates the Prisma client
npm run db:migrate && npm run db:seed
npm run platform:create-owner   # admin login; see docs/authentication.md
npm run test:unit      # no database needed
npm run test:db        # resets the TEST database, then runs database tests
```

## How it is organised

```
Level 1  Agency Admin (/admin)              manages many client store projects
             │
Level 2  Master Ecommerce Template          one shared codebase (this repo)
             │
Level 3  Client stores (store-a, store-b…)  own branding, settings and data
```

- **Agency Admin** — `/admin`: dashboard, client store list, create store,
  template overview and agency settings.
- **Master template** — the storefront pages (`app/(storefront)`) and store
  admin pages (`app/admin/stores/[storeId]`) are shared by every store.
- **Client stores** — each store has its own settings (name, logo, accent
  colour, currency, country, domain, delivery, payment methods, page content)
  and its own products, categories, orders and customers.

### Routes

| Storefront | Agency admin | Store admin (per store) |
| --- | --- | --- |
| `/` | `/admin` | `/admin/stores/[storeId]` |
| `/shop` | `/admin/stores` | `…/products`, `…/products/new`, `…/products/[productId]` |
| `/products/[id]` | `/admin/stores/new` | `…/categories` (add, rename, image, reorder, delete) |
| | | `…/orders`, `…/orders/[orderId]` |
| `/cart`, `/checkout` | `/admin/template` | `…/customers` |
| `/about`, `/contact` | `/admin/settings` | `…/settings` |

The storefront shows one client store at a time, read from the database:
its branding, content, categories and **active** products, with prices in the
store's own currency. Draft, paused, suspended and archived stores are never
shown, and draft or archived products return a 404.

Which store is shown is a **temporary** choice until domain-based store
resolution exists: the dark demo bar lists the active stores and remembers
your pick in a `storefront_store` cookie. The server only honours that cookie
if it names an active store; otherwise it falls back to
`DEFAULT_STOREFRONT_STORE_ID` in `lib/config.ts` (if that store is active too),
and otherwise shows a "not available" page. The cookie is a preference, not
access control — it can only ever show a store that is already public.

A cart only ever holds products from one store, so switching store asks
before emptying the cart. The browser keeps only which products and how many;
prices, stock and availability are always taken from the database, and the
cart and checkout re-check them when opened and point out anything that
changed. Nothing is reserved while it sits in a cart.

The demo bar's admin/contact disclosure uses the configured `ADMIN_HOST` to
show **Agency Admin** on the admin host and **Contact admin** on the storefront
host. Set real platform contact details in `PLATFORM_CONTACT` in
`lib/platform-contact.ts`; leave unused fields empty and they will not be shown.

### Code layout

| Path | What it contains |
| --- | --- |
| `lib/types.ts` | Demo data model: `Store`, `StoreSettings`, `Product`, `Category`, `Order`, `Customer` |
| `lib/demo-data.ts` | Sample data for the three demo stores (also the database seed) |
| `lib/demo-db.ts` | Browser demo data: admin customers, agency settings and legacy demo order details |
| `lib/checkout.ts` | Checkout input validation (shared by the form and the server) and the order result shape |
| `lib/server/orders.ts` | Server-side order placement: re-validation, atomic stock, idempotency |
| `lib/server/admin/orders.ts` | The admin's orders: list, order page, status, cancellation and payment (one store at a time) |
| `lib/server/storefront/catalog.ts` | Public storefront reads from the database (active stores/products only) and the store choice |
| `lib/storefront-types.ts` | Plain data shapes the storefront receives (money as exact minor units) |
| `lib/storefront-cart.ts` | Cart maths: current prices, stock caps, change detection, totals (pure, tested) |
| `lib/storefront-cookie.ts` | The temporary store-choice cookie |
| `lib/storefront.ts` | Storefront hook and the browser-side cart item list |
| `lib/storage.ts` | Safe `localStorage` wrapper (works when storage is blocked) |
| `lib/config.ts` | Options: store types, currencies, emirates, payment methods |
| `components/` | Shared UI, storefront and admin components |

The remaining browser demo data (orders, customers) is saved per store under
its own key (`ecom-demo:v1:store:<storeId>`), and every record carries a
`storeId`. Every store admin page reads the store from the URL through
`StoreContextLayout`, so those pages only ever read or change that one
store's data.

## Demo limitations

These parts are **not** implemented and need a backend:

- **Store-owner logins.** Only the platform owner can sign in so far
  ([docs/authentication.md](docs/authentication.md)). Store owners,
  invitations and store-level permissions arrive in Phase 2b. The admin is
  served only on `ADMIN_HOST` (locally <http://admin.localhost:3000>).
- **Orders are placed and managed, but simply.** Checkout creates a real
  order in the database: the server re-checks the store, products, prices,
  delivery and stock, reduces stock atomically (no overselling) and ignores
  repeated submissions of the same checkout. Only **cash on delivery** and
  **bank transfer** are offered; both orders start **unpaid**. The store
  shares bank transfer details itself — none are shown. In the admin, an
  order moves Pending → Processing → Shipped → Delivered; a pending or
  processing, unpaid order can be cancelled, which returns its stock; and
  staff mark payment as paid (or back to unpaid) by hand once money arrives.
  There are no refunds, returns or item edits, and no emails are sent to the
  customer or store. Admin customers and agency settings are still browser
  demo data. A store without a delivery rate can't take orders.
- **Stores are chosen by hostname.** Each active store is served at
  `<slug>.<PLATFORM_ROOT_DOMAIN>`, or at a client domain listed in
  `STORE_DOMAINS` (see `.env.example`); other hosts show no store. Custom
  domains are configuration, not yet stored per store in the database, and
  changing a store's slug changes its address. Draft stores can't be
  previewed on the storefront yet.
- **Payments.** Nothing is paid online and no card details are collected.
  "Online card payment" can't be switched on because no payment provider is
  connected, and "card on delivery" isn't offered at checkout yet.
- **Tax.** No tax is calculated; orders record the store's "prices include
  tax" setting and a tax amount of zero.
- **Contact form.** Messages are validated and rate-limited on the server and
  saved to the database for that store, but there is no admin page to read
  them yet and no email is sent. The store is chosen by the visitor's browser,
  not yet by domain.
- **Domains.** The domain field is just a setting. Nothing is registered, no
  DNS is changed and nothing is deployed.
- **Template versioning.** There is none. Every store uses the current code.

Use made-up details when testing checkout locally. To go back to the original
browser sample data, use **Agency settings → Reset demo data** (this does not
touch the database).
