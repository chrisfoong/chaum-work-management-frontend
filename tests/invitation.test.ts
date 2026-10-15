import test from "node:test";
import assert from "node:assert/strict";
import {
  invitationFromURL,
  invitationPlatformFromURL,
  invitationLoginRedirect,
} from "../lib/invitation";
import { allowed } from "../lib/proxy";

test("invitation fragment survives primary LIFF state and login redirect without becoming query data", () => {
  const token = "A".repeat(54);
  const source = `https://liff.line.me/123-id#invite=${token}&platform=worker`;
  assert.equal(invitationFromURL(source), token);
  assert.equal(invitationPlatformFromURL(source), "worker");
  const primary = `https://example.test/?liff.state=${encodeURIComponent(`/#invite=${token}&platform=worker`)}`;
  assert.equal(invitationFromURL(primary), token);
  assert.equal(invitationPlatformFromURL(primary), "worker");
  const redirect = new URL(
    invitationLoginRedirect("https://example.test", "worker", token),
  );
  assert.equal(redirect.pathname, "/worker");
  assert.equal(redirect.search, "");
  assert.equal(invitationFromURL(redirect.href), token);
  assert.equal(invitationFromURL("https://example.test/#invite=invalid"), null);
  assert.equal(invitationFromURL("not a URL"), null);
});
test("invitation proxy exposes only explicit claim and issuance methods", () => {
  const id = "11111111-1111-4111-8111-111111111111";
  assert.equal(allowed("POST", ["web", "invitations"]), true);
  assert.equal(allowed("POST", ["liff", "invitation", "claim"]), true);
  assert.equal(allowed("POST", ["web", "users", id, "invitation"]), true);
  assert.equal(
    allowed("POST", ["web", "users", id, "invitation", "cancel"]),
    true,
  );
  assert.equal(
    allowed("GET", ["web", "users", id, "invitation", "cancel"]),
    false,
  );
  assert.equal(allowed("GET", ["liff", "invitation", "claim"]), false);
  assert.equal(allowed("GET", ["web", "invitations"]), false);
  assert.equal(allowed("POST", ["web", "registration"]), false);
});
