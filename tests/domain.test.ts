import test from "node:test";
import assert from "node:assert/strict";
import {
  clock,
  dateThai,
  decimal,
  distanceMeters,
  money,
  period,
  safeQR,
  satang,
  todayBangkok,
  verifyFile,
} from "../lib/domain";
import { verifiedUser } from "../lib/session";
import { allowed, backendURL } from "../lib/proxy";
test("money keeps cents exact and supports negative report display", () => {
  assert.equal(satang("9007199254740993.99"), 900719925474099399n);
  assert.equal(decimal(-101n), "-1.01");
  assert.equal(money("-0.01"), "-0.01");
  assert.equal(satang("0.10") + satang("0.20"), 30n);
  for (const bad of ["-1", "1.234", "NaN", "1e3", "1,000"])
    assert.throws(() => satang(bad));
});
test("payroll periods account for leap year and December", () => {
  assert.deepEqual(period("2024-02", 2), {
    period_start: "2024-02-16",
    period_end: "2024-02-29",
  });
  assert.equal(period("2025-02", 2).period_end, "2025-02-28");
  assert.equal(period("2026-12", 2).period_end, "2026-12-31");
  assert.equal(period("2026-01", 1).period_end, "2026-01-15");
  assert.throws(() => period("2026-13", 1));
});
test("Bangkok date and overnight timestamps keep next day", () => {
  assert.equal(todayBangkok(new Date("2026-10-08T18:00:00Z")), "2026-10-09");
  assert.equal(clock("2026-10-08T15:00:00Z"), "22:00");
  assert.equal(clock("2026-10-08T23:00:00Z"), "06:00");
  assert.match(dateThai("2026-10-09"), /2569/);
});
test("GPS distance distinguishes same location and 200 metre boundary", () => {
  assert.equal(distanceMeters(13, 100, 13, 100), 0);
  assert.ok(distanceMeters(13, 100, 13.001, 100) < 200);
  assert.ok(distanceMeters(13, 100, 13.003, 100) > 200);
});
test("file policy rejects empty, oversized and incompatible uploads", () => {
  verifyFile(new File(["ok"], "proof.png", { type: "image/png" }), [
    "image/png",
  ]);
  assert.throws(() =>
    verifyFile(new File([], "empty.png", { type: "image/png" }), ["image/png"]),
  );
  assert.throws(() =>
    verifyFile(new File(["x"], "x.svg", { type: "image/svg+xml" }), [
      "image/png",
    ]),
  );
  assert.throws(() =>
    verifyFile(
      new File([new Uint8Array(5 * 1024 * 1024 + 1)], "big.png", {
        type: "image/png",
      }),
      ["image/png"],
    ),
  );
});
test("QR rejects malformed input without treating client check as signature validation", () => {
  assert.equal(safeQR("abcdefghij.xyz"), "abcdefghij.xyz");
  for (const qr of [
    "short",
    "<script>x</script>",
    "abcd efghijk",
    "a".repeat(4097),
  ])
    assert.throws(() => safeQR(qr));
});
test("verified DB roles restrict platform and reject inactive or unknown users", () => {
  const base = {
    user_id: "id",
    is_active: true,
    first_name: "A",
    last_name: "B",
  };
  for (const role of ["supervisor", "assistant"])
    assert.equal(verifiedUser({ ...base, role }, "web").role, role);
  assert.equal(
    verifiedUser({ ...base, role: "worker" }, "worker").role,
    "worker",
  );
  assert.throws(() => verifiedUser({ ...base, role: "supervisor" }, "worker"));
  assert.throws(() => verifiedUser({ ...base, role: "worker" }, "web"));
  assert.throws(() =>
    verifiedUser({ ...base, role: "worker", is_active: false }, "worker"),
  );
  assert.throws(() => verifiedUser({ ...base, role: "admin" }, "web"));
  assert.throws(() => verifiedUser({}, "web"));
});
test("proxy route allowlist rejects arbitrary URLs traversal and unsupported writes", () => {
  const id = "11111111-1111-4111-8111-111111111111";
  assert.ok(allowed("GET", ["web", "me"]));
  assert.ok(allowed("POST", ["liff", "attendance", "check-in"]));
  assert.ok(
    allowed("POST", ["web", "requisitions", id, "purchase", "preview"]),
  );
  assert.ok(
    allowed("POST", ["web", "contracts", id, "operations-summary", "notify"]),
  );
  for (const path of [
    ["web", "..", "me"],
    ["https:", "evil"],
    ["web", "secrets"],
    ["web", "requisitions", "invalid", "purchase"],
  ])
    assert.equal(allowed("GET", path), false);
  assert.equal(allowed("DELETE", ["web", "users", id]), false);
});
test("proxy origin policy allows fixed HTTPS or loopback only", () => {
  for (const value of [
    "https://api.example.com",
    "http://127.0.0.1:8080",
    "http://localhost:8080",
  ])
    assert.ok(backendURL(value));
  for (const value of [
    undefined,
    "http://example.com",
    "https://user:password@example.com",
    "https://api.example.com/api",
    "https://api.example.com?target=x",
    "file:///test",
  ])
    assert.equal(backendURL(value), null);
});
