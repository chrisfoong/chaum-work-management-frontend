import test from "node:test";
import assert from "node:assert/strict";
import {
  equipmentOptions,
  canAddEquipment,
  attendanceActions,
  checkoutTimeReached,
} from "../lib/worker-actions";
const equipment = [
  { equipment_id: "one" },
  { equipment_id: "two" },
  { equipment_id: "off", is_active: false },
];
test("equipment selected in another row disappears, current selection remains", () => {
  const items = [{ equipment: "one" }, { equipment: "two" }];
  assert.deepEqual(
    equipmentOptions(equipment, items, 0).map((r) => r.equipment_id),
    ["one"],
  );
  assert.deepEqual(
    equipmentOptions(equipment, items, 1).map((r) => r.equipment_id),
    ["two"],
  );
});
test("cannot add blank rows or rows beyond available equipment", () => {
  assert.equal(canAddEquipment(equipment, [{ equipment: "" }]), false);
  assert.equal(canAddEquipment(equipment, [{ equipment: "one" }]), true);
  assert.equal(
    canAddEquipment(equipment, [{ equipment: "one" }, { equipment: "two" }]),
    false,
  );
  assert.equal(
    canAddEquipment([{ equipment_id: "one" }], [{ equipment: "one" }]),
    false,
  );
});
test("attendance actions reflect saved check-in and checkout", () => {
  assert.deepEqual(attendanceActions(), {
    checkedIn: false,
    checkedOut: false,
  });
  assert.deepEqual(
    attendanceActions({ check_in: "2026-10-14T18:00:00+07:00" }),
    { checkedIn: true, checkedOut: false },
  );
  assert.deepEqual(
    attendanceActions({ check_in: "saved", check_out: "saved" }),
    { checkedIn: true, checkedOut: true },
  );
});

test("checkout waits for scheduled end across midnight, exact boundary allowed", () => {
  const row = { shift_end_at: "2026-10-15T02:00:00+07:00" };
  assert.equal(
    checkoutTimeReached(row, Date.parse("2026-10-14T20:07:00+07:00")),
    false,
  );
  assert.equal(
    checkoutTimeReached(row, Date.parse("2026-10-15T01:59:59.999+07:00")),
    false,
  );
  assert.equal(
    checkoutTimeReached(row, Date.parse("2026-10-15T02:00:00+07:00")),
    true,
  );
  assert.equal(checkoutTimeReached({}, Date.now()), false);
});
