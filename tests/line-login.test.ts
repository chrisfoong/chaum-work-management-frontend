import test from "node:test";
import assert from "node:assert/strict";
import { startLINELogin } from "../lib/line";

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
