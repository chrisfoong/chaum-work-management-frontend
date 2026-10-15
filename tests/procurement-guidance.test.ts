import test from "node:test";
import assert from "node:assert/strict";
import { retryOptions, procurementNextStep } from "../lib/procurement-guidance";
test("retry events follow committed status and original reviewing assistant", () => {
  assert.deepEqual(retryOptions({ status: "pending_survey" }, "me", false), []);
  assert.equal(
    retryOptions({ status: "pending_approval" }, "me", false)[0].value,
    "approval_needed",
  );
  assert.equal(
    retryOptions({ status: "pending_fund" }, "me", false)[0].value,
    "purchase_funding",
  );
  assert.deepEqual(
    retryOptions(
      { status: "completed", requisition_type: "additional" },
      "me",
      false,
    ),
    [],
  );
  assert.equal(
    retryOptions(
      { status: "completed", requisition_type: "additional" },
      "me",
      true,
    )[0].value,
    "delivery",
  );
  assert.deepEqual(
    retryOptions(
      { status: "completed", requisition_type: "tor_base" },
      "me",
      true,
    ),
    [],
  );
  assert.deepEqual(
    retryOptions(
      {
        status: "rejected",
        requisition_type: "additional",
        reviewed_by: "other",
      },
      "me",
      false,
    ),
    [],
  );
  assert.equal(
    retryOptions(
      { status: "rejected", requisition_type: "additional", reviewed_by: "me" },
      "me",
      false,
    )[0].value,
    "no_purchase",
  );
});
test("blocked stages explain next actor and action", () => {
  assert.match(
    procurementNextStep(
      { status: "pending_survey", requisition_type: "additional" },
      false,
    ),
    /ตรวจและพิจารณาคำขอ/,
  );
  assert.match(
    procurementNextStep({ status: "pending_approval" }, false),
    /Supervisor/,
  );
  assert.match(
    procurementNextStep({ status: "pending_fund" }, false),
    /บันทึกโอนเงิน/,
  );
  assert.match(
    procurementNextStep(
      { status: "completed", requisition_type: "additional" },
      false,
    ),
    /บันทึกการส่งมอบ/,
  );
});
