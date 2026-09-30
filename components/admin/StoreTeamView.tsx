"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  createStoreInvitationAction,
  revokeStoreInvitationAction,
  revokeStoreMemberAction,
  updateStoreMemberRoleAction,
} from "@/app/admin/actions";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { buttonClass, Card, Field, inputClass, Notice, PageHeader } from "@/components/ui";
import type { StoreInvitationSummary } from "@/lib/admin/invitations";
import { isManagedStoreTeamRole, type ManagedStoreTeamRole, type StoreTeamMember } from "@/lib/admin/team";

export function StoreTeamView({
  storeName,
  members,
  invitations,
  invitationEmailEnabled,
  readOnly,
}: {
  storeName: string;
  members: StoreTeamMember[];
  invitations: StoreInvitationSummary[];
  invitationEmailEnabled: boolean;
  readOnly: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [memberToRemove, setMemberToRemove] = useState<StoreTeamMember | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<ManagedStoreTeamRole>("STAFF");
  const [roles, setRoles] = useState<Record<string, ManagedStoreTeamRole>>(() => {
    const initial: Record<string, ManagedStoreTeamRole> = {};
    for (const member of members) {
      if (isManagedStoreTeamRole(member.role)) initial[member.id] = member.role;
    }
    return initial;
  });

  function changeRole(memberId: string, role: ManagedStoreTeamRole) {
    const previousRole = roles[memberId];
    setRoles((current) => ({ ...current, [memberId]: role }));
    startTransition(async () => {
      const result = await updateStoreMemberRoleAction(memberId, role);
      setNotice({ ok: result.ok, text: result.ok ? result.message ?? "Role updated." : result.error });
      if (result.ok) router.refresh();
      else if (previousRole) setRoles((current) => ({ ...current, [memberId]: previousRole }));
    });
  }

  function revoke(memberId: string) {
    startTransition(async () => {
      const result = await revokeStoreMemberAction(memberId);
      setMemberToRemove(null);
      setNotice({ ok: result.ok, text: result.ok ? result.message ?? "Access revoked." : result.error });
      if (result.ok) router.refresh();
    });
  }

  function invite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      const result = await createStoreInvitationAction(inviteEmail, inviteRole);
      setNotice({ ok: result.ok, text: result.ok ? result.message ?? "Invitation sent." : result.error });
      if (result.ok) setInviteEmail("");
      router.refresh();
    });
  }

  function revokeInvitation(invitationId: string) {
    startTransition(async () => {
      const result = await revokeStoreInvitationAction(invitationId);
      setNotice({ ok: result.ok, text: result.ok ? result.message ?? "Invitation revoked." : result.error });
      if (result.ok) router.refresh();
    });
  }

  return (
    <>
      <PageHeader
        title="Store team"
        description={`View and manage team roles for ${storeName}.`}
        breadcrumbs={[{ label: "Dashboard", href: "/admin" }, { label: "Store team" }]}
      />
      <Card className="mb-5 p-5">
        <h2 className="font-semibold">Invite a team member</h2>
        {invitationEmailEnabled ? (
          <form className="mt-4 grid gap-4 sm:grid-cols-[minmax(0,1fr)_12rem_auto] sm:items-end" onSubmit={invite}>
            <Field label="Email address" htmlFor="team-invite-email" required>
              <input
                id="team-invite-email"
                type="email"
                required
                maxLength={254}
                autoComplete="email"
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
                className={inputClass(false)}
              />
            </Field>
            <Field label="Role" htmlFor="team-invite-role" required>
              <select
                id="team-invite-role"
                value={inviteRole}
                onChange={(event) => {
                  if (isManagedStoreTeamRole(event.target.value)) setInviteRole(event.target.value);
                }}
                className={inputClass(false)}
              >
                <option value="MANAGER">Manager</option>
                <option value="STAFF">Staff</option>
              </select>
            </Field>
            <button type="submit" disabled={pending || readOnly} className={buttonClass("primary")}>
              {pending ? "Sending…" : "Send invitation"}
            </button>
          </form>
        ) : (
          <p className="mt-2 text-sm text-slate-600">
            Invitations are unavailable until SMTP email delivery is configured. No invitation was created, and no passwords or invitation links are shown here.
          </p>
        )}
        <p className="mt-3 text-xs text-slate-500">
          Invitations are single-use, expire after 72 hours, and can only grant Manager or Staff access. Existing Managers can sign in with operational access; Staff have read-only Orders and Messages.
        </p>
      </Card>
      {readOnly && (
        <Notice tone="warning" className="mb-5">
          This store is suspended. Team access is read-only until the Platform Owner reactivates it.
        </Notice>
      )}
      {notice && (
        <Notice tone={notice.ok ? "success" : "warning"} className="mb-5">
          <span role={notice.ok ? "status" : "alert"}>{notice.text}</span>
        </Notice>
      )}
      <Card className="overflow-hidden p-0">
        {members.length === 0 ? (
          <p className="p-5 text-sm text-slate-600">No team members are currently assigned to this store.</p>
        ) : (
          <ul className="divide-y divide-slate-200">
            {members.map((member) => {
              const manageable =
                !readOnly &&
                isManagedStoreTeamRole(member.role) &&
                !member.isPlatformOwner;
              return (
                <li key={member.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-900">{member.name}</p>
                    <p className="truncate text-sm text-slate-600">{member.email}</p>
                    {member.disabled && <p className="text-xs text-amber-700">Account disabled</p>}
                    {member.isPlatformOwner && <p className="text-xs text-slate-500">Platform Owner account (locked)</p>}
                  </div>
                  {manageable ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="sr-only" htmlFor={`team-role-${member.id}`}>Role for {member.name}</label>
                      <select
                        id={`team-role-${member.id}`}
                        value={roles[member.id] ?? member.role}
                        disabled={pending}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                        onChange={(event) => {
                          const next = event.target.value;
                          if (isManagedStoreTeamRole(next) && next !== member.role) changeRole(member.id, next);
                        }}
                      >
                        <option value="MANAGER">Manager</option>
                        <option value="STAFF">Staff</option>
                      </select>
                      <button
                        type="button"
                        disabled={pending}
                        className={buttonClass("secondary")}
                        onClick={() => setMemberToRemove(member)}
                      >
                        {pending ? "Updating…" : "Remove access"}
                      </button>
                    </div>
                  ) : (
                    <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                      {member.role === "OWNER" ? "Owner" : member.role === "MANAGER" ? "Manager" : "Staff"}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
      <section className="mt-6">
        <h2 className="mb-3 text-lg font-semibold">Invitations</h2>
        <Card className="overflow-hidden p-0">
          {invitations.length === 0 ? (
            <p className="p-5 text-sm text-slate-600">No invitations have been sent.</p>
          ) : (
            <ul className="divide-y divide-slate-200">
              {invitations.map((invitation) => (
                <li key={invitation.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-slate-900">{invitation.email}</p>
                    <p className="text-sm text-slate-600">
                      {invitation.role === "MANAGER" ? "Manager" : "Staff"} · Expires {new Date(invitation.expiresAt).toLocaleString()}
                    </p>
                  </div>
                  <span className="inline-flex w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                    {invitation.status[0] + invitation.status.slice(1).toLowerCase()}
                  </span>
                  {invitation.status === "PENDING" && !readOnly && (
                    <button
                      type="button"
                      disabled={pending}
                      className={buttonClass("secondary")}
                      onClick={() => revokeInvitation(invitation.id)}
                    >
                      Revoke invitation
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>
      <ConfirmDialog
        open={memberToRemove !== null}
        title={`Remove ${memberToRemove?.name ?? "team member"}?`}
        confirmLabel={pending ? "Removing…" : "Remove access"}
        danger
        onConfirm={() => memberToRemove && revoke(memberToRemove.id)}
        onCancel={() => setMemberToRemove(null)}
      >
        {memberToRemove
          ? `${memberToRemove.name} will lose this store's membership. Their account and access to other stores will not be changed.`
          : null}
      </ConfirmDialog>
    </>
  );
}
