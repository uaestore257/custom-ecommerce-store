import assert from "node:assert/strict";
import { test } from "node:test";
import { createScrollLock, FOCUSABLE_SELECTOR, trapFocusTarget } from "../../lib/storefront-overlay";

test("Tab wraps from the last focusable element to the first, Shift+Tab the other way", () => {
  assert.equal(trapFocusTarget(2, 3, false), 0);
  assert.equal(trapFocusTarget(0, 3, true), 2);
  // In between, the browser moves focus normally.
  assert.equal(trapFocusTarget(0, 3, false), null);
  assert.equal(trapFocusTarget(1, 3, true), null);
  // A single focusable element keeps focus on itself both ways.
  assert.equal(trapFocusTarget(0, 1, false), 0);
  assert.equal(trapFocusTarget(0, 1, true), 0);
});

test("focus outside the panel is pulled back in; an empty panel focuses itself", () => {
  assert.equal(trapFocusTarget(-1, 4, false), 0);
  assert.equal(trapFocusTarget(-1, 4, true), 3);
  assert.equal(trapFocusTarget(9, 4, false), 0);
  assert.equal(trapFocusTarget(-1, 0, false), "panel");
  assert.equal(trapFocusTarget(-1, 0, true), "panel");
});

test("the focusable selector covers controls and excludes disabled, hidden and tabindex=-1 elements", () => {
  for (const part of ["a[href]", "button:not([disabled])", "input:not([disabled]):not([type='hidden'])", "select:not([disabled])", "textarea:not([disabled])", "[tabindex]:not([tabindex='-1'])"]) {
    assert.ok(FOCUSABLE_SELECTOR.split(",").includes(part), part);
  }
});

test("nested overlays share one scroll lock and restore the page's own overflow", () => {
  const style = { overflow: "clip" };
  const lock = createScrollLock(style);
  const releaseCart = lock();
  assert.equal(style.overflow, "hidden");
  const releaseMenu = lock();
  releaseCart();
  assert.equal(style.overflow, "hidden", "still locked while another overlay is open");
  releaseCart(); // a double cleanup must not release the other overlay's lock
  assert.equal(style.overflow, "hidden");
  releaseMenu();
  assert.equal(style.overflow, "clip");
  // A later lock saves the value at that time.
  style.overflow = "";
  const again = lock();
  assert.equal(style.overflow, "hidden");
  again();
  assert.equal(style.overflow, "");
});
