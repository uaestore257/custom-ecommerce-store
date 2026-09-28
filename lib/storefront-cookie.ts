// ---------------------------------------------------------------
// Which store the public storefront shows — a TEMPORARY, demo-era
// preference until real domain-based store resolution exists.
//
// The cookie is a preference, never an authorization: the server only
// honours it if it names an ACTIVE, non-archived store, and otherwise
// falls back to the configured default (lib/server/storefront/catalog.ts).
// Anyone can set it to any value; the worst they can do is view another
// store that is already public. It is set in the browser (the demo store
// switcher) and read by the server — it never has to be set server-side.
// ---------------------------------------------------------------

export const STOREFRONT_STORE_COOKIE = "storefront_store";

const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

/** Same shape as every other store id the app accepts from a request. */
export function isStoreIdCookieValue(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 64 && /^[A-Za-z0-9_-]+$/.test(value);
}

/** The store cookie's value from a raw Cookie header (server side), or undefined. */
export function storeIdFromCookieHeader(header: string | null | undefined): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === STOREFRONT_STORE_COOKIE) {
      const value = rest.join("=");
      return isStoreIdCookieValue(value) ? value : undefined;
    }
  }
  return undefined;
}

/** Browser only. Ignores anything that isn't a plausible store id. */
export function setStorefrontStoreCookie(storeId: string) {
  if (!isStoreIdCookieValue(storeId)) return;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${STOREFRONT_STORE_COOKIE}=${storeId}; Path=/; Max-Age=${MAX_AGE_SECONDS}; SameSite=Lax${secure}`;
}

/** Browser only. Back to the configured default store. */
export function clearStorefrontStoreCookie() {
  document.cookie = `${STOREFRONT_STORE_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}
