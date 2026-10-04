import { PLATFORM_FALLBACK_NAME } from "@/lib/platform-brand";
import { isEmail } from "@/lib/validation";

// ---------------------------------------------------------------
// AGENCY PROFILE (pure: no React, no database)
//
// The public agency website (the bare PLATFORM_ROOT_DOMAIN) takes its
// identity, about, contact, social and SEO from ONE place: Agency
// settings (PlatformSettings, lib/server/agency.ts). This module defines
// the shapes, validates admin input strictly on every write, normalizes
// stored data defensively on every read, and holds the copy used while a
// field is still empty — so no page component keeps its own copy of
// agency information.
//
// Platform data only: nothing here is read from, or written to, a Store.
// ---------------------------------------------------------------

export const SOCIAL_PLATFORMS = [
  { key: "linkedin", label: "LinkedIn" },
  { key: "instagram", label: "Instagram" },
  { key: "facebook", label: "Facebook" },
  { key: "x", label: "X (Twitter)" },
  { key: "youtube", label: "YouTube" },
  { key: "github", label: "GitHub" },
  { key: "tiktok", label: "TikTok" },
  { key: "behance", label: "Behance" },
  { key: "dribbble", label: "Dribbble" },
  { key: "custom", label: "Other" },
] as const;
export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number]["key"];

export interface SocialLink {
  platform: SocialPlatform;
  url: string;
  /** Shown instead of the platform name (required for "custom"). */
  label?: string;
}

export interface TeamMember {
  name: string;
  title: string;
  bio?: string;
  imageUrl?: string;
}

/** Everything the public agency website may show. Empty optional fields are omitted. */
export interface AgencyProfile {
  name: string;
  tagline: string;
  description: string;
  logoUrl?: string;
  logoIsWordmark: boolean;
  brandMarkUrl?: string;
  aboutTitle: string;
  aboutBody: string[];
  team: TeamMember[];
  contact: {
    email?: string;
    phone?: string;
    whatsapp?: string;
    /** Address lines in display order. */
    address: string[];
    businessHours?: string;
    /** Where project enquiries are addressed (enquiry email, else business email). */
    enquiryEmail?: string;
  };
  social: (SocialLink & { displayLabel: string })[];
  seo: {
    title?: string;
    description: string;
    ogImageUrl?: string;
  };
}

/** Copy used while a field is empty. The only place it lives. */
export const AGENCY_DEFAULTS = {
  tagline: "AI-first digital commerce studio",
  description:
    "An AI-first digital commerce studio. We design and build premium ecommerce stores, websites, apps and AI-powered systems — on a production commerce platform we engineer ourselves.",
  aboutTitle: "A studio that builds what it sells.",
  aboutBody: [
    "We are an AI-first digital commerce studio. We design and engineer ecommerce stores, websites, apps and AI systems — and we run our own commerce platform underneath the stores we launch.",
    "That combination lets a store look entirely its own while sharing everything that should never be reinvented.",
  ],
} as const;

export const AGENCY_LIMITS = {
  name: 80,
  tagline: 120,
  description: 400,
  url: 2048,
  aboutTitle: 120,
  aboutBody: 4000,
  memberName: 80,
  memberTitle: 80,
  memberBio: 1200,
  team: 12,
  phone: 40,
  addressLine: 200,
  addressPart: 100,
  postalCode: 20,
  businessHours: 200,
  email: 254,
  social: 20,
  socialLabel: 40,
  seoTitle: 120,
  seoDescription: 300,
} as const;

