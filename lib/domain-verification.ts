export type TxtLookup = (name: string) => Promise<string[][]>;

export async function hasDomainVerificationRecord(
  hostname: string,
  token: string,
  lookup: TxtLookup,
): Promise<boolean> {
  const records = await lookup(`_store-verification.${hostname}`);
  const expected = `store-verification=${token}`;
  return records.some((chunks) => chunks.join("") === expected);
}
