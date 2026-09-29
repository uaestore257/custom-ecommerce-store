# Handover: store-owner access (Code X Store)

Last updated 2026-09-29, when work stopped mid-implementation.
**This is a snapshot — re-check the live repository before acting.**

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
Today the admin (`/admin`, `/login`, `/api/auth`) is served **only** on
`ADMIN_HOST` (`proxy.ts`).

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
| Page guards | Partially implemented | `lib/server/auth/page-guards.ts`, `lib/server/admin/request.ts` (`requireAdminPage`, `requireStorePage`, `requireAdminViewer`). 8 store pages + store layout switched. **Not yet:** `app/admin/stores/[storeId]/settings/page.tsx`, `app/admin/stores/[storeId]/customers/page.tsx` (still `requireAdminPage()`, i.e. platform-only — safe but wrong) |
| Admin layout / navigation / dashboard | Implemented, not verified | `app/admin/layout.tsx` (owner sees only own store), `app/admin/page.tsx` (owner redirected to own store), `components/admin/AdminShell.tsx` (`platform` prop hides agency nav and "Create New Store") |
| Server actions | **Implemented, not verified** | `app/admin/actions.ts`: `guarded()` + `asPlatformOwner` (6 platform-only: create/update store, owner, status, archive, restore) + `asStoreWriter(label, storeId, …)` = `requireStoreAccess(storeId, "write")` (11: products ×3, categories ×4, orders ×3, messages ×1). New `READ_ONLY` message for suspended stores. |
| Action permissions | Implemented, not verified | `lib/server/admin/permissions.ts`: `"platform-owner" \| "store-owner"`; the 11 store actions are `"store-owner"` |
| Orders / messages actor | Implemented, not verified | `lib/server/admin/orders.ts`, `lib/server/admin/inquiries.ts` take `actor: StoreActor` (audit `actorUserId` is the owner or platform owner) |
| Delivery / payment settings | **Partially implemented** | `lib/admin/validation.ts`: new `validateCommerceSettings()` + `CleanCommerceSettings` (reused by `validateStoreSettings`). **Missing:** the save function (plan: extract the zone/rate/payment block of `updateAdminStore` in `lib/server/admin/stores.ts:322–343` into `writeCommerceSettings`, add `updateStoreCommerceSettings(actor: StoreActor, …)` with audit), an `updateStoreCommerceAction` (`"store-owner"`), and an owner-only settings UI. Owners must never get slug/status/owner/profile fields; `online_card` stays off. |
| Customers page | Not started | still browser demo data (`DemoStoreData`); build a read-only, store-scoped list from `Customer` (unique per store+email) |
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
6. Owners manage only their own products & categories, orders, messages, shipping/delivery settings, payment-method settings, customers.
7. Draft and paused → full owner access. 8. Suspended → read-only. 9. Archived → no owner access.
10. Store creation, archive/restore, ownership, status, slug/domain, platform-wide settings → platform owner only.
11. No email invitations; no card-payment integration.
12. No cross-store access via URL, request data, store id or domain. MANAGER/STAFF get nothing.

## 6. Tests and checks

**Run in the store-owner phase (this and the previous session):**
- Start of this session: `npx tsc --noEmit --incremental false` ✅, `npm run lint` ✅, `npm run test:unit` 96/97 (only the old page-guard test failed, as expected).
- `tests/unit/auth.test.ts` page-guard test rewritten to be **stricter** (layout/dashboard → `requireAdminViewer()`, store pages → `requireStorePage(storeId)`, platform pages → `requireAdminPage()`). It now fails **only** on `app/admin/stores/[storeId]/customers/page.tsx` (and will on `settings/page.tsx`) — the two unfinished pages. This failure is the to-do list, not a bug in the test.
- After switching the actions and adding `validateCommerceSettings`: `npx tsc --noEmit --incremental false` ✅.
- **Not re-run after those edits:** `npm run lint`, full `npm run test:unit`, any DB test.

**Known to need updating before DB tests can pass:**
- `tests/db/auth-helpers.ts`: `actAs()` sends only `host: ADMIN_HOST`; add a host parameter, and set `process.env.PLATFORM_ROOT_DOMAIN` in `setTestAuthEnv()` (e.g. `"test.local"`, stores at `<slug>.test.local`).
- `tests/db/auth-actions.test.ts`: add store-owner cases (below). Existing expectations should still hold (non-platform-owner on `ADMIN_HOST` is refused for every action) — verify.

