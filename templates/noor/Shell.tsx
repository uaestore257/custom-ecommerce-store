import Link from "next/link";
import { POLICIES } from "@/lib/policies";
import { storefrontUiLocale } from "@/lib/storefront-i18n";
import { categoryPath } from "@/lib/storefront-urls";
import type { TemplateShellProps } from "../types";
import { NoorHeader } from "./Header";
import { noorMessages } from "./messages";
import { NoorOrnament } from "./Ornament";
import { NOOR_CONTAINER } from "./styles";

/** A symmetrical frame: the centred-stack header and a centred footer. Cart is a page (no drawer). */
export function NoorShell({ store, categories, children }: TemplateShellProps) {
  const t = noorMessages(storefrontUiLocale(store));
  const collections = categories.filter((category) => category.slug && category.productCount > 0).slice(0, 6);

  return (
    <>
      <NoorHeader store={store} categories={categories} />
      <div className="flex-1">{children}</div>
      <footer className="mt-auto border-t border-border">
        <div className={`${NOOR_CONTAINER} py-14 text-center`}>
          <p className="font-heading text-3xl">{store.name}</p>
          {store.tagline && <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">{store.tagline}</p>}
          <NoorOrnament className="mt-8" />
          <div className="mx-auto mt-8 grid max-w-3xl gap-8 text-sm sm:grid-cols-2">
            <nav aria-label={t.footerShop}>
              <p className="font-heading text-base">{t.footerShop}</p>
              <ul className="mt-3 space-y-2 text-muted-foreground">
                <li><Link href="/shop" className="hover:text-foreground">{t.allProducts}</Link></li>
                {collections.map((category) => (
                  <li key={category.id}><Link href={categoryPath(category)} className="hover:text-foreground">{category.name}</Link></li>
                ))}
              </ul>
            </nav>
            <div>
              <p className="font-heading text-base">{t.footerHelp}</p>
              <ul className="mt-3 space-y-2 text-muted-foreground">
                <li><Link href="/about" className="hover:text-foreground">{t.about}</Link></li>
                <li><Link href="/contact" className="hover:text-foreground">{t.contact}</Link></li>
                {store.contactPhone && <li dir="ltr">{store.contactPhone}</li>}
                {store.contactEmail && <li>{store.contactEmail}</li>}
              </ul>
            </div>
          </div>
        </div>
        <div className="border-t border-border">
          <div className={`${NOOR_CONTAINER} flex flex-col items-center gap-3 py-6 text-xs text-muted-foreground`}>
            <nav aria-label={t.storePolicies}>
              <ul className="flex flex-wrap justify-center gap-x-6 gap-y-2">
                {POLICIES.map((policy) => (
                  <li key={policy.id}><Link href={policy.href} className="hover:text-foreground">{t.policies[policy.id]}</Link></li>
                ))}
              </ul>
            </nav>
            <p>© {new Date().getFullYear()} {store.name}</p>
          </div>
        </div>
      </footer>
    </>
  );
}
