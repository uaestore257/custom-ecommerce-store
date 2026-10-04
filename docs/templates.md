# Storefront templates

One platform → many stores → many templates → one codebase.

A **template** is presentation code registered at compile time. A store
chooses one (`Store.templateKey`) plus that template's enumerated options
(`Store.themeConfig`). Commerce behaviour — store resolution, catalogue
reads, pricing, cart, checkout, orders, payments, SEO — is shared and is
never implemented inside a template.

## Layers

| Layer | Where | Owns |
| --- | --- | --- |
| Platform | `proxy.ts`, `lib/store-host.ts`, `lib/server/auth/*` | Host routing, tenancy, auth (unchanged by templates) |
| Store configuration | `Store.templateKey`, `Store.themeConfig`, `Store.isDemo`, branding/content columns | What a store picked; never executable |
| Shared storefront core | `lib/server/storefront/catalog.ts`, `lib/storefront-types.ts`, `lib/storefront-urls.ts`, `lib/storefront.ts`, `lib/storefront-cart.ts`, `lib/checkout.ts` | Typed data loaders (always bounded), URLs, cart state and maths |
| Shared storefront UI | `components/storefront/*` | Checkout, contact, policies, about, cart controls, listing controls, primitives — styled only with semantic tokens |
| Template registry (data) | `lib/templates/registry.ts`, `lib/templates/theme.ts`, `templates/*/definition.ts` | Keys, manifests, theme options, colour/shape tokens |
| Template components | `templates/*/index.ts`, `templates/index.ts` | Shell (header, nav, footer, persistent surfaces), Home, Listing, Product, Cart |
| Routes | `app/(storefront)/*` | URLs, metadata, JSON-LD, redirects, 404s; load data, then render the active template |

## Rendering flow

1. `proxy.ts` and `resolveStoreForHost()` decide the store from the request
   **Host** (subdomain, verified custom domain, operator alias, or the
   explicit preview host). Nothing the browser sends selects a store.
2. `getRequestStorefront()` loads that store's `StorefrontContext` (store
   DTO + categories, no product list). `templateKey` is resolved through
   `resolveTemplateKey()` (unknown → `classic`) and `themeConfig` through
   `normalizeThemeConfig()` (invalid → defaults).
3. `app/(storefront)/layout.tsx` renders `StorefrontRoot`, which sets the
   template's CSS variables, fonts, `lang` and `dir`, then the template's
   `Shell`.
4. Each page loads only what it shows — `getFeaturedProducts`,
   `getStorefrontProductListing` (one page), `getStorefrontProductBySlug`,
   `getRelatedProducts` — and renders the template's page component.
5. Client islands (cart count, add-to-cart, drawers, menus) use
   `lib/storefront.ts`. The cart reads fresh prices for exactly its own
   products from `GET /api/storefront/cart-products` (store resolved by host).
   Checkout is `components/storefront/CheckoutView.tsx` for every template.

## The contract

`templates/types.ts` defines `StorefrontTemplate`:

- `Shell`, `Home`, `Listing`, `Product`, `Cart` components receiving typed data.
- `definition` — the manifest (catalogue metadata, capabilities) and theme
  (options, palettes, radii, fallback accent) from `templates/<key>/definition.ts`.
