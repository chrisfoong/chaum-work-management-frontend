import test from "node:test";
import assert from "node:assert/strict";
import { GET, POST } from "../app/api/backend/[...path]/route";
const context = (...path: string[]) => ({ params: Promise.resolve({ path }) });
test("proxy denies unauthenticated and unlisted paths without connecting upstream", async () => {
  const previous = global.fetch;
  let called = false;
  global.fetch = async () => {
    called = true;
    return Response.json({});
  };
  try {
    assert.equal(
      (
        await GET(
          new Request("http://frontend/api/backend/web/me"),
          context("web", "me"),
        )
      ).status,
      401,
    );
    assert.equal(
      (
        await GET(
          new Request("http://frontend/api/backend/web/private"),
          context("web", "private"),
        )
      ).status,
      404,
    );
    assert.equal(called, false);
  } finally {
    global.fetch = previous;
  }
});
test("proxy keeps authentication and query, strips cookies, avoids redirect and cache", async () => {
  const previous = global.fetch;
  const config = process.env.BACKEND_URL;
  process.env.BACKEND_URL = "http://127.0.0.1:8080";
  global.fetch = async (input, init) => {
    assert.equal(
      String(input),
      "http://127.0.0.1:8080/api/liff/attendance/check-in?test=yes",
    );
    assert.equal(
      new Headers(init?.headers).get("authorization"),
      "Bearer test-only-token",
    );
    assert.equal(new Headers(init?.headers).get("cookie"), null);
    assert.equal(init?.redirect, "error");
    assert.equal(init?.cache, "no-store");
    const payload = JSON.parse(
      new TextDecoder().decode(init?.body as Uint8Array),
    );
    assert.equal(payload.schedule_id, "test");
    return Response.json(
      { success: true },
      {
        headers: { "x-request-id": "example", "set-cookie": "do-not-forward" },
      },
    );
  };
  try {
    const response = await POST(
      new Request(
        "http://frontend/api/backend/liff/attendance/check-in?test=yes",
        {
          method: "POST",
          headers: {
            authorization: "Bearer test-only-token",
            "content-type": "application/json",
            cookie: "secret=not-real",
          },
          body: JSON.stringify({ schedule_id: "test" }),
        },
      ),
      context("liff", "attendance", "check-in"),
    );
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.equal(response.headers.get("set-cookie"), null);
    assert.equal(response.headers.get("x-request-id"), "example");
  } finally {
    global.fetch = previous;
    if (config === undefined) delete process.env.BACKEND_URL;
    else process.env.BACKEND_URL = config;
  }
});
test("proxy limits upload size and returns sanitized connection errors", async () => {
  const previous = global.fetch;
  const config = process.env.BACKEND_URL;
  process.env.BACKEND_URL = "http://127.0.0.1:8080";
  global.fetch = async () => {
    throw new Error("sensitive internal detail");
  };
  try {
    const headers = { authorization: "Bearer test-only-token" };
    assert.equal(
      (
        await POST(
          new Request("http://frontend/files", {
            method: "POST",
            headers,
            body: new Uint8Array(6 * 1024 * 1024 + 1),
          }),
          context("web", "files"),
        )
      ).status,
      413,
    );
    const failed = await GET(
      new Request("http://frontend/me", { headers }),
      context("web", "me"),
    );
    assert.equal(failed.status, 502);
    assert.doesNotMatch(await failed.text(), /sensitive/);
  } finally {
    global.fetch = previous;
    if (config === undefined) delete process.env.BACKEND_URL;
    else process.env.BACKEND_URL = config;
  }
});
