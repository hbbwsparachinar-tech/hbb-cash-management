export const SESSION_IDLE_TIMEOUT_MS = 30 * 60 * 1000;

export type SessionActivity = {
  signedInAt: number;
  lastActiveAt: number;
};

export type SessionExpiryReason = "missing" | "invalid" | "idle" | "new-day";

const activityKey = "hbb-cash-session-activity";
const hospitalTimeZone = "Asia/Karachi";
const hospitalDateFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: hospitalTimeZone,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
let memoryActivity: SessionActivity | null = null;

export function hospitalDay(value: number | string | Date): string | null {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const parts = hospitalDateFormatter.formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function sessionExpiry(
  activity: SessionActivity | null,
  now = Date.now(),
): SessionExpiryReason | null {
  if (!activity) return "missing";
  if (
    !Number.isFinite(activity.signedInAt) ||
    !Number.isFinite(activity.lastActiveAt) ||
    activity.signedInAt > activity.lastActiveAt ||
    activity.lastActiveAt > now ||
    activity.signedInAt <= 0
  ) return "invalid";
  if (hospitalDay(activity.signedInAt) !== hospitalDay(now)) return "new-day";
  if (now - activity.lastActiveAt >= SESSION_IDLE_TIMEOUT_MS) return "idle";
  return null;
}

function browserStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try { return window.sessionStorage; } catch { return null; }
}

export function readSessionActivity(): SessionActivity | null {
  const storage = browserStorage();
  if (!storage) return memoryActivity;
  try {
    const value = storage.getItem(activityKey);
    if (!value) return null;
    const parsed = JSON.parse(value) as SessionActivity;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch { return null; }
}

export function beginSession(now = Date.now()): void {
  const activity = { signedInAt: now, lastActiveAt: now };
  memoryActivity = activity;
  try { browserStorage()?.setItem(activityKey, JSON.stringify(activity)); } catch { /* in-memory fallback */ }
}

export function recordSessionActivity(now = Date.now()): void {
  const activity = readSessionActivity();
  if (sessionExpiry(activity, now)) return;
  if (now - activity!.lastActiveAt < 15_000) return;
  const updated = { ...activity!, lastActiveAt: now };
  memoryActivity = updated;
  try { browserStorage()?.setItem(activityKey, JSON.stringify(updated)); } catch { /* in-memory fallback */ }
}

export function clearSessionActivity(): void {
  memoryActivity = null;
  try { browserStorage()?.removeItem(activityKey); } catch { /* storage unavailable */ }
}
