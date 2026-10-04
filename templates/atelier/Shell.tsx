import Link from "next/link";
import { CartDrawerProvider } from "@/components/storefront/CartDrawerContext";
import { paymentMethodLabel } from "@/lib/config";
import { POLICIES } from "@/lib/policies";
import { categoryPath } from "@/lib/storefront-urls";
import type { TemplateShellProps } from "../types";
import { AtelierCartDrawer } from "./CartDrawer";
import { AtelierHeader } from "./Header";
import { ATELIER_CONTAINER, atelierEyebrow } from "./styles";

export function AtelierShell({ store, categories, children }: TemplateShellProps) {
  const collections = categories.filter((category) => category.slug && category.productCount > 0);
  const payments = store.paymentMethods.map((id) => paymentMethodLabel(id));

  return (
    <CartDrawerProvider>
      <AtelierHeader store={store} categories={categories} />
      <div className="flex-1">{children}</div>
      <AtelierCartDrawer />

      <footer className="mt-auto border-t border-border bg-surface">
        <div className={`${ATELIER_CONTAINER} grid gap-12 py-16 md:grid-cols-12`}>
          <div className="md:col-span-5">
            <p className="font-heading text-3xl font-medium uppercase tracking-[0.2em] rtl:tracking-normal">{store.name}</p>
            {store.tagline && <p className="mt-4 max-w-sm font-heading text-xl italic text-muted-foreground">{store.tagline}</p>}
          </div>
          {collections.length > 0 && (
            <nav aria-label="Collections" className="md:col-span-3">
              <p className={atelierEyebrow}>Collections</p>
              <ul className="mt-4 space-y-2 text-sm">
                {collections.map((category) => (
                  <li key={category.id}><Link href={categoryPath(category)} className="hover:opacity-60">{category.name}</Link></li>
                ))}
                <li><Link href="/shop" className="hover:opacity-60">All pieces</Link></li>
              </ul>
            </nav>
          )}
          <div className="md:col-span-4">
            <p className={atelierEyebrow}>Visit &amp; enquiries</p>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              {store.contactAddress && <li>{store.contactAddress}</li>}
              {store.contactPhone && <li dir="ltr" className="text-start">{store.contactPhone}</li>}
              {store.contactEmail && <li>{store.contactEmail}</li>}
              <li><Link href="/contact" className="text-foreground hover:opacity-60">Write to us</Link></li>
            </ul>
            {payments.length > 0 && <p className="mt-6 text-xs text-muted-foreground">Payment: {payments.join(" · ")}</p>}
          </div>
        </div>
        <div className="border-t border-border">
          <div className={`${ATELIER_CONTAINER} flex flex-col gap-3 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between`}>
            <p>© {new Date().getFullYear()} {store.name}</p>
            <nav aria-label="Store policies">
              <ul className="flex flex-wrap gap-x-6 gap-y-2">
                {POLICIES.map((policy) => (
                  <li key={policy.id}><Link href={policy.href} className="hover:text-foreground">{policy.title}</Link></li>
                ))}
              </ul>
            </nav>
          </div>
        </div>
      </footer>
    </CartDrawerProvider>
  );
}
