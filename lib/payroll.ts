import { satang } from "./domain";
import { str, type Row } from "./types";

export function payrollForPeriod(
  data: Row[],
  range: { period_start: string; period_end: string },
): Row[] {
  return data.filter(
    (r) =>
      str(r, "period_start").slice(0, 10) === range.period_start &&
      str(r, "period_end").slice(0, 10) === range.period_end,
  );
}

// Summaries cover the whole selected period, independently of table pagination.
export function payrollSummary(data: Row[]) {
  const users = new Set<string>();
  let total = 0n;
  let valid = true;
  for (const row of data) {
    const id = str(row, "user_id");
    if (id) users.add(id);
    else valid = false;
    try {
      total += satang(str(row, "net_wage"));
    } catch {
      valid = false;
    }
  }
  return { employees: users.size, net: valid ? total : null, valid };
}
