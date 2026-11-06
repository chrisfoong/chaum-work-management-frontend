import test from "node:test";
import assert from "node:assert/strict";
import { allowed } from "../lib/proxy";
test("Supervisor correction routes are explicitly listed and not exposed under Worker platform", () => {
  const id = "a1b2c3d4-1234-4234-8234-123456789abc";
  for (const [method, path] of [
    ["PATCH", `contracts/${id}/details`],
    ["POST", `contracts/${id}/assignments`],
    ["GET", `assignments/${id}/scope`],
    ["PATCH", `assignments/${id}/scope`],
    ["PATCH", `invoices/${id}`],
  ]) {
    assert.equal(allowed(method, ["web", ...path.split("/")]), true);
    assert.equal(allowed(method, ["liff", ...path.split("/")]), false);
  }
  assert.equal(allowed("DELETE", ["web", "contracts", id, "details"]), false);
});
