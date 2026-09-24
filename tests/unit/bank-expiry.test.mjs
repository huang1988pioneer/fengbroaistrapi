import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { describeBankExpiry } from "../../lib/bankForm.ts";

// 2026-09-24 10:00 台北時間
const now = new Date("2026-09-24T02:00:00Z");

describe("bank expiry countdown", () => {
  it("returns null when there is no usable date", () => {
    assert.equal(describeBankExpiry(undefined, now), null);
    assert.equal(describeBankExpiry("", now), null);
    assert.equal(describeBankExpiry("not-a-date", now), null);
  });

  it("marks the same seven-day window the reminders use", () => {
    assert.deepEqual(describeBankExpiry("2026-09-24", now), { days: 0, label: "今天到期", tone: "soon" });
    assert.deepEqual(describeBankExpiry("2026-10-01", now), { days: 7, label: "剩 7 天", tone: "soon" });
    assert.deepEqual(describeBankExpiry("2026-10-02", now), { days: 8, label: "剩 8 天", tone: "normal" });
  });

  it("counts expired days and accepts legacy ISO datetimes", () => {
    assert.deepEqual(describeBankExpiry("2026-09-21", now), { days: -3, label: "已過期 3 天", tone: "expired" });
    assert.equal(describeBankExpiry("2026-09-30T00:00:00.000Z", now)?.days, 6);
  });
});
