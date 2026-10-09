import test from "node:test";
import assert from "node:assert/strict";
import { payrollForPeriod, payrollSummary } from "../lib/payroll";
import { previewList } from "../lib/preview";
import { period, todayBangkok } from "../lib/domain";

test("payroll summary counts distinct employees and totals all pages in exact cents", () => {
  const data = Array.from({ length: 51 }, (_, i) => ({
    user_id: `user-${i}`,
    net_wage: "0.10",
  }));
  assert.deepEqual(payrollSummary(data), {
    employees: 51,
    net: 510n,
    valid: true,
  });
  assert.deepEqual(
    payrollSummary([...data, { user_id: "user-0", net_wage: "0.20" }]),
    { employees: 51, net: 530n, valid: true },
  );
  assert.deepEqual(payrollSummary([]), { employees: 0, net: 0n, valid: true });
});

test("missing identity or invalid money never silently shows a partial payroll total", () => {
  for (const row of [
    { net_wage: "100.00" },
    { user_id: "a", net_wage: "bad" },
    { user_id: "a", net_wage: "-1.00" },
  ]) {
    assert.equal(
      payrollSummary([{ user_id: "b", net_wage: "50.00" }, row]).net,
      null,
    );
    assert.equal(payrollSummary([row]).valid, false);
  }
});

test("selected half excludes other periods while accepting API date timestamps", () => {
  const range = period("2024-02", 2);
  const matching = {
    user_id: "a",
    period_start: "2024-02-16T00:00:00Z",
    period_end: "2024-02-29T00:00:00Z",
    net_wage: "1.00",
  };
  assert.deepEqual(
    payrollForPeriod(
      [
        matching,
        { ...matching, ...period("2024-02", 1) },
        { ...matching, ...period("2024-03", 2) },
      ],
      range,
    ),
    [matching],
  );
});

test("preview payroll is available in both current halves and absent in another month", () => {
  const month = todayBangkok().slice(0, 7);
  const data = previewList(`payroll?period_month=${month}&limit=100`);
  assert.equal(
    payrollSummary(payrollForPeriod(data, period(month, 1))).net,
    570000n,
  );
  assert.equal(
    payrollSummary(payrollForPeriod(data, period(month, 2))).net,
    640000n,
  );
  assert.deepEqual(previewList("payroll?period_month=2000-01"), []);
});

test("Worker preview only displays their paid payroll, matching production API ownership", () => {
  const data = previewList(
    `payroll?period_month=${todayBangkok().slice(0, 7)}`,
    "worker",
  );
  assert.equal(data.length, 1);
  assert.equal(data[0].is_paid, true);
});
