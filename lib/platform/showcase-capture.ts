import { isShowcasedTemplate, type ShowcasedTemplateKey } from "./showcase";
import { TEMPLATE_DEMO_STORES } from "../template-demo-stores";
import type { TemplateKey } from "../templates/registry";

export function showcaseCaptureKeyForStore(templateKey: TemplateKey, storeSlug: string): ShowcasedTemplateKey | null {
  if (!isShowcasedTemplate(templateKey) || TEMPLATE_DEMO_STORES[templateKey].slug !== storeSlug) return null;
  return templateKey;
}
