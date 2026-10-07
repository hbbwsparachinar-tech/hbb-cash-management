import assert from "node:assert/strict";
import test from "node:test";
import {
  SESSION_IDLE_TIMEOUT_MS,
  beginSession,
  clearSessionActivity,
  hospitalDay,
  readSessionActivity,
  recordSessionActivity,
  sessionExpiry,
} from "../lib/session-policy.ts";

test("session expires at the inactivity limit", () => {
  const signedInAt = Date.parse("2026-10-07T09:00:00+05:00");
  const activity = { signedInAt, lastActiveAt: signedInAt };
  assert.equal(sessionExpiry(activity, signedInAt + SESSION_IDLE_TIMEOUT_MS - 1), null);
  assert.equal(sessionExpiry(activity, signedInAt + SESSION_IDLE_TIMEOUT_MS), "idle");
});

test("a new day in Pakistan requires another sign-in", () => {
  const signedInAt = Date.parse("2026-10-06T18:59:00Z");
  const nextDay = Date.parse("2026-10-06T19:00:00Z");
  assert.equal(hospitalDay(signedInAt), "2026-10-06");
  assert.equal(hospitalDay(nextDay), "2026-10-07");
  assert.equal(sessionExpiry({ signedInAt, lastActiveAt: signedInAt }, nextDay), "new-day");
});

test("missing or inconsistent session records fail closed", () => {
  assert.equal(sessionExpiry(null), "missing");
  assert.equal(sessionExpiry({ signedInAt: 2, lastActiveAt: 1 }, 3), "invalid");
  assert.equal(sessionExpiry({ signedInAt: 1, lastActiveAt: 4 }, 3), "invalid");
});

test("activity is stored for this browser tab and cleared on sign-out", () => {
  const items = new Map();
  globalThis.window = { sessionStorage: {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => items.set(key, value),
    removeItem: (key) => items.delete(key),
  } };
  const signedInAt = Date.parse("2026-10-07T09:00:00+05:00");
  beginSession(signedInAt);
  recordSessionActivity(signedInAt + 20_000);
  assert.equal(readSessionActivity()?.lastActiveAt, signedInAt + 20_000);
  clearSessionActivity();
  assert.equal(readSessionActivity(), null);
  delete globalThis.window;
});
