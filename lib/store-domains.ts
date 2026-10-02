import { normalizeHost } from "./auth/constants";
import type { StoreHostConfig } from "./store-host";

const LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const IPV4 = /^\d{1,3}(?:\.\d{1,3}){3}$/;

function hostNameWithoutPort(value: string): string {
  const normalized = normalizeHost(value);
  if (normalized.startsWith("[")) return normalized;
  return normalized.split(":")[0];
}

export function normalizeRequestHostname(value: string): string | null {
  const input = value.trim();
  if (!input || /[,/@\\?#\s]/.test(input)) return null;
  try {
    const url = new URL(`http://${input}`);
    if (url.username || url.password || url.pathname !== "/" || url.search || url.hash) return null;
    const host = url.hostname.toLowerCase().replace(/\.+$/, "");
    if (!host || host.includes(":")) return null;
    return host;
  } catch {
    return null;
  }
}

/** Canonical ASCII hostname for a custom domain; ports and URL syntax are rejected. */
export function normalizeCustomHostname(value: unknown, config: StoreHostConfig): string | null {
  if (typeof value !== "string") return null;
  const input = value.trim().replace(/\.+$/, "");
  if (!input || /[:/@\\?#\s]/.test(input)) return null;

  let hostname: string;
  try {
    const url = new URL(`http://${input}`);
    if (url.username || url.password || url.port || url.pathname !== "/" || url.search || url.hash) return null;
    hostname = url.hostname.toLowerCase().replace(/\.+$/, "");
  } catch {
    return null;
  }

  if (
    hostname.length > 253 ||
    !hostname.includes(".") ||
    IPV4.test(hostname) ||
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname === hostNameWithoutPort(config.adminHost) ||
    hostname === config.rootDomain ||
    (config.rootDomain !== "" && hostname.endsWith(`.${config.rootDomain}`))
  ) {
    return null;
  }

  const labels = hostname.split(".");
  if (labels.some((label) => label.length > 63 || !LABEL.test(label))) return null;
  return hostname;
}
