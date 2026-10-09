import test from "node:test";
import assert from "node:assert/strict";
import { gpsProblem, qrExpiry } from "../lib/attendance";
test("GPS requires TOR coordinates, finite position, accuracy <=50m and radius <=200m", () => {
  const point = { latitude: 13, longitude: 100, accuracy: 50 };
  assert.equal(gpsProblem(point, "13", "100"), null);
  assert.ok(gpsProblem({ ...point, accuracy: 50.01 }, "13", "100"));
  assert.ok(gpsProblem({ ...point, latitude: 13.003 }, "13", "100"));
  assert.ok(gpsProblem({ ...point, latitude: NaN }, "13", "100"));
  assert.ok(gpsProblem(point, "", "100"));
  assert.ok(gpsProblem(point, "invalid", "100"));
  assert.ok(gpsProblem(null, "13", "100"));
});
test("QR countdown uses issuer expiry instead of resetting at scan time", () => {
  const token =
    Buffer.from(
      JSON.stringify({ assignment_id: "area", iat: 100, exp: 160 }),
    ).toString("base64url") + ".signature";
  assert.equal(qrExpiry(token), 160000);
  assert.equal(qrExpiry("bad"), null);
  const wrong =
    Buffer.from(
      JSON.stringify({ assignment_id: "area", iat: 100, exp: 999 }),
    ).toString("base64url") + ".signature";
  assert.equal(qrExpiry(wrong), null);
});
