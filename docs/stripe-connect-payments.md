# Stripe Connect onboarding and payment operations

Stripe Connect onboarding is started by an authorized Store Owner from
**Admin → Settings → Stripe Connect**. The owner chooses TEST or LIVE and is
redirected to Stripe-hosted Standard account OAuth. The callback is bound to a
short-lived, single-use state stored as a hash and associated with that Store
and owner. The server exchanges the authorization code, stores the connected
account ID on the Store's provider-account record, and discards the returned
OAuth tokens. Stripe Checkout remains disabled until the owner explicitly
enables it; LIVE Checkout additionally remains disabled unless
`STRIPE_LIVE_CHECKOUT_ENABLED=true` is set by an authorized operator.

## Server environment

Configure these as server-only environment variables in Vercel (or the
equivalent deployment secret manager). Use separate TEST and LIVE values:

| Variable | Purpose |
| --- | --- |
| `STRIPE_CONNECT_REDIRECT_URI` | The exact HTTPS callback URL registered in Stripe, ending in `/api/stripe/connect/callback`. |
| `STRIPE_TEST_CONNECT_CLIENT_ID` | Stripe Connect OAuth client ID for TEST onboarding. |
| `STRIPE_TEST_SECRET_KEY` | Platform TEST API key used for OAuth code exchange and scoped Stripe API calls. Must start with `sk_test_`. |
| `STRIPE_TEST_WEBHOOK_SECRET` | Signing secret for the TEST Connect webhook destination. Must start with `whsec_`. |
| `STRIPE_LIVE_CONNECT_CLIENT_ID` | Stripe Connect OAuth client ID for LIVE onboarding. Configure only when preparing for an explicitly approved LIVE test. |
| `STRIPE_LIVE_SECRET_KEY` | Platform LIVE API key used for OAuth code exchange and scoped Stripe API calls. Must start with `sk_live_`. |
| `STRIPE_LIVE_WEBHOOK_SECRET` | Signing secret for the LIVE Connect webhook destination. Must start with `whsec_`. |
| `STRIPE_LIVE_CHECKOUT_ENABLED` | Explicit operations gate for creating new LIVE Checkout sessions. Leave unset or false by default. |

The TEST variables are required for TEST onboarding, Checkout, and webhook
verification. LIVE credentials may be provisioned server-side ahead of a
controlled test, but doing so does not enable LIVE Checkout. Test and live
keys, Connect client IDs, and webhook signing secrets must never be mixed.
Never use `NEXT_PUBLIC_*` names for credentials. Do not put credential values
in `.env.example`, source control, Prisma, browser props, URLs, or logs.

Existing manually provisioned Stripe records may still refer to a
`PAYMENT_SECRET_<UPPERCASE_SHA256_OF_SECRET_REF>` server secret record. Keep
those records available for historical payment verification until the
corresponding payment history no longer needs provider verification. New
OAuth-connected accounts use the platform's server-side mode-specific Stripe
key and are scoped by Store, provider-account record, mode, and connected
account ID.

## Stripe Dashboard setup

1. Enable Connect and Standard account OAuth for the platform.
2. Register the exact value of `STRIPE_CONNECT_REDIRECT_URI` in the Connect
   OAuth redirect URI allowlist. Use HTTPS in production.
3. Copy the TEST Connect client ID and platform TEST secret key into the TEST
   server environment variables. Keep LIVE client/key values separate; never
   activate LIVE Checkout as part of setup.
4. Create a TEST Connect webhook destination on the platform. Subscribe to
   connected-account events:
   `checkout.session.completed`,
   `checkout.session.async_payment_succeeded`, and
   `checkout.session.async_payment_failed`.
5. Set the TEST destination URL to
   `https://<public-app-host>/api/webhooks/stripe/connect` and store its
   signing secret as `STRIPE_TEST_WEBHOOK_SECRET`.
6. When an operator is preparing a separately approved LIVE test, create the
   corresponding LIVE Connect destination with the same event types and URL,
   then store its signing secret in `STRIPE_LIVE_WEBHOOK_SECRET`. Creating a
   destination does not authorize or enable a LIVE payment test.

The generic Connect endpoint verifies the Stripe signature and event mode
before resolving the connected account to one unique provider-account record.
The legacy account-specific route
`/api/webhooks/stripe/<provider-account-record-id>` remains available for
existing per-account webhook configurations.

## Verify a Store connection

1. Sign in as that Store's OWNER and open **Admin → Settings → Stripe
   Connect**.
2. Choose the intended mode and select **Connect Stripe**.
3. Complete the Stripe-hosted authorization/onboarding flow. The callback
   returns to the same Store's settings and shows the connected account ID.
4. Confirm the account appears in the correct TEST or LIVE mode. Checkout is
   still disabled until the owner explicitly enables it and saves settings.
5. Before enabling TEST Checkout, confirm the platform TEST key and Connect
   webhook are configured and that a test event reaches the generic webhook
   endpoint. Settlement is webhook-authoritative; the browser return is not
   payment evidence.

The connected-account ID is written only by the server after a successful
Stripe OAuth code exchange. It is not editable or accepted from the browser.
OAuth state binds the callback to the initiating Store and active owner.
Another Store cannot claim the same Stripe account in the same mode.

## Disconnect, reconnect, and history

To stop taking new Stripe payments, disable Stripe Checkout in the Store's
settings and save. This disables the payment method without deleting provider
account records or payment history. Do not delete old provider-account rows
or remove their matching server credentials while transactions, delayed
webhooks, refund verification, or reconciliation may still need them.

To connect a different account or mode, start a new Stripe-hosted connection.
The server refuses account changes while that Store has pending,
cancelled-unresolved, or reconciliation Stripe attempts. A previously used
account can be reconnected to the same Store and mode without changing its
historical provider-account identity.

## Migration and production release

Migration
`20261008100000_stripe_connect_oauth_onboarding` is required. It adds the
connected-account identifier and short-lived OAuth-state table and adds a
uniqueness constraint to prevent one connected account/mode from being
assigned to multiple Store provider records. It backfills only valid Stripe
account IDs from existing public configuration. It is additive and is not
applied automatically by `npm run build`.

Before production deployment, the release operator must inspect the production
Prisma migration history and check for duplicate account IDs in the same
mode. The migration intentionally fails rather than choosing an owner if
duplicates exist; resolve ownership under the normal reviewed release
procedure before deploying it. Apply the migration only through the approved
production migration process. Never reset production or run a local test
database command against production.

## Controlled LIVE payment test

Do not perform this procedure without separate human approval:

1. Complete and verify TEST onboarding, Checkout, signed webhooks, settlement,
   reconciliation, and account isolation first.
2. Confirm the production migration and LIVE Connect webhook are deployed and
   verified.
3. Have an authorized operator provision the LIVE server variables in the
   deployment secret manager. Never provide them to a Store Owner or enter
   them in the app.
4. Confirm Store Owner authorization is complete and obtain explicit approval
   before changing `STRIPE_LIVE_CHECKOUT_ENABLED` from unset/false.
5. Use an operator-approved controlled order and confirm successful webhook
   settlement and expected payout behavior in Stripe.
6. Disable the gate again after the controlled test unless there is separate
   approval for ongoing LIVE operation.

Automated refunds are intentionally not implemented. An authorized Store
team member may record a manual refund only after the server verifies a
succeeded Stripe refund against the original connected-account payment,
currency, session, and amount. The refund audit trail is retained.
