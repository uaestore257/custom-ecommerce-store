import "server-only";
import type { ReferenceOptions } from "@/lib/admin/types";
import type { StoreReference } from "@/lib/admin/validation";
import type { Client } from "./common";

/** Country, currency and language choices come from the reference tables. */
export async function getReferenceOptions(client: Client): Promise<ReferenceOptions> {
  const [countries, currencies, languages] = await Promise.all([
    client.country.findMany({ orderBy: { name: "asc" } }),
    client.currency.findMany({ orderBy: { code: "asc" } }),
    client.language.findMany({ orderBy: { name: "asc" } }),
  ]);
  return {
    countries: countries.map((c) => ({ code: c.code, name: c.name })),
    currencies: currencies.map((c) => ({ code: c.code, name: c.name, minorUnits: c.minorUnits })),
    languages: languages.map((l) => ({ code: l.code, name: l.name, nativeName: l.nativeName, direction: l.direction })),
    timeZones: Intl.supportedValuesOf("timeZone"),
  };
}

/** The same reference data as lookup sets, for server-side validation. */
export async function getStoreReference(client: Client): Promise<StoreReference> {
  const [countries, currencies, languages] = await Promise.all([
    client.country.findMany({ select: { code: true } }),
    client.currency.findMany({ select: { code: true, minorUnits: true } }),
    client.language.findMany({ select: { code: true } }),
  ]);
  return {
    countries: new Set(countries.map((c) => c.code)),
    currencies: new Map(currencies.map((c) => [c.code, c.minorUnits])),
    languages: new Set(languages.map((l) => l.code)),
  };
}
