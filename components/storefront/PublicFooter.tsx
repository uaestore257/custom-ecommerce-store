import Link from "next/link";
import type { Store } from "@/lib/types";

export function PublicFooter({ store }: { store: Store }) {
  const { settings } = store;
  return (
    <footer className="mt-auto border-t border-slate-200 bg-slate-50">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 text-sm text-slate-600 sm:grid-cols-3 sm:px-6">
        <div>
          <p className="text-base font-bold text-slate-900">{store.name}</p>
          <p className="mt-2">{settings.tagline}</p>
        </div>
        <nav aria-label="Footer navigation">
          <p className="font-semibold text-slate-900">Shop</p>
          <ul className="mt-2 space-y-1.5">
            <li><Link href="/shop" className="hover:text-brand">All products</Link></li>
            <li><Link href="/cart" className="hover:text-brand">Cart</Link></li>
            <li><Link href="/about" className="hover:text-brand">About us</Link></li>
            <li><Link href="/contact" className="hover:text-brand">Contact</Link></li>
          </ul>
        </nav>
        <div>
          <p className="font-semibold text-slate-900">Get in touch</p>
          <ul className="mt-2 space-y-1.5">
            {settings.contactEmail && <li>{settings.contactEmail}</li>}
            {settings.contactPhone && <li>{settings.contactPhone}</li>}
            {settings.contactAddress && <li>{settings.contactAddress}</li>}
          </ul>
        </div>
      </div>
      <div className="border-t border-slate-200">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-5 text-xs text-slate-500 sm:flex-row sm:justify-between sm:px-6">
          <p>© {new Date().getFullYear()} {store.name}. All rights reserved.</p>
          <p>
            Demo storefront built on the Master Ecommerce Template ·{" "}
            <Link href="/admin" className="font-medium text-slate-700 hover:underline">
              Agency admin
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
