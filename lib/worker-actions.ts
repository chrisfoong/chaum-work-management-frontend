import { str, type Row } from "./types";

export function equipmentOptions(
  available: Row[],
  items: { equipment: string }[],
  index: number,
): Row[] {
  const used = new Set(
    items.filter((_, i) => i !== index).map((item) => item.equipment),
  );
  return available.filter(
    (row) => row.is_active !== false && !used.has(str(row, "equipment_id")),
  );
}
export function canAddEquipment(
  available: Row[],
  items: { equipment: string }[],
): boolean {
  const count = new Set(
    available
      .filter((row) => row.is_active !== false)
      .map((row) => str(row, "equipment_id")),
  ).size;
  return items.length < count && items.every((item) => item.equipment !== "");
}
export function attendanceActions(attendance?: Row): {
  checkedIn: boolean;
  checkedOut: boolean;
} {
  return {
    checkedIn: Boolean(attendance?.check_in),
    checkedOut: Boolean(attendance?.check_out),
  };
}

export function checkoutTimeReached(schedule: Row, now: number): boolean {
  const end = Date.parse(str(schedule, "shift_end_at"));
  return Number.isFinite(end) && now >= end;
}
