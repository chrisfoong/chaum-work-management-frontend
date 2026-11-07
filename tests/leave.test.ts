import test from "node:test";
import assert from "node:assert/strict";
import {
  eligibleLeaveDates,
  leaveForSchedule,
  leaveStatusText,
  splitLeaveReason,
} from "../lib/leave";

test("leave dates exclude all previously submitted states including rejected", () => {
  const schedules = ["14", "15", "16", "17"].map((day) => ({
    work_date: `2026-10-${day}`,
    shift_status: "scheduled",
  }));
  const leaves = ["pending", "approved", "rejected"].map((status, i) => ({
    leave_date: `2026-10-${14 + i}`,
    status,
  }));
  assert.deepEqual(eligibleLeaveDates(schedules, leaves, "2026-10-14"), [
    "2026-10-17",
  ]);
});
test("leave dates exclude past and cancelled shifts and deduplicate dates", () => {
  assert.deepEqual(
    eligibleLeaveDates(
      [
        { work_date: "2026-10-13", shift_status: "scheduled" },
        { work_date: "2026-10-15", shift_status: "cancelled" },
        { work_date: "2026-10-14", shift_status: "scheduled" },
        { work_date: "2026-10-14", shift_status: "scheduled" },
      ],
      [],
      "2026-10-14",
    ),
    ["2026-10-14"],
  );
  assert.deepEqual(eligibleLeaveDates([], [], "2026-10-14"), []);
});

test("schedule cards match leave dates and distinguish approval states", () => {
  const leaves = [
    { leave_date: "2026-10-14", status: "approved" },
    { leave_date: "2026-10-15", status: "rejected" },
  ];
  assert.equal(
    leaveForSchedule({ work_date: "2026-10-14" }, leaves)?.status,
    "approved",
  );
  assert.equal(
    leaveForSchedule({ work_date: "2026-10-15" }, leaves)?.status,
    "rejected",
  );
  assert.equal(
    leaveForSchedule({ work_date: "2026-10-16" }, leaves),
    undefined,
  );
  assert.match(leaveStatusText("approved"), /อนุมัติการลาแล้ว/);
  assert.match(leaveStatusText("rejected"), /ต้องเข้างานตามกะ/);
  assert.match(leaveStatusText("pending"), /รอพิจารณา/);
  assert.deepEqual(splitLeaveReason("พบแพทย์\n[Rejection] หาคนแทนไม่ทัน"), {
    reason: "พบแพทย์",
    rejectionReason: "หาคนแทนไม่ทัน",
  });
  assert.deepEqual(splitLeaveReason("พบแพทย์"), {
    reason: "พบแพทย์",
    rejectionReason: "",
  });
});
