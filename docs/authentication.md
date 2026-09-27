# Admin authentication (Phase 2a)

The admin (`/admin`) now requires signing in. In this phase **only the
platform owner** can sign in. Store owners, invitations and store-level
permissions come in Phase 2b; store domains in Phase 2c.

Sign-in uses [Better Auth](https://github.com/better-auth/better-auth)
1.7.6 (pinned) with its Prisma adapter. Better Auth proves *who* is signed
in; *what* they may do is decided by our own checks, which re-read the
user from the database on every request.

## Setting it up (Windows PowerShell)

1. Add the auth settings to your `.env` (see `.env.example`). Generate the
   secret yourself and never share or commit it:

   ```powershell
   node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
   ```

   Paste the output into `BETTER_AUTH_SECRET="..."`. For local development
   keep `BETTER_AUTH_URL="http://admin.localhost:3000"` and
   `ADMIN_HOST="admin.localhost:3000"`.

2. Apply the new migration to your development database (it only adds
   tables and columns; see "Database changes" below):

   ```powershell
   npm install
   npm run db:migrate
   ```

3. Create your platform owner account. The command shows which database it
   will change and asks you to type `yes`. The password is typed without
   being shown:

   ```powershell
   npm run platform:create-owner
   ```

4. Start the app and sign in at <http://admin.localhost:3000/login>
   (Chrome, Edge and Firefox open `*.localhost` addresses on your own
   computer, no hosts-file change needed):

   ```powershell
   npm run dev
   ```

   The storefront still works at <http://localhost:3000>. The admin is only
   served on `admin.localhost:3000`; on any other address `/admin` is a 404.

Forgot the password? Run `npm run platform:reset-password`. It sets a new
password and signs the platform owner out everywhere.

Both commands must be run in an interactive terminal. They never accept a
password as an argument or environment variable, and never print it.

## What is protected, and how

| Layer | What it does |
| --- | --- |
| `proxy.ts` | `/admin`, `/login` and `/api/auth` are served only on `ADMIN_HOST`; everywhere else 404. Server Action requests are refused on other hosts. Signed-out visitors to `/admin` are redirected to `/login` (cookie presence only — not the real check). If `ADMIN_HOST` is unset, the admin is unavailable everywhere. |
| Every admin page and layout | Calls `requireAdminPage()`: validates the session and re-reads the user. Signed out → `/login`; anyone else → 404. A test fails if a page forgets it. |
| Every Server Action | Calls `requirePlatformOwner()` before doing anything. `lib/server/admin/permissions.ts` lists the rule for each action; a test calls every exported action signed out, as a non-owner and as the owner, and fails if an action has no rule. |
| Data layer | Platform-only functions (create/settings/owner/status/archive/restore) require the `PlatformOwner` value that only the guard creates, and write an audit event in the same transaction. |
| `/api/auth` | Only sign-in, sign-out and get-session are served (allow-list); sign-up, password-reset e-mails, profile updates, social login and all other Better Auth endpoints return 404. |
| Database | At most one platform owner (partial unique index). Audit events can't be edited or deleted (trigger). |

**Sessions** are stored in the database (revocable), last 8 hours and are
refreshed hourly while used. The cookie is `httpOnly`, `SameSite=Lax`,
`Secure` in production (with the `__Secure-` prefix) and **host-only**: it
is never shared with other subdomains of the root domain, so store
subdomains and customer domains never receive it.

**Rate limiting**: 5 sign-in attempts per minute, stored in the database.
Until `TRUSTED_IP_HEADER` is set for your hosting provider, all sign-in
attempts share one counter (no client-supplied header such as
`X-Forwarded-For` is trusted). This can't be bypassed, but an attacker
could slow down your own sign-in; set the header once hosting is chosen.

**Accounts**: the platform owner is created only by the CLI. No page,
Server Action or API can create a platform owner or set `isPlatformOwner`
(Better Auth doesn't know the column). Seed data never creates a login.
Passwords must be 12–128 characters, not common, and not contain the email
name; Better Auth stores them as scrypt hashes.

**Audit log** (`AuditEvent`): sign-in, failed sign-in (no email or password
stored), sign-out, platform-owner creation and password reset, store
create, settings change, status change (with from/to), owner change,
archive and restore.

## Store settings changes

Saving store settings no longer changes the store's **status** or
**owner**. Those now have their own actions on the store's settings page:
**Store owner** (assigning an existing user no longer renames them) and
**Suspension** (suspend / reactivate — nothing is deleted).

## Database changes (migration `auth_platform_owner`)

Additive only — no tables, columns or demo data are removed:

* `User`: new `emailVerified`, `image`, `disabledAt` columns.
* New tables: `Session`, `Account`, `Verification`, `RateLimit` (Better
  Auth), `AuditEvent`.
* A unique index allowing at most one platform owner, and an append-only
  trigger on `AuditEvent`.
* One data change: the demo agency user from the seed is no longer marked
  as platform owner (it never had a password, so nobody loses access).

## Not done yet

* Store owners can't sign in yet (Phase 2b: invitations, multiple owners,
  store-level permissions, read-only suspended stores).
* No two-factor login or re-authentication for sensitive actions (Phase 2d).
* Domain routing and store subdomains (Phase 2c).
* Password reset is CLI-only; there is no email provider.
