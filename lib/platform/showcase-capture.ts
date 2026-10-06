import { isShowcasedTemplate } from "./showcase";
import { TEMPLATE_DEMO_STORES } from "../template-demo-stores";
import type { TemplateKey } from "../templates/registry";
import SHOWCASE_CAPTURE_TEMPLATES from "./showcase-capture-manifest.json";

export type ShowcaseCaptureKey = keyof typeof SHOWCASE_CAPTURE_TEMPLATES;

function isShowcaseCaptureKey(key: string): key is ShowcaseCaptureKey {
  return Object.hasOwn(SHOWCASE_CAPTURE_TEMPLATES, key);
}

export function showcaseCaptureKeyForStore(templateKey: TemplateKey, storeSlug: string): ShowcaseCaptureKey | null {
  if (!isShowcasedTemplate(templateKey) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(storeSlug)) return null;
  const key = TEMPLATE_DEMO_STORES[templateKey].slug === storeSlug ? templateKey : storeSlug;
  return isShowcaseCaptureKey(key) && SHOWCASE_CAPTURE_TEMPLATES[key] === templateKey ? key : null;
}
