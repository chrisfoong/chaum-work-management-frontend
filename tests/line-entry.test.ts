import test from "node:test";
import assert from "node:assert/strict";
import { isLocalLINEEntry, lineEntryURL } from "../lib/line";

test("loopback LINE entry is distinguished from registered HTTPS endpoints", () => {
  for (const url of [
    "http://localhost:3000/",
    "http://127.0.0.1:5501/web",
    "http://[::1]:3000/worker",
    "https://test.localhost/web",
  ])
    assert.equal(isLocalLINEEntry(url), true);
  for (const url of [
    "https://unfiled-bunkhouse-float.ngrok-free.dev/web",
    "https://localhost.example.com/web",
    "invalid",
  ])
    assert.equal(isLocalLINEEntry(url), false);
});
test("local login launches configured LINE channel without a localhost redirect", () => {
  assert.equal(
    lineEntryURL("2011922638-yTzxAdCi", "web", null),
    "https://liff.line.me/2011922638-yTzxAdCi",
  );
  assert.equal(
    lineEntryURL("2011922658-kb0yFlBE", "worker", null),
    "https://miniapp.line.me/2011922658-kb0yFlBE",
  );
  const token = "a".repeat(54);
  const url = new URL(lineEntryURL("2011922658-kb0yFlBE", "worker", token));
  assert.equal(url.search, "");
  assert.equal(new URLSearchParams(url.hash.slice(1)).get("invite"), token);
  assert.equal(
    new URLSearchParams(url.hash.slice(1)).get("platform"),
    "worker",
  );
  assert.throws(
    () => lineEntryURL("https://other.example", "web", null),
    /LIFF ID/,
  );
});
