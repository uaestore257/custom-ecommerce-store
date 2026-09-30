import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { headers } from "next/headers";
import { hostContext } from "@/lib/server/auth/store-access";
import { getDb } from "@/lib/server/db";
import { InvitationAcceptanceForm } from "./InvitationAcceptanceForm";

export const metadata: Metadata = {
  title: "Accept store invitation",
  robots: { index: false, follow: false },
};

export default async function AcceptInvitationPage() {
  await connection();
  const requestHeaders = await headers();
  const { host, hostStore } = await hostContext(getDb(), requestHeaders.get("host") ?? "");
  if (host.kind !== "store" || !hostStore) notFound();
  return <InvitationAcceptanceForm />;
}
