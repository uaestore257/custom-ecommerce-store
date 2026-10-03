import { normalizeHost } from "./auth/constants";

// ---------------------------------------------------------------
// WHICH STORE A HOSTNAME SERVES (pure rules; the database lookup is in
// lib/server/storefront/catalog.ts). The store always comes from the
// request's Host on the server, never from anything the browser sends.
//
//   <slug>.<PLATFORM_ROOT_DOMAIN>   -> the store's public storefront
//   admin.<slug>.<PLATFORM_ROOT_DOMAIN> -> that store's admin
//   a host listed in STORE_DOMAINS  -> a trusted operator-configured alias
//                                      (database ownership/status overrides it)
//   ADMIN_HOST                      -> platform host
//   PLATFORM_ROOT_DOMAIN itself     -> platform business website
//   anything else                   -> unknown: no store is shown
//
// STORE_DOMAINS is a trusted, operator-managed comma-separated list of
// host=slug pairs, e.g.
// "shop.example.com=client-a,www.shop.example.com=client-a".
// ---------------------------------------------------------------

export type StoreHostMatch =
  | { kind: "store"; slug: string }
  | { kind: "store-admin"; slug: string }
  | { kind: "platform" }
  | { kind: "unknown" };

export interface StoreHostConfig {
  adminHost: string;
  rootDomain: string;
  customDomains: Map<string, string>;
  production: boolean;
  previewMode: boolean;
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
    previewMode: env.STOREFRONT_PREVIEW_MODE === "path",
  };
}

function pathPreviewHostIsConfigured(config: StoreHostConfig) {
  return Boolean(config.previewMode && config.rootDomain && config.adminHost && hostname(config.adminHost) === config.rootDomain);
}

/** Only the explicitly configured ADMIN_HOST can use temporary path previews. */
export function isStorefrontPathPreviewHost(rawHost: string, env: NodeJS.ProcessEnv = process.env) {
  const config = storeHostConfig(env);
  return pathPreviewHostIsConfigured(config) && normalizeHost(rawHost) === config.adminHost;
}

/** Absolute same-host preview URL for the temporary path-preview mode. */
export function storefrontPathPreviewUrl(slug: string, baseUrl: string, config: StoreHostConfig): string | null {
  if (!SLUG.test(slug) || !pathPreviewHostIsConfigured(config)) return null;

  try {
    const url = new URL(baseUrl);
    if (
      (url.protocol !== "http:" && url.protocol !== "https:") ||
      hostname(normalizeHost(url.host)) !== config.rootDomain
    ) {
      return null;
    }
    url.pathname = `/preview/${slug}`;
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

/** The bare configured root is the business site; path mode also uses its isolated fallback host. */
export function isPlatformBusinessHost(rawHost: string, env: NodeJS.ProcessEnv = process.env) {
  if (isStorefrontPathPreviewHost(rawHost, env)) return true;
  const config = storeHostConfig(env);
  return Boolean(
    config.rootDomain &&
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
  const root = config.rootDomain;
  if (root && name === root) return { kind: "platform" };
  if (root && name.endsWith(`.${root}`)) {
    const label = name.slice(0, -(root.length + 1));
    const labels = label.split(".");
    if (
      labels.length === 2 &&
      labels[0] === "admin" &&
      SLUG.test(labels[1]) &&
      !RESERVED.has(labels[1])
    ) {
      return { kind: "store-admin", slug: labels[1] };
    }
  }

  const mapped = config.customDomains.get(name);
  if (mapped) return { kind: "store", slug: mapped };
  if (root && name.endsWith(`.${root}`)) {
    const label = name.slice(0, -(root.length + 1));
    // Public storefronts are exactly one label below the root.
    if (SLUG.test(label) && !RESERVED.has(label)) return { kind: "store", slug: label };
  }
  return { kind: "unknown" };
}

/** Absolute storefront homepage URL for a store slug, using the same host mapping as requests. */
export function storefrontUrlForSlug(
  slug: string,
  baseUrl: string,
  config: StoreHostConfig,
  verifiedPrimaryDomain?: string,
): string | null {
  if (!SLUG.test(slug)) return null;

  const configuredAlias = [...config.customDomains].find(([, mappedSlug]) => mappedSlug === slug)?.[0];
  const storefrontHost = verifiedPrimaryDomain ?? configuredAlias ?? (config.rootDomain ? `${slug}.${config.rootDomain}` : null);
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

/** Absolute Store Admin homepage URL for the store's reserved nested admin host. */
export function storeAdminUrlForSlug(slug: string, baseUrl: string, config: StoreHostConfig): string | null {
  if (!SLUG.test(slug) || RESERVED.has(slug) || !config.rootDomain) return null;
  try {
    const url = new URL(baseUrl);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    url.hostname = `admin.${slug}.${config.rootDomain}`;
    url.pathname = "/";
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

/**
 * URL for an explicit preview link: use a verified/configured public host,
 * otherwise use the path fallback only on its separately configured preview host.
 */
export function storefrontPreviewUrlForSlug(
  slug: string,
  baseUrl: string,
  config: StoreHostConfig,
  verifiedPrimaryDomain?: string,
): string | null {
  if (verifiedPrimaryDomain || [...config.customDomains.values()].includes(slug)) {
    const publicUrl = storefrontUrlForSlug(slug, baseUrl, config, verifiedPrimaryDomain);
    if (publicUrl) return publicUrl;
  }
  try {
    const baseHost = normalizeHost(new URL(baseUrl).host);
    if (pathPreviewHostIsConfigured(config) && baseHost === config.adminHost) {
      return storefrontPathPreviewUrl(slug, baseUrl, config);
    }
  } catch {
    return null;
  }
  return storefrontUrlForSlug(slug, baseUrl, config, verifiedPrimaryDomain);
}

/** Absolute platform business-site URL, derived from the configured admin origin. */
export function platformRootUrl(path: string, baseUrl: string, config: StoreHostConfig): string | null {
  if (!config.rootDomain || !path.startsWith("/")) return null;
  try {
    const url = new URL(baseUrl);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    url.hostname = config.rootDomain;
    url.pathname = path;
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}
