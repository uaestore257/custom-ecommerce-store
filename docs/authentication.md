# Platform Owner and Store Owner authentication

The admin uses Better Auth 1.7.6 with its Prisma adapter. The Platform
Owner is the platform-level administrator; each store has a separate
`OWNER` membership and credential account. Public sign-up is disabled.

## Platform Owner setup

Configure `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, and `ADMIN_HOST` in
`.env` as described in `.env.example`. Locally, the platform admin host is
`admin.localhost:3000`.

Create or reset the Platform Owner account with the interactive CLI:

```powershell
npm run platform:create-owner
npm run platform:reset-password
```

The CLI identifies the database and asks for confirmation. Passwords are
entered without echo, passed to Better Auth's password hasher, and never
stored or displayed in plaintext.

## Creating and provisioning a Store Owner

On `http://admin.localhost:3000`, the Platform Owner creates a store with
its name, slug, owner name, owner email, and owner password. The Store
Owner section requires a matching password confirmation. The server
validates the password and atomically creates the store, Better Auth
credential account, and `StoreMembership` with role `OWNER`. It rejects
an email already used by another account. No password is returned to the
browser after submission or written to audit metadata.

Older/demo stores may have an owner membership but no credential account.
The Platform Owner can provision one from the store's Settings page using
the **Store owner** card: keep the existing owner email and enter a new
password. The same card can update the owner name/email or set a new
password. Passwords are never displayed; changing or resetting a
Store Owner password revokes that user's sessions.

For the existing local demo stores only, `npm run db:provision-demo-owners
-- --confirm <database>` idempotently provisions the existing demo Store Owners.
Set unique `DEMO_NEST_AND_OAK_OWNER_PASSWORD`, `DEMO_THREADLINE_OWNER_PASSWORD`,
and `DEMO_VOLTBOX_OWNER_PASSWORD` values in the local environment first; the
repository contains no demo passwords. Use only after verifying the local
development target; the command refuses production and test databases. It
updates the existing OWNER account in place, does not create duplicate stores,
and never changes the Platform Owner.

## Store Owner sign-in and account settings

The business-site header links to the central Store Owner/team sign-in on the
bare platform root, separate from the public storefront and Platform Admin:

```text
http://localhost:3000/login
```

After sign-in, a user chooses from their current non-archived store
memberships; a single-store member is sent directly to that store's admin.
All store pages and actions recheck membership and the selected route store.
The selection is held in an HttpOnly, host-only cookie, but that cookie is
only a navigation hint and cannot grant access by itself. Platform Owner
sign-in and platform-level administration remain isolated on exact
`ADMIN_HOST`; Platform Owner accounts cannot use the Store Admin portal.
Public storefront subdomains and custom domains cannot serve Store Admin
routes or open Store Owner sessions. The shared **Account** link lets the
user change their name, email, and password after confirming their current password.
Changing email or password revokes all sessions, so the user must sign
in again. A changed email is marked unverified; email verification and
email-based password recovery are not configured.

## Isolation and authorization

| Layer | Enforcement |
| --- | --- |
| `proxy.ts` | Platform administration is allowed only on exact `ADMIN_HOST`. Store login/admin routes are allowed on the exact business-root portal or the optional recognized nested Store Admin host. Public storefront and custom-domain hosts return 404 for admin routes. |
| Better Auth | Uses host-only, httpOnly session cookies. Trusted origins include the configured platform admin origin, exact business root, and recognized nested Store Admin origins. Sign-up stays disabled and auth HTTP endpoints are allow-listed. |
| Session creation | A server hook allows the Platform Owner only on `ADMIN_HOST`, or a non-platform user with an eligible membership on the business root/nested Store Admin host. |
| Admin pages and actions | Store pages/actions recheck membership, the validated selected store, and route `storeId`. Platform-only pages/actions independently require the Platform Owner on `ADMIN_HOST`. |
| Data access | Store reads and writes include the authorized `storeId`; audit events include actor/store identifiers and changed-field names only. |

Store members sign in on the business root and can select only a store
returned by the server's membership query. The cookie and any submitted
store ID never grant access without that live membership check.

| Role | Store admin access |
| --- | --- |
| `OWNER` | Overview, products, categories, orders, messages, Team, and Store Settings. The owner can manage only Manager/Staff memberships and invitations for this store. Slugs remain read-only. |
| `MANAGER` | Overview, products, categories, orders, messages, and limited Team management of Manager/Staff accounts only. Cannot manage Store Owners or Platform Owners, or access settings. |
| `STAFF` | Overview plus read-only orders and messages. No Team, product/category writes, settings, or platform controls. |
| Platform Owner | Existing platform navigation and platform controls on exact `ADMIN_HOST`; never on a store host. |

Pages, layouts, data access and every sensitive Server Action check the
current authenticated host and role independently. A store member cannot
switch tenants using a URL, action argument, or another store's hostname.
Platform store management, owner assignment, lifecycle controls, customer
data, and agency settings remain Platform-Owner-only.

## Manager/Staff invitations

The Store Team page lets an authorized Store Owner or Manager invite only
`MANAGER` or `STAFF` to the current store. Invitation links use the business
root, and their unguessable tokens resolve the invited store server-side.
Invitation rows bind the email,
store and role server-side. Tokens contain 256 random bits, expire after
72 hours, are single-use, and only their SHA-256 hashes are persisted.
Replacing an outstanding invitation revokes the previous one. Acceptance
is checked and claimed atomically against the invitation's store and expiry;
the token is exchanged from the email-link fragment for a short-lived,
HttpOnly, host-only cookie, then removed from the address bar. It is never
rendered in the page, returned to the Team UI, logged, or written to audit
metadata. Account passwords are validated by the shared password policy and
stored only as Better Auth password hashes. Existing accounts retain their
current password; successful token possession verifies the invited email.

`lib/server/mailer.ts` provides the shared email abstraction and SMTP
implementation. No SMTP settings are configured by default, so the Team UI
shows invitations as unavailable and the server refuses invitation creation
without writing a pending row. For local development, configure a loopback
SMTP sink such as Mailpit (`SMTP_HOST=127.0.0.1`, `SMTP_PORT=1025`,
`SMTP_SECURE=false`, no credentials). The development configuration refuses
unauthenticated SMTP to non-loopback hosts. Production requires authenticated
TLS SMTP. Configure `EMAIL_PROVIDER=smtp`, `EMAIL_FROM`, `SMTP_HOST`,
`SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, and `SMTP_SECURE` in the local
environment or production secret store; do not put credentials in source
control. No provider credentials or service are provisioned by this project.

The invitation acceptance route creates a membership and credential account
when needed, without public sign-up or automatic sign-in. Existing users
accept into the invited store without changing their password. Revoke,
role-change, create, failed-delivery and acceptance events are audited using
IDs and role values only. The additive `StoreInvitation` table is created
by the checked-in migration; applying that migration is required before
invitation status can be read or invitations can be created.

## Passwords and audit

Passwords must be 12–128 characters and pass the shared password policy.
Better Auth's password hash/verify mechanism is used for provisioning and
account changes. Passwords, hashes, session tokens, and verification
tokens are not added to audit metadata. Sign-in, failed sign-in, sign-out,
owner changes, account changes, and store operations are audited.

Email-based password recovery is not configured. Existing Manager/Staff
accounts can sign in on their own store host under the role matrix above.
If no SMTP delivery is configured, invitation creation remains disabled;
the invitation application flow is ready but requires a mail transport to
deliver the one-time link.
