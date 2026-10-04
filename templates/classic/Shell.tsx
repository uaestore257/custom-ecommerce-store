import Link from "next/link";
import { POLICIES } from "@/lib/policies";
import { categoryPath } from "@/lib/storefront-urls";
import type { TemplateShellProps } from "../types";
import { ClassicHeader } from "./Header";

export function ClassicShell({ store, categories, children }: TemplateShellProps) {
  const shopCategories = categories.filter((category) => category.slug && category.productCount > 0).slice(0, 6);
  return (
    <>
      <ClassicHeader store={store} />
      <div className="flex-1">{children}</div>
      <footer className="mt-auto border-t border-border bg-muted">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 text-sm text-muted-foreground sm:grid-cols-3 sm:px-6">
          <div>
            <p className="text-base font-bold text-foreground">{store.name}</p>
            {store.tagline && <p className="mt-2">{store.tagline}</p>}
          </div>
          <nav aria-label="Footer navigation">
            <p className="font-semibold text-foreground">Shop</p>
            <ul className="mt-2 space-y-1.5">
              <li><Link href="/shop" className="hover:text-accent">All products</Link></li>
              {shopCategories.map((category) => (
                <li key={category.id}><Link href={categoryPath(category)} className="hover:text-accent">{category.name}</Link></li>
              ))}
              <li><Link href="/about" className="hover:text-accent">About us</Link></li>
              <li><Link href="/contact" className="hover:text-accent">Contact</Link></li>
            </ul>
          </nav>
          <div>
            <p className="font-semibold text-foreground">Get in touch</p>
            <ul className="mt-2 space-y-1.5">
              {store.contactEmail && <li>{store.contactEmail}</li>}
              {store.contactPhone && <li dir="ltr" className="text-start">{store.contactPhone}</li>}
              {store.contactAddress && <li>{store.contactAddress}</li>}
            </ul>
          </div>
        </div>
        <div className="border-t border-border">
          <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-5 text-xs text-muted-foreground sm:px-6">
            <p>© {new Date().getFullYear()} {store.name}. All rights reserved.</p>
            <nav aria-label="Store policies">
              <ul className="flex flex-wrap gap-x-3 gap-y-1">
                {POLICIES.map((policy) => (
                  <li key={policy.id}><Link href={policy.href} className="hover:text-accent">{policy.title}</Link></li>
                ))}
              </ul>
            </nav>
          </div>
        </div>
      </footer>
    </>
  );
}
