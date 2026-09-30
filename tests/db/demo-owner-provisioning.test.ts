import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { after, before, test } from "node:test";
import {
  DEMO_STORE_OWNERS,
  provisionDemoStoreOwners,
  type DemoStoreOwnerPasswords,
} from "../../lib/server/auth/demo-owners";
import { getAuth } from "../../lib/server/auth/auth";
import { getDb } from "../../lib/server/db";
import { ensurePlatformOwner, setTestAuthEnv } from "./auth-helpers";

setTestAuthEnv();
const db = getDb();
const testPasswords: DemoStoreOwnerPasswords = {
  "nest-and-oak": randomBytes(32).toString("base64url"),
  threadline: randomBytes(32).toString("base64url"),
  voltbox: randomBytes(32).toString("base64url"),
};
before(async () => {
  await ensurePlatformOwner();
  const seededDemoStores = await db.store.count({
    where: { slug: { in: DEMO_STORE_OWNERS.map(({ slug }) => slug) } },
  });
  assert.equal(seededDemoStores, 3);
});
after(() => db.$disconnect());

test("demo Store Owner provisioning is idempotent and never alters the Platform Owner", async () => {
  const platformOwnerBefore = await db.user.findFirstOrThrow({
    where: { isPlatformOwner: true },
    select: { id: true, email: true, name: true },
  });
  const first = await provisionDemoStoreOwners(getAuth(), db, testPasswords);
  const usersAfterFirst = await db.user.count();
  const auditAfterFirst = await db.auditEvent.count({
    where: { action: "store.owner_change", targetId: { in: first.map(({ userId }) => userId) } },
  });
  const second = await provisionDemoStoreOwners(getAuth(), db, testPasswords);

  assert.deepEqual(second, first);
  assert.equal(await db.user.count(), usersAfterFirst);
  assert.equal(
    await db.auditEvent.count({
      where: { action: "store.owner_change", targetId: { in: first.map(({ userId }) => userId) } },
    }),
    auditAfterFirst,
  );
  assert.deepEqual(
    await db.user.findUniqueOrThrow({ where: { id: platformOwnerBefore.id }, select: { id: true, email: true, name: true } }),
    platformOwnerBefore,
  );

  const context = await getAuth().$context;
  for (const owner of first) {
    const membership = await db.storeMembership.findMany({
      where: { store: { slug: owner.slug }, role: "OWNER" },
      include: { user: { include: { accounts: { where: { providerId: "credential" } } } } },
    });
    assert.equal(membership.length, 1, owner.slug);
    assert.equal(membership[0].userId, owner.userId);
    const config = DEMO_STORE_OWNERS.find(({ slug }) => slug === owner.slug);
    assert.ok(config);
    assert.equal(membership[0].user.email, config.email);
    const hash = membership[0].user.accounts[0]?.password;
    assert.ok(hash);
    assert.notEqual(hash, testPasswords[owner.slug]);
    assert.equal(await context.password.verify({ hash, password: testPasswords[owner.slug] }), true);
  }
});
