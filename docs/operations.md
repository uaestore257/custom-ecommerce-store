# Operations: hosting, backups, email and monitoring

A practical operations guide. The current MVP target is Vercel with the
existing Neon Free project in Frankfurt; project deployment, domains, email,
and monitoring still require separate setup and verification.

## Hosting

The app is one Next.js server (`npm run build`, then `npm run start`)
plus one PostgreSQL 16 database. Use Node.js `>=22.12 <23`, as declared
in `package.json`. Any host that runs Node.js 22 and
offers managed PostgreSQL works. Choose one that provides:

* **Custom domains with automatic TLS**, including routing for the bare
  business/Store Admin portal at `PLATFORM_ROOT_DOMAIN`, the exact platform
  admin host, tenant storefronts at `*.<PLATFORM_ROOT_DOMAIN>`, and each
  database-managed custom domain. The central Store Admin portal avoids
  requiring a nested admin hostname for every store.
* **A trusted client-IP header** (set `TRUSTED_IP_HEADER` to it, e.g.
  `x-real-ip`), so rate limits apply per visitor.
* **Managed PostgreSQL with point-in-time recovery** (see Backups), in a
  region agreed with the client (data residency — to be decided per client).

### Environment variables

Required by the production application runtime:

* `DATABASE_URL`
* `BETTER_AUTH_SECRET`
* `BETTER_AUTH_URL`
* `ADMIN_HOST`
* `PLATFORM_ROOT_DOMAIN`

`DATABASE_URL` is the runtime/application connection and may use Neon
pooling. `BETTER_AUTH_URL` is the public HTTPS URL of the platform admin host;
`ADMIN_HOST` is that exact host without a scheme or path. The bare
`PLATFORM_ROOT_DOMAIN` remains the business/portfolio site and also provides
Store Owner/team login and the central Store Admin portal at `/login` and
`/admin`. Storefronts use `<slug>.<PLATFORM_ROOT_DOMAIN>`. The exact
`ADMIN_HOST` remains reserved for Platform Owner administration.

Only an intentional migration/release terminal needs `DIRECT_URL` and
`NODE_ENV=production`. `DIRECT_URL` is the direct PostgreSQL connection used
by Prisma migration commands. Production migrations require it and refuse to
fall back to `DATABASE_URL`; use the same intended database for both URLs if
both are supplied to the release terminal. Keep `DIRECT_URL` server-side only
and never expose it to browser/client code. Local Prisma commands fall back
to `DATABASE_URL` when `DIRECT_URL` is unset. `db:reset` and `test:db` remain
pinned to their guarded `DATABASE_URL`/`TEST_DATABASE_URL` targets.

Other optional or feature-specific variable names:

* `STORE_DOMAINS` — legacy operator-managed host aliases only.
* `TRUSTED_IP_HEADER` — the hosting proxy's trusted client-IP header, so
  rate limits apply per visitor. Detected automatically on Vercel
  (`x-real-ip`); required on any other production host, where admin
  sign-in refuses to start without it rather than putting every visitor in
  one shared rate-limit bucket.
