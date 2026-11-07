import { str, type Row } from "./types";

export function leaveForSchedule(
  schedule: Row,
  leaves: Row[],
): Row | undefined {
  const date = str(schedule, "work_date").slice(0, 10);
  return leaves.find((leave) => str(leave, "leave_date").slice(0, 10) === date);
}

export function leaveStatusText(status: unknown): string {
  return status === "approved"
    ? "อนุมัติการลาแล้ว"
    : status === "rejected"
      ? "ไม่อนุมัติการลา · ต้องเข้างานตามกะ"
      : "ยื่นใบลาแล้ว · รอพิจารณา";
}

export function splitLeaveReason(value: unknown): {
  reason: string;
  rejectionReason: string;
} {
  const raw = str({ v: value }, "v");
  const marker = "\n[Rejection] ";
  const pos = raw.lastIndexOf(marker);
  if (pos >= 0) {
    return {
      reason: raw.slice(0, pos),
      rejectionReason: raw.slice(pos + marker.length),
    };
  }
  return { reason: raw, rejectionReason: "" };
}

export function eligibleLeaveDates(
  schedules: Row[],
  leaves: Row[],
  today: string,
): string[] {
  const submitted = new Set(
    leaves.map((r) => str(r, "leave_date").slice(0, 10)),
  );
  return [
    ...new Set(
      schedules
        .filter(
          (r) => r.shift_status === "scheduled" || r.status === "scheduled",
        )
        .map((r) => str(r, "work_date").slice(0, 10))
        .filter((date) => date >= today && !submitted.has(date)),
    ),
  ].sort();
}
