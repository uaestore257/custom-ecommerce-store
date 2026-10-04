import assert from "node:assert/strict";
import { test } from "node:test";
import { PROCESS_STEPS, SERVICE_CATEGORIES } from "../../lib/platform/services";

test("service categories have unique, URL-safe slugs and no duplicate items", () => {
  const slugs = SERVICE_CATEGORIES.map((category) => category.slug);
  assert.equal(new Set(slugs).size, slugs.length);
  for (const category of SERVICE_CATEGORIES) {
    assert.match(category.slug, /^[a-z0-9-]+$/, category.slug);
    assert.ok(category.title && category.outcome && category.items.length > 0, category.slug);
    assert.equal(new Set(category.items).size, category.items.length, category.slug);
  }
});

test("'on our platform today' only marks items that are listed in that category", () => {
  for (const category of SERVICE_CATEGORIES) {
    for (const item of category.platformNative ?? []) {
      assert.ok(category.items.includes(item), `${category.slug}: ${item}`);
    }
  }
});

test("the homepage features the core categories and the process has five steps", () => {
  const featured = SERVICE_CATEGORIES.filter((category) => category.featured).map((category) => category.slug);
  assert.deepEqual(featured, ["ecommerce", "websites", "apps", "ai", "automation", "growth", "software"]);
  assert.deepEqual(PROCESS_STEPS.map((step) => step.title), ["Discover", "Design", "Build", "Launch", "Grow"]);
});
