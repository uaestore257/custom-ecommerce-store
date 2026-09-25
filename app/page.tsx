import Link from "next/link";

// ---------------------------------------------------------------
// STORE SETTINGS
// Change these values for each new client. Nothing else on the
// page needs to be edited to rebrand the homepage.
// ---------------------------------------------------------------
const store = {
  name: "Your Store",
  heroTitle: "Good things, picked with care",
  heroText:
    "A small, thoughtful selection of everyday products. Browse the collection and find something you'll use for years.",
  heroButton: "Shop now",
};

const navLinks = [
  { label: "Home", href: "/" },
  { label: "Shop", href: "/shop" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

const featuredProducts = [
  { id: 1, name: "Classic Everyday Item", price: 29.99 },
  { id: 2, name: "Premium Signature Item", price: 59.0 },
  { id: 3, name: "Essential Starter Item", price: 18.5 },
];

function formatPrice(price: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(price);
}

// ---------------------------------------------------------------
// PAGE
// ---------------------------------------------------------------
export default function Home() {
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
                    className="rounded hover:text-teal-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 md:grid-cols-2 md:py-24">
          <div>
            <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
              {store.heroTitle}
            </h1>
            <p className="mt-5 max-w-md text-lg leading-relaxed text-slate-600">
              {store.heroText}
            </p>
            <Link
              href="/shop"
              className="mt-8 inline-block rounded-full bg-teal-700 px-7 py-3 font-semibold text-white hover:bg-teal-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
            >
              {store.heroButton}
            </Link>
          </div>

          {/* Hero image placeholder (replace with a real image later) */}
          <div className="grid aspect-square grid-cols-2 grid-rows-2 gap-3">
            <div className="row-span-2 rounded-3xl bg-teal-100" />
            <div className="rounded-3xl bg-amber-100" />
            <div className="rounded-3xl bg-slate-200" />
          </div>
        </section>

        {/* Featured products */}
        <section className="bg-slate-50 py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="flex items-end justify-between gap-4">
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Featured products
              </h2>
              <Link
                href="/shop"
                className="text-sm font-semibold text-teal-700 hover:underline"
              >
                View all
              </Link>
            </div>

            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {featuredProducts.map((product) => (
                <article
                  key={product.id}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
                >
                  {/* Product image placeholder */}
                  <div className="flex aspect-[4/3] items-center justify-center bg-slate-100 text-sm text-slate-400">
                    Product image
                  </div>
                  <div className="flex items-center justify-between gap-4 p-5">
                    <h3 className="font-semibold">{product.name}</h3>
                    <p className="font-semibold text-teal-700">
                      {formatPrice(product.price)}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
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