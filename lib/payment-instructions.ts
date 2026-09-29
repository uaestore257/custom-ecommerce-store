import type { CheckoutPaymentMethod } from "./checkout";

// ---------------------------------------------------------------
// What the customer is told about paying, on the order confirmation page
// and in the confirmation email. No bank account details exist in the
// system yet, so bank transfer says the store sends them — nothing here
// is (or may ever be) an invented account number.
// ---------------------------------------------------------------

export function paymentInstructions(method: CheckoutPaymentMethod, storeName: string, orderNumber: string): string {
  if (method === "bank_transfer") {
    return (
      `Pay by bank transfer: ${storeName} will send you its bank account details. ` +
      `Please use ${orderNumber} as the payment reference. Your order is processed once the payment arrives.`
    );
  }
  return "Pay in cash when your order is delivered.";
}
