import Link from "next/link";
import { CartDrawerProvider } from "@/components/storefront/CartDrawerContext";
import { paymentMethodLabel } from "@/lib/config";
import { POLICIES } from "@/lib/policies";
import { categoryPath } from "@/lib/storefront-urls";
import type { TemplateShellProps } from "../types";
import { MaisonCartDrawer } from "./CartDrawer";
import { MaisonHeader } from "./Header";
import { MAISON_CONTAINER, maisonLabel } from "./styles";

export function MaisonShell({ store, categories, children }: TemplateShellProps) {
  const collections = categories.filter((category) => category.slug && category.productCount > 0);
  const payments = store.paymentMethods.map((id) => paymentMethodLabel(id));

  return (
    <CartDrawerProvider>
      <MaisonHeader store={store} categories={categories} />
      <div className="flex-1">{children}</div>
      <MaisonCartDrawer />

      <footer className="mt-auto border-t border-border">
        <div className={`${MAISON_CONTAINER} py-16 text-center`}>
          <p className="font-heading text-3xl uppercase tracking-[0.3em] sm:text-4xl sm:tracking-[0.42em] rtl:tracking-normal">{store.name}</p>
          {store.tagline && <p className="mt-4 text-sm text-muted-foreground">{store.tagline}</p>}
        </div>
        <div className={`${MAISON_CONTAINER} grid gap-10 border-t border-border py-12 text-sm md:grid-cols-3`}>
          <nav aria-label="Collections">
            <p className={maisonLabel}>Collections</p>
            <ul className="mt-4 space-y-2 text-muted-foreground">
              <li><Link href="/shop" className="hover:text-foreground">All</Link></li>
              {collections.map((category) => (
                <li key={category.id}><Link href={categoryPath(category)} className="hover:text-foreground">{category.name}</Link></li>
              ))}
            </ul>
          </nav>
          <nav aria-label="The house">
            <p className={maisonLabel}>The house</p>
            <ul className="mt-4 space-y-2 text-muted-foreground">
              <li><Link href="/about" className="hover:text-foreground">About</Link></li>
              <li><Link href="/contact" className="hover:text-foreground">Client service</Link></li>
            </ul>
          </nav>
          <div>
            <p className={maisonLabel}>Contact</p>
            <ul className="mt-4 space-y-2 text-muted-foreground">
              {store.contactEmail && <li>{store.contactEmail}</li>}
              {store.contactPhone && <li dir="ltr" className="text-start">{store.contactPhone}</li>}
              {store.contactAddress && <li>{store.contactAddress}</li>}
            </ul>
            {payments.length > 0 && <p className="mt-5 text-xs text-muted-foreground">Payment: {payments.join(" · ")}</p>}
          </div>
        </div>
        <div className="border-t border-border">
          <div className={`${MAISON_CONTAINER} flex flex-col gap-3 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between`}>
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
