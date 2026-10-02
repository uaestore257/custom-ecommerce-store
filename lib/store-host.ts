import { normalizeHost } from "./auth/constants";

// ---------------------------------------------------------------
// WHICH STORE A HOSTNAME SERVES (pure rules; the database lookup is in
// lib/server/storefront/catalog.ts). The store always comes from the
// request's Host on the server, never from anything the browser sends.
//
//   <slug>.<PLATFORM_ROOT_DOMAIN>   -> the store with that slug
//   a host listed in STORE_DOMAINS  -> a trusted operator-configured alias
//                                      (database ownership/status overrides it)
//   ADMIN_HOST                      -> platform host
//   PLATFORM_ROOT_DOMAIN itself     -> platform business website in local
//                                      development; it does not name a store
//   anything else                   -> unknown: no store is shown
//
// STORE_DOMAINS is a trusted, operator-managed comma-separated list of
// host=slug pairs, e.g.
// "shop.example.com=client-a,www.shop.example.com=client-a".
// ---------------------------------------------------------------

export type StoreHostMatch = { kind: "store"; slug: string } | { kind: "platform" } | { kind: "unknown" };

export interface StoreHostConfig {
  adminHost: string;
  rootDomain: string;
  customDomains: Map<string, string>;
  production: boolean;
}

/** Store slugs as the admin accepts them (isSlug in lib/admin/validation.ts). */
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
/** Subdomains that never name a store. */
const RESERVED = new Set(["www", "admin", "api", "app", "mail"]);

/** Hostname without the port (IPv6 literals keep their brackets). */
function hostname(host: string) {
  return host.startsWith("[") ? host.slice(0, host.indexOf("]") + 1) : host.split(":")[0];
}

/** Parses STORE_DOMAINS. Malformed entries are ignored (fails closed: that host serves no store). */
export function parseStoreDomains(value: string | undefined): Map<string, string> {
  const map = new Map<string, string>();
  for (const entry of (value ?? "").split(",")) {
    const [rawHost, rawSlug, extra] = entry.split("=");
    if (extra !== undefined || !rawHost || !rawSlug) continue;
    const host = hostname(normalizeHost(rawHost));
    const slug = rawSlug.trim().toLowerCase();
    if (host && SLUG.test(slug)) map.set(host, slug);
  }
  return map;
}

export function storeHostConfig(env: NodeJS.ProcessEnv = process.env): StoreHostConfig {
  return {
    adminHost: normalizeHost(env.ADMIN_HOST ?? ""),
    rootDomain: hostname(normalizeHost(env.PLATFORM_ROOT_DOMAIN ?? "")),
    customDomains: parseStoreDomains(env.STORE_DOMAINS),
    production: env.NODE_ENV === "production",
  };
}

/** The bare development root belongs to the platform website, not a store preview. */
export function isPlatformBusinessHost(rawHost: string, env: NodeJS.ProcessEnv = process.env) {
  const config = storeHostConfig(env);
  return Boolean(
    config.rootDomain &&
      !config.production &&
      hostname(normalizeHost(rawHost)) === config.rootDomain &&
      normalizeHost(rawHost) !== config.adminHost,
  );
}

export function matchStoreHost(rawHost: string, config: StoreHostConfig): StoreHostMatch {
  const host = normalizeHost(rawHost);
  if (!host) return { kind: "unknown" };
  // Same comparison as the proxy's admin check (port included).
  if (config.adminHost && host === config.adminHost) return { kind: "platform" };

  const name = hostname(host);
  const mapped = config.customDomains.get(name);
  if (mapped) return { kind: "store", slug: mapped };

  const root = config.rootDomain;
  if (!root) return { kind: "unknown" };
  if (name === root) return config.production ? { kind: "unknown" } : { kind: "platform" };
  if (name.endsWith(`.${root}`)) {
    const label = name.slice(0, -(root.length + 1));
    // One label only: a.b.<root> is not a store.
    if (SLUG.test(label) && !RESERVED.has(label)) return { kind: "store", slug: label };
  }
  return { kind: "unknown" };
}

/** Absolute storefront homepage URL for a store slug, using the same host mapping as requests. */
export function storefrontUrlForSlug(slug: string, baseUrl: string, config: StoreHostConfig): string | null {
  if (!SLUG.test(slug)) return null;

  const customHost = [...config.customDomains].find(([, mappedSlug]) => mappedSlug === slug)?.[0];
  const storefrontHost = customHost ?? (config.rootDomain ? `${slug}.${config.rootDomain}` : null);
  if (!storefrontHost) return null;

  try {
    const url = new URL(baseUrl);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    url.hostname = storefrontHost;
    url.pathname = "/";
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}
