import assert from "node:assert/strict";
import { test } from "node:test";
import {
  cancelProblem,
  isOrderStatus,
  isPaymentStatus,
  nextOrderStatus,
  ORDER_STATUS_VALUES,
  paymentProblem,
} from "../../lib/admin/order-rules";

test("orders only move forward, one step at a time, and final statuses don't move", () => {
  assert.equal(nextOrderStatus("PENDING"), "PROCESSING");
  assert.equal(nextOrderStatus("PROCESSING"), "SHIPPED");
  assert.equal(nextOrderStatus("SHIPPED"), "DELIVERED");
  assert.equal(nextOrderStatus("DELIVERED"), null);
  assert.equal(nextOrderStatus("CANCELLED"), null);
  // Never backwards, never to CANCELLED (that's a separate action).
  for (const status of ORDER_STATUS_VALUES) assert.notEqual(nextOrderStatus(status), "CANCELLED", status);
});

test("only pending or processing, unpaid orders can be cancelled", () => {
  assert.equal(cancelProblem("PENDING", "UNPAID"), null);
  assert.equal(cancelProblem("PROCESSING", "UNPAID"), null);
  assert.match(cancelProblem("PENDING", "PAID") ?? "", /paid/i);
  assert.match(cancelProblem("PROCESSING", "PAID") ?? "", /refund/i);
  for (const status of ["SHIPPED", "DELIVERED"] as const) {
    assert.ok(cancelProblem(status, "UNPAID"), status);
    assert.ok(cancelProblem(status, "PAID"), status);
  }
  assert.match(cancelProblem("CANCELLED", "UNPAID") ?? "", /already cancelled/i);
});

test("payment can change on any order that isn't cancelled, for manual payment methods only", () => {
  for (const status of ["PENDING", "PROCESSING", "SHIPPED", "DELIVERED"] as const) {
    assert.equal(paymentProblem(status, "cash_on_delivery"), null, status);
    assert.equal(paymentProblem(status, "bank_transfer"), null, status);
  }
  assert.ok(paymentProblem("CANCELLED", "cash_on_delivery"));
  for (const method of ["online_card", "card_on_delivery", "", "anything"]) assert.ok(paymentProblem("PENDING", method), method);
});

test("status values from the browser are checked exactly", () => {
  for (const status of ORDER_STATUS_VALUES) assert.ok(isOrderStatus(status));
  for (const value of ["pending", "Pending", "SHIPPED ", "", null, undefined, 1, {}, ["PENDING"]]) {
    assert.equal(isOrderStatus(value), false, JSON.stringify(value));
  }
  assert.ok(isPaymentStatus("PAID"));
  assert.ok(isPaymentStatus("UNPAID"));
  for (const value of ["paid", "REFUNDED", "", null, 0]) assert.equal(isPaymentStatus(value), false, JSON.stringify(value));
});
