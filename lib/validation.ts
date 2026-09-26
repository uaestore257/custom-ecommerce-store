// Small, readable validation helpers used by the demo forms.
// Frontend validation improves the experience; a real backend must
// validate again because browser checks can be bypassed.

export type FieldErrors<T> = Partial<Record<keyof T, string>>;

export function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

/** Accepts UAE numbers such as 050 123 4567, +971 50 123 4567, 04 123 4567. */
export function isUaePhone(value: string) {
  const digits = value.replace(/[\s()-]/g, "");
  return /^(\+971|00971|0)?[1-9]\d{7,8}$/.test(digits);
}

/** Loose international phone check for non-UAE stores. */
export function isPhone(value: string) {
  const digits = value.replace(/[\s()-]/g, "");
  return /^\+?\d{7,15}$/.test(digits);
}

export function isSlug(value: string) {
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(value);
}

export function isHexColor(value: string) {
  return /^#[0-9a-fA-F]{6}$/.test(value);
}

/** Domain names such as shop.example.com (no protocol, no path). */
export function isDomain(value: string) {
  return /^(?=.{3,253}$)([a-z0-9](-*[a-z0-9])*\.)+[a-z]{2,}$/i.test(value.trim());
}

export function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function hasErrors<T>(errors: FieldErrors<T>) {
  return Object.values(errors).some(Boolean);
}
