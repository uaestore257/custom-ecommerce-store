"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Mail } from "lucide-react";
import { setInquiryStatusAction } from "@/app/admin/actions";
import { EmptyState } from "@/components/EmptyState";
import { buttonClass, Card, PageHeader } from "@/components/ui";
import { nextInquiryStatuses } from "@/lib/admin/inquiry-rules";
import type { AdminInquiry, DbInquiryStatus } from "@/lib/admin/types";
import { formatDate } from "@/lib/format";

// The store's contact messages, newest first. Buttons follow
// lib/admin/inquiry-rules.ts; the server re-checks every change and
// refuses it if the message changed since this page loaded.

const STATUS: Record<DbInquiryStatus, { label: string; className: string }> = {
  NEW: { label: "New", className: "bg-amber-50 text-amber-800 ring-amber-600/20" },
  READ: { label: "Read", className: "bg-slate-100 text-slate-700 ring-slate-500/20" },
  ARCHIVED: { label: "Archived", className: "bg-slate-100 text-slate-500 ring-slate-400/20" },
};

const ACTION_LABEL: Record<DbInquiryStatus, string> = {
  NEW: "",
  READ: "Mark as read",
  ARCHIVED: "Archive",
};

export function InquiryInbox({
  storeId,
  storeName,
  inquiries,
  readOnly = false,
}: {
  storeId: string;
  storeName: string;
  inquiries: AdminInquiry[];
  readOnly?: boolean;
}) {
  const router = useRouter();
  const [showArchived, setShowArchived] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const archivedCount = inquiries.filter((i) => i.status === "ARCHIVED").length;
  const newCount = inquiries.filter((i) => i.status === "NEW").length;
  const shown = showArchived ? inquiries : inquiries.filter((i) => i.status !== "ARCHIVED");

  function change(inquiry: AdminInquiry, to: DbInquiryStatus) {
    setMessage(null);
    setPendingId(inquiry.id);
    startTransition(async () => {
      const result = await setInquiryStatusAction(storeId, inquiry.id, inquiry.status, to);
      setPendingId(null);
      setMessage({ ok: result.ok, text: result.ok ? (result.message ?? "Saved.") : result.error });
      if (result.ok) router.refresh();
    });
  }

  return (
    <>
      <PageHeader
        title="Messages"
        description={`Contact messages sent from ${storeName}'s storefront, newest first. ${newCount} new. Replying happens by email; nothing is sent from here.`}
      />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
          Show archived ({archivedCount})
        </label>
        {message && (
          <p role={message.ok ? "status" : "alert"} className={`text-sm ${message.ok ? "text-emerald-700" : "text-red-600"}`}>
            {message.text}
          </p>
        )}
      </div>

      {shown.length === 0 ? (
        <EmptyState
          icon={Mail}
          title={inquiries.length === 0 ? "No messages yet" : "No messages to show"}
          description={
            inquiries.length === 0
              ? "Messages sent from the storefront's contact page will appear here."
              : "All messages are archived. Tick “Show archived” to see them."
          }
        />
      ) : (
        <ul className="space-y-4">
          {shown.map((inquiry) => (
            <li key={inquiry.id}>
              <Card className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900">{inquiry.subject || "(No subject)"}</p>
                    <p className="mt-0.5 text-sm text-slate-600">
                      {inquiry.name} ·{" "}
                      <a href={`mailto:${inquiry.email}`} className="break-all text-teal-700 hover:underline">
                        {inquiry.email}
                      </a>{" "}
                      · {formatDate(inquiry.createdAt)}
                    </p>
                  </div>
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${STATUS[inquiry.status].className}`}>
                    {STATUS[inquiry.status].label}
                  </span>
                </div>
                <p className="mt-3 whitespace-pre-wrap break-words text-sm text-slate-700">{inquiry.message}</p>
                {!readOnly && <div className="mt-4 flex flex-wrap gap-2">
                  {nextInquiryStatuses(inquiry.status).map((to) => (
                    <button
                      key={to}
                      type="button"
                      disabled={pendingId !== null}
                      onClick={() => change(inquiry, to)}
                      className={buttonClass("secondary", { size: "sm" })}
                    >
                      {pendingId === inquiry.id ? "Saving…" : inquiry.status === "ARCHIVED" && to === "READ" ? "Move back to inbox" : ACTION_LABEL[to]}
                    </button>
                  ))}
                </div>}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
