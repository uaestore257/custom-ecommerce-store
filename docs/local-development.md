# Local development on Windows

This guide does not assume an existing database is empty. Before any
database-writing command, verify the target host, port, and database name and
confirm it is the intended development database.

## Requirements

- Windows PowerShell
- Node.js 22.12.x and npm (CI uses Node.js 22)
- Docker Desktop with Docker Engine running, or a separately managed local
  PostgreSQL 16 instance

The supported Node.js range is declared in `package.json`. Check
`node --version` before installing dependencies. Do not uninstall another
Node.js version just to meet this requirement; use a side-by-side installation
if needed. For a separate Windows installation, download the official Node.js
22 Windows x64 ZIP from [nodejs.org](https://nodejs.org/en/download), extract
it to a new user-local folder, then point only the current PowerShell session
at the extracted folder. Replace the example folder name with the one you
downloaded and extracted:

```powershell
$zip = Join-Path $HOME "Downloads\node-v22.X.Y-win-x64.zip"
$installRoot = Join-Path $env:LOCALAPPDATA "Programs"
Expand-Archive -LiteralPath $zip -DestinationPath $installRoot
$nodeHome = Join-Path $installRoot "node-v22.X.Y-win-x64"
$env:PATH = "$nodeHome;$env:PATH"
node --version
npm --version
```

The ZIP includes npm and this session-only PATH change does not replace another
Node.js install or alter the system PATH.

## New Developer Setup

In PowerShell, choose a destination folder that does not already contain this
checkout:

```powershell
git clone https://github.com/uaestore257/custom-ecommerce-store.git "$HOME\custom-ecommerce-store"
Set-Location "$HOME\custom-ecommerce-store"
node --version
npm --version
npm run setup
```

Confirm `node --version` is `v22.12.0` or newer within major version 22 before
setup. `npm run setup` creates `.env` from `.env.example` only when `.env` is
absent, generates a local `BETTER_AUTH_SECRET` without displaying it, then
runs `npm ci`. Existing `.env` files are preserved, not read or overwritten.
The package manifest and lockfile are the source of truth for dependencies.
To check the Node version and `.env` presence without changing files or
installing packages, use `npm run setup:check`.

## Create the environment file

For manual environment setup, run this from the repository folder.
`-NoClobber` ensures an existing `.env` is not overwritten.

```powershell
Copy-Item -LiteralPath .env.example -Destination .env -NoClobber
```

If `.env` already exists, stop and inspect it privately; do not replace it.
Edit `.env` locally if needed. Set `DATABASE_URL` to the intended development
database. When using this Compose file, set `POSTGRES_PORT` to its chosen host
port and use the same port in `POSTGRES_PORT`, `DATABASE_URL`, and
`TEST_DATABASE_URL`; if you configure local `DIRECT_URL`, point it at the
intended local database too. Keep `.env` private;
`.gitignore` excludes it. `TEST_DATABASE_URL` must refer to a different,
disposable test database and is not needed for normal setup.
`DATABASE_URL` is the app runtime URL. `DIRECT_URL` is optional for local
Prisma CLI commands and, when set, selects their direct connection; if absent,
Prisma falls back to `DATABASE_URL`. Keep local URLs pointed at the intended
local database. Destructive `db:reset` and `test:db` commands are pinned to
their separately guarded `DATABASE_URL` and `TEST_DATABASE_URL` targets.

## Start an isolated PostgreSQL instance with Compose

The Compose project name determines the container and named-volume namespace.
The default name can select existing resources; the default host port can
already be in use. Inspect Docker containers, volumes, and the chosen port
first. Do not run plain `docker compose up -d` if you have not confirmed which
project and volume it will use.

Use a fresh project name and a free host port to create separate resources.
Generate the project name once and record it; reuse it when restarting this
same local database so Compose reconnects to its existing volume. Generate a
different name only when you intentionally want a separate database. This
example binds PostgreSQL only to loopback:

```powershell
$projectName = "custom-ecommerce-local-$([guid]::NewGuid().ToString('N'))"
$env:POSTGRES_PORT = "5436"
docker compose -p $projectName up -d
Write-Output "Record this Compose project name for later use: $projectName"
```

Choose a port not already published by a container or process, and set the
same port in `POSTGRES_PORT`, `DATABASE_URL`, and `TEST_DATABASE_URL` in `.env`.
Run the Compose command from the repository directory so Compose loads `.env`.
Use a fresh project name once, record it, then reuse it whenever restarting
this same database; a different name creates another volume. The first
initialization of a new volume creates `shop_dev` and `shop_test`; the init
SQL does not run again on an initialized volume. Compose uses the local-only
`shop` credentials from `docker-compose.yml`; do not expose this service to a
network.

Do not run `docker compose down -v`: it deletes the Compose project's data
volume. Do not stop, remove, or reconfigure containers or volumes you did not
create for this project.

## Install dependencies and run non-database checks

`npm ci` installs versions from `package-lock.json` and runs Prisma client
generation through `postinstall`. Client generation does not connect to or
modify a database.

```powershell
npm ci
npm run lint
npm run typecheck
npm run test:unit
npm run build
```

Unit tests do not require a database. The production build does not apply
migrations.

## Database changes: verify target and get approval first

`npm run db:migrate` displays the database name, host, and port, and requires
typing `yes`. It applies checked-in migrations only (`prisma migrate deploy`);
it does not reset or create a new migration. Inspect the target and migration
SQL before confirming. If the migration fails due to existing schema/data,
stop and investigate; do not reset the database.

`npm run db:seed` also displays the target and requires typing `yes` before
writing reference and demo records to `DATABASE_URL`. It is optional and
intended for a new local development database; do not run it on a database
whose contents you need to preserve. `npm run db:deploy` uses the same local
target guard and confirmation as `db:migrate`.

`npm run db:reset` and `npm run test:db` are restricted destructive
maintenance commands, not setup steps. They display the exact target and warn
that all data will be dropped. Continuing requires typing `DROP <database>`
exactly. `db:reset` targets `DATABASE_URL`; `test:db` targets
`TEST_DATABASE_URL`, which must be a different local database with a `test`
name segment. Never run either against data you need to keep.

After migrations are complete, start the development server with
`npm run dev`. Sign in as the Platform Owner at
`http://admin.localhost:3000/login`, create each store there, and set that
store's owner name, email, and password in the Create Store form. The bare
`http://localhost:3000` is the UAE Store business website, not a storefront.
Each public store is resolved dynamically at
`http://<store-slug>.localhost:3000/`; its Store Owner signs in at
`http://<store-slug>.localhost:3000/login` and administers it at `/admin`.

To provision the existing local demo stores, first inspect `DATABASE_URL` and
the target using the same safety checks as other writes. This explicitly
sets/reuses the development demo owner credentials and revokes their sessions
when changed; it never resets or seeds the database. It is not for production:

```powershell
npm run db:provision-demo-owners -- --confirm shop_dev
```

Replace `shop_dev` only with the verified local development database name.
This command refuses production, non-local, test, or non-development targets.
Set unique `DEMO_NEST_AND_OAK_OWNER_PASSWORD`, `DEMO_THREADLINE_OWNER_PASSWORD`,
and `DEMO_VOLTBOX_OWNER_PASSWORD` values in your local environment before running
the command. The repository contains no demo passwords; do not reuse these
local credentials outside development.
Demo seeding alone does not create owner credentials. See
[`authentication.md`](./authentication.md) for host and account isolation.