**Must add:** proxy tests (store host allowed for `/login`, `/api/auth`, `/admin` + admin Server Actions; look-alike/unknown hosts refused); DB tests: owner on own host OK; other store / other host / mismatched storeId / no membership / MANAGER refused; platform-only actions refused for owners; draft & paused writable; suspended → every mutation `READ_ONLY`; archived denied; store list shows only own store; real sign-in on a store host (session hook + trusted origin); account creation (new OWNER, not platform owner; existing email reused, password unchanged; no duplicate membership; password absent from audit/logs); customers scoped by store.

**Safe checks to use:** `npx tsc --noEmit --incremental false` (not `npm run typecheck`, which runs `next typegen` and writes generated files), `npm run lint`, `npm run test:unit`.

## 7. Database safety (mandatory)

- The one approved `npm run test:db` run has been **used**. Any further run needs the user's **fresh, explicit approval**.
- `npm run test:db` = `tsx scripts/test-db.ts`: `prisma migrate reset --force` + `prisma db seed` on `TEST_DATABASE_URL`, then all `tests/db/*.test.ts`. Guards: `scripts/test-db.ts:18`, `tests/db/helpers.ts:8`.
- Preflight before asking (report names only, never credentials/full URLs): `TEST_DATABASE_URL` → `localhost:5433/shop_test`; `DATABASE_URL` → `localhost:5433/shop_dev`; distinct; no `DATABASE_URL`/`TEST_DATABASE_URL`/`DOTENV_CONFIG_PATH` in the shell; only `.env` and `.env.example` exist.
- Prisma refuses AI-driven resets unless `PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION` is set to the user's exact approval message.
- Never run migrations, seeds, resets or cleanup on `shop_dev`. **No migration is needed** (StoreMembership, User, Better Auth tables and store statuses already exist).

## 8. Security-sensitive next steps — required order

The current partial state **fails closed**: the proxy still blocks the admin off `ADMIN_HOST`, so no store owner can sign in; on `ADMIN_HOST` only the platform owner gets access. Keep it that way until steps 1–3 are done.

1. **Finish server-side authorization first:** switch the Customers and store Settings pages to `requireStorePage(storeId)` *together with* their owner-safe content (owner settings = delivery/payments only; customers read-only). Add the commerce save + `updateStoreCommerceAction` (`"store-owner"`, `requireStoreAccess(storeId, "write")`). Confirm every page under `app/admin/stores/[storeId]/` and every action is guarded (the unit test + a grep for `requirePlatformOwner`/`asPlatformOwner` uses).
2. **Tests for authorization** (unit + DB, §6) — including suspended read-only on every mutation.
3. **Only then open the proxy** for store hosts (`/login`, `/api/auth`, `/admin`, admin Server Actions) using `adminHostOf(...).kind === "store"`; store-host login redirect to the same host; update the login page. Add proxy tests.
4. Account flows: store creation with email + password, existing-email reuse, initial-password setup for owners without login. Never log/audit passwords.
5. DB-test preflight → ask approval → run once → fix → review full diff → commit (access work only) → push `feat/store-owner-access`. No merge/PR/deploy without explicit approval.

## 9. Known gaps and risks

- Opening the proxy before step 1 would expose store hosts to pages/actions that aren't owner-scoped yet.
- `baseURL` is static (admin URL); store-host sign-in relies on the `trustedOrigins` function and host-only cookies — prove it with a real sign-in DB test. Better Auth's `baseURL.allowedHosts` exists if needed (avoid wildcards).
- `setStoreOwnerAction` creates owners without login → needs the initial-password flow.
- `validateStoreProfile` includes `slug` (= the store's address); owners must never reach it.
- Owners of several stores sign in separately per store domain (host-only cookies) — expected.
- Cosmetic, out of scope: admin "Dubai, Dubai, AE"; footer "Demo storefront…" wording.

## 10. Exact recommended continuation task

In the worktree above, on `feat/store-owner-access`: run the safe checks
(§6), then do **§8 step 1** — owner-safe store Settings (delivery &
payments only: `writeCommerceSettings` + `updateStoreCommerceSettings` +
`updateStoreCommerceAction` + owner form) and a read-only, store-scoped
Customers page, both on `requireStorePage(storeId)` — until
`tests/unit/auth.test.ts` passes. Then §8 step 2.

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
