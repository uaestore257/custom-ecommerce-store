import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { StoreTeamView } from "@/components/admin/StoreTeamView";
import { listStoreInvitations, listStoreTeamMembers } from "@/lib/server/admin/team";
import { requireAdminViewer } from "@/lib/server/admin/request";
import { isEmailDeliveryConfigured } from "@/lib/server/mailer";

export const metadata: Metadata = { title: "Store team" };

export default async function StoreTeamPage() {
  const { db, viewer } = await requireAdminViewer();
  if (viewer.kind !== "store" || viewer.role === "STAFF") notFound();
  const [store, members, invitations] = await Promise.all([
    db.store.findUnique({ where: { id: viewer.store.id }, select: { name: true } }),
    listStoreTeamMembers(db, viewer.store.id),
    listStoreInvitations(db, viewer.store.id),
  ]);
  if (!store) notFound();
  return (
    <StoreTeamView
      storeName={store.name}
      members={members}
      invitations={invitations}
      invitationEmailEnabled={isEmailDeliveryConfigured()}
      readOnly={viewer.access === "read"}
    />
  );
}
