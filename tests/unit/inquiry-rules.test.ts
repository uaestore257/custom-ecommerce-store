import assert from "node:assert/strict";
import { test } from "node:test";
import { INQUIRY_STATUS_VALUES, isInquiryStatus, nextInquiryStatuses } from "../../lib/admin/inquiry-rules";

test("a message moves New -> Read/Archived, Read -> Archived, Archived -> Read, and never back to New", () => {
  assert.deepEqual(nextInquiryStatuses("NEW"), ["READ", "ARCHIVED"]);
  assert.deepEqual(nextInquiryStatuses("READ"), ["ARCHIVED"]);
  assert.deepEqual(nextInquiryStatuses("ARCHIVED"), ["READ"]);
  for (const status of INQUIRY_STATUS_VALUES) {
    assert.ok(!nextInquiryStatuses(status).includes("NEW"), status);
    assert.ok(!nextInquiryStatuses(status).includes(status), `${status} can't move to itself`);
  }
});

test("message status values from the browser are checked exactly", () => {
  for (const status of ["NEW", "READ", "ARCHIVED"]) assert.ok(isInquiryStatus(status), status);
  for (const value of ["new", "Read", "SPAM", "", null, undefined, 1, ["READ"]]) {
    assert.equal(isInquiryStatus(value), false, JSON.stringify(value));
  }
});
