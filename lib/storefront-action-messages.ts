// ---------------------------------------------------------------
// STOREFRONT ACTION RESULTS IN THE SHOPPER'S UI LANGUAGE (P6)
//
// The order and inquiry services return English (their logs, tests and
// every English-only template rely on it). The public storefront actions
// pass their failures through these before returning them: a message the
// dictionary knows is translated, a flagged field gets the same validator's
// message in the UI locale, and anything unknown is passed on unchanged.
// English is returned as it is, untouched.
// ---------------------------------------------------------------
import type { ActionResult } from "./admin/types";
import { validateCheckoutFields, type PlaceOrderResult } from "./checkout";
import { validateInquiry } from "./inquiry";
import {
  DEFAULT_UI_LOCALE,
  localizeFieldErrors,
  localizeServerMessage,
  messagesFor,
  type UiLocale,
} from "./storefront-i18n";

export function localizeOrderResult(
  result: PlaceOrderResult,
  input: unknown,
  countryCode: string,
  locale: UiLocale,
): PlaceOrderResult {
  if (result.ok || locale === DEFAULT_UI_LOCALE) return result;
  return {
    ...result,
    error: localizeServerMessage(result.error, locale),
    ...(result.fieldErrors
      ? {
          fieldErrors: localizeFieldErrors(
            result.fieldErrors,
            validateCheckoutFields(input, countryCode, messagesFor(locale).validation),
          ),
        }
      : {}),
  };
}

export function localizeInquiryResult<T>(result: ActionResult<T>, input: unknown, locale: UiLocale): ActionResult<T> {
  if (result.ok || locale === DEFAULT_UI_LOCALE) return result;
  return {
    ...result,
    error: localizeServerMessage(result.error, locale),
    ...(result.fieldErrors
      ? { fieldErrors: localizeFieldErrors(result.fieldErrors, validateInquiry(input, messagesFor(locale).validation).errors) as Record<string, string> }
      : {}),
  };
}
