import test from "node:test";
import assert from "node:assert/strict";
import { API, APIError } from "../lib/api";

test("expired sessions invalidate the app session, but permission denials do not", async () => {
  const previous = global.fetch;
  let expired = 0;
  let calls = 0;
  global.fetch = async () => {
    calls++;
    return Response.json({}, { status: calls === 1 ? 401 : 403 });
  };
  try {
    const api = new API("assistant", () => "test", false, {
      onUnauthorized: () => expired++,
    });
    await assert.rejects(
      api.get("me"),
      (e: unknown) => e instanceof APIError && e.status === 401,
    );
    assert.equal(expired, 1);
    await assert.rejects(
      api.get("reports/profit"),
      (e: unknown) => e instanceof APIError && e.status === 403,
    );
    assert.equal(expired, 1);
    assert.equal(calls, 2);
  } finally {
    global.fetch = previous;
  }
});

test("a missing SDK token invalidates the session without a network request", async () => {
  let expired = false;
  const api = new API("worker", () => null, false, {
    onUnauthorized: () => {
      expired = true;
    },
  });
  await assert.rejects(api.get("schedules"));
  assert.equal(expired, true);
});

test("a stalled request times out without automatically repeating a write", async () => {
  const previous = global.fetch;
  let calls = 0;
  global.fetch = async (_, init) => {
    calls++;
    return new Promise<Response>((_, reject) => {
      init?.signal?.addEventListener(
        "abort",
        () => reject(init.signal?.reason),
        { once: true },
      );
    });
  };
  // Keep the test alive while the unref'd AbortSignal timeout fires.
  const keepAlive = setTimeout(() => {}, 1000);
  try {
    const api = new API("assistant", () => "test", false, {
      requestTimeoutMs: 10,
    });
    await assert.rejects(
      api.post("schedules", {}),
      (e: unknown) =>
        e instanceof APIError &&
        e.status === 408 &&
        /ตรวจสถานะล่าสุดก่อนทำซ้ำ/.test(e.message),
    );
    assert.equal(calls, 1);
  } finally {
    clearTimeout(keepAlive);
    global.fetch = previous;
  }
});

test("caller cancellation still cancels a request and does not report a timeout", async () => {
  const previous = global.fetch;
  const controller = new AbortController();
  global.fetch = async (_, init) =>
    new Promise<Response>((_, reject) => {
      init?.signal?.addEventListener(
        "abort",
        () => reject(init.signal?.reason),
        { once: true },
      );
      controller.abort();
    });
  try {
    await assert.rejects(
      new API("worker", () => "test").get("schedules", controller.signal),
      (e: unknown) => e instanceof APIError && e.status === 0,
    );
  } finally {
    global.fetch = previous;
  }
});
