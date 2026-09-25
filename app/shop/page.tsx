import type { Metadata } from "next";
import Link from "next/link";

// ---------------------------------------------------------------
// STORE SETTINGS
// Keep these in sync with the homepage (app/page.tsx).
// ---------------------------------------------------------------
const store = {
  name: "Your Store",
};

const navLinks = [
  { label: "Home", href: "/" },
  { label: "Shop", href: "/shop" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

// Sample products. Replace with real products later.
const products = [
  { id: 1, name: "Classic Everyday Item", category: "Essentials", price: 29.99 },
  { id: 2, name: "Premium Signature Item", category: "Premium", price: 59.0 },
  { id: 3, name: "Essential Starter Item", category: "Essentials", price: 18.5 },
  { id: 4, name: "Cozy Home Item", category: "Home", price: 34.0 },
  { id: 5, name: "Handy Travel Item", category: "Travel", price: 24.75 },
  { id: 6, name: "Thoughtful Gift Item", category: "Gifts", price: 42.0 },
];

export const metadata: Metadata = {
  title: `Shop | ${store.name}`,
  description: "Browse all products in the store.",
};

function formatPrice(price: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(price);
}

// ---------------------------------------------------------------
// PAGE
// ---------------------------------------------------------------
export default function ShopPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Header */}
      <header className="border-b border-slate-200">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <Link href="/" className="text-xl font-bold tracking-tight">
            {store.name}
          </Link>
          <nav aria-label="Main navigation">
            <ul className="flex gap-6 text-sm font-medium text-slate-600">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={link.href === "/shop" ? "page" : undefined}
                    className={`rounded hover:text-teal-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 ${
                      link.href === "/shop" ? "text-teal-700" : ""
                    }`}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 md:py-16">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Shop</h1>
        <p className="mt-3 max-w-xl text-slate-600">
          Browse our full collection of {products.length} products.
        </p>

        {/* Product grid */}
        <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <li key={product.id}>
              <Link
                href={`/products/${product.id}`}
                className="group block overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:border-teal-600 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
              >
                {/* Product image placeholder */}
                <div className="flex aspect-[4/3] items-center justify-center bg-slate-100 text-sm text-slate-400">
                  Product image
                </div>
                <div className="p-5">
                  <span className="inline-block rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">
                    {product.category}
                  </span>
                  <div className="mt-3 flex items-center justify-between gap-4">
                    <h2 className="font-semibold group-hover:text-teal-700">
                      {product.name}
                    </h2>
                    <p className="font-semibold text-teal-700">
                      {formatPrice(product.price)}
                    </p>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200">
        <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-slate-500 sm:px-6">
          © {new Date().getFullYear()} {store.name}. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
