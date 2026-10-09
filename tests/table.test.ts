import test from "node:test";
import assert from "node:assert/strict";
import { tableRowKeys } from "../lib/table";

test("payroll rows sharing a user and TOR retain distinct stable identities", () => {
  const data = [
    { payroll_id: "p1", user_id: "u", tor_id: "t" },
    { payroll_id: "p2", user_id: "u", tor_id: "t" },
  ];
  const keys = tableRowKeys(data);
  assert.equal(new Set(keys).size, 2);
  assert.deepEqual(tableRowKeys([...data].reverse()), [...keys].reverse());
});
test("shared TOR and repeated IDs never drop table rows or duplicate React keys", () => {
  const data = [
    { tor_id: "t", location_id: "l1" },
    { tor_id: "t", location_id: "l2" },
    { tor_id: "t", location_id: "l2" },
    {},
    {},
  ];
  const keys = tableRowKeys(data);
  assert.equal(keys.length, data.length);
  assert.equal(new Set(keys).size, data.length);
});
