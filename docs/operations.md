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
2. Migrate: `npm run db:deploy` (`prisma migrate deploy`: applies pending
   migrations only, never drops data). Take a backup first (below).
3. Start: `npm run start`.
4. Create the one platform owner: `npm run platform:create-owner`.

Never run `db:reset`, `db:seed`, `db:migrate` or `test:db` against
production. `db:reset` and `db:seed` refuse production themselves
(`prisma/seed-guard.ts`), and `test:db` only accepts a database named `*test*`.

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

Order emails are built and scheduled after each new order
(`lib/server/order-emails.ts`, sent after the response so they can never
undo an order), but **nothing is sent until a provider is connected**:
`getMailer()` in `lib/server/mailer.ts` returns null. To connect one:

* Choose a provider (a transactional email API, or SMTP from an existing
  mail service). This is a business/cost decision.
* Implement `Mailer` for it in `lib/server/mailer.ts`.
* Configure `EMAIL_PROVIDER`, `EMAIL_FROM` (an address on a domain you
  control) and the provider's credentials in the host's secret store.
* Add the provider's SPF/DKIM DNS records for the sending domain.

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
