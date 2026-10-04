"use client";

import { useStorefrontContext } from "@/lib/storefront";
import { DEFAULT_UI_LOCALE, storefrontUiLocale, type UiLocale } from "@/lib/storefront-i18n";
import { noorMessages, type NoorMessages } from "./messages";

/** Noor's copy and UI locale in client components, from the storefront context. */
export function useNoor(): { t: NoorMessages; locale: UiLocale } {
  const context = useStorefrontContext();
  const locale = context ? storefrontUiLocale(context.store) : DEFAULT_UI_LOCALE;
  return { t: noorMessages(locale), locale };
}
