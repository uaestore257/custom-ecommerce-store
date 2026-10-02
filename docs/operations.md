# Operations: hosting, backups, email and monitoring

A practical plan. Nothing here has been set up yet: no host, database,
email provider or monitoring service has been chosen or created.

## Hosting

The app is one Next.js server (`npm run build`, then `npm run start`)
plus one PostgreSQL 16 database. Use Node.js `>=22.12 <23`, as declared
in `package.json`. Any host that runs Node.js 22 and
offers managed PostgreSQL works. Choose one that provides:

* **Custom domains with automatic TLS**, including a wildcard certificate
  for `*.<PLATFORM_ROOT_DOMAIN>` (every store's subdomain) and each
  database-managed custom domain.
* **A trusted client-IP header** (set `TRUSTED_IP_HEADER` to it, e.g.
  `x-real-ip`), so rate limits apply per visitor.
* **Managed PostgreSQL with point-in-time recovery** (see Backups), in a
  region agreed with the client (data residency — to be decided per client).

### Environment (production)

Provide these required runtime variable names through the deployment
environment/secret manager:

* `DATABASE_URL`
* `BETTER_AUTH_SECRET`
* `BETTER_AUTH_URL`
* `ADMIN_HOST`
* `PLATFORM_ROOT_DOMAIN`
* `NODE_ENV`

Optional or feature-specific names:

* `STORE_DOMAINS` — legacy operator-managed host aliases only.
* `TRUSTED_IP_HEADER` — set to the hosting proxy's trusted client-IP header
  to apply public rate limits per visitor.
* `EMAIL_PROVIDER`, `EMAIL_FROM`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`,
  `SMTP_PASSWORD`, and `SMTP_SECURE` — required together only when enabling
  SMTP mail (see Email below).
* `TEST_DATABASE_URL` — must not be configured in production.

Keep all values, especially database URLs, authentication secrets, and SMTP
credentials, in the deployment secret manager; never place them in source
control or deployment documentation.

Never set `TEST_DATABASE_URL` in production.

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

1. Use the Node 22 runtime and run `npm ci` (which runs `prisma generate`),
   `npm exec prisma -- validate`, `npm run typecheck`, `npm run lint`,
   `npm run test:setup`, `npm run test:unit`, and `npm run build`.
2. Take and verify a database backup before migration (below). From an
   intentional interactive release terminal, set
   `NODE_ENV=production`, provide the production `DATABASE_URL` from the
   deployment secret store, ensure `TEST_DATABASE_URL` is not set, then run
   `npm run db:deploy:production`. The command rejects loopback and
   dev/test/local/demo database targets, prints the database name/host/port
   (never credentials), and requires typing `DEPLOY <database>` before
   applying checked-in migrations.
3. Deploy the built application and start it with `npm run start`. Verify
   `https://<admin host>/api/auth/ok` and representative storefront routes
   before directing production traffic.
4. Create the one platform owner: `npm run platform:create-owner`.
5. Sign in on `ADMIN_HOST` and create each store with its Store Owner
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

* **Continuous:** enable the provider's point-in-time recovery (at least 7
  days; longer if the client requires it).
* **Daily logical dump,** kept off the database provider (another account
  or storage), for 30 days:
  `pg_dump --format=custom --no-owner "$DATABASE_URL" > shop-YYYY-MM-DD.dump`
* **Before every migration:** a manual snapshot or dump.

**Restore drill** (do this once before launch, then every few months):

1. Create a new, empty database (never the live one).
2. `pg_restore --no-owner --dbname "<new database url>" shop-YYYY-MM-DD.dump`
3. Point a staging copy of the app at it and check: stores load, an order
   page opens, stock numbers match.
4. Write down how long it took; that is the real recovery time.

To recover production: restore into a new database, check it as above,
then switch `DATABASE_URL` to it and restart.

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
