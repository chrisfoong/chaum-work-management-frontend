import test from "node:test";
import assert from "node:assert/strict";
import { automaticLINELogin, startLINELogin } from "../lib/line";

test("explicit login renews an existing rejected LINE session before authorization", () => {
  let loggedIn = true;
  const actions: string[] = [];
  startLINELogin(
    {
      isLoggedIn: () => loggedIn,
      logout: () => {
        loggedIn = false;
        actions.push("logout");
      },
      login: ({ redirectUri }) => {
        assert.equal(loggedIn, false);
        actions.push(redirectUri);
      },
    },
    "https://example.com/web",
  );
  assert.deepEqual(actions, ["logout", "https://example.com/web"]);
});
test("signed-out Worker login preserves the Worker redirect and starts only once", () => {
  const actions: string[] = [];
  startLINELogin(
    {
      isLoggedIn: () => false,
      logout: () => {
        throw new Error("unexpected logout");
      },
      login: ({ redirectUri }) => actions.push(redirectUri),
    },
    "https://example.com/worker",
  );
  assert.deepEqual(actions, ["https://example.com/worker"]);
});

test("automatic login redirects once and waits for LINE instead of looping", () => {
  const saved = new Map<string, string>();
  const storage = {
    getItem: (key: string) => saved.get(key) ?? null,
    setItem: (key: string, value: string) => {
      saved.set(key, value);
    },
  };
  const redirects: string[] = [];
  const liff = {
    isLoggedIn: () => false,
    isInClient: () => false,
    login: ({ redirectUri }: { redirectUri: string }) =>
      redirects.push(redirectUri),
  };
  assert.equal(
    automaticLINELogin(liff, "https://example.com/web", storage, "web"),
    "redirecting",
  );
  assert.equal(
    automaticLINELogin(liff, "https://example.com/web", storage, "web"),
    "retry-required",
  );
  assert.deepEqual(redirects, ["https://example.com/web"]);
  assert.equal(
    automaticLINELogin(
      { ...liff, isLoggedIn: () => true },
      "https://example.com/web",
      storage,
      "web",
    ),
    "logged-in",
  );
});

test("automatic login does not call liff.login inside LINE", () => {
  const liff = {
    isLoggedIn: () => false,
    isInClient: () => true,
    login: () => {
      throw new Error("must not call liff.login in LINE");
    },
  };
  const storage = { getItem: () => null, setItem: () => {} };
  assert.equal(
    automaticLINELogin(liff, "https://example.com/worker", storage, "worker"),
    "open-in-line",
  );
});
