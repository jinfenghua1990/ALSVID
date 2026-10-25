import assert from "node:assert/strict";
import test from "node:test";
import { localDateTimeToBusinessInstant } from "./finance-timezone.mjs";

test("converts Europe/Berlin winter and summer wall-clock values to explicit UTC instants", () => {
  assert.equal(localDateTimeToBusinessInstant("2026-01-15T12:30"), "2026-01-15T11:30:00.000Z");
  assert.equal(localDateTimeToBusinessInstant("2026-07-15T12:30"), "2026-07-15T10:30:00.000Z");
});
test("rejects invalid and DST-nonexistent or ambiguous local times", () => {
  assert.throws(() => localDateTimeToBusinessInstant("not-a-date"), /有效的汇率生效时间/);
  assert.throws(() => localDateTimeToBusinessInstant("2026-02-30T12:30"), /有效的汇率生效时间/);
  assert.throws(() => localDateTimeToBusinessInstant("2026-03-29T02:30"), /不存在/);
  assert.throws(() => localDateTimeToBusinessInstant("2026-10-25T02:30"), /有歧义/);
});
