export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const [{ configurePaymentSecretStore }, { createEnvironmentPaymentSecretStore }] = await Promise.all([
    import("./lib/server/payments/credentials"),
    import("./lib/server/payments/environment-secret-store"),
  ]);
  configurePaymentSecretStore(createEnvironmentPaymentSecretStore());
}
