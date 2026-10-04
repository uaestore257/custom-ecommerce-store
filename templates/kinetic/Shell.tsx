import Link from "next/link";
import { CartDrawerProvider } from "@/components/storefront/CartDrawerContext";
import { paymentMethodLabel } from "@/lib/config";
import { POLICIES } from "@/lib/policies";
import { categoryPath } from "@/lib/storefront-urls";
import type { TemplateShellProps } from "../types";
import { KineticCartSheet } from "./CartSheet";
import { KineticHeader } from "./Header";
import { KINETIC_CONTAINER, kineticEyebrow } from "./styles";

export function KineticShell({ store, categories, children }: TemplateShellProps) {
  const collections = categories.filter((category) => category.slug && category.productCount > 0).slice(0, 8);
  const payments = store.paymentMethods.map((id) => paymentMethodLabel(id));

  return (
    <CartDrawerProvider>
      <KineticHeader store={store} categories={categories} />
      <div className="flex-1">{children}</div>
      <KineticCartSheet />

      <footer className="mt-auto border-t-2 border-foreground bg-foreground text-background">
        <div className={`${KINETIC_CONTAINER} grid gap-10 py-12 md:grid-cols-12`}>
          <div className="md:col-span-5">
            <p className="font-heading text-3xl font-extrabold tracking-tight rtl:tracking-normal">{store.name}</p>
            {store.tagline && <p className="mt-3 max-w-sm text-sm text-background/70">{store.tagline}</p>}
          </div>
          <nav aria-label="Footer navigation" className="md:col-span-3">
            <p className={kineticEyebrow}>Shop</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link href="/shop" className="hover:underline">All products</Link></li>
              {collections.map((category) => (
                <li key={category.id}><Link href={categoryPath(category)} className="hover:underline">{category.name}</Link></li>
              ))}
              <li><Link href="/about" className="hover:underline">About</Link></li>
              <li><Link href="/contact" className="hover:underline">Contact</Link></li>
            </ul>
          </nav>
          <div className="md:col-span-4">
            <p className={kineticEyebrow}>Get in touch</p>
            <ul className="mt-3 space-y-2 text-sm text-background/70">
              {store.contactEmail && <li>{store.contactEmail}</li>}
              {store.contactPhone && <li dir="ltr" className="text-start">{store.contactPhone}</li>}
              {store.contactAddress && <li>{store.contactAddress}</li>}
            </ul>
            {payments.length > 0 && <p className="mt-5 text-xs text-background/70">Payment: {payments.join(" · ")}</p>}
          </div>
        </div>
        <div className="border-t border-background/20">
          <div className={`${KINETIC_CONTAINER} flex flex-col gap-3 py-5 text-xs text-background/70 sm:flex-row sm:items-center sm:justify-between`}>
            <p>© {new Date().getFullYear()} {store.name}</p>
            <nav aria-label="Store policies">
              <ul className="flex flex-wrap gap-x-5 gap-y-2">
                {POLICIES.map((policy) => (
                  <li key={policy.id}><Link href={policy.href} className="hover:text-background hover:underline">{policy.title}</Link></li>
                ))}
              </ul>
            </nav>
          </div>
        </div>
      </footer>
    </CartDrawerProvider>
  );
}
