"use client";

import { Check, Copy } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  addStoreDomainAction,
  disableStoreDomainAction,
  setPrimaryStoreDomainAction,
  verifyStoreDomainAction,
} from "@/app/admin/actions";
import { buttonClass, Card, Field, inputClass, Notice, PageHeader } from "@/components/ui";
import type { AdminStoreDomain } from "@/lib/admin/types";

export function StoreDomainsView({
  storeName,
  domains,
  readOnly,
}: {
  storeName: string;
  domains: AdminStoreDomain[];
  readOnly: boolean;
}) {
  const router = useRouter();
  const [hostname, setHostname] = useState("");
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [copyNotice, setCopyNotice] = useState<string | null>(null);

  async function copyValue(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopyNotice(`${label} copied.`);
    } catch {
      setCopyNotice(`Couldn't copy the ${label.toLowerCase()}. Select the text and copy it manually.`);
    }
  }

  function addDomain(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      const result = await addStoreDomainAction(hostname);
      setNotice({
        ok: result.ok,
        text: result.ok
          ? `Added ${result.data.hostname}. Next, add the TXT record shown below at your domain provider.`
          : result.error,
      });
      if (result.ok) {
        setHostname("");
        router.refresh();
      }
    });
  }

  function verifyDomain(domainId: string) {
    startTransition(async () => {
      const result = await verifyStoreDomainAction(domainId);
      setNotice({
        ok: result.ok,
        text: result.ok
          ? "Domain ownership verified. Ask your platform administrator to configure and confirm production routing. Set it as Primary only after it is live; Primary changes your canonical storefront URLs immediately."
          : result.error,
      });
      if (result.ok) router.refresh();
    });
  }

  function setPrimary(domainId: string) {
    startTransition(async () => {
      const result = await setPrimaryStoreDomainAction(domainId);
      setNotice({
        ok: result.ok,
        text: result.ok
          ? "Primary domain updated. Canonical storefront metadata and sitemap URLs now use this address; the previous primary is no longer primary."
          : result.error,
      });
      if (result.ok) router.refresh();
    });
  }

  function disableDomain(domainId: string) {
    startTransition(async () => {
      const result = await disableStoreDomainAction(domainId);
      setNotice({ ok: result.ok, text: result.ok ? result.message ?? "Domain disabled." : result.error });
      if (result.ok) router.refresh();
    });
  }

  return (
    <>
      <PageHeader
        title="Custom domains"
        description={`Add and verify domain names for the ${storeName} storefront.`}
        breadcrumbs={[{ label: "Dashboard", href: "/admin" }, { label: "Custom domains" }]}
      />
      {readOnly && (
        <Notice tone="warning" className="mb-5">
          This store is suspended. Custom domains are read-only until the Platform Owner reactivates it.
        </Notice>
      )}
      {notice && (
        <Notice tone={notice.ok ? "success" : "warning"} className="mb-5">
          <span role={notice.ok ? "status" : "alert"}>{notice.text}</span>
        </Notice>
      )}
      {copyNotice && (
        <p className="mb-4 text-sm text-slate-600" role="status" aria-live="polite">
          {copyNotice}
        </p>
      )}
      <Card className="mb-5 p-5">
        <h2 className="font-semibold">Add a custom domain</h2>
        <p className="mt-1 text-sm text-slate-600">
          Verification proves that you control the domain; it does not make your storefront live at that address. Follow these steps:
        </p>
        <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-slate-700">
          <li>Add the domain below, then create the TXT record shown at the company that manages its DNS.</li>
          <li>Select Verify DNS. DNS changes can take time to appear, so you can check again later.</li>
          <li>Ask your platform administrator to configure production routing and confirm the storefront opens at this domain.</li>
          <li>Only after it is live, set it as Primary. This changes canonical storefront and sitemap URLs immediately.</li>
        </ol>
        <form className="mt-4 grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end" onSubmit={addDomain}>
          <Field
            label="Domain name"
            htmlFor="store-domain-hostname"
            required
            hint="Enter only the hostname, such as www.example.ae. Do not include https://, a path, or a port."
          >
            <input
              id="store-domain-hostname"
              type="text"
              required
              maxLength={253}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              value={hostname}
              onChange={(event) => setHostname(event.target.value)}
              className={inputClass(false)}
            />
          </Field>
          <button type="submit" disabled={pending || readOnly} className={buttonClass("primary")}>
            {pending ? "Saving…" : "Add domain"}
          </button>
        </form>
      </Card>
      <Card className="overflow-hidden p-0">
        {domains.length === 0 ? (
          <p className="p-5 text-sm text-slate-600">No custom domains have been added.</p>
        ) : (
          <ul className="divide-y divide-slate-200">
            {domains.map((domain) => (
              <li key={domain.id} className="space-y-3 p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                  <div className="min-w-0 flex-1">
                    <p className="break-all font-medium text-slate-900">{domain.hostname}</p>
                    <p className="mt-1 text-sm font-medium text-slate-700">
                      {domain.status === "VERIFIED" ? "Verified" : domain.status === "PENDING" ? "Pending verification" : "Disabled"}
                      {domain.status === "VERIFIED" && domain.isPrimary && (
                        <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-teal-50 px-2 py-0.5 text-xs text-teal-800">
                          <Check className="h-3.5 w-3.5" aria-hidden />
                          Primary
                        </span>
                      )}
                    </p>
                    {domain.status === "VERIFIED" && (
                      <p className="mt-2 text-sm text-slate-600">
                        {domain.isPrimary
                          ? "This is the preferred canonical address for your storefront. Ownership is verified, but that does not confirm the site is live here; ask your platform administrator to confirm production routing."
                          : "Domain ownership is verified. Ask your platform administrator to confirm production routing before setting it as Primary; that changes canonical storefront and sitemap URLs immediately."}
                      </p>
                    )}
                    {domain.status === "DISABLED" && (
                      <p className="mt-2 text-sm text-slate-600">
                        This domain no longer routes to your store and cannot be re-enabled. Add the same hostname again to start a new verification.
                      </p>
                    )}
                    {domain.status === "PENDING" && (
                      <div className="mt-3 rounded-xl bg-slate-50 p-4">
                        <p className="text-sm text-slate-700">
                          At your domain provider, add this DNS record to prove you control the domain. DNS changes can take time to appear.
                          This check only verifies ownership; it does not publish your storefront.
                        </p>
                        <dl className="mt-3 grid gap-x-3 gap-y-2 text-sm sm:grid-cols-[7rem_minmax(0,1fr)_auto]">
                          <div className="contents">
                            <dt className="text-slate-500">Record type</dt>
                            <dd className="font-mono text-slate-800">TXT</dd>
                          </div>
                          <div className="contents">
                            <dt className="text-slate-500">Name / Host</dt>
                            <dd className="break-all font-mono text-xs text-slate-800">_store-verification.{domain.hostname}</dd>
                            <CopyValueButton label="Record name" value={`_store-verification.${domain.hostname}`} onCopy={copyValue} />
                          </div>
                          <div className="contents">
                            <dt className="text-slate-500">Value</dt>
                            <dd className="break-all font-mono text-xs text-slate-800">
                              {domain.verificationToken
                                ? `store-verification=${domain.verificationToken}`
                                : "Reload this page to retrieve the pending verification record."}
                            </dd>
                            {domain.verificationToken && (
                              <CopyValueButton
                                label="Record value"
                                value={`store-verification=${domain.verificationToken}`}
                                onCopy={copyValue}
                              />
                            )}
                          </div>
                        </dl>
                        <p className="mt-3 text-xs text-slate-600">
                          If the record is not found yet, check that its name and value match exactly, wait for DNS to update, and select Verify DNS again.
                        </p>
                      </div>
                    )}
                  </div>
                  {domain.status !== "DISABLED" && (
                    <div className="flex flex-wrap gap-2">
                      {domain.status === "PENDING" ? (
                        <button
                          type="button"
                          disabled={pending || readOnly || !domain.verificationToken}
                          className={buttonClass("secondary")}
                          onClick={() => verifyDomain(domain.id)}
                        >
                          {pending ? "Checking DNS…" : "Verify DNS"}
                        </button>
                      ) : (
                        <>
                          {!domain.isPrimary && (
                            <button
                              type="button"
                              disabled={pending || readOnly}
                              className={buttonClass("secondary")}
                              onClick={() => setPrimary(domain.id)}
                            >
                              Set as Primary
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={pending || readOnly}
                            className={buttonClass("danger")}
                            onClick={() => disableDomain(domain.id)}
                          >
                            Disable
                          </button>
                        </>
                      )}
                    </div>
                  )}
                  {domain.status === "PENDING" && !domain.verificationToken && (
                    <p className="text-sm text-amber-800">
                      The verification record is unavailable. Reload the page before continuing.
                    </p>
                  )}
                  {domain.status === "DISABLED" && !readOnly && (
                    <button
                      type="button"
                      disabled={pending}
                      className={buttonClass("secondary")}
                      onClick={() => {
                        setHostname(domain.hostname);
                        document.getElementById("store-domain-hostname")?.focus();
                      }}
                    >
                      Use this hostname again
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}

function CopyValueButton({
  label,
  value,
  onCopy,
}: {
  label: string;
  value: string;
  onCopy: (label: string, value: string) => void;
}) {
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1 self-start text-xs font-medium text-teal-800 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
      aria-label={`Copy ${label.toLowerCase()}`}
      onClick={() => onCopy(label, value)}
    >
      <Copy className="h-3.5 w-3.5" aria-hidden />
      Copy
    </button>
  );
}
