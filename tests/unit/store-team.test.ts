import assert from "node:assert/strict";
import { test } from "node:test";
import { isManagedStoreTeamRole } from "../../lib/admin/team";

test("only Manager and Staff are manageable Store Team roles", () => {
  assert.equal(isManagedStoreTeamRole("MANAGER"), true);
  assert.equal(isManagedStoreTeamRole("STAFF"), true);
  assert.equal(isManagedStoreTeamRole("OWNER"), false);
  assert.equal(isManagedStoreTeamRole("PLATFORM_OWNER"), false);
  assert.equal(isManagedStoreTeamRole(null), false);
});
