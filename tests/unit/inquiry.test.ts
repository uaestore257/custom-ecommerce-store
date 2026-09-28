import assert from "node:assert/strict";
import { test } from "node:test";
import { INQUIRY_LIMITS, validateInquiry } from "../../lib/inquiry";

const valid = {
  name: "Jane Visitor",
  email: "jane@example.com",
  subject: "Delivery question",
  message: "Do you deliver to Sharjah, and how long does it usually take?",
};

test("valid input produces no errors", () => {
  const { errors } = validateInquiry(valid);
  assert.deepEqual(errors, { name: undefined, email: undefined, subject: undefined, message: undefined });
});

test("name, email and message are required; subject is not", () => {
  const { errors } = validateInquiry({ ...valid, name: "J", email: "not-an-email", message: "short", subject: "" });
  assert.match(errors.name ?? "", /enter your name/);
  assert.match(errors.email ?? "", /valid email/);
  assert.match(errors.message ?? "", /at least 10 characters/);
  assert.equal(errors.subject, undefined, "an empty subject is fine — it's optional");
});

test("an over-length subject is rejected with a field error, not silently truncated", () => {
  const tooLong = "x".repeat(INQUIRY_LIMITS.subject + 1);
  const { values, errors } = validateInquiry({ ...valid, subject: tooLong });
  assert.match(errors.subject ?? "", /150 characters/);
  // Unlike a truncate-then-ignore design, the full (untruncated) value is
  // still returned in `values` — the caller only ever sees the field
  // error, since submitInquiry() refuses the whole submission when
  // hasErrors() is true.
  assert.equal(values.subject.length, tooLong.length);
});

test("a subject exactly at the limit is accepted", () => {
  const atLimit = "x".repeat(INQUIRY_LIMITS.subject);
  const { errors } = validateInquiry({ ...valid, subject: atLimit });
  assert.equal(errors.subject, undefined);
});

test("name, email and message over their limits are also rejected (same convention as subject)", () => {
  const { errors } = validateInquiry({
    ...valid,
    name: "x".repeat(INQUIRY_LIMITS.name + 1),
    email: `${"x".repeat(INQUIRY_LIMITS.email)}@example.com`,
    message: "x".repeat(INQUIRY_LIMITS.message + 1),
  });
  assert.match(errors.name ?? "", /80 characters/);
  assert.match(errors.email ?? "", /254 characters/);
  assert.match(errors.message ?? "", /4000 characters/);
});

test("unknown fields (e.g. a storeId placed alongside the form fields) are ignored", () => {
  const { values } = validateInquiry({ ...valid, storeId: "some-other-store" });
  assert.deepEqual(values, valid);
});

test("non-object input produces empty values and every required-field error, not a throw", () => {
  for (const bad of [null, undefined, "a string", 123, ["array"]]) {
    const { errors } = validateInquiry(bad);
    assert.ok(errors.name && errors.email && errors.message, JSON.stringify(bad));
  }
});