- `fonts` — font-family stacks from `next/font` (`preload: false`, so a
  browser only downloads the active template's font files).
- `homepageProductCount`, `relatedProductCount` — how much the routes load.

Templates **must not**: import Prisma or `lib/server/*` loaders, check
permissions, resolve tenants, compute prices or totals, write orders or
touch payments. They **may**: compose shared components, choose their own
markup, navigation model, card anatomy, gallery, density, typography and
cart surface (page, drawer or both), and add small client islands that call
the shared hooks.

## Semantic tokens

Storefront code uses roles, never fixed colours:
`bg-background`, `text-foreground`, `bg-muted`, `text-muted-foreground`,
`border-border`, `bg-surface`, `bg-surface-elevated`, `bg-accent`,
`text-accent-foreground`, `text-destructive`, `text-success`,
`text-warning`, `ring-focus`, `rounded-control`, `rounded-card`,
`font-heading`, `font-body`. Values come from the template's palette and the
store's validated accent (`themeCssVariables()`). The admin keeps its own
slate/teal design language (`components/ui.tsx`).

## RTL

Every template must stay correct under `dir="rtl"` (the store's default
language decides it): use logical utilities (`ps-*`, `pe-*`, `ms-*`,
`me-*`, `start-*`, `end-*`, `text-start`, `text-end`), mirror directional
icons with `rtl:rotate-180`, slide drawers from `end-0` with
`rtl:-translate-x-full`, and drop letter-spacing with `rtl:tracking-normal`
(tracking breaks Arabic joining). Templates' own UI copy is English today
(`manifest.capabilities.uiLocales`); store content comes from the store.

## Adding a template

1. Create `templates/<key>/definition.ts` (manifest + theme) — pure data.
2. Add `<key>` to `TEMPLATE_KEYS` and `DEFINITIONS` in `lib/templates/registry.ts`.
3. Build `templates/<key>/{Shell,Home,Listing,Product,Cart}.tsx`, `fonts.ts`
   and `index.ts`, and register it in `templates/index.ts`
   (`Record<TemplateKey, …>` makes a missing half a type error).
4. Differ in **structure**, not only colour: navigation model, homepage
   composition, card anatomy, PDP hierarchy, gallery, density, cart surface.
5. `tests/unit/template-registry.test.ts` validates every registered
   definition automatically. Create a demo store, choose the template on its
   Design page and mark it as a demo (platform owner).

## Demo stores

A demo store is an ordinary tenant with `isDemo = true` (set by the platform
owner on the store's Design page). It shows a demonstration notice, is
excluded from indexing (`noindex`, robots `Disallow: /`, empty sitemap) and is
linked from `/admin/template` and each store's Design page as a live demo.

## Public business site

The bare `PLATFORM_ROOT_DOMAIN` serves the studio site: `/` (home),
`/portfolio` (Work), `/services`, `/platform`, `/about` and `/contact`
(`proxy.ts` `BUSINESS_SITE_PATHS`). Work leads; the engineering lives on
`/platform`.

- **Real work, not mock-ups.** Demo stores are shown with screenshots of
  the live demo storefronts rendered by the real templates
  (`public/showcase/`, captured by `scripts/capture-showcase.mjs`; re-run
  it after changing a template or the demo content) and link straight into
  them. Links come only from stores marked `isDemo` (ACTIVE,
  non-archived) via `lib/server/platform/showcase.ts`; client stores are
  never listed.
- **One token system.** The site paints itself through the storefront
  semantic roles (`semanticCssVariables()`) with constant "studio" tones
  (`night`, `ink`, `paper` in `lib/platform/showcase.ts`).
- **Services** are data (`lib/platform/services.ts`); `platformNative`
  marks only what the platform ships today.
- **Motion** is CSS (`app/globals.css`, "PLATFORM BUSINESS SITE MOTION")
  plus one small runtime (`components/platform/site/motion/MotionRuntime.tsx`):
  transform/opacity only, pointer effects for fine pointers only, nothing
  hidden without JavaScript or under `prefers-reduced-motion`.
- Template **specimens** (`components/platform/site/specimens/`) are
  static, token-painted miniatures used on `/platform` to explain the
  design system and RTL; they are labelled as specimens.

When adding a template, also add its portfolio copy (`TEMPLATE_EDITORIAL`
and `SHOWCASE_ORDER` in `lib/platform/showcase.ts`), its screenshots
(`SHOWCASE_MEDIA` in `components/platform/site/work/showcase-media.ts`)
and its specimen (`SPECIMENS` / `FONTS` in
`components/platform/site/specimens/TemplateSpecimen.tsx`); the
`Record<TemplateKey, …>` types and `tests/unit/platform-showcase.test.ts`
flag anything missing.
