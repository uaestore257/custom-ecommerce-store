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
> browser's `localStorage`. Email can be configured through SMTP but is
> disabled until configured; online payment providers are not connected.
> Store Owners and Managers can manage custom storefront domains after DNS
> ownership verification. See [Demo limitations](#demo-limitations).

## New Developer Setup

Dependencies and exact versions are managed by `package.json` and
`package-lock.json` (npm); there is no separate requirements file. Use
Node.js `>=22.12 <23` and its bundled npm. Clone this repository, then run
`npm run setup` from the project directory. Setup creates `.env` only if
missing, generates a local auth secret without printing it, preserves any
existing `.env`, and runs `npm ci`.

Next, follow [docs/local-development.md](docs/local-development.md) to start
an isolated local PostgreSQL instance and review `.env`. `npm run db:migrate`
and optional `npm run db:seed` show the exact local target and require typing
`yes` before changing it. Neither command resets the database. Create a
platform-owner account separately and manually only if you need admin access;
setup never creates one. Then start the app with `npm run dev`.

## Database (Phase 1)

An international, multi-store PostgreSQL schema (Prisma 7) sits alongside the
demo: ISO country and currency codes, BigInt minor-unit money (0/2/3-decimal
currencies), per-store languages with translations, default product variants,
per-store customers and order numbers, and database-enforced store isolation.
Full details are in [docs/database.md](docs/database.md). Verify the exact
database target before running any database-writing command.

### Store localization reference data

Before creating or editing stores, populate the standard country, currency,
language and timezone choices with `npm run db:reference-data`. This dedicated
command upserts only ISO reference rows and never deletes existing rows,
creates demo records, runs migrations or changes environment variables; it is
safe to run again when updating the pinned datasets. Country, ISO-4217 currency
and ISO-639-1 language data come from the exact-pinned `countries-list`
dependency; IANA timezone names come from exact-pinned `@vvo/tzdb`. Run the
command against the already-migrated database selected by the app's existing
`DATABASE_URL`. For production, run it as an explicit deployment step after
schema migrations and before opening store setup; do not use `npm run db:seed`
as a substitute.

## Canonical local URLs

| Purpose | Local URL |
| --- | --- |
| UAE Store business/portfolio website | <http://localhost:3000> |
| Platform Owner control panel and sign-in | <http://admin.localhost:3000/admin> |
| Storefront for a store | `http://<store-slug>.localhost:3000/` |
| Store Owner sign-in and admin | `http://admin.<store-slug>.localhost:3000/login` and `/admin` |

The bare root host is the business website in every environment, never a
default store. Public storefront and Store Admin hosts are resolved
separately from `Store.slug`; a browser cookie or manually supplied store ID
cannot switch a request to a different store. Public storefronts show active,
non-archived stores only; draft/paused/suspended stores are not public. The shared storefront and store-admin code is under
`app/(storefront)` and `app/admin/stores/[storeId]`.

### Temporary preview-only storefront fallback

Only when tenant subdomains cannot be routed, use a dedicated temporary
preview-only hostname with `STOREFRONT_PREVIEW_MODE=path`. Never set this
fallback on the production business root or where real tenant hostnames are
available:

```dotenv
ADMIN_HOST="preview.example.com"
PLATFORM_ROOT_DOMAIN="preview.example.com"
BETTER_AUTH_URL="https://preview.example.com"
STOREFRONT_PREVIEW_MODE="path"
```

The `ADMIN_HOST` and `PLATFORM_ROOT_DOMAIN` hostnames must match the temporary
URL hostname, and `BETTER_AUTH_URL` must be its full HTTPS origin. This host
is not the public platform business root. Opening `/preview/<store-slug>`
first redirects to a verified/configured public storefront hostname when
available; only otherwise does it use the temporary cookie-based preview.
The fallback looks up the slug on the server and selects only an ACTIVE,
non-archived store; invalid or non-public stores return 404. Its cookie is
scoped to this preview-only hostname and never selects a store on the real
platform root. Existing host-selected tenant and verified custom-domain
routing remain unchanged.

The selected store uses the existing host-only `storefront_store` cookie.
Browsers do not share this cookie between the temporary host, tenant
subdomains, and client custom domains, so continue testing normal tenant
routing on those hosts. To restore normal production routing, unset
`STOREFRONT_PREVIEW_MODE` (or set it empty), restore the usual admin/root host
configuration, and redeploy. This mode requires no schema change or migration.

The Platform Owner creates stores and their OWNER login from the existing
Create Store form. Store members manage only their own store; server-side
authorization checks the membership role and store resolved from the
current hostname. See [docs/authentication.md](docs/authentication.md) for
credential provisioning and role access controls.

The browser keeps only which products and how many; prices, stock and
availability are always taken from the database, and checkout re-checks them.
Nothing is reserved while it sits in a cart.

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
| `lib/server/storefront/catalog.ts` | Public storefront reads from the active store named by the request host |
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

- **Orders are placed and managed, but simply.** Checkout creates a real
  order in the database: the server re-checks the store, products, prices,
  delivery and stock, reduces stock atomically (no overselling) and ignores
  repeated submissions of the same checkout. Only **cash on delivery** and
  **bank transfer** are offered; both orders start **unpaid**. The store
  shares bank transfer details itself — none are shown. In the admin, an
  order moves Pending → Processing → Shipped → Delivered; a pending or
  processing, unpaid order can be cancelled, which returns its stock; and
  staff mark payment as paid (or back to unpaid) by hand once money arrives.
  There are no refunds, returns or item edits. Order emails are sent only
  after SMTP is configured. Admin customers and agency settings are still
  browser demo data. A store without a delivery rate can't take orders.
- **Stores are chosen by hostname.** Each active store is served publicly at
  `<slug>.<PLATFORM_ROOT_DOMAIN>`, an operator-configured `STORE_DOMAINS`
  alias, or a database-managed custom hostname after TXT verification.
  Store Admin is on `admin.<slug>.<PLATFORM_ROOT_DOMAIN>` and never on the
  public storefront/custom-domain host.
  Unrecognized or unverified hosts show no store. A verified primary custom
  hostname is used for canonical storefront URLs; otherwise the existing
  platform slug host or trusted operator alias is used. Draft stores can't be
  previewed on the storefront yet.
- **Custom-domain access.** Store Owners and Managers can add, verify, set a
  primary hostname, or disable domains at `/admin/domains` on their dedicated
  Store Admin host. Domain actions derive the store from the authenticated
  host and are unavailable to Staff and Platform Admin sessions.
- **Payments.** Nothing is paid online and no card details are collected.
  "Online card payment" can't be switched on because no payment provider is
  connected, and "card on delivery" isn't offered at checkout yet.
- **Tax.** No tax is calculated; orders record the store's "prices include
  tax" setting and a tax amount of zero.
- **Contact form.** Messages are validated and rate-limited on the server and
  saved to the database for that store, but there is no admin page to read
  them yet and no email is sent. The store is chosen by the visitor's browser,
  not yet by domain.
- **Domains.** Adding a custom hostname does not register it, alter DNS, or
  provision hosting. The Store Owner or Manager must configure DNS with their
  hosting provider and publish the displayed TXT proof record before the
  hostname routes to the store.
- **Template versioning.** There is none. Every store uses the current code.

Use made-up details when testing checkout locally. To go back to the original
browser sample data, use **Agency settings → Reset demo data** (this does not
touch the database).
