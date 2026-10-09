import type { Row } from "./types";

// Prefer the record identity over foreign keys shared by several rows.
export function tableRowKeys(data: Row[]): string[] {
  const seen = new Map<string, number>();
  return data.map((row, index) => {
    const field = [
      "schedule_id",
      "requisition_id",
      "payroll_id",
      "invoice_id",
      "request_id",
      "attendance_id",
      "deduction_id",
      "evidence_id",
      "assignment_id",
      "item_id",
      "equipment_id",
      "location_id",
      "worker_id",
      "user_id",
      "tor_id",
    ].find(
      (key) => row[key] !== null && row[key] !== undefined && row[key] !== "",
    );
    const identity = field ? `${field}:${String(row[field])}` : `row:${index}`;
    const occurrence = seen.get(identity) || 0;
    seen.set(identity, occurrence + 1);
    return JSON.stringify([identity, occurrence]);
  });
}
