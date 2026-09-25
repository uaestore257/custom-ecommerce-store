import Link from "next/link";

// ---------------------------------------------------------------
// STORE SETTINGS
// Keep the store name the same as on your homepage.
// ---------------------------------------------------------------
const storeName = "Your Store";

const navLinks = [
  { label: "Home", href: "/" },
  { label: "Shop", href: "/shop" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

const categories = ["All", "Home", "Furniture", "Accessories"];

// Sample products. Later these will come from a database.
const products = [
  { id: 1, name: "Ceramic Table Lamp", price: 49.0, category: "Home" },
  { id: 2, name: "Oak Side Table", price: 129.0, category: "Furniture" },
  { id: 3, name: "Leather Card Holder", price: 24.5, category: "Accessories" },
  { id: 4, name: "Linen Throw Blanket", price: 39.99, category: "Home" },
  { id: 5, name: "Upholstered Armchair", price: 289.0, category: "Furniture" },
  { id: 6, name: "Canvas Tote Bag", price: 19.0, category: "Accessories" },
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
export default function ShopPage() {
  // Filters are visual only for now. "All" is shown as selected.
  const activeCategory = "All";

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Header */}
      <header className="border-b border-slate-200">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <Link href="/" className="text-xl font-bold tracking-tight">
            {storeName}
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
        {/* Page heading */}
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Shop All Products
        </h1>
        <p className="mt-3 max-w-xl text-slate-600">
          Browse the full collection. Choose a category to narrow things down.
        </p>

        {/* Category filters (visual only for now) */}
        <div
          className="mt-8 flex flex-wrap gap-2"
          role="group"
          aria-label="Filter by category"
        >
          {categories.map((category) => {
            const isActive = category === activeCategory;
            return (
              <button
                key={category}
                type="button"
                aria-pressed={isActive}
                className={`rounded-full border px-5 py-2 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 ${
                  isActive
                    ? "border-teal-700 bg-teal-700 text-white"
                    : "border-slate-300 bg-white text-slate-700 hover:border-teal-700 hover:text-teal-700"
                }`}
              >
                {category}
              </button>
            );
          })}
        </div>

        {/* Product count */}
        <p className="mt-6 text-sm text-slate-500">
          Showing {products.length} products
        </p>

        {/* Product grid */}
        <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <article
              key={product.id}
              className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white"
            >
              {/* Product image placeholder */}
              <div className="flex aspect-[4/3] items-center justify-center bg-slate-100 text-sm text-slate-400">
                Product image
              </div>

              <div className="flex flex-1 flex-col p-5">
                <p className="text-sm text-slate-500">{product.category}</p>
                <h2 className="mt-1 font-semibold">{product.name}</h2>
                <p className="mt-2 font-semibold text-teal-700">
                  {formatPrice(product.price)}
                </p>

                <Link
                  href={`/products/${product.id}`}
                  className="mt-5 inline-block rounded-full border border-teal-700 px-5 py-2 text-center text-sm font-semibold text-teal-700 hover:bg-teal-700 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
                >
                  View product
                </Link>
              </div>
            </article>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200">
        <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-slate-500 sm:px-6">
          © {new Date().getFullYear()} {storeName}. All rights reserved.
        </div>
      </footer>
    </div>
  );
}