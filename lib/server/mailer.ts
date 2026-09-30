import "server-only";
import nodemailer from "nodemailer";
import { isEmail } from "@/lib/validation";

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  replyTo?: string;
}

export interface Mailer {
  send(message: EmailMessage): Promise<void>;
}

export function isEmailDeliveryConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  const provider = env.EMAIL_PROVIDER?.trim().toLowerCase();
  const from = env.EMAIL_FROM?.trim() ?? "";
  const host = env.SMTP_HOST?.trim() ?? "";
  const port = Number(env.SMTP_PORT ?? "");
  const secure = env.SMTP_SECURE === "true";
  const user = env.SMTP_USER?.trim() ?? "";
  const password = env.SMTP_PASSWORD ?? "";
  const credentialsComplete = Boolean(user && password);
  const credentialsEmpty = !user && !password;
  const localHost = ["localhost", "127.0.0.1", "::1", "[::1]"].includes(host.toLowerCase());

  if (provider !== "smtp" || !isEmail(from) || !host || !Number.isInteger(port) || port < 1 || port > 65535) {
    return false;
  }
  if (Boolean(user) !== Boolean(password)) return false;
  if (env.NODE_ENV === "production") return secure && credentialsComplete;
  return secure || (localHost && credentialsEmpty);
}

export function getMailer(env: NodeJS.ProcessEnv = process.env): Mailer | null {
  if (!isEmailDeliveryConfigured(env)) return null;

  const transport = nodemailer.createTransport({
    host: env.SMTP_HOST!.trim(),
    port: Number(env.SMTP_PORT),
    secure: env.SMTP_SECURE === "true" && Number(env.SMTP_PORT) === 465,
    requireTLS: env.SMTP_SECURE === "true" && Number(env.SMTP_PORT) !== 465,
    ...(env.SMTP_USER && env.SMTP_PASSWORD
      ? { auth: { user: env.SMTP_USER.trim(), pass: env.SMTP_PASSWORD } }
      : {}),
  });
  const from = env.EMAIL_FROM!.trim();

  return {
    async send(message) {
      await transport.sendMail({ from, ...message });
    },
  };
}