* `EMAIL_PROVIDER`, `EMAIL_FROM`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`,
  `SMTP_PASSWORD`, and `SMTP_SECURE` — required together only when enabling
  SMTP mail (see Email below).
* `TEST_DATABASE_URL` — must not be configured in production.

Keep all values, especially database URLs, authentication secrets, and SMTP
credentials, in the deployment secret manager; never place them in source
control or deployment documentation.

Never set `TEST_DATABASE_URL` in production.

### Vercel + Neon Free (development/MVP)

This is the deployment configuration for development and non-commercial MVP
validation, not a declaration that the platform or its payment integrations
are ready for commercial production. Vercel Hobby is restricted to
non-commercial personal use; any commercial use requires Vercel Pro or
Enterprise under [Vercel's fair-use rules](https://vercel.com/docs/limits/fair-use-guidelines).
Neon Free is suitable for development/MVP evaluation only: check its current
limits and recovery retention, and arrange independent backups before
depending on it for customer production data.

No Vercel-specific repository configuration is required. Configure the
project in Vercel as follows:

* Import this repository with its repository root as the project root and
  select the Next.js framework preset.
* Select Node.js 22.x. The package requires Node.js `>=22.12 <23`; Vercel
  supports selecting Node.js 22.x in project settings.
* Use `npm ci` as the install command and `npm run build` as the build
  command. `npm ci` runs the existing `postinstall` Prisma client generation;
  the build also uses the existing `next build`. Neither command runs
  `prisma migrate deploy` or applies database migrations. Keep production
  migrations in the guarded release workflow below, never in the Vercel
  install or build command.
* Leave the Next.js output directory on automatic detection. Set the Vercel
  function region to Frankfurt (`fra1`) if available for the project, to
  keep application functions close to Neon Frankfurt.

In Vercel, configure each environment independently:

| Vercel environment | Required configuration |
| --- | --- |
| Production | Set `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `ADMIN_HOST`, and `PLATFORM_ROOT_DOMAIN` to production values. Add the SMTP variables only after authenticated SMTP is provisioned. Do not set `DIRECT_URL` or `TEST_DATABASE_URL` on the application runtime. |
| Preview | Use a separate Neon non-production branch/database for `DATABASE_URL` and a distinct `BETTER_AUTH_SECRET`; never reuse production database or authentication secrets. Set `BETTER_AUTH_URL`, `ADMIN_HOST`, and `PLATFORM_ROOT_DOMAIN` to stable preview hosts. Attach the storefront wildcard and confirm nested `admin.<slug>.<root>` routing/TLS before testing store-admin login. Per-deployment `*.vercel.app` URLs are not a substitute for stable hostnames in this host-based app. |
| Development | For `vercel dev`, use only an isolated development database and development auth values (`DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `ADMIN_HOST`, and `PLATFORM_ROOT_DOMAIN`). Ordinary local development may continue to use the private local `.env` and local PostgreSQL setup instead. Never pull production variables into local development. |

`DIRECT_URL` is not needed by the Vercel application or its build: Prisma
client generation does not connect to PostgreSQL. Supply it only to the
separately invoked migration/release terminal. Set `TEST_DATABASE_URL` only
for a disposable non-production test database; never configure it in
Production or point it at customer data. Vercel's built-in `NODE_ENV` is
managed by the platform; explicitly set `NODE_ENV=production` in the
production migration terminal.

The application resolves the platform root, exact platform admin host,
`<slug>.<PLATFORM_ROOT_DOMAIN>` storefronts, and optionally the distinct
`admin.<slug>.<PLATFORM_ROOT_DOMAIN>` compatibility hosts. On the central
portal, a host-only HttpOnly cookie selects a store, but the selection never
grants access: the server rechecks the user's membership and the route's
store ID on every request. It independently checks database-verified
custom-domain ownership. Vercel still needs each public hostname routed to
the project and covered by TLS; attaching a hostname and its DNS/TLS
configuration does not replace the application's custom-domain ownership
verification. The app uses the request `Host` header and
deliberately ignores `X-Forwarded-Host`; confirm the hosting layer preserves
the intended host. On Vercel, the trusted client-IP header (`x-real-ip`) is
used automatically; on any other host set `TRUSTED_IP_HEADER` to the header
the hosting proxy documents as trustworthy (production admin sign-in refuses
to start without one; see `lib/auth/trusted-ip.ts`).

**Infrastructure limitation for shared `*.vercel.app` URLs:** the code
cannot register subdomains or certificates for Vercel's shared `vercel.app`
domain. Vercel must explicitly route the configured platform root and
`ADMIN_HOST`, and the tenant storefront wildcard, to the project. The central
Store Admin flow needs no nested tenant-admin hostname or certificate. The
optional compatibility hostname `admin.<slug>.<PLATFORM_ROOT_DOMAIN>` still
requires separate Vercel/DNS/TLS verification; never infer its support from
a one-label wildcard. Verify each hostname in Vercel before launch.

The Vercel deployment serves the existing API and webhook routes. Provider
webhooks must be configured with their public HTTPS endpoint after a
production-compatible provider integration exists. The current Stripe
checkout is test-only; JazzCash remains fail-closed and Easypaisa has no
implemented merchant verification contract. No live payment credential
variable names are currently implemented: provider credentials belong in a
server-only `PaymentSecretStore` integration, and must not be invented,
placed in `NEXT_PUBLIC_*`, or added to Vercel until that integration and
provider onboarding are complete.

Environment-variable inventory (names only):

* **Vercel runtime:** `DATABASE_URL`, `BETTER_AUTH_SECRET`,
  `BETTER_AUTH_URL`, `ADMIN_HOST`, `PLATFORM_ROOT_DOMAIN`.
* **Production migration/release terminal only:** `DIRECT_URL`,
  `NODE_ENV`; `DATABASE_URL` may also be supplied to confirm both URLs target
  the intended database. `TEST_DATABASE_URL` must be absent.
* **Optional email:** `EMAIL_PROVIDER`, `EMAIL_FROM`, `SMTP_HOST`,
  `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_SECURE`.
* **Client IP:** `TRUSTED_IP_HEADER` — automatic on Vercel; required on any
  other production host (set it only to a header the hosting proxy overwrites).
* **Legacy/optional:** `STORE_DOMAINS` (operator-managed aliases only).
* **Local/non-production only:** `TEST_DATABASE_URL` (disposable database),
  `POSTGRES_PORT`, `DEMO_NEST_AND_OAK_OWNER_PASSWORD`,
  `DEMO_THREADLINE_OWNER_PASSWORD`, `DEMO_VOLTBOX_OWNER_PASSWORD`.
* **Payment:** no production payment credential environment variables are
  implemented; do not create placeholder names or values.

### DNS

* `admin.<root>` and `*.<root>` → the app.
* Point each client domain (and any `www.` hostname) to the app using the
  hosting provider's DNS instructions. A Store Owner or Manager then adds
  and verifies that hostname in `/admin/domains` using its generated DNS TXT
  record. Database-managed domains do not need a `STORE_DOMAINS` entry.
* Keep `STORE_DOMAINS` only for legacy, operator-managed host aliases; these
  aliases are separate from the verified custom-domain workflow.
* Changing a store's slug in the admin changes its subdomain address.

### Deploying

Vercel deploys `main` automatically: merging a pull request into `main`
starts a production deployment of that code. Database migrations are not
part of that deployment; they are applied separately by the authorized
release operator. Application code that needs a new migration therefore must
not reach `main` until the migration is applied to production; otherwise the
new code runs against the old schema and fails (for example "column ... does
not exist"). Write migrations as additive changes (new tables, nullable or
defaulted columns) so the currently deployed code keeps working after the
migration is applied ahead of it; a migration that would break the running
code needs its own planned release.

#### Release order

1. **Prepare and validate the pull request.** Use the Node 22 runtime and run
   `npm ci` (which runs `prisma generate`), `npm exec prisma -- validate`,
   `npm run typecheck`, `npm run lint`, `npm run test:setup`,
   `npm run test:unit`, and `npm run build`. CI runs the same checks.
2. **If the pull request changes `prisma/migrations/`, apply the production
   migration BEFORE merging.** Take and verify a database backup first
   (below), then run `npm run db:deploy:production` from an interactive
   release terminal (see "Production migration terminal" below). This is the
   only supported way to migrate production.
3. **Verify migration status (read-only).** In the same release terminal run
   `npx prisma migrate status`. It reports whether every checked-in
   migration has been applied ("Database schema is up to date!"); it only
   reads status and never applies, changes or resets anything. Then the
   release operator adds the `db-migrated` label to the pull request.
4. **Merge the pull request into `main`.** The "Migration gate" check blocks
   a pull request that changes `prisma/migrations/` until it has the
   `db-migrated` label.
5. **Vercel deploys `main` automatically.** Its install and build
   (`npm ci`, `npm run build`) never apply migrations.
6. **Smoke-test production.** Verify `https://<admin host>/api/auth/ok`, the
   platform website, sign-in and representative storefront routes, and check
   the Vercel function logs for errors.

Rules:

* A pull request that changes `prisma/migrations/` must never be merged
  before its migration has been applied to production.
* `npm run db:deploy:production` is the official production migration
  mechanism. Never run production migrations from the Vercel install or
  build command.
* Never run `prisma db push` or `prisma migrate reset` against production.
* Only the authorized release operator adds the `db-migrated` label, and only
  after `npm run db:deploy:production` succeeded and
  `npx prisma migrate status` reports the database is up to date. The label
  is that person's confirmation; the check cannot verify the database
  itself.
* The gate is enforced only when "Migration gate" is a required status check
  in the `main` branch protection rule, and the `db-migrated` label must
  exist in the repository (Issues → Labels).

`npm run db:deploy:production` has safety guards: it requires an interactive
terminal, `NODE_ENV=production` and `DIRECT_URL`; refuses to run while
`TEST_DATABASE_URL` is set; rejects loopback and dev/test/local/demo
migration targets (also checking `DATABASE_URL` when set); prints the
database name/host/port from `DIRECT_URL` (never credentials); and requires
typing `DEPLOY <database>` before applying checked-in migrations with
`prisma migrate deploy`.

#### Production migration terminal

The migration command and the Prisma CLI load the local `.env` file. A
development `.env` normally contains a localhost `DATABASE_URL` and a
`TEST_DATABASE_URL`, so the guard correctly refuses ("TEST_DATABASE_URL is
configured" or a loopback target), even when `DIRECT_URL` is set in the
terminal. Values set in the terminal take precedence over `.env`, but a
variable cannot be cleared that way: in Windows PowerShell,
`$env:TEST_DATABASE_URL = ""` removes the variable and `.env` then supplies
it again. Move `.env` aside for the release instead of editing it.

Windows PowerShell, from the repository root:

```powershell
Rename-Item .env .env.release-backup
$env:NODE_ENV = "production"
$env:DIRECT_URL = "<production direct (non-pooled) Neon URL from the secret store>"
# Optional: lets the guard also check the runtime URL.
$env:DATABASE_URL = "<production pooled Neon URL>"
npm run db:deploy:production    # type DEPLOY <database> when prompted
npx prisma migrate status       # read-only; must report the schema is up to date
Remove-Item Env:DIRECT_URL, Env:DATABASE_URL, Env:NODE_ENV -ErrorAction SilentlyContinue
Rename-Item .env.release-backup .env
```

macOS/Linux shells follow the same steps (`mv .env .env.release-backup`,
`export NODE_ENV=production DIRECT_URL=...`, then `unset` and move `.env`
back). Close the release terminal afterwards so production credentials do
not remain in its environment, and never write them into `.env`.

#### First-time setup

After the first production deployment:

1. Create the one platform owner: `npm run platform:create-owner`.
2. Sign in on `ADMIN_HOST` and create each store with its Store Owner
   credentials; legacy owner memberships must be provisioned through that
   store's protected Settings page. Do not send passwords by email or place
   them in deployment variables.

`npm run db:deploy` is the guarded local-development migration command.
Production migrations use only the separate, explicitly confirmed
`npm run db:deploy:production` workflow above. Never run `db:reset`,
`db:seed`, `db:migrate` or `test:db` against production. Destructive reset and
test commands require typing `DROP <database>` after the exact target and
data-loss warning are displayed.

### Rollback

Keep the previous known-good application build available for deployment.
If a release fails, first stop or route traffic away from the failing
application, inspect the server logs, and redeploy the previous build only
when it is compatible with the database schema already in place. Prefer a
forward application fix when a migration has already been applied; this
project does not provide automatic down-migrations, and database migrations
must not be reversed by dropping or resetting tables.

For data loss or an incompatible schema change, restore the pre-release
backup into a separate new database, validate it with a staging application,
then point the deployment at that restored database and restart. Keep the
original database intact until recovery has been verified. Coordinate
application and schema rollback with the actual hosting/database provider's
release procedures.

## Backups and restore

Neon Free is for the development/MVP stage, not a production backup or
recovery guarantee. As currently documented by Neon, Free has a six-hour
history window (subject to a 1 GB limit), one manual snapshot, no scheduled
snapshots, and no Instant Restore. These plan limits can change; verify them
in the [current Neon pricing](https://neon.com/pricing) and project console.
Do not describe the Free history window as production-grade PITR or assume
that it meets a required recovery point or recovery time.

Before accepting customer production data, select a database plan and
independent backup arrangement whose documented recovery window meets the
business requirements. Verify provider recovery/restore features and run a
restore drill before launch. Regardless of plan, maintain a daily logical
dump encrypted before it leaves the trusted environment, store it outside
the database provider in a separately protected account, and retain it for
30 days. Use the direct database connection (`DIRECT_URL`) for `pg_dump`;
never put a connection string in the command text or logs. Take and verify
an additional dump or provider snapshot before every production migration.

**Restore drill** (do this once before launch, then every few months):

1. Create a new, isolated database (never restore over the live database).
2. Restore the encrypted dump into that database using the approved
   decryption and restore process; keep connection details out of logs.
3. Point a staging copy of the app at it and check: stores load, an order
   page opens, stock numbers match.
4. Write down how long it took; that is the real recovery time.

To recover production: restore into a new database, check it as above, then
switch the runtime `DATABASE_URL` to the verified database and restart. Keep
the original database intact until recovery is confirmed.

## Email

Order and Store Team invitation emails use the `Mailer` abstraction in
`lib/server/mailer.ts`. The supported transport is SMTP. With no valid SMTP
configuration, `getMailer()` returns null: order emails are skipped and the
Team UI disables invitations without creating invitation records.

For local development, point SMTP at a loopback-only test sink such as
Mailpit (`SMTP_HOST=127.0.0.1`, `SMTP_PORT=1025`, `SMTP_SECURE=false`) and
leave credentials empty. The app refuses unauthenticated SMTP to a
non-loopback host. Production SMTP requires TLS plus a username and password.
Set `EMAIL_PROVIDER=smtp`, `EMAIL_FROM`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`,
`SMTP_PASSWORD`, and `SMTP_SECURE` through the local environment or host
secret manager; never put provider credentials in source control. Add the
provider's SPF/DKIM records for the sending domain. No provider credentials
or mail sink are provisioned by this project.

Invitation emails contain a 72-hour, single-use link. Tokens are stored only
as hashes, are not logged, and are exchanged from the URL fragment for a
short-lived HttpOnly cookie before the browser removes the fragment. See
`docs/authentication.md` for invitation acceptance and role boundaries.

Recipients: the customer, and the store at its contact email (else its
owner's email). Logs name only the order number and email kind.

## Online payment providers

Do not enable online payments in production based only on the presence of
provider settings. Provider onboarding, merchant approval, credentials, and
any required compliance are external prerequisites. Payment secrets must be
provided by a deployment-installed server-side `PaymentSecretStore`
adapter; the application intentionally has no database- or environment-
backed payment secret store.

The current implementation is not a production online-payment integration:
Stripe checkout is restricted to test mode and remains unavailable until a
compatible secret-store adapter and credentials are installed. JazzCash
checkout remains unavailable because its current browser-post flow would
expose the merchant password; do not bypass that guard. Easypaisa has no
implemented merchant API/verification contract. Do not collect or enter
real provider credentials until the relevant server-side integration has
been implemented, reviewed, and verified. Manual payment methods remain
separate.

## Monitoring and logs

Currently: server errors are written to the host's logs with a short
label (`[admin action]`, `[storefront action]`, `[email]`); error pages
show only a reference code (`digest`) that matches the log entry. No
customer details are logged.

Still to choose (needs an account, so not set up here):

* **Error tracking** (a hosted error-monitoring service): alerts on new
  server and browser errors.
* **Uptime checks** on a store page and on `https://<admin host>/api/auth/ok`.
* **Log retention** at the host (e.g. 30 days).

## Housekeeping

* The rate-limit table (`RateLimit`) is never pruned. Once hosting is
  chosen, schedule a daily job that deletes rows older than a day.
* Run `npm audit` before each release. As of this writing it reports
  advisories only in Prisma's own tooling (`mysql2`, `deepmerge-ts`);
  upgrade Prisma when fixed versions ship.
