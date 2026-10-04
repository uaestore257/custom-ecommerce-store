import Link from "next/link";
import { paymentMethodLabel } from "@/lib/config";
import { POLICIES } from "@/lib/policies";
import { categoryPath } from "@/lib/storefront-urls";
import type { TemplateShellProps } from "../types";
import { MarketHeader } from "./Header";
import { MarketMobileNav } from "./MobileNav";
import { MARKET_CONTAINER } from "./styles";

export function MarketShell({ store, categories, children }: TemplateShellProps) {
  const aisles = categories.filter((category) => category.slug && category.productCount > 0).slice(0, 8);
  const payments = store.paymentMethods.map((id) => paymentMethodLabel(id));

  return (
    <>
      <MarketHeader store={store} categories={categories} />
      {/* Room for the fixed tab bar (and cart bar) on small screens. */}
      <div className="flex-1 pb-36 md:pb-0">{children}</div>
      <footer className="mt-auto border-t border-border bg-surface pb-36 md:pb-0">
        <div className={`${MARKET_CONTAINER} grid gap-6 py-8 text-sm sm:grid-cols-3`}>
          <div>
            <p className="font-heading text-base font-extrabold">{store.name}</p>
            {store.tagline && <p className="mt-1 text-muted-foreground">{store.tagline}</p>}
            {payments.length > 0 && <p className="mt-3 text-xs text-muted-foreground">Payment: {payments.join(" · ")}</p>}
          </div>
          <nav aria-label="Footer navigation">
            <p className="font-bold">Shop</p>
            <ul className="mt-2 space-y-1.5 text-muted-foreground">
              <li><Link href="/shop" className="hover:text-foreground">All products</Link></li>
              {aisles.map((category) => (
                <li key={category.id}><Link href={categoryPath(category)} className="hover:text-foreground">{category.name}</Link></li>
              ))}
            </ul>
          </nav>
          <div>
            <p className="font-bold">Help</p>
            <ul className="mt-2 space-y-1.5 text-muted-foreground">
              <li><Link href="/contact" className="hover:text-foreground">Contact us</Link></li>
              <li><Link href="/about" className="hover:text-foreground">About {store.name}</Link></li>
              {store.contactPhone && <li dir="ltr" className="text-start">{store.contactPhone}</li>}
              {store.contactEmail && <li>{store.contactEmail}</li>}
            </ul>
          </div>
        </div>
        <div className="border-t border-border">
          <div className={`${MARKET_CONTAINER} flex flex-col gap-2 py-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between`}>
            <p>© {new Date().getFullYear()} {store.name}</p>
            <nav aria-label="Store policies">
              <ul className="flex flex-wrap gap-x-4 gap-y-1">
                {POLICIES.map((policy) => (
                  <li key={policy.id}><Link href={policy.href} className="hover:text-foreground">{policy.title}</Link></li>
                ))}
              </ul>
            </nav>
          </div>
        </div>
      </footer>
      <MarketMobileNav store={store} categories={categories} />
    </>
  );
}
