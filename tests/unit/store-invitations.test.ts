import assert from "node:assert/strict";
import { test } from "node:test";
import {
  hashStoreInvitationToken,
  isStoreInvitationToken,
  newStoreInvitationToken,
  storeInvitationStatus,
  STORE_INVITATION_TTL_MS,
} from "../../lib/admin/invitations";
import { isEmailDeliveryConfigured } from "../../lib/server/mailer";

test("store invitation bearer tokens are random, fixed-shape, and stored as hashes", () => {
  const first = newStoreInvitationToken();
  const second = newStoreInvitationToken();
  assert.equal(isStoreInvitationToken(first), true);
  assert.equal(first.length, 43);
  assert.notEqual(first, second);
  assert.equal(hashStoreInvitationToken(first).length, 64);
  assert.notEqual(hashStoreInvitationToken(first), first);
  assert.equal(isStoreInvitationToken(`${first}x`), false);
  assert.equal(isStoreInvitationToken(""), false);
  assert.equal(isStoreInvitationToken(null), false);
});

test("invitation expiry and state are calculated consistently", () => {
  const now = new Date("2026-10-01T00:00:00Z");
  assert.equal(STORE_INVITATION_TTL_MS, 72 * 60 * 60 * 1000);
  assert.equal(storeInvitationStatus({ acceptedAt: null, revokedAt: null, expiresAt: new Date(now.getTime() + 1) }, now), "PENDING");
  assert.equal(storeInvitationStatus({ acceptedAt: null, revokedAt: null, expiresAt: now }, now), "EXPIRED");
  assert.equal(storeInvitationStatus({ acceptedAt: null, revokedAt: now, expiresAt: new Date(now.getTime() + 1) }, now), "REVOKED");
  assert.equal(storeInvitationStatus({ acceptedAt: now, revokedAt: null, expiresAt: new Date(0) }, now), "ACCEPTED");
});

test("SMTP configuration permits only loopback unauthenticated development delivery", () => {
  const base = {
    EMAIL_PROVIDER: "smtp",
    EMAIL_FROM: "admin@example.test",
    SMTP_HOST: "127.0.0.1",
    SMTP_PORT: "1025",
    SMTP_SECURE: "false",
    NODE_ENV: "development",
  };
  assert.equal(isEmailDeliveryConfigured(base as NodeJS.ProcessEnv), true);
  assert.equal(isEmailDeliveryConfigured({ ...base, SMTP_HOST: "mail.example.test" } as NodeJS.ProcessEnv), false);
  assert.equal(
    isEmailDeliveryConfigured({ ...base, NODE_ENV: "production", SMTP_SECURE: "true" } as NodeJS.ProcessEnv),
    false,
  );
  assert.equal(
    isEmailDeliveryConfigured({
      ...base,
      NODE_ENV: "production",
      SMTP_HOST: "smtp.example.test",
      SMTP_SECURE: "true",
      SMTP_USER: "service",
      SMTP_PASSWORD: "provider-secret",
    } as NodeJS.ProcessEnv),
    true,
  );
  assert.equal(
    isEmailDeliveryConfigured({
      ...base,
      EMAIL_PROVIDER: "unsupported",
      SMTP_HOST: "127.0.0.1",
    } as NodeJS.ProcessEnv),
    false,
  );
});
