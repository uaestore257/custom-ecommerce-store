import { listTemplateManifests } from "@/lib/templates/registry";
import { ButtonLink, CONTAINER, Eyebrow, Tone } from "../primitives";

/**
 * A short, confident note that a real platform sits underneath — with a
 * line drawing of its three layers that draws itself on scroll. The detail
 * lives on /platform.
 */
export function PlatformTeaser() {
  const templates = listTemplateManifests().map((manifest) => manifest.name);
  const layers = [
    { label: "Your store", text: "Your brand, domain, catalogue, customers and orders." },
    { label: "Templates", text: `${new Intl.ListFormat("en").format(templates)} — complete storefront designs.` },
    { label: "Commerce core", text: "Checkout, orders, payments, search foundations and security, shared and maintained." },
  ];
  return (
    <Tone tone="ink" aria-labelledby="platform-teaser-title" className="relative overflow-hidden">
      <div className={`${CONTAINER} grid gap-14 py-24 lg:grid-cols-12 lg:py-32`}>
        <div data-reveal className="lg:col-span-5">
          <Eyebrow index="04">The platform</Eyebrow>
          <h2 id="platform-teaser-title" className="mt-6 text-balance font-heading text-5xl leading-[1.02] tracking-tight sm:text-6xl rtl:tracking-normal">
            Built on our own production commerce platform.
          </h2>
          <p className="mt-6 max-w-md text-base leading-relaxed text-muted-foreground">
            Every store we launch runs on a multi-store platform we engineer and maintain ourselves — so your design is
            free to be distinctive while the checkout, security and search foundations underneath are proven.
          </p>
          <div className="mt-10">
            <ButtonLink href="/platform" variant="outline">
              How the platform works
            </ButtonLink>
          </div>
        </div>
        <div data-reveal className="relative lg:col-span-7">
          <svg aria-hidden viewBox="0 0 40 300" preserveAspectRatio="none" className="absolute start-3 top-4 h-[calc(100%-2rem)] w-6 overflow-visible">
            <path d="M20 0 C 2 60, 38 90, 20 150 S 2 240, 20 300" pathLength={1} fill="none" stroke="var(--sf-accent)" strokeWidth={1.2} vectorEffect="non-scaling-stroke" className="studio-draw" />
          </svg>
          <ol className="space-y-6 ps-16">
            {layers.map((layer, index) => (
              <li key={layer.label} className="border border-border bg-surface p-6 sm:p-8">
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent rtl:tracking-normal">Layer {index + 1}</p>
                <p className="mt-3 font-heading text-3xl sm:text-4xl">{layer.label}</p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{layer.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </Tone>
  );
}
