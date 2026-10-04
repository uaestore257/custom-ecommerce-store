import { PAYMENT_METHODS } from "@/lib/config";
import { CONTAINER, Eyebrow, SectionHeading, StudioMain } from "../primitives";
import { ClosingCta, ProcessSteps } from "../sections";

/** Offline methods only: online adapters exist but run in test mode, so they are not offered publicly. */
const PAYMENT_OPTIONS = new Intl.ListFormat("en", { type: "disjunction" }).format(
  PAYMENT_METHODS.filter((method) => !method.requiresProvider).map((method) => method.label.toLowerCase()),
);

const INCLUDED: { title: string; items: string[] }[] = [
  {
    title: "Storefront",
    items: [
      "A template chosen for your products, with its palette and homepage composition",
      "Your logo, accent colour, tagline, hero and story",
      "About, contact, delivery, returns, privacy and terms pages",
      "A contact form whose messages arrive in your store admin",
    ],
  },
  {
    title: "Catalogue",
    items: [
      "Products with prices, sale prices, SKUs, stock and images",
      "Collections and featured products",
      "Per-product delivery: a delivery fee, free delivery or pickup only",
      "Search, sorting and paginated listings",
    ],
  },
  {
    title: "Orders and payments",
    items: [
      "Checkout with prices and stock re-checked on the server",
      "Order numbers, status tracking and payment status",
      `Payment by ${PAYMENT_OPTIONS}`,
      "Customer records for every store, kept separate from every other store",
    ],
  },
  {
    title: "Your store, your team",
    items: [
      "A Store Owner sign-in and admin for your store alone",
      "Team members by invitation, with their own roles",
      "Your country, currency, timezone and store languages — including right-to-left",
      "Your own subdomain, or your domain once verified",
    ],
  },
];

/** /services: what a store on the platform includes and how it is delivered. */
export function ServicesPage() {
  return (
    <StudioMain>
      <section aria-labelledby="services-title">
        <div className={`${CONTAINER} grid gap-10 pb-16 pt-14 lg:grid-cols-12 lg:pb-24 lg:pt-20`}>
          <div className="lg:col-span-8">
            <Eyebrow>Services</Eyebrow>
            <h1 id="services-title" className="mt-6 text-balance font-heading text-5xl leading-[1] tracking-tight sm:text-7xl rtl:tracking-normal">
              From a first conversation to a store that is open for business.
            </h1>
          </div>
          <p className="self-end text-base leading-relaxed text-muted-foreground lg:col-span-4">
            We design, configure and launch your store on the platform, then keep the platform beneath it maintained. You run
            your products, orders and customers from your own store admin.
          </p>
        </div>
      </section>

      <section aria-labelledby="included-title" className="border-t border-border bg-surface">
        <div className={`${CONTAINER} py-20 lg:py-28`}>
          <SectionHeading index="01" eyebrow="Included" id="included-title" title="What every store comes with." />
          <div className="mt-14 grid gap-px border border-border bg-border md:grid-cols-2">
            {INCLUDED.map((group, index) => (
              <section key={group.title} aria-labelledby={`included-${index}`} className="studio-reveal bg-surface-elevated p-6 sm:p-8">
                <h3 id={`included-${index}`} className="font-heading text-3xl">
                  {group.title}
                </h3>
                <ul className="mt-6 space-y-3">
                  {group.items.map((item) => (
                    <li key={item} className="grid grid-cols-[1.25rem_1fr] gap-2 text-sm leading-relaxed">
                      <span aria-hidden className="mt-[0.6rem] h-px w-3 bg-accent" />
                      {item}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </div>
      </section>

      <section aria-labelledby="process-title" className="border-t border-border">
        <div className={`${CONTAINER} py-20 lg:py-28`}>
          <SectionHeading
            index="02"
            eyebrow="Process"
            id="process-title"
            title="How a store comes together."
            lede="Four steps, each finished before the next begins. You see your store on the real platform throughout — never a mock-up."
          />
          <div className="mt-14">
            <ProcessSteps />
          </div>
        </div>
      </section>

      <ClosingCta
        title="Tell us what you sell."
        text="A short message about your products, your customers and where you deliver is all we need to begin."
      />
    </StudioMain>
  );
}
