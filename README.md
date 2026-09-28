# Custom Ecommerce Store — Agency Platform Demo

A reusable ecommerce template run by an agency. Built with Next.js (App Router),
TypeScript and Tailwind CSS.

> **Partly connected to a database.** The admin's **stores, products and
> categories** are stored in PostgreSQL ([Database](#database-phase-1)), and
> the public storefront reads them from there (active stores and products
> only). The admin requires signing in as the platform owner
> ([docs/authentication.md](docs/authentication.md)). Checkout, orders,
> customers and agency settings still use sample data saved in the browser's
> `localStorage`. There is no payment provider, email or domain/DNS
> integration. See [Demo limitations](#demo-limitations).

## Getting started

```bash
npm install
npm run dev      # storefront http://localhost:3000, admin http://admin.localhost:3000/admin
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
| `lib/demo-db.ts` | Browser demo data: admin orders, customers, agency settings and demo checkout orders |
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
- **Checkout is still a demo.** The storefront shows real database products
  and prices, but checkout only saves a labelled demo order in your browser:
  nothing is sent to the store, no stock is reserved or reduced, and prices
  are not re-checked on the server when the demo order is placed. Admin
  orders, customers and agency settings are still browser demo data.
- **Store choice is temporary.** The storefront picks a store from a browser
  cookie or the configured default, not yet from the domain name. Draft
  stores can't be previewed on the storefront yet.
- **Payments.** Nothing is paid and no card details are collected. "Online card
  payment" can't be switched on because no payment provider is connected.
- **Orders.** Demo orders are saved in this browser only. They are not sent to
  a store, courier or email inbox, and payment is never confirmed.
- **Contact form.** It checks the fields but doesn't send or save anything.
- **Domains.** The domain field is just a setting. Nothing is registered, no
  DNS is changed and nothing is deployed.
- **Template versioning.** There is none. Every store uses the current code.

Use made-up details at checkout. To go back to the original sample data, use
**Agency settings → Reset demo data**.
