import test from "node:test";
import assert from "node:assert/strict";
import { API, APIError } from "../lib/api";
test("missing token and preview block requests before any network call", async () => {
  const previous = global.fetch;
  let calls = 0;
  global.fetch = async () => {
    calls++;
    return Response.json({});
  };
  try {
    await assert.rejects(
      new API("worker", () => null).get("me"),
      (e: unknown) => e instanceof APIError && e.status === 401,
    );
    await assert.rejects(
      new API("supervisor", () => null, true).post("payroll/batch", {}),
      (e: unknown) => e instanceof APIError && e.status === 403,
    );
    assert.equal(calls, 0);
  } finally {
    global.fetch = previous;
  }
});
test("API sends ID token on the correct platform and does not trust client IDs", async () => {
  const previous = global.fetch;
  const requests: { url: string; headers: Headers; body?: BodyInit | null }[] =
    [];
  global.fetch = async (input, init) => {
    requests.push({
      url: String(input),
      headers: new Headers(init?.headers),
      body: init?.body,
    });
    return Response.json({ data: [{ schedule_id: "s" }] });
  };
  try {
    const client = new API("worker", () => "test-id-token");
    assert.equal((await client.list("schedules?limit=50")).length, 1);
    await client.post("attendance/check-in", {
      schedule_id: "s",
      latitude: 13,
      longitude: 100,
      accuracy_m: 5,
      qr_token: "signed-qr",
    });
    assert.equal(requests[0].url, "/api/backend/liff/schedules?limit=50");
    assert.equal(
      requests[1].headers.get("authorization"),
      "Bearer test-id-token",
    );
    const body = JSON.parse(String(requests[1].body));
    assert.equal(body.accuracy_m, 5);
    assert.equal(body.qr_token, "signed-qr");
    assert.equal(body.user_id, undefined);
    assert.equal(body.role, undefined);
  } finally {
    global.fetch = previous;
  }
});
test("auth rejection, conflict and request IDs survive API error conversion", async () => {
  const previous = global.fetch;
  try {
    for (const status of [401, 403, 409]) {
      global.fetch = async () =>
        Response.json(
          { error: { message: "denied", request_id: "test-request" } },
          { status },
        );
      await assert.rejects(
        new API("assistant", () => "test").get("me"),
        (e: unknown) =>
          e instanceof APIError &&
          e.status === status &&
          e.requestID === "test-request",
      );
    }
  } finally {
    global.fetch = previous;
  }
});
test("uploads use raw bytes and returned private object path", async () => {
  const previous = global.fetch;
  global.fetch = async (input, init) => {
    assert.equal(String(input), "/api/backend/web/files");
    assert.ok(init?.body instanceof File);
    assert.equal(new Headers(init?.headers).get("content-type"), "image/png");
    return Response.json({ object_path: "user/object" });
  };
  try {
    assert.equal(
      await new API("assistant", () => "test").upload(
        new File(["x"], "x.png", { type: "image/png" }),
      ),
      "user/object",
    );
  } finally {
    global.fetch = previous;
  }
});
test("option loading follows paginated results and preserves query filters", async () => {
  const previous = global.fetch;
  const urls: string[] = [];
  global.fetch = async (input) => {
    urls.push(String(input));
    return Response.json({
      data:
        urls.length === 1
          ? Array.from({ length: 100 }, (_, i) => ({ worker_id: String(i) }))
          : [{ worker_id: "last" }],
    });
  };
  try {
    assert.equal(
      (
        await new API("assistant", () => "test").all(
          "workers/available?work_date=2026-10-09",
        )
      ).length,
      101,
    );
    assert.match(urls[1], /work_date=2026-10-09/);
    assert.match(urls[1], /offset=100/);
  } finally {
    global.fetch = previous;
  }
});

test("HTML from a tunnel is a connection error, never a successful API login", async () => {
  const previous = global.fetch;
  global.fetch = async (_, init) => {
    assert.equal(new Headers(init?.headers).get("accept"), "application/json");
    return new Response("<!DOCTYPE html><html>warning</html>", {
      headers: { "content-type": "text/html" },
    });
  };
  try {
    await assert.rejects(
      new API("supervisor", () => "test").get("me"),
      (error: unknown) =>
        error instanceof APIError &&
        error.status === 502 &&
        !error.message.includes("<!DOCTYPE"),
    );
  } finally {
    global.fetch = previous;
  }
});

test("expired LINE token gives a relogin instruction without retrying or bypassing auth", async () => {
  const previous = global.fetch;
  let calls = 0;
  global.fetch = async () => {
    calls++;
    return Response.json(
      { error: { message: "invalid or expired token" } },
      { status: 401 },
    );
  };
  try {
    await assert.rejects(
      new API("supervisor", () => "test-expired").get("requisitions"),
      (e: unknown) =>
        e instanceof APIError &&
        e.status === 401 &&
        /เข้าสู่ระบบ LINE ใหม่/.test(e.message),
    );
    assert.equal(calls, 1);
  } finally {
    global.fetch = previous;
  }
});
