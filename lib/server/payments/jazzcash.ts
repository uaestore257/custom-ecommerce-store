import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import type {
  PaymentProviderAdapter,
  ProviderCheckoutInput,
  ResolvedPaymentCredentials,
} from "./types";

const JAZZCASH_SANDBOX_URL = "https://sandbox.jazzcash.com.pk/CustomerPortal/TransactionManagement/DoTransactionViaSDK/";

function jazzcashSecret(credentials: ResolvedPaymentCredentials): string | null {
  const value =
    credentials.secrets.merchantPassword ??
    credentials.secrets.password ??
    credentials.secrets.jazzcashPassword ??
    credentials.secrets.sharedSecret ??
    null;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function jazzcashMerchantId(input: ProviderCheckoutInput, credentials: ResolvedPaymentCredentials): string | null {
  const publicConfig = input.publicConfig as Record<string, unknown>;
  const fromConfig = typeof publicConfig.merchantId === "string" ? publicConfig.merchantId.trim() : "";
  const fromSecrets = typeof credentials.secrets.merchantId === "string" ? credentials.secrets.merchantId.trim() : "";
  return fromConfig || fromSecrets || null;
}

function normaliseJazcashFields(values: Record<string, string>): Record<string, string> {
  const clean: Record<string, string> = {};
  for (const [key, value] of Object.entries(values)) {
    if (typeof value === "string") clean[key] = value;
  }
  return clean;
}

function sortJazzcashFields(fields: Record<string, string>): [string, string][] {
  return Object.entries(fields)
    .filter(([key]) => key.startsWith("pp_") && key !== "pp_SecureHash")
    .sort(([left], [right]) => {
      if (left < right) return -1;
      if (left > right) return 1;
      return 0;
    });
}

export function buildJazzcashSecureHash(secret: string, fields: Record<string, string>): string {
  const ordered = sortJazzcashFields(normaliseJazcashFields(fields));
  const payload = ordered.map(([, value]) => value).join("&");
  const input = `${secret}&${payload}`;
  const latin1Payload = Buffer.from(input, "utf8").toString("latin1");
  return createHmac("sha256", Buffer.from(secret, "utf8"))
    .update(Buffer.from(latin1Payload, "latin1"))
    .digest("hex");
}

export function verifyJazzcashSecureHash(secret: string, fields: Record<string, string>): boolean {
  const hash = typeof fields.pp_SecureHash === "string" ? fields.pp_SecureHash.trim() : "";
  if (!/^[a-f0-9]{64}$/i.test(hash)) return false;
  const expected = Buffer.from(buildJazzcashSecureHash(secret, fields), "hex");
  const actual = Buffer.from(hash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function mapJazzcashResponseCode(responseCode: string): "PENDING" | "SUCCEEDED" | "FAILED" | "CANCELLED" {
  return jazzcashResponseCodeStatus(responseCode);
}

function isoDateTime(date: Date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z").replace(/Z$/, "");
}

function jazzcashResponseCodeStatus(responseCode: string): "PENDING" | "SUCCEEDED" | "FAILED" | "CANCELLED" {
  const code = (responseCode ?? "").trim();
  if (code === "000") return "SUCCEEDED";
  if (["100", "101", "150", "151", "152", "153", "200", "201", "202", "205", "209", "210", "220", "300", "301", "399"].includes(code)) {
    return "PENDING";
  }
  if (["003", "004", "014", "015", "016", "021", "026", "041", "044", "049", "053", "059", "061", "080", "081", "090"].includes(code)) {
    return "FAILED";
  }
  if (["012", "013", "019", "025", "029", "030"].includes(code)) {
    return "CANCELLED";
  }
  return "FAILED";
}

export const jazzcashAdapter: PaymentProviderAdapter = {
  id: "jazzcash",
  method: "jazzcash",
  async createCheckout(input, credentials) {
    const merchantId = jazzcashMerchantId(input, credentials);
    const merchantPassword = jazzcashSecret(credentials);
    if (!merchantId || !merchantPassword) {
      throw new Error("JazzCash merchant credentials are unavailable.");
    }
    const publicConfig = input.publicConfig as Record<string, unknown>;
    const now = new Date();
    const expiry = new Date(now.getTime() + 3 * 60 * 60 * 1000);
    const fields: Record<string, string> = {
      pp_Version: "1.1",
      pp_TxnType: typeof publicConfig.txnType === "string" ? publicConfig.txnType : "MIGS",
      pp_Language: typeof publicConfig.language === "string" ? publicConfig.language : "EN",
      pp_MerchantID: merchantId,
      pp_SubMerchantID: typeof publicConfig.subMerchantId === "string" ? publicConfig.subMerchantId : "",
      pp_Password: merchantPassword,
      pp_BankID: typeof publicConfig.bankId === "string" ? publicConfig.bankId : "TBANK",
      pp_ProductID: typeof publicConfig.productId === "string" ? publicConfig.productId : "RETL",
      pp_TxnRefNo: input.transactionId,
      pp_Amount: input.amountMinor.toString(),
      pp_TxnCurrency: input.currency.toUpperCase(),
      pp_TxnDateTime: isoDateTime(now),
      pp_TxnExpiryDateTime: isoDateTime(expiry),
      pp_BillReference: input.orderNumber,
      pp_Description: `Order ${input.orderNumber}`,
      pp_ReturnURL: `${input.storeOrigin}/payment/return/${encodeURIComponent(input.transactionId)}`,
      ppmpf_1: "",
      ppmpf_2: "",
      ppmpf_3: "",
      ppmpf_4: "",
      ppmpf_5: "",
    };
    fields.pp_SecureHash = buildJazzcashSecureHash(merchantPassword, fields);
    const action = typeof publicConfig.gatewayUrl === "string" ? publicConfig.gatewayUrl : JAZZCASH_SANDBOX_URL;
    return {
      providerReference: input.transactionId,
      redirect: { kind: "post", action, fields },
    };
  },
  async verifyReturn(input, query, credentials) {
    const merchantPassword = jazzcashSecret(credentials);
    if (!merchantPassword) return null;
    const params: Record<string, string> = {};
    for (const [key, value] of query.entries()) {
      if (typeof value === "string") params[key] = value;
    }
    if (!verifyJazzcashSecureHash(merchantPassword, params)) return null;
    const responseCode = params.pp_ResponseCode ?? params.ResponseCode ?? "";
    const transactionReference = params.pp_TxnRefNo ?? "";
    const amount = params.pp_Amount ?? "";
    const requestedAmount = input.amountMinor.toString();
    const currency = params.pp_TxnCurrency?.toUpperCase();
    if (
      transactionReference !== input.transactionId ||
      amount !== requestedAmount ||
      (currency !== undefined && currency !== input.currency.toUpperCase())
    ) {
      return null;
    }
    const outcome = mapJazzcashResponseCode(responseCode);
    return {
      eventId: `jazzcash:${transactionReference}:${responseCode || "unknown"}`,
      eventType: outcome === "SUCCEEDED" ? "checkout.session.completed" : "payment.response",
      paymentTransactionId: input.transactionId,
      transactionReference,
      amountMinor: BigInt(amount || input.amountMinor.toString()),
      currency: currency ?? input.currency.toUpperCase(),
      outcome,
    };
  },
  async verifyWebhook(rawBody, headers, credentials) {
    const merchantPassword = jazzcashSecret(credentials);
    if (!merchantPassword) return null;
    const params = new URLSearchParams(rawBody);
    const fields: Record<string, string> = {};
    for (const [key, value] of params.entries()) fields[key] = value;
    if (!verifyJazzcashSecureHash(merchantPassword, fields)) return null;
    const responseCode = fields.pp_ResponseCode ?? "";
    const transactionReference = fields.pp_TxnRefNo ?? "";
    const amount = fields.pp_Amount ?? "0";
    return {
      eventId: `jazzcash:webhook:${transactionReference}:${responseCode}`,
      eventType: "payment.response",
      paymentTransactionId: fields.pp_BillReference || transactionReference,
      transactionReference,
      amountMinor: BigInt(amount || "0"),
      currency: (fields.pp_TxnCurrency ?? "PKR").toUpperCase(),
      outcome: mapJazzcashResponseCode(responseCode),
    };
  },
};
