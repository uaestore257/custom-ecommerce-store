import assert from "node:assert/strict";
import { test } from "node:test";
import {
  AGENCY_DEFAULTS,
  isSafeImageUrl,
  normalizeSocialLinks,
  normalizeTeam,
  toAgencyProfile,
  validateAgencySettingsInput,
  whatsappHref,
  type AgencySettingsRecord,
} from "../../lib/agency/profile";
import { PLATFORM_FALLBACK_NAME } from "../../lib/platform-brand";

const empty: AgencySettingsRecord = {
  platformName: "Studio",
  contactEmail: null,
  tagline: null,
  description: null,
  logoUrl: null,
  logoIsWordmark: false,
  brandMarkUrl: null,
  aboutTitle: null,
  aboutBody: null,
  team: [],
  phone: null,
  whatsapp: null,
  addressLine: null,
  city: null,
  region: null,
  country: null,
  postalCode: null,
  businessHours: null,
  enquiryEmail: null,
  socialLinks: [],
  seoTitle: null,
  seoDescription: null,
  ogImageUrl: null,
};

test("without a settings row the public profile is the fallback name and default copy, with no contact or social", () => {
  const profile = toAgencyProfile(null);
  assert.equal(profile.name, PLATFORM_FALLBACK_NAME);
  assert.equal(profile.tagline, AGENCY_DEFAULTS.tagline);
  assert.equal(profile.seo.description, AGENCY_DEFAULTS.description);
  assert.deepEqual(profile.team, []);
  assert.deepEqual(profile.social, []);
  assert.deepEqual(profile.contact, { email: undefined, phone: undefined, whatsapp: undefined, address: [], businessHours: undefined, enquiryEmail: undefined });
});

test("empty and whitespace fields are omitted, never rendered as placeholders", () => {
  const profile = toAgencyProfile({ ...empty, phone: "   ", contactEmail: "", city: " ", logoUrl: "" });
  assert.equal(profile.contact.phone, undefined);
  assert.equal(profile.contact.email, undefined);
  assert.deepEqual(profile.contact.address, []);
  assert.equal(profile.logoUrl, undefined);
  assert.equal(profile.logoIsWordmark, false);
});

test("configured values flow through: name, story paragraphs, address lines, enquiry fallback, SEO defaults", () => {
  const profile = toAgencyProfile({
    ...empty,
    platformName: " Agency X ",
    description: "We build stores.",
    aboutBody: "First paragraph.\n\nSecond paragraph.",
    addressLine: "Office 4, Tower 1",
    city: "Dubai",
    postalCode: "00000",
    country: "United Arab Emirates",
    contactEmail: "hello@agency.test",
    team: [{ name: "Muhammad Hamad", title: "Co-Founder" }],
  });
  assert.equal(profile.name, "Agency X");
  assert.deepEqual(profile.aboutBody, ["First paragraph.", "Second paragraph."]);
  assert.deepEqual(profile.contact.address, ["Office 4, Tower 1", "Dubai, 00000", "United Arab Emirates"]);
  assert.equal(profile.contact.enquiryEmail, "hello@agency.test", "enquiries fall back to the business email");
  assert.equal(profile.seo.description, "We build stores.", "SEO description falls back to the short description");
  assert.deepEqual(profile.team, [{ name: "Muhammad Hamad", title: "Co-Founder" }]);
});

test("stored lists are normalized defensively: unsafe or malformed entries are dropped", () => {
  assert.deepEqual(
    normalizeSocialLinks([
      { platform: "linkedin", url: "https://www.linkedin.com/company/x" },
      { platform: "github", url: "http://github.com/x" },
      { platform: "x", url: "javascript:alert(1)" },
      { platform: "myspace", url: "https://myspace.com/x" },
      { platform: "custom", url: "https://example.com" },
      "nope",
    ]),
    [{ platform: "linkedin", url: "https://www.linkedin.com/company/x" }],
  );
  assert.deepEqual(normalizeTeam([{ name: "" }, { name: "A", title: "B", imageUrl: "javascript:alert(1)" }, 5]), [{ name: "A", title: "B" }]);
  assert.deepEqual(normalizeTeam({ name: "not a list" }), []);
});

test("image URLs must be https or a path on this site", () => {
  assert.equal(isSafeImageUrl("https://cdn.example.com/logo.svg"), true);
  assert.equal(isSafeImageUrl("/brand/logo.svg"), true);
  assert.equal(isSafeImageUrl("//evil.test/logo.svg"), false);
  assert.equal(isSafeImageUrl("http://example.com/logo.png"), false);
  assert.equal(isSafeImageUrl("data:image/svg+xml,<svg/>"), false);
  assert.equal(isSafeImageUrl("javascript:alert(1)"), false);
});

test("admin input is validated strictly and empty optional fields become null", () => {
  const ok = validateAgencySettingsInput({
    platformName: "  Agency  ",
    contactEmail: "",
    phone: "+971 50 123 4567",
    team: [{ name: "Muhammad Hamad", title: "Co-Founder", bio: "", imageUrl: "" }],
    socialLinks: [{ platform: "instagram", url: "https://instagram.com/agency", label: "" }],
    logoIsWordmark: false,
  });
  assert.equal(ok.ok, true);
  if (ok.ok) {
    assert.equal(ok.value.platformName, "Agency");
    assert.equal(ok.value.contactEmail, null);
    assert.equal(ok.value.phone, "+971 50 123 4567");
    assert.deepEqual(ok.value.team, [{ name: "Muhammad Hamad", title: "Co-Founder" }]);
    assert.deepEqual(ok.value.socialLinks, [{ platform: "instagram", url: "https://instagram.com/agency" }]);
  }

  const bad = validateAgencySettingsInput({
    platformName: "A",
    contactEmail: "not-an-email",
    logoUrl: "javascript:alert(1)",
    phone: "call me",
    team: [{ name: "" }],
    socialLinks: [{ platform: "custom", url: "http://x.test" }, { platform: "nope", url: "https://x.test" }],
    logoIsWordmark: "yes",
  });
  assert.equal(bad.ok, false);
  if (!bad.ok) {
    for (const key of ["platformName", "contactEmail", "logoUrl", "phone", "team.0.name", "socialLinks.0.url", "socialLinks.0.label", "socialLinks.1.platform", "logoIsWordmark"]) {
      assert.ok(bad.errors[key], `expected an error for ${key}`);
    }
  }
  assert.equal(validateAgencySettingsInput("nope").ok, false);
  assert.equal(validateAgencySettingsInput({ platformName: "Agency", seoTitle: 42 }).ok, false);
});

test("WhatsApp links use only the digits", () => {
  assert.equal(whatsappHref("+971 (50) 123-4567"), "https://wa.me/971501234567");
  assert.equal(whatsappHref("none"), null);
});
