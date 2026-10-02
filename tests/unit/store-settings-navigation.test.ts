import assert from "node:assert/strict";
import { test } from "node:test";
import { storeSettingsNav, storeTeamNav } from "../../lib/admin/store-navigation";

test("Store Owner navigation sends Store Settings to the current-host scoped route", () => {
  assert.deepEqual(storeSettingsNav(false, "store-a"), { label: "Store Settings", href: "/admin/settings" });
});

test("Platform Owner store navigation keeps the existing store settings route", () => {
  assert.deepEqual(storeSettingsNav(true, "store-a"), {
    label: "Store settings",
    href: "/admin/stores/store-a/settings",
  });
});

test("only Owners and Managers get the store-team navigation item", () => {
  assert.deepEqual(storeTeamNav(false, "OWNER"), { label: "Team", href: "/admin/team" });
  assert.deepEqual(storeTeamNav(false, "MANAGER"), { label: "Team", href: "/admin/team" });
  assert.equal(storeTeamNav(false, "STAFF"), null);
  assert.equal(storeTeamNav(true), null);
});
