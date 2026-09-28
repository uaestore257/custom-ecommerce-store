import Link from "next/link";
import { PlatformContactDisclosure } from "@/components/PlatformContactDisclosure";
import type { StorefrontStore } from "@/lib/storefront-types";

export function PublicFooter({ store, isAdminHost }: { store: StorefrontStore; isAdminHost: boolean }) {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-slate-50">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 text-sm text-slate-600 sm:grid-cols-3 sm:px-6">
        <div>
          <p className="text-base font-bold text-slate-900">{store.name}</p>
          <p className="mt-2">{store.tagline}</p>
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
            {store.contactEmail && <li>{store.contactEmail}</li>}
            {store.contactPhone && <li>{store.contactPhone}</li>}
            {store.contactAddress && <li>{store.contactAddress}</li>}
          </ul>
        </div>
      </div>
      <div className="border-t border-slate-200">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-5 text-xs text-slate-500 sm:flex-row sm:justify-between sm:px-6">
          <p>© {new Date().getFullYear()} {store.name}. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-x-1">
            Demo storefront built on the Master Ecommerce Template ·{" "}
            <PlatformContactDisclosure
              label={isAdminHost ? "Agency Admin" : "Contact admin"}
              variant="footer"
            />
          </div>
        </div>
      </div>
    </footer>
  );
}
