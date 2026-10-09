import test from "node:test";
import assert from "node:assert/strict";
import { withDeadline } from "../lib/line";
test("LINE initialization deadline surfaces failures and never treats timeout as authenticated", async () => {
  assert.equal(await withDeadline(Promise.resolve("done"), 100), "done");
  await assert.rejects(
    withDeadline(Promise.reject(new Error("LINE failed")), 100),
    /LINE failed/,
  );
  await assert.rejects(
    withDeadline(new Promise(() => {}), 5),
    /LINE.*นานเกินไป/,
  );
});
