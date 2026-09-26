# Custom Ecommerce Store — Agency Platform Demo

A reusable ecommerce template run by an agency. Built with Next.js (App Router),
TypeScript and Tailwind CSS.

> **This is a frontend demo.** There is no backend, database, login, payment
> provider, email or domain/DNS integration. All data is sample data saved in
> the browser's `localStorage`. See [Demo limitations](#demo-limitations).

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
npm run lint
npm run build
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
| `/products/[id]` | `/admin/stores/new` | `…/orders`, `…/orders/[orderId]` |
| `/cart`, `/checkout` | `/admin/template` | `…/customers` |
| `/about`, `/contact` | `/admin/settings` | `…/settings` |

The storefront shows one client store at a time. It uses
`DEFAULT_STOREFRONT_STORE_ID` in `lib/config.ts` (the furniture store), and the
dark demo bar at the top lets you switch store. A cart only ever holds products
from one store, so switching store asks before emptying the cart.

### Code layout

| Path | What it contains |
| --- | --- |
| `lib/types.ts` | Data model: `Store`, `StoreSettings`, `Product`, `Category`, `CartItem`, `Order`, `Customer` |
| `lib/demo-data.ts` | Sample data for the three demo stores |
| `lib/demo-db.ts` | Demo data layer: reads and writes, each keyed by `storeId` |
| `lib/storefront.ts` | Selected storefront store, cart and checkout totals |
| `lib/storage.ts` | Safe `localStorage` wrapper (works when storage is blocked) |
| `lib/config.ts` | Options: store types, currencies, emirates, payment methods |
| `components/` | Shared UI, storefront and admin components |

Each store's data is saved under its own key (`ecom-demo:v1:store:<storeId>`),
and every product, order and customer also carries a `storeId`. Every store
admin page reads the store from the URL through `StoreContextLayout`, so those
pages only ever read or change that one store's data. To add a real backend,
replace the functions in `lib/demo-db.ts` with API calls. The components can
stay the same.

## Demo limitations

These parts are **not** implemented and need a backend:

- **Authentication and roles.** There is no login, so anyone who opens `/admin`
  can use it. Checks in the browser are not security.
- **Separate databases / tenant isolation.** Data is split per store in the
  browser only. Real isolation must be enforced on the server.
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
