# Operations: hosting, backups, email and monitoring

A practical plan. Nothing here has been set up yet: no host, database,
email provider or monitoring service has been chosen or created.

## Hosting

The app is one Next.js server (`npm run build`, then `npm run start`)
plus one PostgreSQL 16 database. Any host that runs Node.js 22 and
offers managed PostgreSQL works. Choose one that provides:

* **Custom domains with automatic TLS**, including a wildcard certificate
  for `*.<PLATFORM_ROOT_DOMAIN>` (every store's subdomain) and each client's
  own domain listed in `STORE_DOMAINS`.
* **A trusted client-IP header** (set `TRUSTED_IP_HEADER` to it, e.g.
  `x-real-ip`), so rate limits apply per visitor.
* **Managed PostgreSQL with point-in-time recovery** (see Backups), in a
  region agreed with the client (data residency — to be decided per client).

### Environment (production)

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | The production database (never a `*dev*`/`*test*` name) |
| `BETTER_AUTH_SECRET` | 32+ random bytes, generated once, kept in the host's secret store |
| `BETTER_AUTH_URL` | `https://<admin host>` |
| `ADMIN_HOST` | The admin's host, e.g. `admin.<root domain>` |
| `PLATFORM_ROOT_DOMAIN` | The root domain stores are subdomains of |
| `STORE_DOMAINS` | Optional client domains: `host=store-slug,...` |
| `TRUSTED_IP_HEADER` | The host's client-IP header |
| `NODE_ENV` | `production` |
| Email variables | See Email below |

Never set `TEST_DATABASE_URL` in production.

### DNS

* `admin.<root>` and `*.<root>` → the app.
* Each client domain (and its `www.`) → the app, plus an entry in
  `STORE_DOMAINS` mapping it to the store's slug.
* Changing a store's slug in the admin changes its subdomain address.

### Deploying

1. Build: `npm ci` (runs `prisma generate`) and `npm run build`.
2. Migrate: from an intentional interactive release terminal, set
   `NODE_ENV=production`, provide the production `DATABASE_URL` from the
   deployment secret store, ensure `TEST_DATABASE_URL` is not set, then run
   `npm run db:deploy:production`. The command rejects loopback and
   dev/test/local/demo database targets, prints the database name/host/port
   (never credentials), and requires typing `DEPLOY <database>` before
   applying checked-in migrations. Take a backup first (below).
3. Start: `npm run start`.
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
