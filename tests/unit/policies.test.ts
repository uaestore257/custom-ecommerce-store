// Storefront policy pages (lib/policies.ts) stay clearly marked placeholders.
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { PLACEHOLDER_NOTICE, POLICIES, policyText } from "../../lib/policies";

test("privacy, terms, delivery and returns each have a page that renders its policy", () => {
  assert.deepEqual(POLICIES.map((p) => p.id), ["privacy", "terms", "delivery", "returns"]);
  for (const policy of POLICIES) {
    const file = `app/(storefront)${policy.href}/page.tsx`;
    assert.ok(existsSync(file), file);
    assert.match(readFileSync(file, "utf8"), new RegExp(`policyId="${policy.id}"`), file);
  }
});

test("the text is a marked placeholder in the store's name, with no compliance claims", () => {
  assert.match(policyText(PLACEHOLDER_NOTICE, "Nest & Oak"), /^Placeholder: Nest & Oak has not published this policy yet/);
  for (const policy of POLICIES) {
    for (const text of policy.sections) {
      assert.doesNotMatch(text, /complian|guarantee|in accordance with|we comply/i, policy.id);
      assert.ok(!policyText(text, "X").includes("{store}"), policy.id);
    }
  }
});
