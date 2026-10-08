# Stripe Connect payment operations

Stripe Checkout credentials are resolved only in the Node.js server runtime. The
store database contains an opaque `secretRef`; it never contains the Stripe API
key or webhook signing secret. For each credential reference, deployment must
provide a protected server-only environment variable named
`PAYMENT_SECRET_<UPPERCASE_SHA256_OF_SECRET_REF>`. Its value is one JSON record:

```json
{
  "provider": "stripe_connect",
  "storeId": "<store-id>",
  "providerAccountId": "<payment-provider-account-id>",
  "mode": "TEST",
  "connectedAccountId": "<acct-id>",
  "secrets": {
    "apiSecretKey": "<server-side Stripe API key>",
    "webhookSigningSecret": "<Stripe webhook signing secret>"
  }
}
```

This is a per-reference deployment secret, not a committed configuration file.
The record metadata must exactly match the store's Stripe Connect account,
selected mode, opaque reference and connected-account ID. TEST uses only a
`sk_test_` key; LIVE uses only a `sk_live_` key. The webhook signing secret must
start with `whsec_`. Mismatches fail closed. Do not place these values in
`NEXT_PUBLIC_*` variables, source control, logs, Prisma records, or client props.
When rotating an account, keep the prior reference's deployment secret
available for already-created transactions, delayed signed webhooks, and
refund verification. The old provider-account row remains associated with its
historical payment transactions.

LIVE Checkout is disabled unless the server runtime explicitly sets
`STRIPE_LIVE_CHECKOUT_ENABLED=true`. Leave it unset/false until the database
migration is deployed, focused and full validation passes, production webhook
delivery is verified, and an operator approves activation. This flag controls
new LIVE Checkout sessions only; signed webhooks and verification of already
created sessions remain available when it is off.

Configure the Stripe Dashboard webhook for each connected account to deliver
`checkout.session.completed`, `checkout.session.async_payment_succeeded`, and
`checkout.session.async_payment_failed` to:

```text
https://<storefront-host>/api/webhooks/stripe/<payment-provider-account-id>
```

The webhook signing secret must come from that account's matching mode. Verify
the account, mode, event signature, stored session, order, currency and amount
before enabling LIVE payments. Payment settlement is webhook-authoritative;
the browser return is informational only.

Automated refunds are intentionally not implemented. Refunds are initiated in
the connected account's Stripe Dashboard. After Stripe reports a refund as
succeeded, an authorized store team member can record its refund ID on the
order. The application retrieves the refund and original Checkout Session from
Stripe and records only matching, successful refund evidence.

The additive payment-safety migration must be deployed through the repository's
reviewed migration deployment process before using the new payment transaction
states or refund reconciliation. Never reset or migrate a production database
as part of local test execution.
