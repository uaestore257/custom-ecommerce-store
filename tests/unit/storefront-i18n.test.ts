import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEFAULT_UI_LOCALE,
  messagesFor,
  plural,
  resolveUiLocale,
  STOREFRONT_MESSAGES,
  storefrontMessages,
  storefrontUiLocale,
  UI_LOCALES,
} from "../../lib/storefront-i18n";
import { getTemplateDefinition, TEMPLATE_KEYS } from "../../lib/templates/registry";

test("the UI language is the store's language only when the template declares it and a dictionary exists", () => {
  assert.equal(resolveUiLocale("ar", ["en", "ar"]), "ar");
  assert.equal(resolveUiLocale("ar-AE", ["en", "ar"]), "ar");
  assert.equal(resolveUiLocale("AR_sa", ["en", "ar"]), "ar");
  assert.equal(resolveUiLocale("ar", ["en"]), "en", "template not localized: English, as before");
  assert.equal(resolveUiLocale("fr", ["en", "fr"]), "en", "no dictionary yet: English");
  assert.equal(resolveUiLocale("", ["en", "ar"]), "en");
  assert.equal(DEFAULT_UI_LOCALE, "en");
});

test("templates that declare only English keep English for every store language", () => {
  for (const key of TEMPLATE_KEYS) {
    const declared = getTemplateDefinition(key).manifest.capabilities.uiLocales;
    if (declared.length === 1 && declared[0] === "en") {
      assert.equal(storefrontUiLocale({ language: "ar", templateKey: key }), "en", key);
      assert.equal(storefrontMessages({ language: "ar", templateKey: key }).addToCart, "Add to cart", key);
    }
    for (const locale of declared) assert.ok((UI_LOCALES as readonly string[]).includes(locale), `${key} declares a locale with a dictionary`);
  }
});

test("English shared labels are exactly the strings the shared components always showed", () => {
  const en = messagesFor("en");
  assert.equal(en.addToCart, "Add to cart");
  assert.equal(en.outOfStock, "Out of stock");
  assert.equal(en.alreadyInCart(2), "2 already in your cart.");
  assert.equal(en.items(1), "1 item");
  assert.equal(en.items(3), "3 items");
  assert.equal(en.notReserved, "Items in your cart are not reserved — stock can change at any time.");
  assert.equal(en.cartUpdatedTitle, "Your cart was updated to match the store's current prices and stock.");
  assert.equal(en.pricesChanged(1), "1 item changed price since you added it.");
  assert.equal(en.quantitiesReduced(2), "2 items had their quantity reduced to what is in stock.");
  assert.equal(en.noLongerAvailable(2), "2 items are no longer available and were left out.");
  assert.equal(en.priceChanged("AED 1.00", "AED 2.00"), "Price changed: was AED 1.00, now AED 2.00.");
  assert.equal(en.onlyAvailable(3, 5), "Only 3 available — you asked for 5.");
  assert.deepEqual(en.sort, { featured: "Featured", newest: "Newest", "price-asc": "Price: low to high", "price-desc": "Price: high to low" });
  assert.equal(en.pageOf(2, 5), "Page 2 of 5");
});

test("every locale has every shared label, and Arabic is really Arabic", () => {
  const keys = Object.keys(STOREFRONT_MESSAGES.en).sort();
  for (const locale of UI_LOCALES) assert.deepEqual(Object.keys(STOREFRONT_MESSAGES[locale]).sort(), keys, locale);
  const ar = messagesFor("ar");
  for (const value of [ar.addToCart, ar.subtotal, ar.total, ar.sortBy, ar.notReserved, ar.sort.newest, ar.pageOf(1, 2)]) {
    assert.match(value, /[؀-ۿ]/, value);
  }
});

test("Arabic counts follow Arabic plural rules", () => {
  const ar = messagesFor("ar");
  assert.equal(ar.items(0), "لا منتجات");
  assert.equal(ar.items(1), "منتج واحد");
  assert.equal(ar.items(2), "منتجان");
  assert.equal(ar.items(3), "3 منتجات");
  assert.equal(ar.items(11), "11 منتجًا");
  assert.equal(ar.items(100), "100 منتج");
  assert.equal(plural("en", 1, { one: () => "one", other: () => "other" }), "one");
  assert.equal(plural("ar", 2, { other: () => "fallback" }), "fallback", "missing forms fall back to other");
});
