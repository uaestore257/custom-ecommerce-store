import { redirect } from "next/navigation";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { requireAdminViewer } from "@/lib/server/admin/request";
import { listAdminStores } from "@/lib/server/admin/stores";
import { getPlatformName } from "@/lib/server/platform-brand";

// The platform dashboard (all stores), or a store-member store chooser on
// the central business root. Store-specific routes are always membership-checked.
export default async function AdminPage() {
  const { db, viewer } = await requireAdminViewer();
  if (viewer.kind === "store") redirect(`/admin/stores/${viewer.store.id}`);
  if (viewer.kind === "store-portal") {
    return (
      <section className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-bold">Choose a store</h1>
        <p className="mt-2 text-sm text-slate-600">Select a store you are authorized to manage.</p>
        <ul className="mt-6 grid gap-3">
          {viewer.stores.map(({ store, role }) => (
            <li key={store.id}>
              <form action="/admin/select-store" method="post">
                <input type="hidden" name="storeId" value={store.id} />
                <button
                  type="submit"
                  className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white p-5 text-left hover:border-teal-600"
                >
                <span>
                  <span className="block font-semibold">{store.name}</span>
                  <span className="mt-1 block text-sm text-slate-600">
                    {role === "OWNER" ? "Owner" : role === "MANAGER" ? "Manager" : "Staff"}
                    {store.status === "SUSPENDED" ? " · read-only while suspended" : ""}
                  </span>
                </span>
                <span className="font-semibold text-teal-700">Open admin</span>
                </button>
              </form>
            </li>
          ))}
        </ul>
      </section>
    );
  }
  const stores = await listAdminStores(db);
  return <AdminDashboard stores={stores} agencyName={await getPlatformName()} />;
}
