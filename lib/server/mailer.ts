import "server-only";

// ---------------------------------------------------------------
// OUTGOING EMAIL. No email provider is connected yet, so getMailer()
// returns null and nothing is sent. Connecting one means implementing
// Mailer for it here (see docs/operations.md, "Email"), configured by
// EMAIL_PROVIDER, EMAIL_FROM and the provider's own credentials — which,
// like every secret, only ever live in the environment.
// ---------------------------------------------------------------

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  replyTo?: string;
}

export interface Mailer {
  send(message: EmailMessage): Promise<void>;
}

/** The configured mailer, or null while no email provider is set up. */
export function getMailer(env: NodeJS.ProcessEnv = process.env): Mailer | null {
  const provider = env.EMAIL_PROVIDER?.trim();
  if (provider) console.warn(`[email] EMAIL_PROVIDER "${provider}" is not supported yet; no email is sent.`);
  return null;
}
