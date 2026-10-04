import { numberWord, platformFacts } from "@/lib/platform/showcase";
import { getTemplateShowcase } from "@/lib/server/platform/showcase";
import { getTemplateDefinition } from "@/lib/templates/registry";
import { DesignSystemSheets } from "../DesignSystemSheets";
import { ButtonLink, CONTAINER, Eyebrow, InkBand, SectionHeading, StudioMain } from "../primitives";
import { ClosingCta, PlatformDiagram, ProcessSteps, SpecimenComposition, TemplateFeature } from "../sections";
import { TemplateSpecimen } from "../specimens/TemplateSpecimen";

/** The platform business site's homepage: the studio, its templates and the platform beneath them. */
export async function HomePage() {
  const showcase = await getTemplateShowcase();
  const facts = platformFacts();
  const templates = numberWord(facts.templates);

  return (
    <StudioMain>
      {/* Hero */}
      <section aria-labelledby="hero-title" className="overflow-hidden">
        <div className={`${CONTAINER} grid gap-14 pb-20 pt-14 lg:grid-cols-12 lg:gap-10 lg:pb-28 lg:pt-20`}>
          <div className="flex flex-col lg:col-span-5 lg:pt-6">
            <Eyebrow>Commerce studio &amp; platform</Eyebrow>
            <h1 id="hero-title" className="mt-6 text-balance font-heading text-[3.25rem] leading-[0.98] tracking-tight sm:text-7xl xl:text-[5.6rem] rtl:tracking-normal">
              Online stores with the presence of a <em className="text-accent">showroom</em>.
            </h1>
            <p className="mt-8 max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground">
              We design premium storefronts for furniture, interiors and design-led brands — and run them on our own
              production-grade commerce platform. Every store has its own identity, domain and catalogue, built on templates
              designed as complete systems rather than colour schemes.
            </p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <ButtonLink href="/contact">Start a project</ButtonLink>
              <ButtonLink href="/portfolio" variant="outline">
                Explore the templates
              </ButtonLink>
            </div>
            <dl className="mt-14 grid grid-cols-2 gap-px border border-border bg-border text-sm sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
              {[
                [String(facts.templates), "Storefront templates"],
                [String(facts.palettes), "Curated palettes"],
                ["RTL", "Right-to-left ready"],
                ["1", "Platform, every store"],
              ].map(([value, label]) => (
                <div key={label} className="flex flex-col-reverse bg-background p-4">
                  <dt className="mt-1 text-xs text-muted-foreground">{label}</dt>
                  <dd className="font-heading text-3xl leading-none">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="studio-rise lg:col-span-7">
            <SpecimenComposition
              desktop={{ template: "atelier", palette: "linen", view: "home" }}
              phone={{ template: "atelier", palette: "charcoal", view: "product" }}
              captions={[
                "The Atelier template in Linen: editorial navigation, split hero, tall photography.",
                "The same template in Charcoal — one setting, a different evening.",
              ]}
            />
          </div>
        </div>
      </section>

      {/* 01 Templates */}
      <section aria-labelledby="templates-title" className="border-t border-border">
        <div className={`${CONTAINER} py-24 lg:py-32`}>
          <SectionHeading
            index="01"
            eyebrow="Templates"
            id="templates-title"
            title={`${templates} storefronts. Each a complete design system.`}
            lede="A template here decides navigation, page composition, card anatomy, the product page and how the cart behaves — not just colours. Underneath, every store keeps the same secure commerce core."
          />
          <div className="mt-20 space-y-28 lg:mt-24 lg:space-y-36">
            {showcase.map((entry, position) => (
              <TemplateFeature key={entry.key} entry={entry} index={position + 1} reverse={position % 2 === 1} />
            ))}
          </div>
        </div>
      </section>

      {/* 02 Platform */}
      <section id="platform" aria-labelledby="platform-title" className="scroll-mt-20 border-t border-border bg-surface">
        <div className={`${CONTAINER} py-24 lg:py-32`}>
          <div className="grid gap-10 lg:grid-cols-12">
            <SectionHeading
              className="lg:col-span-7"
              index="02"
              eyebrow="Platform"
              id="platform-title"
              title="Every store is its own. The foundation is shared."
            />
            <p className="self-end text-base leading-relaxed text-muted-foreground lg:col-span-5">
              Your storefront, catalogue, customers and orders belong to your store alone. Beneath them runs one platform we
              maintain for every client — so improvements to security, speed and checkout reach every store at once, without
              redesigning anyone&apos;s storefront.
            </p>
          </div>
          <div className="studio-reveal mt-16">
            <PlatformDiagram />
          </div>
          <dl className="mt-16 grid gap-10 md:grid-cols-3">
            {[
              ["Isolated by design", "Each store's products, customers and orders are scoped to that store on the server and in the database. One store can never read another's data."],
              ["Rendered on the server", "Pages arrive complete — quick on mobile networks, and readable by search engines from the very first request."],
              ["Improved once, for everyone", "Fixes and refinements to the core ship to every store together. Your design stays yours."],
            ].map(([title, text]) => (
              <div key={title} className="border-t border-foreground pt-5">
                <dt className="font-heading text-2xl">{title}</dt>
                <dd className="mt-3 text-sm leading-relaxed text-muted-foreground">{text}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* 03 Craft */}
      <section aria-labelledby="craft-title" className="border-t border-border">
        <div className={`${CONTAINER} py-24 lg:py-32`}>
          <div className="grid gap-10 lg:grid-cols-12">
            <SectionHeading className="lg:col-span-7" index="03" eyebrow="Craft" id="craft-title" title="Designed as systems, not skins." />
            <p className="self-end text-base leading-relaxed text-muted-foreground lg:col-span-5">
              Every template is defined by tokens — colour roles, typefaces, corner radii, image proportions — rather than
              one-off styles. Your accent colour runs through the whole store, and the shared pages (checkout, contact, policies)
              take on each template&apos;s character automatically.
            </p>
          </div>
          <div className="mt-16">
            <DesignSystemSheets />
          </div>
        </div>
      </section>

      {/* 04 RTL */}
      <section aria-labelledby="rtl-title" className="border-t border-border bg-surface">
        <div className={`${CONTAINER} py-24 lg:py-32`}>
          <div className="grid gap-10 lg:grid-cols-12">
            <SectionHeading className="lg:col-span-7" index="04" eyebrow="Right-to-left" id="rtl-title" title="Arabic, laid out properly." />
            <div className="self-end text-base leading-relaxed text-muted-foreground lg:col-span-5">
              <p>
                When a store&apos;s language is right-to-left, the whole layout mirrors — navigation, grids, drawers, arrows —
                because templates are built with logical properties, not patched afterwards. Letter-spacing is removed where it
                would break Arabic joining.
              </p>
              <p className="mt-4 text-sm">
                Your products, collections and content can be entirely Arabic. Template interface labels are written in English
                today.
              </p>
            </div>
          </div>
          <div className="mt-16 grid gap-8 md:grid-cols-2">
            <figure className="studio-reveal">
              <TemplateSpecimen template="atelier" palette="stone" view="home" caption="atelier · stone · ltr" />
              <figcaption className="mt-4 font-mono text-[11px] text-muted-foreground">
                <span className="text-accent">LTR</span> — English store content.
              </figcaption>
            </figure>
            <figure className="studio-reveal">
              <TemplateSpecimen template="atelier" palette="stone" view="home" direction="rtl" caption="atelier · stone · rtl" />
              <figcaption className="mt-4 font-mono text-[11px] text-muted-foreground">
                <span className="text-accent">RTL</span> — the same template with Arabic store content.
              </figcaption>
            </figure>
          </div>
        </div>
      </section>

      {/* 05 Who it's for */}
      <section aria-labelledby="fit-title" className="border-t border-border">
        <div className={`${CONTAINER} py-24 lg:py-32`}>
          <SectionHeading
            index="05"
            eyebrow="Who it's for"
            id="fit-title"
            title="Made for considered purchases."
            lede="The platform is at its best where presentation matters and every order counts. These are the businesses each template was designed around."
          />
          <ul className="mt-16 border-t border-foreground">
            {[
              {
                name: "Furniture & interiors",
                text: "Higher-value pieces that need room to breathe: tall photography, collections as an index, a product page that sells calmly, delivery terms on every piece.",
                template: "atelier" as const,
                lead: true,
              },
              { name: "Lighting & homeware", text: "Design-led objects and small, curated catalogues where the photograph does the work.", template: "atelier" as const },
              { name: "Fashion & lifestyle", text: "Seasonal ranges and repeat customers who want to browse fast and add to the cart from anywhere.", template: "classic" as const },
              { name: "Specialty & everyday retail", text: "Broader catalogues where clarity, quick add and a familiar cart page convert best.", template: "classic" as const },
            ].map((item) => (
              <li key={item.name} className="studio-reveal grid gap-3 border-b border-border py-8 md:grid-cols-12 md:items-baseline md:gap-8">
                <h3 className={`font-heading leading-tight md:col-span-5 ${item.lead ? "text-4xl sm:text-5xl" : "text-3xl sm:text-4xl"}`}>{item.name}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground md:col-span-5">{item.text}</p>
                <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground md:col-span-2 md:text-end rtl:tracking-normal">
                  <span className="sr-only">Suggested template: </span>
                  {getTemplateDefinition(item.template).manifest.name}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 06 Engineering */}
      <InkBand aria-labelledby="engineering-title">
        <div className={`${CONTAINER} grid gap-14 py-24 lg:grid-cols-12 lg:py-32`}>
          <div className="lg:col-span-5">
            <SectionHeading index="06" eyebrow="Engineering" id="engineering-title" title="Built like infrastructure." />
            <p className="mt-6 max-w-md text-base leading-relaxed text-muted-foreground">
              A storefront is only as premium as the checkout behind it. The platform is engineered so you never have to think
              about any of this — but it is all there.
            </p>
          </div>
          <dl className="grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:col-span-7">
            {[
              ["Store isolation", "Each request's store is resolved on the server from its address — never from anything a browser sends — and every read is scoped to it."],
              ["A checkout that re-checks", "Prices, stock and delivery are recalculated on the server when an order is placed. Stock is decremented atomically, and a repeated submission places the order once."],
              ["Search foundations", "Readable product and collection URLs, canonical links, per-store sitemaps and robots rules, and structured data for products."],
              ["Your own domain", "Every store runs on its own subdomain, or on your domain once it has been verified."],
              ["Responsive and accessible", "Semantic markup, keyboard support, visible focus and layouts designed for phones first."],
              ["Tested before it ships", "Automated test suites cover pricing, checkout, permissions and store isolation, against a real database."],
            ].map(([title, text], position) => (
              <div key={title} className="studio-reveal border-t border-border pt-5">
                <dt className="flex items-baseline gap-3">
                  <span className="font-mono text-[11px] text-accent">{String(position + 1).padStart(2, "0")}</span>
                  <span className="font-heading text-2xl">{title}</span>
                </dt>
                <dd className="mt-3 text-sm leading-relaxed text-muted-foreground">{text}</dd>
              </div>
            ))}
          </dl>
        </div>
      </InkBand>

      {/* 07 Process */}
      <section aria-labelledby="process-title">
        <div className={`${CONTAINER} py-24 lg:py-32`}>
          <SectionHeading index="07" eyebrow="Process" id="process-title" title="How a store comes together." />
          <div className="mt-16">
            <ProcessSteps />
          </div>
        </div>
      </section>

      <ClosingCta
        title={
          <>
            Let&apos;s build the store your pieces <em className="text-accent">deserve</em>.
          </>
        }
        text="Tell us about your products and your customers. We'll walk you through the templates, live, and show you how your store would come together."
      />
    </StudioMain>
  );
}
