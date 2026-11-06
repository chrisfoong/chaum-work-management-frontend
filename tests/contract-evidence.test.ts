import test from "node:test";
import assert from "node:assert/strict";
import {
  contractInfoErrors,
  evidenceLayout,
  prepareContractEvidence,
} from "../lib/contract-evidence";

const valid = {
  contract_no: "6900006767",
  project_name: "ดูแลสวน",
  partner_agency: "ภาครัฐ",
  start_date: "2026-11-06",
  end_date: "2026-11-08",
  contract_value: "4000.25",
};
test("contract validation rejects empty, malformed and reversed dates before uploading", () => {
  assert.deepEqual(contractInfoErrors(valid), {});
  assert.ok(contractInfoErrors({ ...valid, contract_no: "6900" }).contract_no);
  assert.ok(contractInfoErrors({ ...valid, project_name: "   " }).project_name);
  assert.ok(
    contractInfoErrors({ ...valid, start_date: "2026-02-30" }).start_date,
  );
  assert.ok(contractInfoErrors({ ...valid, end_date: "2026-11-05" }).end_date);
});
test("contract money validation preserves exact satang and database limit", () => {
  for (const contract_value of ["", "-1", "4.001", "1e3", "10000000000"])
    assert.ok(contractInfoErrors({ ...valid, contract_value }).contract_value);
  assert.deepEqual(
    contractInfoErrors({ ...valid, contract_value: "9999999999.99" }),
    {},
  );
});
test("evidence composition retains page order and original resolution without cropping", () => {
  assert.deepEqual(
    evidenceLayout([
      { width: 100, height: 200 },
      { width: 80, height: 150 },
    ]),
    {
      width: 100,
      height: 374,
      pages: [
        { x: 0, y: 0, width: 100, height: 200 },
        { x: 10, y: 224, width: 80, height: 150 },
      ],
    },
  );
});
test("evidence bounds prevent empty, excessive and oversized canvas allocations", () => {
  for (const sizes of [
    [],
    Array(11).fill({ width: 1, height: 1 }),
    [{ width: 0, height: 1 }],
    [{ width: 9000, height: 10 }],
    [{ width: 8192, height: 8192 }],
  ])
    assert.throws(() => evidenceLayout(sizes));
});
test("a renamed or truncated PNG is rejected before image decode or upload", async () => {
  await assert.rejects(
    prepareContractEvidence([
      new File(["not a png"], "contract.png", { type: "image/png" }),
    ]),
    /ไม่ใช่ PNG/,
  );
  await assert.rejects(
    prepareContractEvidence([
      new File(
        [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])],
        "broken.png",
        { type: "image/png" },
      ),
    ]),
    /ไม่สมบูรณ์/,
  );
});
