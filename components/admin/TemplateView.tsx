import Link from "next/link";
import {
  ArrowRight,
  Boxes,
  CreditCard,
  House,
  LayoutGrid,
  Package,
  Receipt,
  Settings,
  ShoppingCart,
  Tag,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Card, Notice, PageHeader } from "@/components/ui";

const features: { icon: LucideIcon; title: string; text: string; href?: string }[] = [
  { icon: House, title: "Storefront & homepage", text: "Hero, categories, featured products and calls to action.", href: "/" },
  { icon: LayoutGrid, title: "Shop & category pages", text: "Product grid with search, category filter and sorting.", href: "/shop" },
  { icon: Tag, title: "Product detail pages", text: "Image, price, description, stock and quantity selector.", href: "/shop" },
  { icon: ShoppingCart, title: "Cart", text: "Quantities, remove items, subtotal and delivery fee.", href: "/cart" },
  { icon: CreditCard, title: "Checkout", text: "Contact and delivery details with validation (demo — no payments).", href: "/checkout" },
  { icon: Receipt, title: "Order management", text: "Order list, details and status updates per store." },
  { icon: Package, title: "Product management", text: "Add, edit and delete products and categories per store." },
  { icon: Users, title: "Customer management", text: "Customers created from each store's orders." },
  { icon: Settings, title: "Store settings", text: "Branding, region, domain, delivery and payment options." },
];

const shared = [
  "Page layouts and design system (cards, buttons, forms)",
  "Storefront pages: home, shop, product, cart, checkout, about, contact",
  "Cart and checkout logic, including total calculation",
  "Admin screens for products, orders, customers and settings",
  "Data model (Store, Product, Category, Order, Customer…)",
];

const perStore = [
  "Store name, slug, category and status",
  "Logo and accent colour",
  "Currency and country / region",
  "Domain configuration",
  "Products and categories",
  "Orders and customers",
  "Delivery fee and free-delivery threshold",
  "Enabled payment methods",
  "Homepage, About and Contact content",
];

export function TemplateView() {
  return (
    <>
      <PageHeader
        title="Master Ecommerce Template"
        description="The shared codebase every client store runs on. Improve a feature here once, and every client store gets it — while each store keeps its own branding, data and settings."
        breadcrumbs={[{ label: "Agency Admin", href: "/admin" }, { label: "Master template" }]}
      />

      <Notice className="mb-8">
        In this demo the template is the code in this repository. There is no separate template
        publishing or versioning system: all client stores always use the current code.
      </Notice>

      <h2 className="text-lg font-semibold">Features included</h2>
      <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f) => (
          <li key={f.title}>
            <Card className="h-full p-5">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                <f.icon className="h-5 w-5" aria-hidden />
              </span>
              <h3 className="mt-3 font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-slate-600">{f.text}</p>
              {f.href && (
                <Link href={f.href} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-teal-700 hover:underline">
                  Preview
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </Link>
              )}
            </Card>
          </li>
        ))}
      </ul>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        <Card className="p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <Boxes className="h-5 w-5 text-teal-700" aria-hidden />
            <h2 className="text-lg font-semibold">Shared by all stores (template)</h2>
          </div>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-slate-700">
            {shared.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </Card>
        <Card className="p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <Settings className="h-5 w-5 text-teal-700" aria-hidden />
            <h2 className="text-lg font-semibold">Configured per client store</h2>
          </div>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-slate-700">
            {perStore.map((item) => <li key={item}>{item}</li>)}
          </ul>
          <Link href="/admin/stores" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-teal-700 hover:underline">
            Manage client stores
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </Card>
      </div>
    </>
  );
}
