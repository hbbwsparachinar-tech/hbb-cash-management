import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null | undefined;

function authStorageKey(url: string) {
  return `sb-${new URL(url).hostname.split(".")[0]}-auth-token`;
}

export function clearBrowserSupabaseSession() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url || typeof window === "undefined") return;
  try { window.sessionStorage.removeItem(authStorageKey(url)); } catch { /* storage unavailable */ }
  try { window.localStorage.removeItem(authStorageKey(url)); } catch { /* storage unavailable */ }
}

export function getBrowserSupabaseClient() {
  if (browserClient !== undefined) return browserClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    browserClient = null;
    return browserClient;
  }

  let storage: Storage | undefined;
  if (typeof window !== "undefined") {
    try {
      storage = window.sessionStorage;
      window.localStorage.removeItem(authStorageKey(url));
    } catch { /* Browser storage may be unavailable; keep auth in memory. */ }
  }

  browserClient = createClient(url, publishableKey, {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: false,
      persistSession: Boolean(storage),
      storage,
    },
  });

  return browserClient;
}
