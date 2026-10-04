> **Historical document.** This handover describes the store-owner access
> work while it was in progress. That work has since been completed and
> merged; trust the code, README.md and docs/*.md over the status tables
> below.

# Handover: store-owner access (Code X Store)

Historical implementation notes follow; current status is summarized below.
Re-check the live repository before acting.

## Current implementation update (2026-09-30)

The earlier incomplete-state notes below are historical. Store Owner
credentials are now created with stores, Store Owners can authenticate on
their own recognized host, and the existing host/store guards restrict
them to their own store. Legacy/demo owners without credentials can be
provisioned through the Platform Owner's Store settings page. Account
changes and the remaining limitations are documented in
`docs/authentication.md`. No schema migration is needed for this flow.

## Team and role update (2026-10-01)

OWNER/MANAGER/STAFF permissions and the secure invitation lifecycle are now
implemented as documented in `docs/authentication.md`. Invitations use the
new additive `StoreInvitation` migration; apply pending migrations through
the guarded local migration command before using Team invitation status.
SMTP delivery remains disabled until configured, and the Team UI reports
that state without creating invitations or exposing tokens.

## Product delivery and Store Owner completion

Product delivery is configured per product as a delivery fee, free delivery,
or pickup-only. Checkout recalculates fees from database product data and
requires pickup when any cart item is pickup-only. Store Owner Settings now
edit payment methods only; profile, ownership, slug and lifecycle controls
remain platform-controlled. The Customers page is read-only and scoped to the
authorized store (Owner and Platform Owner access only). The old
store-level fixed fee / free-delivery threshold and shipping-rate checkout
path are no longer used; existing `ShippingZone` / `ShippingRate` schema
objects are retained for compatibility.

## Payment phase status (2026-10-02)

Bank Transfer, Cash on Delivery, and Pay on Pickup are store-scoped. Hosted
Stripe Checkout and the documented JazzCash sandbox adapter are wired to
store-scoped transactions, with server-side totals, account checks, return
verification, and Stripe signature-verified webhook processing. JazzCash
checkout is explicitly unavailable: its current browser-post flow would
expose the merchant password, so credential-bearing redirects are blocked
until an official credential-safe server-side handoff is supported. Payment
references shown in Store Owner order details are non-secret provider
identifiers only.

Store Payment Settings accept each store's Stripe and JazzCash metadata and
opaque, provider/store-scoped credential reference; they never display or
accept provider secrets. Runtime resolution uses the server-only
`PaymentSecretStore` adapter, installed by deployment infrastructure through
`configurePaymentSecretStore()`. The application intentionally includes no
database-backed or `.env`-backed secret store. Stripe checkout remains
unavailable until that adapter is installed and credentials are provisioned
externally. JazzCash also remains unavailable regardless of credentials until
its checkout handoff can keep the merchant password server-side. JazzCash
returns use the documented return contract; no separate callback/webhook
behavior is assumed. Easypaisa remains unavailable because no official
merchant API and response-verification contract is implemented.

> **Historical handover snapshot.** The branch/worktree table below records
> an earlier implementation state. The current central Store Admin login is
> documented in [authentication.md](../authentication.md): store members sign
> in on the business root and can select only authorized memberships.

## 1. Project overview

Code X Store (repo `uaestore257/custom-ecommerce-store`): a multi-store
ecommerce platform for UAE furniture businesses. Next.js 16 (App Router;
`proxy.ts` replaces middleware), TypeScript, Tailwind, Prisma 7 +
PostgreSQL 16 (Docker on `localhost:5433`: `shop_dev` for development,
`shop_test` for tests), Better Auth 1.7.6.

Read first: `AGENTS.md` (this Next.js differs from older versions — read
`node_modules/next/dist/docs/` before writing code), `README.md`,
`docs/authentication.md`, `docs/database.md`, `docs/operations.md`.

Storefront stores are chosen by hostname (`lib/store-host.ts`):
`<slug>.<PLATFORM_ROOT_DOMAIN>` or a host listed in `STORE_DOMAINS`.
Platform administration remains restricted to `ADMIN_HOST`; Store Owner/team
login and `/admin` are also available through the exact business-root portal.

## 2. Git state (verified read-only at this update)

| Worktree | Branch | HEAD | Notes |
| --- | --- | --- | --- |
| `C:\Users\dell\Desktop\projects\custom-ecommerce-store\.claude\worktrees\inspect-ecommerce-project-a2ecdd` | **`feat/store-owner-access`** | `d3f0e8b` + this handover commit | **Work here.** Pushed with only the handover commit; all code below is **uncommitted** |
| `C:\Users\dell\Desktop\projects\custom-ecommerce-store` (main folder) | `feature/contact-admin-disclosure` | `dfa1579` | **Stale code — do not work here** |
| `…\custom-ecommerce-store.worktrees\project-inspection-report` | `agents/project-inspection-report` | `8f02fd2` | Unrelated |

- `main` = `origin/main` = `d10616c`.
- `feat/admin-inquiry-inbox` = `origin/feat/admin-inquiry-inbox` = `d3f0e8b` (inbox commit).
- One old stash `stash@{0}: On main: save local test-db changes` — not ours; leave it.

**Uncommitted working tree on `feat/store-owner-access`** (all store-owner access work; nothing unrelated):

```
 M app/admin/actions.ts
 M app/admin/layout.tsx
 M app/admin/page.tsx
 M app/admin/stores/[storeId]/categories/page.tsx
 M app/admin/stores/[storeId]/layout.tsx
 M app/admin/stores/[storeId]/messages/page.tsx
 M app/admin/stores/[storeId]/orders/[orderId]/page.tsx
 M app/admin/stores/[storeId]/orders/page.tsx
 M app/admin/stores/[storeId]/page.tsx
 M app/admin/stores/[storeId]/products/[productId]/page.tsx
 M app/admin/stores/[storeId]/products/new/page.tsx
 M app/admin/stores/[storeId]/products/page.tsx
 M components/admin/AdminShell.tsx
 M components/admin/StoreContext.tsx
 M lib/admin/validation.ts
 M lib/server/admin/inquiries.ts
 M lib/server/admin/orders.ts
 M lib/server/admin/permissions.ts
 M lib/server/admin/request.ts
 M lib/server/auth/auth.ts
 M lib/server/auth/guards.ts
 M lib/server/auth/page-guards.ts
 D lib/server/auth/policy.ts
 M tests/unit/auth.test.ts
?? lib/admin/store-access.ts          (pure rules; checksum unchanged since created)
?? lib/server/auth/store-access.ts
?? tests/unit/store-access.test.ts    (checksum unchanged since created)
?? .claude/                           (never stage or touch)
```

24 tracked files changed (+402 / −148) plus 3 new files.
**Dev servers:** neither is running (the port 3100 server exited by itself;
port 3000 — stale main folder — doesn't respond). Don't restart the old one.
To browser-test later, start this worktree's server with temporary
`ADMIN_HOST=admin.localhost:3100` and `BETTER_AUTH_URL=http://admin.localhost:3100`
(never by editing `.env`); stores are `http://<slug>.localhost:3100`.

## 3. Completed: admin inbox (committed and pushed)

Commit `d3f0e8b` on `feat/admin-inquiry-inbox` (no PR yet): per-store
Messages page, New/Read/Archived rules (`lib/admin/inquiry-rules.ts`),
store-scoped server module `lib/server/admin/inquiries.ts` (conditional
updates; audit `inquiry.status_change` with status values only),
`setInquiryStatusAction`, tests `tests/unit/inquiry-rules.test.ts` and
`tests/db/admin-inquiries.test.ts`. Results before that commit: unit
97/97, `tsc` and lint passed, `npm run test:db` **188/188** (reset and
seeded `shop_test` only). In `shop_dev` the QA message was marked Read by
the user — keep it.

## 4. Store-owner access: implemented vs. incomplete

Nothing here is "complete and verified" except the pure rules module; the
rest was written but has had only a type-check since.

| Area | Status | Where / notes |
| --- | --- | --- |
| Pure access rules | **Complete and verified** (9/9 unit tests, before later edits) | `lib/admin/store-access.ts`: `adminHostOf`, `decideStoreAccess`, `mayOpenSession`, `mayRunAction` |
| Host → store facts (DB) | Implemented, not verified | `lib/server/auth/store-access.ts`: `hostContext` (store by slug, archived or not), `storeFacts`, `isStoreOwner` (OWNER only), `sessionAllowed` |
| Better Auth trusted origins | Implemented, not verified | `lib/server/auth/auth.ts`: `trustedOrigins` function adds the request's own origin only for a store host (exact, no wildcard); `baseURL` stays the static admin URL |
| Session authorization | Implemented, not verified | `auth.ts` session `create.before` → `sessionAllowed(db, userId, host)`; old `lib/server/auth/policy.ts` deleted |
| Platform-owner host restriction | Implemented, not verified | `lib/server/auth/guards.ts` `requirePlatformOwner()` requires `ADMIN_HOST` |
| Shared store guard | Implemented, not verified | `guards.ts` `requireStoreAccess(storeId, "read" \| "write")` → `AccessDenied("unauthenticated" \| "forbidden" \| "read-only")`; `requireAdminViewer()`; `StoreActor` |
| Page guards | Implemented | Store pages use `requireStorePage(storeId, section)`; Customers is restricted to the Owner and Platform Owner. |
| Admin layout / navigation / dashboard | Implemented, not verified | `app/admin/layout.tsx` (owner sees only own store), `app/admin/page.tsx` (owner redirected to own store), `components/admin/AdminShell.tsx` (`platform` prop hides agency nav and "Create New Store") |
| Server actions | **Implemented, not verified** | `app/admin/actions.ts`: `guarded()` + `asPlatformOwner` (6 platform-only: create/update store, owner, status, archive, restore) + `asStoreWriter(label, storeId, …)` = `requireStoreAccess(storeId, "write")` (11: products ×3, categories ×4, orders ×3, messages ×1). New `READ_ONLY` message for suspended stores. |
| Action permissions | Implemented, not verified | `lib/server/admin/permissions.ts`: `"platform-owner" \| "store-owner"`; the 11 store actions are `"store-owner"` |
| Orders / messages actor | Implemented, not verified | `lib/server/admin/orders.ts`, `lib/server/admin/inquiries.ts` take `actor: StoreActor` (audit `actorUserId` is the owner or platform owner) |
| Product delivery | Implemented | Product-level fee/free-delivery/pickup-only fields, server validation, store-scoped product actions, storefront display and server-recalculated checkout totals. |
| Delivery / payment settings | Implemented | Store Owner can change payment methods only. Platform-controlled store profile fields stay platform-only; legacy store-level delivery rates are not used by checkout or seed code. |
| Customers page | Implemented | Read-only database-backed list uses a bounded exact-store query and is available to Owners and Platform Owners; MANAGER/STAFF are denied. |
| Proxy rules | **Not started** | `proxy.ts:56` still 404s the admin off `ADMIN_HOST` and refuses admin Server Actions there. **Store owners cannot sign in yet.** |
| Login page | Not started | `app/login/page.tsx` only redirects platform owners; copy says "platform administrator only" |
| Store creation with client email + password | Not started | `createAdminStore` / `setOwner` (`stores.ts:157`) create owners without a login. Hash like `lib/server/auth/platform-owner.ts` (Better Auth scrypt, "credential" account); validate with `passwordProblem` (`lib/auth/password-policy.ts`); masked field in `components/admin/NewStoreView.tsx` |
| Existing-email reuse | Not started | reuse the account, never change its password; clear error if platform owner or disabled |
| Initial password for owners without login | Not started | platform-owner-only action + UI (e.g. `components/admin/StorePlatformControls.tsx`); only if no credential account exists |
| Suspended read-only | Partially implemented | UI: `components/admin/StoreContext.tsx` notice + `<fieldset disabled>`. Server: enforced for the 11 switched actions via `requireStoreAccess(…, "write")`; still to cover the future commerce/settings action. |
| Archived-store denial | Implemented, not verified | `decideStoreAccess`; `getAdminStore` returns null for archived |
| Audit | Existing conventions | still to add: commerce-settings change, owner initial password set (never log passwords) |

## 5. Confirmed product decisions (do not re-ask)

1. Each store's own domain is where its owner signs in to the admin.
2. Platform-owner login stays on `ADMIN_HOST` only.
3. Platform owner creates a store and enters the client's email + initial password.
4. Existing email → assign the new store to that account; never change its password; clear error if not eligible.
5. Existing owners without login → platform-owner-only initial-password setup.
6. Owners manage only their own products & categories, orders, messages,
   payment-method settings and read-only customers. Delivery is configured
   per product, not at store level.
7. Draft and paused → full owner access. 8. Suspended → read-only. 9. Archived → no owner access.
10. Store creation, archive/restore, ownership, status, store slug and platform-wide settings → platform owner only. Custom hostnames are managed by that store's OWNER or MANAGER after DNS ownership verification.
11. Store invitations are single-use, expiring and store-scoped; SMTP delivery
    remains disabled until configured. No card-payment integration.
12. No cross-store access via URL, request data, store id or domain. MANAGER gets operational access; STAFF is read-only for orders/messages.

## 6. Tests and checks

Latest safe checks on the primary checkout:
- `npm run typecheck` ✅
- `npm run lint` ✅ (3 existing unused-symbol warnings)
- `npm run test:unit` ✅ (159 passed)
- `npx prisma validate` ✅
- `npx prisma migrate status` ✅ (all 7 migrations applied)
- `git diff --check` ✅

Database integration tests were not run because `npm run test:db` resets and
seeds its test database. The primary local development database reports all
seven migrations applied, including Product delivery and StoreDomain.

## 7. Database safety (mandatory)

- The one approved `npm run test:db` run has been **used**. Any further run needs the user's **fresh, explicit approval**.
- `npm run test:db` = `tsx scripts/test-db.ts`: `prisma migrate reset --force` + `prisma db seed` on `TEST_DATABASE_URL`, then all `tests/db/*.test.ts`. Guards: `scripts/test-db.ts:18`, `tests/db/helpers.ts:8`.
- Preflight before asking (report names only, never credentials/full URLs): `TEST_DATABASE_URL` → `localhost:5435/shop_test`; `DATABASE_URL` → `localhost:5435/shop_dev`; distinct; no `DATABASE_URL`/`TEST_DATABASE_URL`/`DOTENV_CONFIG_PATH` in the shell; only `.env` and `.env.example` exist.
- Prisma refuses AI-driven resets unless `PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION` is set to the user's exact approval message.
- Never reset, seed, drop or clean `shop_dev`. The Product delivery and
  StoreDomain migrations have been applied to the primary local development
  database using the approved deploy process; this does not imply they are
  applied to any other environment.

The additive StoreDomain migration has been applied to the primary local
development database, and Prisma reports the schema up to date. Other
environments still need to apply it through the repository's approved
migration process; never reset or seed a database as part of this feature.

## 8. Current follow-up

1. Run the safe checks for pending code changes: TypeScript, lint, unit tests,
   Prisma validation and `git diff --check`.
2. The additive Product delivery and StoreDomain migrations are applied in
   the primary local development database. Apply pending migrations in other
   environments only through the repository's guarded process and with
   explicit approval; never reset, seed or drop a database as part of this
   feature.
3. Keep authorization coverage for store-host access, role-specific sections,
   suspended-store read-only behavior, invitations and cross-store denial.
   Database integration tests require fresh approval before any run that resets
   `TEST_DATABASE_URL`.
4. Do not commit, push, merge, open a PR or deploy without explicit approval.

The old continuation prompt below is retained as history only; its paths and
instructions are not current and must not be followed.

---

### Prompt for the next session

```
Continue the Code X Store project (repo uaestore257/custom-ecommerce-store).

Work ONLY in the worktree
C:\Users\dell\Desktop\projects\custom-ecommerce-store\.claude\worktrees\inspect-ecommerce-project-a2ecdd
on branch feat/store-owner-access. The main project folder is on an old branch — do not use it.

1. Read docs/handover/store-owner-access-handover.md first, then AGENTS.md
   (and the relevant guide in node_modules/next/dist/docs/ before writing code).
2. Re-check git state (branch, HEAD, status, full diff) before editing; treat the
   handover as a snapshot and continue from the actual state.
3. Preserve everything: inbox commit d3f0e8b (pushed on feat/admin-inquiry-inbox) and
   all uncommitted store-owner work, incl. lib/admin/store-access.ts and
   tests/unit/store-access.test.ts. Never reset, discard, stash, clean or remove
   worktrees. Never touch .claude/. Never stage .env or secrets. Never print
   credentials or full DB URLs.
4. Run safe checks: npx tsc --noEmit --incremental false, npm run lint,
   npm run test:unit (avoid npm run typecheck — it writes generated files).
5. Follow handover §8 IN ORDER: (1) finish server-side authorization — owner-safe
   Settings (delivery/payments only; slug/status/owner stay platform-only) and a
   read-only store-scoped Customers page on requireStorePage(storeId), plus
   updateStoreCommerceAction on requireStoreAccess(storeId,"write");
   (2) authorization tests; (3) only then open proxy.ts for store hosts and update
   the login page; (4) account flows: client email + masked initial password on store
   creation, existing-email reuse without changing passwords, platform-owner-only
   initial-password setup for owners without login. Suspended = read-only on every
   mutation; archived = no owner access. Confirmed decisions are in handover §5.
6. Add/update unit and DB tests (handover §6). Don't weaken tests.
7. Database gate: NO npm run test:db, migrations, seeds or resets without my fresh
   explicit approval; do the §7 preflight and report it first. Never touch shop_dev.
8. Review the full diff; commit the access work separately; push feat/store-owner-access
   only after checks and approved DB tests pass. Never merge to main, open a PR or
   deploy without explicit approval.
9. If a security decision is missing or something can't be done safely, stop and
   report the exact decision needed.
```
