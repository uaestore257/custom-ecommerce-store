// Safe wrappers around localStorage.
// localStorage can be missing (server rendering), blocked (private
// browsing, strict privacy settings) or full. In those cases the demo
// keeps working in memory for the current visit.
//
// Never put passwords, secret keys or payment details in here.

export const STORAGE_PREFIX = "ecom-demo:v1:";

function getStorage(): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readJson<T>(key: string): T | null {
  const storage = getStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(STORAGE_PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function writeJson(key: string, value: unknown) {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  } catch {
    // Storage full or blocked: keep the in-memory value only.
  }
}

export function removeKeys(predicate: (key: string) => boolean) {
  const storage = getStorage();
  if (!storage) return;
  try {
    const keys: string[] = [];
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key && key.startsWith(STORAGE_PREFIX) && predicate(key)) keys.push(key);
    }
    keys.forEach((key) => storage.removeItem(key));
  } catch {
    // Ignore
  }
}