const SOCIAL_KEYS = new Set<string>(SOCIAL_PLATFORMS.map((platform) => platform.key));

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** An https:// URL, or a path on this site ("/brand/logo.svg" — files in public/brand/). Never javascript:, data: or protocol-relative. */
export function isSafeImageUrl(value: string) {
  if (value.startsWith("/") && !value.startsWith("//") && !value.includes("\\")) return true;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

/** An https:// link (social profiles). */
export function isHttpsUrl(value: string) {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function text(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

/** Safe list of team members from stored JSON (never throws; drops anything malformed). */
export function normalizeTeam(raw: unknown): TeamMember[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, AGENCY_LIMITS.team).flatMap((entry) => {
    if (!isPlainObject(entry)) return [];
    const name = text(entry.name, AGENCY_LIMITS.memberName);
    if (!name) return [];
    const member: TeamMember = { name, title: text(entry.title, AGENCY_LIMITS.memberTitle) };
    const bio = text(entry.bio, AGENCY_LIMITS.memberBio);
    const imageUrl = text(entry.imageUrl, AGENCY_LIMITS.url);
    if (bio) member.bio = bio;
    if (imageUrl && isSafeImageUrl(imageUrl)) member.imageUrl = imageUrl;
    return [member];
  });
}

/** Safe list of social links from stored JSON (never throws; drops anything malformed or not https). */
export function normalizeSocialLinks(raw: unknown): SocialLink[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, AGENCY_LIMITS.social).flatMap((entry) => {
    if (!isPlainObject(entry) || typeof entry.platform !== "string" || !SOCIAL_KEYS.has(entry.platform)) return [];
    const url = text(entry.url, AGENCY_LIMITS.url);
    if (!url || !isHttpsUrl(url)) return [];
    const label = text(entry.label, AGENCY_LIMITS.socialLabel);
    if (entry.platform === "custom" && !label) return [];
    return [{ platform: entry.platform as SocialPlatform, url, ...(label ? { label } : {}) }];
  });
}

export function socialLabel(link: SocialLink) {
  return link.label || SOCIAL_PLATFORMS.find((platform) => platform.key === link.platform)?.label || "Link";
}

/** The stored row's agency columns (see prisma/schema.prisma PlatformSettings). */
export interface AgencySettingsRecord {
  platformName: string;
  contactEmail: string | null;
  tagline: string | null;
  description: string | null;
  logoUrl: string | null;
  logoIsWordmark: boolean;
  brandMarkUrl: string | null;
  aboutTitle: string | null;
  aboutBody: string | null;
  team: unknown;
  phone: string | null;
  whatsapp: string | null;
  addressLine: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  postalCode: string | null;
  businessHours: string | null;
  enquiryEmail: string | null;
  socialLinks: unknown;
  seoTitle: string | null;
  seoDescription: string | null;
  ogImageUrl: string | null;
}

const optional = (value: string | null | undefined) => (value ?? "").trim() || undefined;
const safeImage = (value: string | null | undefined) => {
  const url = optional(value);
  return url && isSafeImageUrl(url) ? url : undefined;
};

/** The public profile from the stored row (or the defaults when there is no row). */
export function toAgencyProfile(row: AgencySettingsRecord | null): AgencyProfile {
  const email = optional(row?.contactEmail);
  const enquiry = optional(row?.enquiryEmail);
  const cityLine = [row?.city, row?.region, row?.postalCode].map(optional).filter(Boolean).join(", ");
  const description = optional(row?.description) ?? AGENCY_DEFAULTS.description;
  const aboutBody = optional(row?.aboutBody)
    ?.split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  return {
    name: optional(row?.platformName) ?? PLATFORM_FALLBACK_NAME,
    tagline: optional(row?.tagline) ?? AGENCY_DEFAULTS.tagline,
    description,
    logoUrl: safeImage(row?.logoUrl),
    logoIsWordmark: Boolean(row?.logoIsWordmark && safeImage(row?.logoUrl)),
    brandMarkUrl: safeImage(row?.brandMarkUrl),
    aboutTitle: optional(row?.aboutTitle) ?? AGENCY_DEFAULTS.aboutTitle,
    aboutBody: aboutBody && aboutBody.length > 0 ? aboutBody : [...AGENCY_DEFAULTS.aboutBody],
    team: normalizeTeam(row?.team),
    contact: {
      email: email && isEmail(email) ? email : undefined,
      phone: optional(row?.phone),
      whatsapp: optional(row?.whatsapp),
      address: [optional(row?.addressLine), cityLine || undefined, optional(row?.country)].filter((line): line is string => Boolean(line)),
      businessHours: optional(row?.businessHours),
      enquiryEmail: enquiry && isEmail(enquiry) ? enquiry : email && isEmail(email) ? email : undefined,
    },
    social: normalizeSocialLinks(row?.socialLinks).map((link) => ({ ...link, displayLabel: socialLabel(link) })),
    seo: {
      title: optional(row?.seoTitle),
      description: optional(row?.seoDescription) ?? description,
      ogImageUrl: safeImage(row?.ogImageUrl),
    },
  };
}

/** tel: target for a typed phone number. */
export function telHref(phone: string) {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

/** wa.me link for a typed WhatsApp number, or null when it has no digits. */
export function whatsappHref(whatsapp: string) {
  const digits = whatsapp.replace(/\D/g, "");
  return digits ? `https://wa.me/${digits}` : null;
}

// ---------------------------------------------------------------
// WRITES (admin): strict validation of the whole settings form.
// ---------------------------------------------------------------

export type AgencySettingsInput = Omit<AgencySettingsRecord, "team" | "socialLinks"> & {
  team: TeamMember[];
  socialLinks: SocialLink[];
};

export type AgencySettingsValidation =
  | { ok: true; value: AgencySettingsInput }
  | { ok: false; errors: Record<string, string> };

const STRING_FIELDS: { key: Exclude<keyof AgencySettingsInput, "team" | "socialLinks" | "logoIsWordmark" | "platformName">; max: number; kind?: "email" | "image" | "phone" }[] = [
  { key: "contactEmail", max: AGENCY_LIMITS.email, kind: "email" },
  { key: "tagline", max: AGENCY_LIMITS.tagline },
  { key: "description", max: AGENCY_LIMITS.description },
  { key: "logoUrl", max: AGENCY_LIMITS.url, kind: "image" },
  { key: "brandMarkUrl", max: AGENCY_LIMITS.url, kind: "image" },
  { key: "aboutTitle", max: AGENCY_LIMITS.aboutTitle },
  { key: "aboutBody", max: AGENCY_LIMITS.aboutBody },
  { key: "phone", max: AGENCY_LIMITS.phone, kind: "phone" },
  { key: "whatsapp", max: AGENCY_LIMITS.phone, kind: "phone" },
  { key: "addressLine", max: AGENCY_LIMITS.addressLine },
  { key: "city", max: AGENCY_LIMITS.addressPart },
  { key: "region", max: AGENCY_LIMITS.addressPart },
  { key: "country", max: AGENCY_LIMITS.addressPart },
  { key: "postalCode", max: AGENCY_LIMITS.postalCode },
  { key: "businessHours", max: AGENCY_LIMITS.businessHours },
  { key: "enquiryEmail", max: AGENCY_LIMITS.email, kind: "email" },
  { key: "seoTitle", max: AGENCY_LIMITS.seoTitle },
  { key: "seoDescription", max: AGENCY_LIMITS.seoDescription },
  { key: "ogImageUrl", max: AGENCY_LIMITS.url, kind: "image" },
];

const PHONE = /^\+?[\d\s().-]{6,40}$/;

/** Strict validation of an admin-submitted settings form. Empty optional fields become null. */
export function validateAgencySettingsInput(raw: unknown): AgencySettingsValidation {
  if (!isPlainObject(raw)) return { ok: false, errors: { form: "Invalid request." } };
  const errors: Record<string, string> = {};
  const name = typeof raw.platformName === "string" ? raw.platformName.trim() : "";
  if (name.length < 2 || name.length > AGENCY_LIMITS.name) errors.platformName = `Enter an agency name of 2–${AGENCY_LIMITS.name} characters.`;

  const strings: Record<string, string | null> = {};
  for (const { key, max, kind } of STRING_FIELDS) {
    const value = raw[key];
    if (value !== undefined && value !== null && typeof value !== "string") {
      errors[key] = "Invalid value.";
      continue;
    }
    const trimmed = (value ?? "").trim();
    if (!trimmed) {
      strings[key] = null;
      continue;
    }
    if (trimmed.length > max) errors[key] = `Use ${max} characters or fewer.`;
    else if (kind === "email" && !isEmail(trimmed)) errors[key] = "Enter a valid email address.";
    else if (kind === "image" && !isSafeImageUrl(trimmed)) errors[key] = "Use an https:// URL or a path on this site, such as /brand/logo.svg.";
    else if (kind === "phone" && !PHONE.test(trimmed)) errors[key] = "Enter a phone number with digits, e.g. +971 50 123 4567.";
    strings[key] = trimmed;
  }

  const team: TeamMember[] = [];
  if (raw.team !== undefined && !Array.isArray(raw.team)) errors.team = "Invalid team.";
  else if (Array.isArray(raw.team)) {
    if (raw.team.length > AGENCY_LIMITS.team) errors.team = `Add at most ${AGENCY_LIMITS.team} people.`;
    raw.team.slice(0, AGENCY_LIMITS.team).forEach((entry, index) => {
      if (!isPlainObject(entry)) {
        errors[`team.${index}`] = "Invalid entry.";
        return;
      }
      const name = typeof entry.name === "string" ? entry.name.trim() : "";
      const title = typeof entry.title === "string" ? entry.title.trim() : "";
      const bio = typeof entry.bio === "string" ? entry.bio.trim() : "";
      const imageUrl = typeof entry.imageUrl === "string" ? entry.imageUrl.trim() : "";
      if (!name || name.length > AGENCY_LIMITS.memberName) errors[`team.${index}.name`] = "Enter a name.";
      if (title.length > AGENCY_LIMITS.memberTitle) errors[`team.${index}.title`] = `Use ${AGENCY_LIMITS.memberTitle} characters or fewer.`;
      if (bio.length > AGENCY_LIMITS.memberBio) errors[`team.${index}.bio`] = `Use ${AGENCY_LIMITS.memberBio} characters or fewer.`;
      if (imageUrl && (imageUrl.length > AGENCY_LIMITS.url || !isSafeImageUrl(imageUrl))) {
        errors[`team.${index}.imageUrl`] = "Use an https:// URL or a path on this site.";
      }
      team.push({ name, title, ...(bio ? { bio } : {}), ...(imageUrl ? { imageUrl } : {}) });
    });
  }

  const socialLinks: SocialLink[] = [];
  if (raw.socialLinks !== undefined && !Array.isArray(raw.socialLinks)) errors.socialLinks = "Invalid social accounts.";
  else if (Array.isArray(raw.socialLinks)) {
    if (raw.socialLinks.length > AGENCY_LIMITS.social) errors.socialLinks = `Add at most ${AGENCY_LIMITS.social} accounts.`;
    raw.socialLinks.slice(0, AGENCY_LIMITS.social).forEach((entry, index) => {
      if (!isPlainObject(entry) || typeof entry.platform !== "string" || !SOCIAL_KEYS.has(entry.platform)) {
        errors[`socialLinks.${index}.platform`] = "Choose a platform.";
        return;
      }
      const url = typeof entry.url === "string" ? entry.url.trim() : "";
      const label = typeof entry.label === "string" ? entry.label.trim() : "";
      if (!url || url.length > AGENCY_LIMITS.url || !isHttpsUrl(url)) errors[`socialLinks.${index}.url`] = "Enter the full https:// address.";
      if (label.length > AGENCY_LIMITS.socialLabel) errors[`socialLinks.${index}.label`] = `Use ${AGENCY_LIMITS.socialLabel} characters or fewer.`;
      if (entry.platform === "custom" && !label) errors[`socialLinks.${index}.label`] = "Name this link.";
      socialLinks.push({ platform: entry.platform as SocialPlatform, url, ...(label ? { label } : {}) });
    });
  }

  if (raw.logoIsWordmark !== undefined && typeof raw.logoIsWordmark !== "boolean") errors.logoIsWordmark = "Invalid value.";
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      platformName: name,
      logoIsWordmark: raw.logoIsWordmark === true,
      ...(strings as Record<(typeof STRING_FIELDS)[number]["key"], string | null>),
      team,
      socialLinks,
    },
  };
}
